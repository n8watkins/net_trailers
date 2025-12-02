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
        watchHistoryCount = 20, // Match client-side
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

    // 4. Seed watch history
    if (watchHistoryCount > 0) {
        console.log(`  🕐 Adding ${watchHistoryCount} watch history items`)
        const watchHistory = getShuffledContentSlice(contentIndex, watchHistoryCount).map(
            (content, index) => ({
                content,
                watchedAt: Date.now() - (watchHistoryCount - index) * 86400000, // Spread over days
            })
        )

        const historyRef = userRef.collection('data').doc('watchHistory')
        await historyRef.set({
            history: watchHistory,
            updatedAt: Date.now(),
        })
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

    for (const template of collectionTemplates) {
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

        // Store in subcollection
        await userRef.collection('customRows').doc(collectionId).set(collection)
        console.log(`    ✅ Created collection: ${collection.name} (${items.length} items)`)
    }
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
            title: rankingTitles[i],
            description: `My personal ranking of ${rankingTitles[i].toLowerCase()}`,
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

    for (let i = 0; i < count; i++) {
        const notifType = notificationTypes[i % notificationTypes.length]
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
    }
    console.log(`    ✅ Created ${count} notifications`)
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
