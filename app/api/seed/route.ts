/**
 * Seed Data API Route
 *
 * Runs seed function server-side so it can continue running
 * even if the user navigates away from the page.
 *
 * NOTE: This route is designed for authenticated users only.
 * Guest users should use client-side seeding since their data is in localStorage.
 */

import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { validateServerActionOrigin } from '@/lib/csrfProtection'
import { getAdminDb } from '@/lib/firebase-admin'
import { sampleMovies, sampleTVShows } from '@/utils/seed/sampleContent'
import { Content } from '@/typings'

interface SeedOptions {
    likedCount?: number
    hiddenCount?: number
    watchLaterCount?: number
    watchHistoryCount?: number
    createCollections?: boolean
    rankingCount?: number
    notificationCount?: number
    threadCount?: number
    pollCount?: number
    userName?: string
    userAvatar?: string
}

/**
 * Get shuffled content slice
 */
function getShuffledContentSlice(startIndex: number, count: number): Content[] {
    const allContent = [...sampleMovies, ...sampleTVShows]

    // Shuffle using Fisher-Yates
    for (let i = allContent.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[allContent[i], allContent[j]] = [allContent[j], allContent[i]]
    }

    return allContent.slice(startIndex, startIndex + count)
}

export async function POST(request: NextRequest) {
    try {
        // CSRF protection
        const headersList = await headers()
        if (!validateServerActionOrigin(headersList)) {
            return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
        }

        // Get user ID from request body
        const body = await request.json()
        const { userId, options = {} } = body as { userId: string; options?: SeedOptions }

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
        }

        // Don't allow guest users (they use localStorage, not Firebase)
        if (userId.startsWith('guest_')) {
            return NextResponse.json(
                { error: 'Guest users must use client-side seeding' },
                { status: 400 }
            )
        }

        // Verify user exists and get their profile data
        let userProfile: any = null
        let displayName: string | null = null
        let avatarUrl: string | null = null

        try {
            const adminDb = getAdminDb()
            const userDoc = await adminDb.collection('users').doc(userId).get()
            if (!userDoc.exists) {
                return NextResponse.json({ error: 'User not found' }, { status: 404 })
            }

            // Get user's profile to use their actual display name
            const profileDoc = await adminDb.collection('profiles').doc(userId).get()
            if (profileDoc.exists) {
                userProfile = profileDoc.data()
                displayName = userProfile.displayName
                avatarUrl = userProfile.avatarUrl
                console.log('📝 Found user profile:', displayName)
            } else {
                console.log('⚠️  No profile document found, checking Firebase Auth...')
            }

            // Fallback to Firebase Auth if no profile document
            if (!displayName) {
                const { getAdminAuth } = await import('@/lib/firebase-admin')
                const adminAuth = getAdminAuth()
                try {
                    const userRecord = await adminAuth.getUser(userId)
                    displayName =
                        userRecord.displayName || userRecord.email?.split('@')[0] || 'User'
                    avatarUrl = userRecord.photoURL || null
                    console.log('📝 Using Firebase Auth display name:', displayName)
                } catch (authError) {
                    console.error('Failed to fetch user from Auth:', authError)
                    displayName = 'User'
                }
            }
        } catch (error) {
            console.error('Error verifying user:', error)
            return NextResponse.json({ error: 'Failed to verify user' }, { status: 500 })
        }

        console.log('🌱 Starting server-side seed for user:', userId)
        console.log('   Display name:', displayName)
        console.log('   Avatar URL:', avatarUrl)

        // Use fetched display name and avatar
        const seedOptions = {
            ...options,
            userName: displayName || options.userName || 'User',
            userAvatar: avatarUrl || options.userAvatar,
        }

        // Start seeding in the background (fire and forget)
        // This allows the response to return immediately while seeding continues
        seedUserDataServerSide(userId, seedOptions).catch((error) => {
            console.error('❌ Server-side seed failed for user:', userId, error)
        })

        // Return immediately
        return NextResponse.json({
            success: true,
            message: 'Seed process started in background. Data will be available shortly.',
            userId,
        })
    } catch (error) {
        console.error('Seed API error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to start seed' },
            { status: 500 }
        )
    }
}

