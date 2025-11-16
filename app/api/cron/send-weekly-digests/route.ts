/**
 * Send Weekly Digest Emails
 * POST /api/cron/send-weekly-digests
 *
 * Runs weekly (Sundays at 6 PM) to send digest emails to users
 * Includes trending content, user stats, and personalized recommendations
 */

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getAdminDb } from '@/lib/firebase-admin'
import { Firestore } from 'firebase-admin/firestore'
import { EmailService } from '@/lib/email/email-service'
import { Content } from '@/typings'
import { apiLog, apiError, apiWarn } from '@/utils/debugLogger'

export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes for sending multiple emails

// Cache for TMDB data to avoid repeated API calls
let trendingCache: {
    movies: Content[]
    tvShows: Content[]
    fetchedAt: number
} | null = null

const CACHE_TTL = 60 * 60 * 1000 // 1 hour

export async function POST(request: NextRequest) {
    try {
        // Verify authorization
        const authHeader = request.headers.get('authorization')
        const cronSecret = process.env.CRON_SECRET

        if (!cronSecret) {
            apiError('[WeeklyDigest] CRON_SECRET is not configured')
            return NextResponse.json(
                { success: false, error: 'Cron secret is not configured' },
                { status: 500 }
            )
        }

        // Constant-time comparison
        const expectedHeader = `Bearer ${cronSecret}`

        if (!authHeader || authHeader.length !== expectedHeader.length) {
            apiWarn('[WeeklyDigest] Unauthorized attempt - invalid header format')
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const encoder = new TextEncoder()
        const authBuffer = encoder.encode(authHeader)
        const expectedBuffer = encoder.encode(expectedHeader)

        let isValid = false
        try {
            isValid = crypto.timingSafeEqual(authBuffer, expectedBuffer)
        } catch {
            isValid = false
        }

        if (!isValid) {
            apiWarn('[WeeklyDigest] Unauthorized attempt - invalid credentials')
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        apiLog('[WeeklyDigest] Starting weekly digest job...')

        // Get current date info
        const now = new Date()
        const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        const weekStartStr = weekStart.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
        })
        const weekEndStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

        // Fetch trending content
        const trendingContent = await fetchTrendingContent()

        const db = getAdminDb()

        // Get all users with weekly digest enabled
        const eligibleUsers = await getEligibleUsers(db)

        apiLog(`[WeeklyDigest] Found ${eligibleUsers.length} eligible users`)

        let successCount = 0
        let errorCount = 0
        const errors: string[] = []

        // Send digest to each user
        for (const user of eligibleUsers) {
            try {
                await sendUserDigest(db, user, trendingContent, weekStartStr, weekEndStr)
                successCount++
            } catch (error) {
                const errorMsg = `Error sending digest to ${user.id}: ${error instanceof Error ? error.message : 'Unknown'}`
                apiError(errorMsg)
                errors.push(errorMsg)
                errorCount++
            }
        }

        apiLog('[WeeklyDigest] Weekly digest job complete', {
            successCount,
            errorCount,
        })

        return NextResponse.json({
            success: true,
            stats: {
                usersProcessed: eligibleUsers.length,
                emailsSent: successCount,
                errors: errorCount,
            },
            errors: errors.length > 0 ? errors : undefined,
        })
    } catch (error) {
        apiError('[WeeklyDigest] Fatal error:', error)
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}

/**
 * Get users eligible for weekly digest
 */
async function getEligibleUsers(db: Firestore): Promise<any[]> {
    try {
        const usersSnapshot = await db.collection('users').get()
        const eligible: any[] = []

        for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data()
            const notificationPrefs = userData.notificationPreferences

            // Check if user has email enabled and weekly digest enabled
            if (
                notificationPrefs?.email === true &&
                notificationPrefs?.emailDigest === 'weekly' &&
                userData.profile?.email
            ) {
                eligible.push({
                    id: userDoc.id,
                    email: userData.profile.email,
                    username: userData.profile.username || 'User',
                    data: userData,
                })
            }
        }

        return eligible
    } catch (error) {
        apiError('[WeeklyDigest] Error getting eligible users:', error)
        return []
    }
}

/**
 * Send digest email to a single user
 */
