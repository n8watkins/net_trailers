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
        likedCount = 10,
        hiddenCount = 5,
        watchLaterCount = 12,
        watchHistoryCount = 15,
        createCollections = true,
        rankingCount = 3,
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
        // Add basic collections logic here if needed
        // For now, skip to keep the seed fast
    }

    // 6. Seed rankings (if requested)
    if (rankingCount > 0) {
        console.log(`  🏆 Creating ${rankingCount} sample rankings...`)
        await seedRankingsServerSide(adminDb, userId, userName, userAvatar, rankingCount)
    }

    console.log('✨ Server-side seed complete for user:', userId)
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