/**
 * Server-side seed implementation that writes directly to Firebase
 * without using Zustand stores
 */
async function seedUserDataServerSide(userId: string, options: SeedOptions): Promise<void> {
    const {
        likedCount = 15, // Match client-side
        hiddenCount = 8, // Match client-side
        watchLaterCount = 12,
        watchHistoryCount = 75, // Match client-side
        createCollections = true,
        rankingCount = 3,
        notificationCount = 8,
        threadCount = 5,
        pollCount = 4,
        userName = 'User',
        userAvatar,
    } = options

    const adminDb = getAdminDb()
    const userRef = adminDb.collection('users').doc(userId)

    console.log('  📝 Seeding data for user:', userId)

    let contentIndex = 0

    // 1. Seed liked content
    if (likedCount > 0) {
        console.log(`  ✅ Adding ${likedCount} liked items`)
        const likedContent = getShuffledContentSlice(contentIndex, likedCount)
        await userRef.update({
            likedMovies: likedContent,
            lastActive: Date.now(),
        })
        contentIndex += likedCount
    }

    // 2. Seed hidden content
    if (hiddenCount > 0) {
        console.log(`  🙈 Adding ${hiddenCount} hidden items`)
        const hiddenContent = getShuffledContentSlice(contentIndex, hiddenCount)
        await userRef.update({
            hiddenMovies: hiddenContent,
            lastActive: Date.now(),
        })
        contentIndex += hiddenCount
    }

    // 3. Seed watch later (default watchlist)
    if (watchLaterCount > 0) {
        console.log(`  📺 Adding ${watchLaterCount} watch later items`)
        const watchLaterContent = getShuffledContentSlice(contentIndex, watchLaterCount)
        await userRef.update({
            defaultWatchlist: watchLaterContent,
            lastActive: Date.now(),
        })
        contentIndex += watchLaterCount
    }

    // 4. Seed watch history with realistic viewing schedule (MULTIPLE entries per day)
    if (watchHistoryCount > 0) {
        console.log(`  🕐 Adding ${watchHistoryCount} watch history items`)

        // Get content - cycle through available pool if count exceeds pool size
        // This allows duplicates which is realistic (people rewatch content)
        const allContent = [...sampleMovies, ...sampleTVShows]
        const shuffled = allContent.sort(() => Math.random() - 0.5)
        const content: Content[] = []
        for (let i = 0; i < watchHistoryCount; i++) {
            content.push(shuffled[i % shuffled.length])
        }

        console.log(
            `    Available pool: ${shuffled.length} items, generating ${content.length} entries (${watchHistoryCount > shuffled.length ? 'with duplicates' : 'no duplicates'})`
        )

        const now = Date.now()

        // Define viewing schedule - 2 months of realistic viewing history
        // Strategy: More entries on recent days, gradually decreasing over 60 days
        const viewingSchedule: Array<{ daysAgo: number; entriesCount: number }> = []

        // Past week (days 0-6): Heavy viewing (3-4 entries per day) = ~25 entries
        for (let day = 0; day <= 6; day++) {
            viewingSchedule.push({ daysAgo: day, entriesCount: day === 0 ? 4 : 3 })
        }

        // Week 2 (days 7-13): Moderate viewing (2 entries per day) = 14 entries
        for (let day = 7; day <= 13; day++) {
            viewingSchedule.push({ daysAgo: day, entriesCount: 2 })
        }

        // Weeks 3-4 (days 14-27): Light viewing (1-2 entries per day) = ~21 entries
        for (let day = 14; day <= 27; day++) {
            viewingSchedule.push({ daysAgo: day, entriesCount: day % 2 === 0 ? 2 : 1 })
        }

        // Weeks 5-8 (days 28-55): Sparse viewing (1 entry every 2 days) = ~14 entries
        for (let day = 28; day <= 55; day += 2) {
            viewingSchedule.push({ daysAgo: day, entriesCount: 1 })
        }

        // Older (days 56-60): Very sparse = 1 entry
        viewingSchedule.push({ daysAgo: 60, entriesCount: 1 })

        // Flatten schedule into individual entries
        const scheduledEntries: Array<{
            daysAgo: number
            entryIndex: number
            entriesCount: number
        }> = []
        viewingSchedule.forEach((day) => {
            for (let i = 0; i < day.entriesCount; i++) {
                scheduledEntries.push({
                    daysAgo: day.daysAgo,
                    entryIndex: i,
                    entriesCount: day.entriesCount,
                })
            }
        })

        // Add remaining entries as scattered older content
        const totalScheduled = scheduledEntries.length
        if (content.length > totalScheduled) {
            const remaining = content.length - totalScheduled
            for (let i = 0; i < remaining; i++) {
                const daysAgo = 60 + Math.floor(Math.random() * 60)
                scheduledEntries.push({ daysAgo, entryIndex: 0, entriesCount: 1 })
            }
        }

        // Generate watch history with proper timestamps
        const watchHistory = content.map((item, i) => {
            let watchedAt: number

            if (i === 0) {
                // First entry uses current time
                watchedAt = now
            } else if (i <= scheduledEntries.length) {
                const schedule = scheduledEntries[i - 1]
                const daysAgo = schedule.daysAgo
                const entryIndex = schedule.entryIndex

                const startOfDay = new Date(now)
                startOfDay.setHours(0, 0, 0, 0)
                const dayStart = startOfDay.getTime() - daysAgo * 24 * 60 * 60 * 1000

                if (daysAgo === 0) {
                    // Today: spread from morning (8am) to now
                    const morningStart = dayStart + 8 * 60 * 60 * 1000
                    const timeRange = now - morningStart
                    const segment = timeRange / 8
                    watchedAt = morningStart + segment * entryIndex + Math.random() * segment
                } else {
                    // Other days: spread throughout waking hours (8am - 11pm)
                    const wakingHours = 15
                    const segment = wakingHours / Math.max(schedule.entriesCount || 1, 1)
                    const hour = 8 + segment * entryIndex + Math.random() * segment
                    const minutes = Math.floor(Math.random() * 60)
                    watchedAt = dayStart + hour * 60 * 60 * 1000 + minutes * 60 * 1000
                }
            } else {
                // Fallback for any extra entries
                watchedAt = now - i * 24 * 60 * 60 * 1000
            }

            return {
                id: `${item.id}-${item.media_type}`,
                contentId: item.id,
                mediaType: item.media_type,
                watchedAt,
                content: item,
            }
        })

        const historyRef = userRef.collection('data').doc('watchHistory')
        await historyRef.set({
            history: watchHistory,
            updatedAt: Date.now(),
        })
        console.log(`  ✅ Watch history saved with realistic timestamps`)
    }

    // 5. Seed collections (if requested)
    if (createCollections) {
        console.log('  📂 Creating sample collections...')
        await seedCollectionsServerSide(adminDb, userId)
    }

    // 6. Seed rankings (if requested)
    if (rankingCount > 0) {
        console.log(`  🏆 Creating ${rankingCount} sample rankings...`)
        await seedRankingsServerSide(adminDb, userId, userName, userAvatar, rankingCount)
    }

    // 7. Seed notifications (if requested)
    if (notificationCount > 0) {
        console.log(`  🔔 Creating ${notificationCount} sample notifications...`)
        await seedNotificationsServerSide(adminDb, userId, notificationCount)
    }

    // 8. Seed forum threads (if requested)
    if (threadCount > 0) {
        console.log(`  💬 Creating ${threadCount} sample forum threads...`)
        await seedForumThreadsServerSide(adminDb, userId, userName, userAvatar, threadCount)
    }

    // 9. Seed forum polls (if requested)
    if (pollCount > 0) {
        console.log(`  📊 Creating ${pollCount} sample forum polls...`)
        await seedForumPollsServerSide(adminDb, userId, userName, userAvatar, pollCount)
    }

    console.log('✨ Server-side seed complete for user:', userId)
}