async function sendUserDigest(
    db: Firestore,
    user: any,
    trendingContent: { movies: Content[]; tvShows: Content[] },
    weekStart: string,
    weekEnd: string
): Promise<void> {
    try {
        // Get user stats
        const userDoc = await db.collection('users').doc(user.id).get()
        const userData = userDoc.data()

        const watchlistCount = userData?.defaultWatchlist?.length || 0
        const customRows = userData?.customRows || {}
        const collectionsCount = Object.keys(customRows).length

        // Count new rankings created this week
        const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
        const rankingsSnapshot = await db
            .collection('rankings')
            .where('userId', '==', user.id)
            .where('createdAt', '>=', oneWeekAgo)
            .get()

        const newRankings = rankingsSnapshot.size

        // Get total interactions (simplified - just count)
        const totalInteractions = 0 // Could query interactions collection if needed

        // Get collection updates (collections with new content this week)
        const collectionUpdates: Array<{ name: string; id: string; newItemsCount: number }> = []

        for (const [rowId, row] of Object.entries(customRows)) {
            const rowData = row as any
            if (rowData.lastUpdateCount && rowData.lastUpdateCount > 0) {
                collectionUpdates.push({
                    name: rowData.name,
                    id: rowId,
                    newItemsCount: rowData.lastUpdateCount,
                })
            }
        }

        // Get recommendations (use trending as fallback)
        const recommendations = trendingContent.movies.slice(0, 3)

        // Get community highlights (top rankings this week)
        const communitySnapshot = await db
            .collection('rankings')
            .where('isPublic', '==', true)
            .where('createdAt', '>=', oneWeekAgo)
            .orderBy('createdAt', 'desc')
            .orderBy('likes', 'desc')
            .limit(3)
            .get()

        const communityHighlights = communitySnapshot.docs.map((doc) => {
            const data = doc.data()
            return {
                type: 'ranking' as const,
                title: data.title,
                author: data.userName || 'Anonymous',
                engagement: data.likes || 0,
            }
        })

        // Send email
        await EmailService.sendWeeklyDigest({
            to: user.email,
            userName: user.username,
            weekStart,
            weekEnd,
            stats: {
                watchlistCount,
                collectionsCount,
                newRankings,
                totalInteractions,
            },
            trendingContent,
            recommendations,
            collectionUpdates: collectionUpdates.slice(0, 5),
            communityHighlights,
        })

        apiLog(`[WeeklyDigest] Sent digest to ${user.email}`)
    } catch (error) {
        apiError(`[WeeklyDigest] Error sending digest to ${user.id}:`, error)
        throw error
    }
}

/**
 * Fetch trending content from TMDB
 */
async function fetchTrendingContent(): Promise<{ movies: Content[]; tvShows: Content[] }> {
    // Return cached data if fresh
    if (trendingCache && Date.now() - trendingCache.fetchedAt < CACHE_TTL) {
        return {
            movies: trendingCache.movies,
            tvShows: trendingCache.tvShows,
        }
    }

    const TMDB_API_KEY = process.env.TMDB_API_KEY
    const TMDB_BASE_URL = 'https://api.themoviedb.org/3'

    if (!TMDB_API_KEY) {
        apiError('[WeeklyDigest] TMDB_API_KEY not configured')
        return { movies: [], tvShows: [] }
    }

    try {
        const [moviesRes, tvRes] = await Promise.all([
            fetch(`${TMDB_BASE_URL}/trending/movie/week?api_key=${TMDB_API_KEY}`),
            fetch(`${TMDB_BASE_URL}/trending/tv/week?api_key=${TMDB_API_KEY}`),
        ])

        const moviesData = await moviesRes.json()
        const tvData = await tvRes.json()

        const movies = (moviesData.results || []).map((item: any) => ({
            ...item,
            media_type: 'movie' as const,
        }))

        const tvShows = (tvData.results || []).map((item: any) => ({
            ...item,
            media_type: 'tv' as const,
        }))

        // Update cache
        trendingCache = {
            movies,
            tvShows,
            fetchedAt: Date.now(),
        }

        return { movies, tvShows }
    } catch (error) {
        apiError('[WeeklyDigest] Error fetching trending content:', error)
        return { movies: [], tvShows: [] }
    }
}

/**
 * Manual trigger for testing (GET request)
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const secret = searchParams.get('secret')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret || secret !== cronSecret) {
        return NextResponse.json({ success: false, error: 'Invalid secret' }, { status: 401 })
    }

    // Forward to POST handler
    return POST(request)
}
