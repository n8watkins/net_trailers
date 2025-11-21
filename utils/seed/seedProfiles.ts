/**
 * Seed Demo Profiles
 *
 * Creates demo user profiles with rankings, threads, and polls
 * for populating the community page
 */

import { db } from '../../firebase'
import { doc, setDoc, collection, writeBatch } from 'firebase/firestore'
import type { UserProfile } from '../../types/profile'
import { seedRankings } from './seedRankings'
import { seedForumThreads, seedForumPolls } from './seedForum'

export interface DemoProfile {
    username: string
    displayName: string
    description: string
    favoriteGenres: string[]
}

export const DEMO_PROFILES: DemoProfile[] = [
    {
        username: 'MovieBuff42',
        displayName: 'Alex Chen',
        description: 'Film enthusiast with a passion for indie cinema and classic noir',
        favoriteGenres: ['Drama', 'Thriller', 'Mystery'],
    },
    {
        username: 'SciFiNerd',
        displayName: 'Jordan Smith',
        description:
            'Sci-fi fanatic! Love anything with time travel, space exploration, or dystopian futures',
        favoriteGenres: ['Sci-Fi', 'Fantasy', 'Adventure'],
    },
    {
        username: 'HorrorFan88',
        displayName: 'Sam Rivera',
        description: 'Horror connoisseur. From slashers to psychological thrillers',
        favoriteGenres: ['Horror', 'Thriller', 'Mystery'],
    },
    {
        username: 'CinemaLover',
        displayName: 'Taylor Kim',
        description: 'Classic film aficionado. Golden age Hollywood is my jam',
        favoriteGenres: ['Drama', 'Romance', 'Comedy'],
    },
    {
        username: 'AnimeFan99',
        displayName: 'Riley Park',
        description: 'Anime and animation lover. Studio Ghibli forever',
        favoriteGenres: ['Animation', 'Fantasy', 'Adventure'],
    },
]

export interface SeedDemoProfilesOptions {
    count?: number
    withRankings?: boolean
    withForumPosts?: boolean
    rankingsPerProfile?: number
    threadsPerProfile?: number
    pollsPerProfile?: number
}

/**
 * Generate a demo user ID with demo_ prefix
 */
function generateDemoUserId(username: string): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 9)
    return `demo_${username.toLowerCase()}_${timestamp}_${random}`
}

/**
 * Create a single demo profile in Firestore
 */
async function createDemoProfile(profileData: DemoProfile, userId: string): Promise<UserProfile> {
    const now = Date.now()
    const createdAt = now - Math.floor(Math.random() * 90) * 24 * 60 * 60 * 1000 // Random in last 90 days

    const profile: UserProfile = {
        id: userId,
        userId,
        email: `${profileData.username.toLowerCase()}@demo.nettrailers.com`,
        username: profileData.username,
        displayName: profileData.displayName,
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${profileData.username}`,
        avatarSource: 'generated',
        description: profileData.description,
        favoriteGenres: profileData.favoriteGenres,
        rankingsCount: 0,
        publicCollectionsCount: 0,
        totalLikes: Math.floor(Math.random() * 100) + 20,
        totalViews: Math.floor(Math.random() * 500) + 100,
        isPublic: true,
        createdAt,
        updatedAt: now,
    }

    // Save to Firestore profiles collection
    await setDoc(doc(db, 'profiles', userId), profile)

    console.log(`  ✅ Created demo profile: ${profile.username} (${userId})`)

    return profile
}

/**
 * Seed demo profiles with content
 */
export async function seedDemoProfiles(options: SeedDemoProfilesOptions = {}): Promise<string[]> {
    const {
        count = 3,
        withRankings = true,
        withForumPosts = true,
        rankingsPerProfile = 2,
        threadsPerProfile = 2,
        pollsPerProfile = 1,
    } = options

    console.log('🌱 Starting demo profile seeding...')
    console.log(`  Creating ${count} demo profiles with:`)
    console.log(`  - Rankings: ${withRankings ? rankingsPerProfile : 'none'}`)
    console.log(`  - Threads: ${withForumPosts ? threadsPerProfile : 'none'}`)
    console.log(`  - Polls: ${withForumPosts ? pollsPerProfile : 'none'}`)

    const createdUserIds: string[] = []
    const profilesToCreate = DEMO_PROFILES.slice(0, Math.min(count, DEMO_PROFILES.length))

    for (const profileData of profilesToCreate) {
        try {
            const userId = generateDemoUserId(profileData.username)
            const profile = await createDemoProfile(profileData, userId)
            createdUserIds.push(userId)

            // Create rankings for this profile
            if (withRankings && rankingsPerProfile > 0) {
                console.log(`  📊 Creating rankings for ${profile.username}...`)
                await seedRankings({
                    userId,
                    userName: profile.displayName || profile.username,
                    userAvatar: profile.avatarUrl,
                })
            }

            // Create forum threads
            if (withForumPosts && threadsPerProfile > 0) {
                console.log(`  🧵 Creating threads for ${profile.username}...`)
                await seedForumThreads({
                    userId,
                    userName: profile.displayName || profile.username,
                    userAvatar: profile.avatarUrl,
                    threadCount: threadsPerProfile,
                    pollCount: 0,
                    isGuest: false,
                })
            }

            // Create forum polls
            if (withForumPosts && pollsPerProfile > 0) {
                console.log(`  📊 Creating polls for ${profile.username}...`)
                await seedForumPolls({
                    userId,
                    userName: profile.displayName || profile.username,
                    userAvatar: profile.avatarUrl,
                    threadCount: 0,
                    pollCount: pollsPerProfile,
                    isGuest: false,
                })
            }

            // Update profile counts
            const { useRankingStore } = await import('../../stores/rankingStore')
            await useRankingStore.getState().loadUserRankings(userId)
            const rankingsCount = useRankingStore
                .getState()
                .rankings.filter((r) => r.userId === userId).length

            await setDoc(
                doc(db, 'profiles', userId),
                { rankingsCount, updatedAt: Date.now() },
                { merge: true }
            )

            console.log(`  ✅ Completed profile: ${profile.username}`)

            // Small delay between profiles
            await new Promise((resolve) => setTimeout(resolve, 500))
        } catch (error) {
            console.error(`  ❌ Failed to create profile ${profileData.username}:`, error)
        }
    }

    console.log(`\n🎉 Demo profile seeding complete!`)
    console.log(`  Created ${createdUserIds.length} profiles`)
    console.log(`  User IDs:`, createdUserIds)

    return createdUserIds
}

/**
 * Get list of all demo user IDs (users with demo_ prefix)
 */
export async function getDemoProfileIds(): Promise<string[]> {
    const { collection, query, where, getDocs } = await import('firebase/firestore')

    try {
        // Query profiles where ID starts with demo_
        // Note: Firestore doesn't support startsWith, so we use a range query
        const profilesRef = collection(db, 'profiles')
        const q = query(
            profilesRef,
            where('__name__', '>=', 'demo_'),
            where('__name__', '<', 'demo`') // 'demo`' is lexicographically after 'demo_'
        )

        const snapshot = await getDocs(q)
        return snapshot.docs.map((doc) => doc.id)
    } catch (error) {
        console.error('Error getting demo profile IDs:', error)
        return []
    }
}