/**
 * Seed collections using Admin SDK
 *
 * Stores collections in the userCreatedWatchlists array in the main user document,
 * matching the client-side behavior
 */
async function seedCollectionsServerSide(adminDb: any, userId: string): Promise<void> {
    const { nanoid } = await import('nanoid')

    const collectionTemplates = [
        {
            name: 'Epic Sci-Fi Adventures',
            emoji: '🚀',
            color: '#3B82F6',
            genres: ['scifi', 'adventure'],
            movieIndices: [8, 16, 18],
            tvIndices: [3],
            displayAsRow: true,
        },
        {
            name: 'Mind-Bending Thrillers',
            emoji: '🧠',
            color: '#8B5CF6',
            genres: ['thriller', 'drama'],
            movieIndices: [0, 1, 20, 19],
            tvIndices: [],
            displayAsRow: true,
        },
        {
            name: 'Animated Masterpieces',
            emoji: '🎨',
            color: '#EC4899',
            genres: ['animation', 'fantasy'],
            movieIndices: [7, 9],
            tvIndices: [2, 3, 15],
            displayAsRow: true,
        },
        {
            name: 'Crime & Drama Classics',
            emoji: '🎭',
            color: '#EF4444',
            genres: ['crime', 'drama'],
            movieIndices: [5, 4, 13],
            tvIndices: [0],
            displayAsRow: false,
        },
        {
            name: 'Epic Fantasy Sagas',
            emoji: '⚔️',
            color: '#10B981',
            genres: ['fantasy', 'adventure'],
            movieIndices: [10, 17],
            tvIndices: [1, 17],
            displayAsRow: false,
        },
        {
            name: 'Marvel Universe',
            emoji: '🦸',
            color: '#F59E0B',
            genres: ['action', 'scifi'],
            movieIndices: [14, 15],
            tvIndices: [5, 4],
            displayAsRow: false,
        },
        {
            name: 'Comfort Classics',
            emoji: '☕',
            color: '#06B6D4',
            genres: ['drama', 'comedy'],
            movieIndices: [2, 12],
            tvIndices: [9, 14],
            displayAsRow: false,
        },
        {
            name: 'Dark & Mysterious',
            emoji: '🌙',
            color: '#6366F1',
            genres: ['mystery', 'horror'],
            movieIndices: [],
            tvIndices: [8, 11, 16, 14],
            displayAsRow: false,
        },
    ]

    const userRef = adminDb.collection('users').doc(userId)
    const userDoc = await userRef.get()
    const userData = userDoc.data()

    // Get existing collections or start with empty array
    const existingCollections = userData?.userCreatedWatchlists || []
    const newCollections = []

    for (const template of collectionTemplates) {
        // Check if collection with this title already exists
        const existingCollection = existingCollections.find((c: any) => c.name === template.name)
        if (existingCollection) {
            console.log(`    ⏭️  Skipping existing collection: ${template.name}`)
            continue
        }

        const collectionId = nanoid(12)

        // Get items from sample content
        const items = [
            ...template.movieIndices.map((i) => sampleMovies[i]).filter(Boolean),
            ...template.tvIndices.map((i) => sampleTVShows[i]).filter(Boolean),
        ]

        const collection = {
            id: collectionId,
            name: template.name,
            emoji: template.emoji,
            color: template.color,
            collectionType: 'manual',
            genres: template.genres,
            mediaType: 'both',
            displayAsRow: template.displayAsRow,
            canGenerateMore: true,
            items,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        }

        newCollections.push(collection)
        console.log(`    ✅ Created collection: ${collection.name} (${items.length} items)`)
    }

    // Store all collections in the userCreatedWatchlists array (matching client-side behavior)
    await userRef.update({
        userCreatedWatchlists: [...existingCollections, ...newCollections],
        lastActive: Date.now(),
    })

    console.log(`    📦 Stored ${newCollections.length} collections in userCreatedWatchlists`)
}

