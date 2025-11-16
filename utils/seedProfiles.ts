/**
 * Seed Demo Profiles Utility
 *
 * Creates demo user profiles with rankings and collections
 * for testing and demonstration purposes
 */

import { db } from '../lib/firebase/firebaseConfig'
import { collection, doc, setDoc, writeBatch } from 'firebase/firestore'
import type { UserProfile } from '../types/profile'
import type { Ranking } from '../types/rankings'
import { sampleMovies, sampleTVShows } from './seedData'

// Demo user profiles with different interests
const DEMO_PROFILES = [
    {
        username: 'MovieBuff42',
        displayName: 'Alex Chen',
        description: 'Film enthusiast with a passion for indie cinema and classic noir 🎬',
        favoriteGenres: ['Drama', 'Thriller', 'Mystery'],
    },
    {
        username: 'SciFiNerd',
        displayName: 'Jordan Smith',
        description:
            'Sci-fi fanatic! Love anything with time travel, space exploration, or dystopian futures 🚀',
        favoriteGenres: ['Sci-Fi', 'Fantasy', 'Adventure'],
    },
    {
        username: 'HorrorFan88',
        displayName: 'Sam Rivera',
        description: 'Horror connoisseur. From slashers to psychological thrillers 👻',
        favoriteGenres: ['Horror', 'Thriller', 'Mystery'],
    },
]

// Sample ranking ideas
const RANKING_TEMPLATES = [
    {
        title: 'Top 10 Mind-Bending Movies',
        description: 'Movies that made me question reality',
        isPublic: true,
    },
    {
        title: 'Best Sci-Fi of the Decade',
        description: 'The most innovative sci-fi films from the last 10 years',
        isPublic: true,
    },
    {
        title: 'Classic Horror Must-Watch',
        description: 'Essential horror films that defined the genre',
        isPublic: true,
    },
    {
        title: 'Underrated Gems',
        description: 'Great movies that flew under the radar',
        isPublic: true,
    },
    {
        title: 'Best Plot Twists',
        description: 'Movies with endings that blew my mind',
        isPublic: true,
    },
]

/**
 * Create a demo user profile
 */
async function createDemoProfile(profileData: (typeof DEMO_PROFILES)[0]): Promise<string> {
    // Generate a unique userId (in production, this would be Firebase Auth UID)
    const userId = `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

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
        rankingsCount: 0, // Will update after creating rankings
        publicCollectionsCount: 0,
        totalLikes: Math.floor(Math.random() * 100) + 20, // Random likes (20-120)
        totalViews: Math.floor(Math.random() * 500) + 100, // Random views (100-600)
        isPublic: true,
        createdAt: Date.now() - Math.floor(Math.random() * 90) * 24 * 60 * 60 * 1000, // Random date in last 90 days
        updatedAt: Date.now(),
    }

    // Save profile to Firestore
    await setDoc(doc(db, 'users', userId), profile)

    console.log(`✅ Created demo profile: ${profile.username} (${userId})`)

    return userId
}

/**
 * Create demo rankings for a user
 */
async function createDemoRankings(userId: string, count: number = 3): Promise<void> {
    const batch = writeBatch(db)
    const rankingsRef = collection(db, 'rankings')

    // Shuffle ranking templates and take random ones
    const shuffled = [...RANKING_TEMPLATES].sort(() => 0.5 - Math.random())
    const selectedTemplates = shuffled.slice(0, count)

    for (let i = 0; i < selectedTemplates.length; i++) {
        const template = selectedTemplates[i]
        const rankingId = `ranking_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

        // Select random movies/shows for this ranking (5-10 items)
        const itemCount = Math.floor(Math.random() * 6) + 5 // 5-10 items
        const allContent = [...sampleMovies, ...sampleTVShows]
        const shuffledContent = [...allContent].sort(() => 0.5 - Math.random())
        const selectedContent = shuffledContent.slice(0, itemCount)

        const ranking: Ranking = {
            id: rankingId,
            title: template.title,
            description: template.description,
            userId,
            items: selectedContent.map((content, index) => ({
                id: content.id,
                rank: index + 1,
                customScore: 10 - index, // Descending scores
                note: index === 0 ? 'My absolute favorite!' : undefined,
            })),
            isPublic: template.isPublic,
            likes: Math.floor(Math.random() * 50) + 5, // Random likes (5-55)
            views: Math.floor(Math.random() * 200) + 50, // Random views (50-250)
            createdAt: Date.now() - Math.floor(Math.random() * 60) * 24 * 60 * 60 * 1000, // Random date in last 60 days
            updatedAt: Date.now(),
        }

        batch.set(doc(rankingsRef, rankingId), ranking)
    }

    await batch.commit()

    // Update profile rankingsCount
    const profileRef = doc(db, 'users', userId)
    await setDoc(
        profileRef,
        {
            rankingsCount: count,
            updatedAt: Date.now(),
        },
        { merge: true }
    )

    console.log(`✅ Created ${count} rankings for user ${userId}`)
}

/**
 * Seed all demo profiles
 */
export async function seedDemoProfiles(): Promise<string[]> {
    console.log('🌱 Starting demo profile seeding...')

    const userIds: string[] = []

    for (const profileData of DEMO_PROFILES) {
        try {
            const userId = await createDemoProfile(profileData)
            userIds.push(userId)

            // Create 2-4 rankings for each user
            const rankingCount = Math.floor(Math.random() * 3) + 2 // 2-4 rankings
            await createDemoRankings(userId, rankingCount)

            // Small delay between users
            await new Promise((resolve) => setTimeout(resolve, 500))
        } catch (error) {
            console.error(`❌ Failed to seed profile ${profileData.username}:`, error)
        }
    }

    console.log(`🎉 Demo profile seeding complete! Created ${userIds.length} profiles.`)
    console.log('User IDs:', userIds)

    return userIds
}

/**
 * Get all demo profile user IDs (for easy access)
 */
export async function getDemoProfileIds(): Promise<string[]> {
    // In a real implementation, we'd query Firestore for demo users
    // For now, return empty array - IDs will be logged when seeding
    return []
}
