import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getAdminDb } from '@/lib/firebase-admin'
import {
    detectRankingChanges,
    getRankingChangeMessage,
    filterWatchlistChanges,
    getTopChanges,
} from '@/utils/trendingRankingChanges'
import { getTrendingTitle } from '@/utils/trendingComparison'
import { validateAdminRequest } from '@/utils/adminMiddleware'

const TMDB_API_KEY = process.env.TMDB_API_KEY
const CRON_SECRET = process.env.CRON_SECRET

/**
 * Timing-safe comparison of cron secret tokens.
 * Prevents timing attacks by using constant-time comparison.
 */
function isValidCronSecret(token: string | null | undefined): boolean {
    if (!token || !CRON_SECRET) return false
    try {
        const encoder = new TextEncoder()
        const tokenBytes = encoder.encode(token)
        const secretBytes = encoder.encode(CRON_SECRET)
        if (tokenBytes.length !== secretBytes.length) return false
        return crypto.timingSafeEqual(tokenBytes, secretBytes)
    } catch {
        return false
    }
}

export async function GET(req: NextRequest) {
    try {
        // Auth check - allow cron or admin
        const authHeader = req.headers.get('authorization')
        const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : authHeader

        const isCron = isValidCronSecret(token)

        let isAdmin = false
        if (!isCron) {
            const authResult = await validateAdminRequest(req)
            isAdmin = authResult.authorized
        }

        if (!isCron && !isAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (!TMDB_API_KEY) {
            return NextResponse.json({ error: 'TMDB API key not configured' }, { status: 500 })
        }

        // Check for demo mode (admin only)
        const { searchParams } = new URL(req.url)
        const isDemoMode = searchParams.get('demo') === 'true' && isAdmin

        // Fetch current trending from TMDB
        const [moviesRes, tvRes] = await Promise.all([
            fetch(`https://api.themoviedb.org/3/trending/movie/week?api_key=${TMDB_API_KEY}`),
            fetch(`https://api.themoviedb.org/3/trending/tv/week?api_key=${TMDB_API_KEY}`),
        ])

        if (!moviesRes.ok || !tvRes.ok) {
            return NextResponse.json({ error: 'Failed to fetch TMDB data' }, { status: 500 })
        }

        const moviesData = await moviesRes.json()
        const tvData = await tvRes.json()

        // Get previous snapshot
        const db = getAdminDb()
        const trendingDoc = await db.doc('system/trending').get()
        const previousData = trendingDoc.data() || {}

        // Detect ranking changes (NEW LOGIC!)
        const movieChanges = detectRankingChanges(
            previousData.moviesSnapshot || [],
            moviesData.results,
            {
                minJumpPositions: 5,
                notifyTop10Entry: true,
                notifyTop5Entry: true,
                notifyNumberOne: true,
            }
        )

        const tvChanges = detectRankingChanges(previousData.tvSnapshot || [], tvData.results, {
            minJumpPositions: 5,
            notifyTop10Entry: true,
            notifyTop5Entry: true,
            notifyNumberOne: true,
        })

        const allChanges = [...movieChanges, ...tvChanges]

        console.log(
            `📊 [Trending v2] Found ${allChanges.length} ranking changes (${movieChanges.length} movies, ${tvChanges.length} TV)`
        )

        // Log change breakdown
        const changeTypes = {
            new: 0,
            big_jump: 0,
            entered_top_10: 0,
            entered_top_5: 0,
            reached_number_1: 0,
        }

        allChanges.forEach((change) => {
            changeTypes[change.changeType]++
        })

        console.log('📊 [Trending v2] Change breakdown:', changeTypes)

        // Create notifications for users
        let notificationCount = 0
        let skippedUsers = 0

        if (allChanges.length > 0) {
            const trendingTimestamp = previousData.lastRun || 0

            // Get all users
            const usersSnapshot = await db.collection('users').get()

            for (const userDoc of usersSnapshot.docs) {
                const userData = userDoc.data()
                const watchlist = userData.watchlist || []

                // Check if user has opted into trending notifications
                const trendingEnabled = userData.notifications?.types?.trending_update ?? false
                if (!trendingEnabled) {
                    skippedUsers++
                    continue
                }

                // Check if user has logged in since last trending update
                const lastLoginAt = userData.lastLoginAt || 0
                if (lastLoginAt >= trendingTimestamp) {
                    skippedUsers++
                    continue
                }

                // Filter changes to only include watchlist items
                const watchlistChanges = filterWatchlistChanges(allChanges, watchlist)

                if (watchlistChanges.length === 0) {
                    continue // No watchlist items changed
                }

                // Get top 3 most significant changes for this user
                const topChanges = getTopChanges(watchlistChanges, 3)

                // Create notifications for top changes
                for (const change of topChanges) {
                    const { title, message } = getRankingChangeMessage(change)
                    const isMovie = change.item.title !== undefined

                    await db.collection(`users/${userDoc.id}/notifications`).add({
                        type: 'trending_update',
                        title,
                        message,
                        contentId: change.item.id,
                        mediaType: isMovie ? 'movie' : 'tv',
                        imageUrl: change.item.poster_path
                            ? `https://image.tmdb.org/t/p/w92${change.item.poster_path}`
                            : null,
                        rankChange: change.rankChange,
                        newRank: change.newRank,
                        oldRank: change.oldRank,
                        changeType: change.changeType,
                        isRead: false,
                        createdAt: Date.now(),
                        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
                    })
                    notificationCount++
                }
            }
        }

        console.log(`📊 [Trending v2] Skipped ${skippedUsers} users (opted out or already seen)`)
        console.log(`📊 [Trending v2] Created ${notificationCount} notifications`)

        // Update snapshot
        await db.doc('system/trending').set({
            moviesSnapshot: moviesData.results,
            tvSnapshot: tvData.results,
            lastRun: Date.now(),
            lastChanges: allChanges.length,
            lastChangeTypes: changeTypes,
            totalNotifications: (previousData.totalNotifications || 0) + notificationCount,
            demoMode: isDemoMode,
            version: 2, // Mark as v2
        })

        return NextResponse.json({
            success: true,
            totalChanges: allChanges.length,
            changeBreakdown: changeTypes,
            notifications: notificationCount,
            demoMode: isDemoMode,
        })
    } catch (error) {
        console.error('📊 ❌ Trending v2 update error:', error)
        return NextResponse.json(
            {
                error: 'Failed to update trending',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}