/**
 * Seed rankings using Admin SDK
 */
async function seedRankingsServerSide(
    adminDb: any,
    userId: string,
    userName: string,
    userAvatar: string | undefined,
    count: number
): Promise<void> {
    const { nanoid } = await import('nanoid')

    const rankingTitles = [
        'Top 10 Action Movies of All Time',
        'Best Sci-Fi TV Series',
        'Underrated Thriller Movies',
        'Top 5 Comedy Shows',
        'Most Emotional Dramas',
    ]

    for (let i = 0; i < count && i < rankingTitles.length; i++) {
        const title = rankingTitles[i]

        // Check if ranking with this title already exists for this user
        const existingRanking = await adminDb
            .collection('rankings')
            .where('userId', '==', userId)
            .where('title', '==', title)
            .limit(1)
            .get()

        if (!existingRanking.empty) {
            console.log(`    ⏭️  Skipping existing ranking: ${title}`)
            continue
        }

        const rankingId = nanoid(12)
        const now = Date.now()

        // Get sample content for this ranking
        const rankedItems = getShuffledContentSlice(i * 5, 5).map((content, index) => ({
            content,
            position: index + 1,
            score: 10 - index, // Descending scores
            notes: `Great ${content.media_type}!`,
        }))

        const ranking = {
            id: rankingId,
            userId,
            userName,
            userUsername: null, // Don't set userUsername - let it use userId for profile links
            userAvatar: userAvatar || null,
            title: title,
            description: `My personal ranking of ${title.toLowerCase()}`,
            rankedItems,
            isPublic: true,
            itemCount: rankedItems.length,
            createdAt: now - i * 86400000, // Spread over days
            updatedAt: now - i * 86400000,
            likes: 0,
            comments: 0,
            views: 0,
            contentIds: rankedItems.map((item) => item.content.id),
            contentTitles: rankedItems.map((item) =>
                'title' in item.content
                    ? item.content.title.toLowerCase()
                    : item.content.name.toLowerCase()
            ),
        }

        await adminDb.collection('rankings').doc(rankingId).set(ranking)
        console.log(`    ✅ Created ranking: ${ranking.title}`)

        // Add comments to this ranking (2-5 comments from various profiles)
        const commentCount = Math.floor(Math.random() * 4) + 2 // 2-5 comments
        await seedRankingCommentsServerSide(
            adminDb,
            rankingId,
            userId,
            userName,
            userAvatar,
            commentCount
        )
    }
}

