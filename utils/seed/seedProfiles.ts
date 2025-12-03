/**
 * Seed Demo Profiles
 *
 * Creates demo user profiles with rankings, threads, and polls
 * for populating the community page
 *
 * NOTE: This requires authentication. The script must authenticate with a test user
 * before calling these functions to bypass Firestore security rules.
 */

import { db } from '../../firebase'
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore'
import type { UserProfile } from '../../types/profile'
import { seedRankings } from './seedRankings'
import { seedForumThreads, seedForumPolls } from './seedForum'

export interface DemoProfile {
    displayName: string
    description: string
    favoriteGenres: string[]
}

export const DEMO_PROFILES: DemoProfile[] = [
    {
        displayName: 'Alex Chen',
        description: 'Film enthusiast with a passion for indie cinema and classic noir',
        favoriteGenres: ['Drama', 'Thriller', 'Mystery'],
    },
    {
        displayName: 'Jordan Smith',
        description:
            'Sci-fi fanatic! Love anything with time travel, space exploration, or dystopian futures',
        favoriteGenres: ['Sci-Fi', 'Fantasy', 'Adventure'],
    },
    {
        displayName: 'Sam Rivera',
        description: 'Horror connoisseur. From slashers to psychological thrillers',
        favoriteGenres: ['Horror', 'Thriller', 'Mystery'],
    },
    {
        displayName: 'Taylor Kim',
        description: 'Classic film aficionado. Golden age Hollywood is my jam',
        favoriteGenres: ['Drama', 'Romance', 'Comedy'],
    },
    {
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
function generateDemoUserId(displayName: string): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 9)
    const slug = displayName.toLowerCase().replace(/\s+/g, '_')
    return `demo_${slug}_${timestamp}_${random}`
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
        email: `${profileData.displayName.toLowerCase().replace(/\s+/g, '_')}@demo.nettrailers.com`,
        displayName: profileData.displayName,
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${profileData.displayName}`,
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

    console.log(`  ✅ Created demo profile: ${profile.displayName} (${userId})`)

    return profile
}

/**
 * Seed demo profiles with content and interconnected interactions
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
    console.log(`  - Watch History: 75 items each`)
    console.log(`  - Collections: 3-5 each`)
    console.log(`  - Liked Content: 15 items each`)

    const createdUserIds: string[] = []
    const createdProfiles: Array<{
        userId: string
        userName: string
        userAvatar: string
    }> = []
    const profilesToCreate = DEMO_PROFILES.slice(0, Math.min(count, DEMO_PROFILES.length))

    // Import seed utilities
    const { seedWatchHistoryContent } = await import('./seedWatchHistory')
    const { seedCollections } = await import('./seedCollections')
    const { seedLikedContent } = await import('./seedLiked')
    const { seedWatchLaterContent } = await import('./seedWatchLater')
    const { getShuffledContent } = await import('./sampleContent')

    // PHASE 1: Create all profiles and their content
    console.log('\n📝 Phase 1: Creating profiles and content...')
    for (const profileData of profilesToCreate) {
        try {
            const userId = generateDemoUserId(profileData.displayName)
            const profile = await createDemoProfile(profileData, userId)
            createdUserIds.push(userId)
            createdProfiles.push({
                userId,
                userName: profile.displayName,
                userAvatar: profile.avatarUrl,
            })

            // Set up stores for this user
            const { useAuthStore } = await import('../../stores/authStore')
            const { useProfileStore } = await import('../../stores/profileStore')

            // Temporarily set this user as active
            useAuthStore.setState({ userId })
            useProfileStore.setState({ profile })

            console.log(`\n  👤 Setting up ${profile.displayName}...`)

            // Get shuffled content for this user
            const shuffledContent = getShuffledContent()
            let contentIndex = 0

            // Add liked content (15 items)
            console.log(`  ❤️  Adding liked content for ${profile.displayName}...`)
            await seedLikedContent({
                userId,
                count: 15,
                isGuest: false,
                startIndex: contentIndex,
                shuffledContent,
            })
            contentIndex += 15

            // Add watch later (10 items)
            console.log(`  ⏰ Adding watch later for ${profile.displayName}...`)
            await seedWatchLaterContent({
                userId,
                count: 10,
                isGuest: false,
                startIndex: contentIndex,
                shuffledContent,
            })
            contentIndex += 10

            // Add watch history (75 items)
            console.log(`  🎬 Adding watch history for ${profile.displayName}...`)
            await seedWatchHistoryContent({
                userId,
                count: 75,
                isGuest: false,
                startIndex: contentIndex,
                shuffledContent,
            })

            // Add collections (3-5)
            console.log(`  📚 Creating collections for ${profile.displayName}...`)
            await seedCollections({ userId, isGuest: false })

            // Create rankings for this profile
            if (withRankings && rankingsPerProfile > 0) {
                console.log(`  📊 Creating rankings for ${profile.displayName}...`)
                await seedRankings({
                    userId,
                    userName: profile.displayName,
                    userAvatar: profile.avatarUrl,
                    count: rankingsPerProfile,
                    favoriteGenres: profileData.favoriteGenres,
                })
            }

            // Create forum threads
            if (withForumPosts && threadsPerProfile > 0) {
                console.log(`  🧵 Creating threads for ${profile.displayName}...`)
                await seedForumThreads({
                    userId,
                    userName: profile.displayName,
                    userAvatar: profile.avatarUrl,
                    threadCount: threadsPerProfile,
                    pollCount: 0,
                    isGuest: false,
                })
            }

            // Create forum polls
            if (withForumPosts && pollsPerProfile > 0) {
                console.log(`  📊 Creating polls for ${profile.displayName}...`)
                await seedForumPolls({
                    userId,
                    userName: profile.displayName,
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

            // Get collections count from Firestore
            const collectionsSnapshot = await getDocs(
                query(collection(db, 'users', userId, 'customRows'), where('isPublic', '==', true))
            )
            const publicCollectionsCount = collectionsSnapshot.size

            // Update profile counts
            await setDoc(
                doc(db, 'profiles', userId),
                { rankingsCount, publicCollectionsCount, updatedAt: Date.now() },
                { merge: true }
            )

            console.log(`  ✅ Completed profile: ${profile.displayName}`)

            // Small delay between profiles
            await new Promise((resolve) => setTimeout(resolve, 500))
        } catch (error) {
            console.error(`  ❌ Failed to create profile ${profileData.displayName}:`, error)
        }
    }

    // PHASE 2: Create cross-profile interactions (comments, likes)
    if (createdProfiles.length > 1) {
        console.log('\n💬 Phase 2: Creating cross-profile interactions...')

        // 2A: Ranking interactions
        if (withRankings) {
            console.log('\n  📊 Adding ranking comments and likes...')
            const { seedRankingComments, seedRankingLikes } = await import('./seedRankingComments')
            const { useRankingStore } = await import('../../stores/rankingStore')

            // Load all rankings from all created profiles
            for (const profile of createdProfiles) {
                await useRankingStore.getState().loadUserRankings(profile.userId)
            }

            const allRankings = useRankingStore.getState().rankings

            // For each ranking, add comments and likes from other profiles
            for (const ranking of allRankings) {
                // Only add interactions to rankings from our demo profiles
                if (!createdUserIds.includes(ranking.userId)) {
                    continue
                }

                console.log(`    🎯 "${ranking.title}" by ${ranking.userName}`)

                try {
                    // Add comments (2-4 comments per ranking)
                    await seedRankingComments({
                        rankingId: ranking.id,
                        rankingOwnerId: ranking.userId,
                        commentingProfiles: createdProfiles,
                        commentCount: Math.floor(Math.random() * 3) + 2, // 2-4 comments
                    })

                    // Add likes (60-80% of other profiles like each ranking)
                    await seedRankingLikes({
                        rankingId: ranking.id,
                        rankingOwnerId: ranking.userId,
                        likingProfiles: createdProfiles,
                    })

                    // Small delay between rankings
                    await new Promise((resolve) => setTimeout(resolve, 300))
                } catch (error) {
                    console.error(
                        `      ❌ Failed to add interactions to ranking ${ranking.id}:`,
                        error
                    )
                }
            }
        }

        // 2B: Forum interactions (thread replies, poll votes)
        if (withForumPosts) {
            console.log('\n  🧵 Adding forum thread replies and poll votes...')
            const { useForumStore } = await import('../../stores/forumStore')

            // Load all threads and polls
            const forumState = useForumStore.getState()
            await forumState.loadThreads()
            await forumState.loadPolls()

            const allThreads = forumState.threads.filter((t) => createdUserIds.includes(t.userId))
            const allPolls = forumState.polls.filter((p) => createdUserIds.includes(p.userId))

            // Add replies to threads
            for (const thread of allThreads) {
                const replyCount = Math.floor(Math.random() * 3) + 1 // 1-3 replies per thread
                console.log(`    💬 Adding ${replyCount} replies to thread "${thread.title}"`)

                // Get profiles who can reply (not the thread owner)
                const validRepliers = createdProfiles.filter((p) => p.userId !== thread.userId)

                for (let i = 0; i < Math.min(replyCount, validRepliers.length); i++) {
                    const replier = validRepliers[Math.floor(Math.random() * validRepliers.length)]

                    const replyTexts = [
                        "Great point! I hadn't thought of it that way.",
                        'I completely agree with this take.',
                        "Interesting perspective! Here's my experience...",
                        'This is so true. I had a similar experience.',
                        'Thanks for sharing! This really resonates with me.',
                        'I have a different opinion but I respect your take.',
                        'Adding this to my watchlist based on your recommendation!',
                    ]

                    try {
                        await forumState.replyToThread(
                            thread.id,
                            replier.userId,
                            replier.userName,
                            replier.userAvatar,
                            replyTexts[Math.floor(Math.random() * replyTexts.length)]
                        )

                        await new Promise((resolve) => setTimeout(resolve, 200))
                    } catch (error) {
                        console.error(
                            `      ❌ Failed to add reply from ${replier.userName}:`,
                            error
                        )
                    }
                }

                // Add likes to the thread (40-70% of other profiles)
                const likeCount = Math.floor(validRepliers.length * (0.4 + Math.random() * 0.3))
                for (let i = 0; i < likeCount; i++) {
                    const liker = validRepliers[i]
                    try {
                        await forumState.likeThread(thread.id, liker.userId)
                        await new Promise((resolve) => setTimeout(resolve, 100))
                    } catch (error) {
                        // Silently continue if already liked
                    }
                }
            }

            // Add votes to polls
            for (const poll of allPolls) {
                console.log(`    📊 Adding votes to poll "${poll.question}"`)

                // Get profiles who can vote (not the poll owner)
                const validVoters = createdProfiles.filter((p) => p.userId !== poll.userId)

                // 60-90% of profiles vote on each poll
                const voteCount = Math.floor(validVoters.length * (0.6 + Math.random() * 0.3))

                for (let i = 0; i < voteCount; i++) {
                    const voter = validVoters[i]

                    // Random option selection
                    const optionIndex = Math.floor(Math.random() * poll.options.length)

                    try {
                        await forumState.voteOnPoll(poll.id, voter.userId, [optionIndex])
                        await new Promise((resolve) => setTimeout(resolve, 100))
                    } catch (error) {
                        // Silently continue if already voted
                    }
                }
            }
        }
    }

    console.log(`\n🎉 Demo profile seeding complete!`)
    console.log(`  Created ${createdUserIds.length} profiles with comprehensive data:`)
    console.log(`    - Watch history, collections, liked content`)
    console.log(`    - Rankings with cross-profile comments and likes`)
    console.log(`    - Forum threads with replies and likes`)
    console.log(`    - Polls with votes`)
    console.log(`  User IDs:`, createdUserIds)

    return createdUserIds
}

/**
 * Get list of all demo user IDs (users with demo_ prefix)
 */
export async function getDemoProfileIds(): Promise<string[]> {
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
