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

        // Verify user exists
        try {
            const adminDb = getAdminDb()
            const userDoc = await adminDb.collection('users').doc(userId).get()
            if (!userDoc.exists) {
                return NextResponse.json({ error: 'User not found' }, { status: 404 })
            }
        } catch (error) {
            console.error('Error verifying user:', error)
            return NextResponse.json({ error: 'Failed to verify user' }, { status: 500 })
        }

        console.log('🌱 Starting server-side seed for user:', userId)

        // Start seeding in the background (fire and forget)
        // This allows the response to return immediately while seeding continues
        seedUserDataServerSide(userId, options).catch((error) => {
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
        const content = getShuffledContentSlice(contentIndex, watchHistoryCount)
        const now = Date.now()

        // Define viewing schedule (same as client-side)
        const viewingSchedule: Array<{ daysAgo: number; entriesCount: number }> = [
            { daysAgo: 0, entriesCount: 8 }, // Today: 8 entries
            { daysAgo: 1, entriesCount: 6 }, // Yesterday: 6 entries
            { daysAgo: 2, entriesCount: 5 }, // 2 days ago: 5 entries
            { daysAgo: 3, entriesCount: 4 }, // 3 days ago: 4 entries
            { daysAgo: 5, entriesCount: 3 }, // 5 days ago: 3 entries
            { daysAgo: 7, entriesCount: 3 }, // 1 week ago: 3 entries
            { daysAgo: 10, entriesCount: 2 }, // 10 days ago: 2 entries
            { daysAgo: 14, entriesCount: 2 }, // 2 weeks ago: 2 entries
            { daysAgo: 20, entriesCount: 2 }, // ~3 weeks ago: 2 entries
            { daysAgo: 28, entriesCount: 2 }, // 4 weeks ago: 2 entries
            { daysAgo: 35, entriesCount: 1 }, // 5 weeks ago: 1 entry
            { daysAgo: 42, entriesCount: 1 }, // 6 weeks ago: 1 entry
            { daysAgo: 50, entriesCount: 1 }, // ~7 weeks ago: 1 entry
            { daysAgo: 58, entriesCount: 1 }, // ~8 weeks ago: 1 entry
        ]

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
            userUsername: userName.toLowerCase().replace(/\s+/g, '_'),
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
    }
}

/**
 * Seed notifications using Admin SDK
 */
async function seedNotificationsServerSide(
    adminDb: any,
    userId: string,
    count: number
): Promise<void> {
    const { nanoid } = await import('nanoid')

    const notificationTypes = [
        {
            type: 'trending',
            title: 'Content Trending',
            message: 'A movie in your watchlist is trending!',
        },
        { type: 'system', title: 'New Feature', message: 'Check out our new ranking system!' },
        {
            type: 'collection_shared',
            title: 'Collection Shared',
            message: 'Someone shared a collection with you',
        },
        {
            type: 'ranking_comment',
            title: 'New Comment',
            message: 'Someone commented on your ranking',
        },
        { type: 'ranking_like', title: 'New Like', message: 'Someone liked your ranking' },
    ]

    const userNotificationsRef = adminDb.collection('users').doc(userId).collection('notifications')

    // Get existing notifications to avoid duplicates
    const existingNotifications = await userNotificationsRef.get()
    const existingNotificationKeys = new Set(
        existingNotifications.docs.map((doc) => {
            const data = doc.data()
            return `${data.type}:${data.title}`
        })
    )

    let createdCount = 0
    for (let i = 0; i < count; i++) {
        const notifType = notificationTypes[i % notificationTypes.length]
        const notificationKey = `${notifType.type}:${notifType.title}`

        // Check if notification with this type and title already exists
        if (existingNotificationKeys.has(notificationKey)) {
            console.log(`    ⏭️  Skipping existing notification: ${notifType.title}`)
            continue
        }

        const notificationId = nanoid(12)
        const now = Date.now()

        const notification = {
            id: notificationId,
            type: notifType.type,
            title: notifType.title,
            message: notifType.message,
            read: i > count / 2, // First half unread, second half read
            createdAt: now - i * 3600000, // Spread over hours
            dismissedAt: null,
        }

        await userNotificationsRef.doc(notificationId).set(notification)
        existingNotificationKeys.add(notificationKey) // Track this to avoid duplicates in same batch
        createdCount++
    }
    console.log(`    ✅ Created ${createdCount} notifications`)
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