/**
 * Seed ranking comments using Admin SDK
 * Creates comments from the current user and demo profiles
 */
async function seedRankingCommentsServerSide(
    adminDb: any,
    rankingId: string,
    rankingOwnerId: string,
    rankingOwnerName: string,
    rankingOwnerAvatar: string | undefined,
    commentCount: number
): Promise<void> {
    const { nanoid } = await import('nanoid')

    // Get demo profiles to comment from
    const demoProfiles = await adminDb
        .collection('profiles')
        .where('__name__', '>=', 'demo_')
        .where('__name__', '<', 'demo`')
        .limit(10)
        .get()

    const commenters = [
        // Include the ranking owner
        {
            userId: rankingOwnerId,
            userName: rankingOwnerName,
            userAvatar: rankingOwnerAvatar || null,
        },
    ]

    // Add demo profiles as potential commenters
    demoProfiles.docs.forEach((doc: any) => {
        const profile = doc.data()
        commenters.push({
            userId: doc.id,
            userName: profile.displayName || 'Demo User',
            userAvatar: profile.avatarUrl || null,
        })
    })

    // If no demo profiles, use the owner multiple times with varied comments
    if (commenters.length === 1) {
        console.log(`      ℹ️  No demo profiles found, using ranking owner for all comments`)
    }

    const commentTexts = [
        'Great ranking! I totally agree with your top picks.',
        "Interesting choices! I'd swap #2 and #3 personally.",
        'This list is spot on. Love your taste!',
        "Nice ranking! Haven't seen #4 yet, adding to my watchlist.",
        'Solid list. The top 3 are definitely classics.',
        "I'd rank them differently but I respect your opinion!",
        'Finally someone who appreciates these gems!',
        'This ranking speaks to my soul. Perfect picks.',
        "Good list but where's [insert movie]? That should be #1!",
        'Absolutely agree with your #1 choice. Masterpiece!',
    ]

    const now = Date.now()
    let actualCommentCount = 0

    for (let i = 0; i < commentCount; i++) {
        const commenter = commenters[Math.floor(Math.random() * commenters.length)]
        const commentText = commentTexts[Math.floor(Math.random() * commentTexts.length)]
        const commentId = nanoid(12)

        const comment = {
            id: commentId,
            rankingId,
            userId: commenter.userId,
            userName: commenter.userName,
            userAvatar: commenter.userAvatar,
            text: commentText,
            createdAt: now - (commentCount - i) * 3600000, // Spread over hours
            updatedAt: now - (commentCount - i) * 3600000,
            likes: Math.floor(Math.random() * 10), // 0-9 likes per comment
        }

        await adminDb.collection('rankingComments').doc(commentId).set(comment)
        actualCommentCount++
    }

    // Update ranking with actual comment count
    await adminDb.collection('rankings').doc(rankingId).update({
        comments: actualCommentCount,
    })

    console.log(`      💬 Added ${actualCommentCount} comments`)
}

/**
 * Seed notifications using Admin SDK
 * Creates individual trending notifications with real TMDB data
 */
async function seedNotificationsServerSide(
    adminDb: any,
    userId: string,
    count: number
): Promise<void> {
    const { nanoid } = await import('nanoid')

    if (count <= 0) {
        console.log('    ⏭️  Skipping notifications (count = 0)')
        return
    }

    console.log(`    🔔 Creating ${count} trending notifications from live TMDB data`)

    const TMDB_API_KEY = process.env.TMDB_API_KEY

    if (!TMDB_API_KEY) {
        console.error('    ❌ TMDB_API_KEY not configured, cannot fetch trending data')
        return
    }

    try {
        // Fetch current trending movies and TV shows
        const [moviesRes, tvRes] = await Promise.all([
            fetch(`https://api.themoviedb.org/3/trending/movie/week?api_key=${TMDB_API_KEY}`),
            fetch(`https://api.themoviedb.org/3/trending/tv/week?api_key=${TMDB_API_KEY}`),
        ])

        if (!moviesRes.ok || !tvRes.ok) {
            console.error('    ❌ Failed to fetch trending data from TMDB')
            return
        }

        const moviesData = await moviesRes.json()
        const tvData = await tvRes.json()

        // Combine trending items (movies and TV)
        const allTrendingItems = [
            ...moviesData.results.slice(0, 4).map((m: any) => ({ ...m, media_type: 'movie' })),
            ...tvData.results.slice(0, 4).map((s: any) => ({ ...s, media_type: 'tv' })),
        ]

        // Limit to requested count
        const itemsToNotify = allTrendingItems.slice(0, count)

        console.log(`    🔔 Creating ${itemsToNotify.length} notifications for real trending items`)

        const userNotificationsRef = adminDb
            .collection('users')
            .doc(userId)
            .collection('notifications')
        const now = Date.now()

        // Create individual notification for each trending item
        for (let i = 0; i < itemsToNotify.length; i++) {
            const item = itemsToNotify[i]
            const title = item.title || item.name
            const mediaType = item.media_type === 'movie' ? 'movie' : 'tv'
            const notificationId = nanoid(12)

            const notification = {
                id: notificationId,
                type: 'trending_update',
                title: 'Now Trending! 🔥',
                message: `${title} is currently trending this week!`,
                contentId: item.id,
                mediaType: mediaType,
                imageUrl: item.poster_path
                    ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
                    : null,
                actionUrl: `/${mediaType}/${item.id}`,
                isRead: false,
                createdAt: now - i * 300000, // Spread 5 minutes apart
                expiresAt: now + 7 * 24 * 60 * 60 * 1000, // Expire after 7 days
                dismissedAt: null,
            }

            await userNotificationsRef.doc(notificationId).set(notification)
        }

        console.log(`    ✅ Created ${itemsToNotify.length} trending notifications`)
    } catch (error) {
        console.error('    ❌ Failed to create trending notifications:', error)
    }
}

/**
 * Seed forum threads using Admin SDK
 */
async function seedForumThreadsServerSide(
    adminDb: any,
    userId: string,
    userName: string,
    userAvatar: string | undefined,
    count: number
): Promise<void> {
    const { nanoid } = await import('nanoid')

    const threadTemplates = [
        {
            category: 'General',
            title: 'Welcome to the Community!',
            content: "Hey everyone! Let's discuss our favorite movies and TV shows here.",
        },
        {
            category: 'Movies',
            title: 'Best Action Movies of 2024',
            content: 'What are your top action movies this year? I loved the latest blockbusters!',
        },
        {
            category: 'TV Shows',
            title: 'Recommend me a new series',
            content: 'I just finished Stranger Things. What should I watch next?',
        },
        {
            category: 'Recommendations',
            title: 'Hidden Gems You Must Watch',
            content: 'Share those underrated movies that deserve more attention!',
        },
        {
            category: 'Rankings',
            title: 'How do you create your rankings?',
            content: "What's your process for ranking movies? Do you use specific criteria?",
        },
    ]

    for (let i = 0; i < count && i < threadTemplates.length; i++) {
        const template = threadTemplates[i]

        // Check if thread with this title already exists for this user
        const existingThread = await adminDb
            .collection('threads')
            .where('userId', '==', userId)
            .where('title', '==', template.title)
            .limit(1)
            .get()

        if (!existingThread.empty) {
            console.log(`    ⏭️  Skipping existing thread: ${template.title}`)
            continue
        }

        const threadId = nanoid(12)
        const now = Date.now()

        const thread = {
            id: threadId,
            userId,
            userName,
            userAvatar: userAvatar || null,
            category: template.category,
            title: template.title,
            content: template.content,
            likes: Math.floor(Math.random() * 20),
            replyCount: Math.floor(Math.random() * 10),
            views: Math.floor(Math.random() * 100),
            isPinned: i === 0, // Pin the first thread
            createdAt: now - i * 86400000, // Spread over days
            updatedAt: now - i * 86400000,
        }

        await adminDb.collection('threads').doc(threadId).set(thread)
        console.log(`    ✅ Created thread: ${thread.title}`)
    }
}

/**
 * Seed forum polls using Admin SDK
 */
async function seedForumPollsServerSide(
    adminDb: any,
    userId: string,
    userName: string,
    userAvatar: string | undefined,
    count: number
): Promise<void> {
    const { nanoid } = await import('nanoid')

    const pollTemplates = [
        {
            category: 'General',
            title: 'Favorite movie genre?',
            options: ['Action', 'Comedy', 'Drama', 'Sci-Fi', 'Horror'],
        },
        {
            category: 'Movies',
            title: 'Best superhero movie?',
            options: [
                'The Dark Knight',
                'Avengers: Endgame',
                'Spider-Man',
                'Iron Man',
                'Black Panther',
            ],
        },
        {
            category: 'TV Shows',
            title: 'Best TV series of all time?',
            options: ['Breaking Bad', 'Game of Thrones', 'The Sopranos', 'The Wire', 'Friends'],
        },
        {
            category: 'Recommendations',
            title: 'What should we watch this weekend?',
            options: [
                'New Release',
                'Classic Movie',
                'TV Series Marathon',
                'Documentary',
                'Indie Film',
            ],
        },
    ]

    for (let i = 0; i < count && i < pollTemplates.length; i++) {
        const template = pollTemplates[i]

        // Check if poll with this title already exists for this user
        const existingPoll = await adminDb
            .collection('polls')
            .where('userId', '==', userId)
            .where('title', '==', template.title)
            .limit(1)
            .get()

        if (!existingPoll.empty) {
            console.log(`    ⏭️  Skipping existing poll: ${template.title}`)
            continue
        }

        const pollId = nanoid(12)
        const now = Date.now()

        const poll = {
            id: pollId,
            userId,
            userName,
            userAvatar: userAvatar || null,
            category: template.category,
            title: template.title,
            options: template.options.map((option, idx) => ({
                id: `option_${idx}`,
                text: option,
                votes: Math.floor(Math.random() * 50), // Random vote counts
            })),
            totalVotes: Math.floor(Math.random() * 200),
            allowMultipleChoices: false,
            expiresAt: null,
            createdAt: now - i * 86400000, // Spread over days
            updatedAt: now - i * 86400000,
        }

        await adminDb.collection('polls').doc(pollId).set(poll)
        console.log(`    ✅ Created poll: ${poll.title}`)
    }
}
