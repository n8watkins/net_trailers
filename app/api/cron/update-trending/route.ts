import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getAdminDb } from '@/lib/firebase-admin'
import { compareTrendingContent, getTrendingTitle } from '@/utils/trendingComparison'
import { validateAdminRequest } from '@/utils/adminMiddleware'
import { EmailService } from '@/lib/email/email-service'
import { Content } from '@/typings'

const TMDB_API_KEY = process.env.TMDB_API_KEY
const CRON_SECRET = process.env.CRON_SECRET

/**
 * Timing-safe comparison of cron secret tokens.
 * Prevents timing attacks by using constant-time comparison.
 */
function isValidCronSecret(token: string | null | undefined): boolean {
    if (!token || !CRON_SECRET) return false
    try {
        // Use TextEncoder for consistent UTF-8 encoding
        const encoder = new TextEncoder()
        const tokenBytes = encoder.encode(token)
        const secretBytes = encoder.encode(CRON_SECRET)
        // Lengths must match for timingSafeEqual
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

        // Check if it's a cron request (timing-safe comparison)
        const isCron = isValidCronSecret(token)

        // Check if it's an admin request via Firebase Auth
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

        let newMovies = []
        let newShows = []

        if (isDemoMode) {
            // Demo mode: Always find at least one new item
            console.log('📊 [Trending] Running in DEMO mode')
            newMovies = moviesData.results.slice(0, 1)
            newShows = tvData.results.slice(0, 1)
        } else {
            // Production mode: Real comparison
            newMovies = compareTrendingContent(
                previousData.moviesSnapshot || [],
                moviesData.results
            )
            newShows = compareTrendingContent(previousData.tvSnapshot || [], tvData.results)
        }

        console.log(
            `📊 [Trending] Found ${newMovies.length} new movies, ${newShows.length} new shows`
        )

        // Create notifications and send emails for users (Weekly Digest)
        let notificationCount = 0
        let emailsSent = 0
        let skippedUsers = 0

        if (newMovies.length > 0 || newShows.length > 0) {
            // Get timestamp when trending data was last fetched
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

                // For weekly digest: skip login time check
                // We want to send emails even if users have been active

                // Check if user has any new trending items in watchlist
                const matchingMovies = newMovies.filter((movie: any) =>
                    watchlist.some(
                        (item: any) => item.id === movie.id && item.media_type === 'movie'
                    )
                )
                const matchingShows = newShows.filter((show: any) =>
                    watchlist.some((item: any) => item.id === show.id && item.media_type === 'tv')
                )

                // Create notifications for matches (max 3 per user)
                const totalMatches = [...matchingMovies, ...matchingShows].slice(0, 3)

                if (totalMatches.length > 0) {
                    // Create in-app notifications
                    for (const item of totalMatches) {
                        const isMovie = item.title !== undefined
                        const title = getTrendingTitle(item)

                        await db.collection(`users/${userDoc.id}/notifications`).add({
                            type: 'trending_update',
                            title: 'Now Trending!',
                            message: `${title} is trending this week`,
                            contentId: item.id,
                            mediaType: isMovie ? 'movie' : 'tv',
                            imageUrl: item.poster_path
                                ? `https://image.tmdb.org/t/p/w92${item.poster_path}`
                                : null,
                            isRead: false,
                            createdAt: Date.now(),
                            expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
                        })
                        notificationCount++
                    }

                    // Send weekly digest email if user has opted into email notifications
                    const emailEnabled = userData.notifications?.email ?? false
                    if (emailEnabled && userData.email) {
                        try {
                            // Prepare trending content for email (top 5 of each)
                            const trendingMovies = moviesData.results.slice(0, 5).map((m: any) => ({
                                ...m,
                                media_type: 'movie' as const,
                            }))
                            const trendingShows = tvData.results.slice(0, 5).map((s: any) => ({
                                ...s,
                                media_type: 'tv' as const,
                            }))

                            await EmailService.sendTrendingContent({
                                to: userData.email,
                                userName: userData.displayName || userData.email.split('@')[0],
                                movies: trendingMovies as Content[],
                                tvShows: trendingShows as Content[],
                            })
                            emailsSent++
                            console.log(
                                `📧 [Trending] Sent email to ${userData.email} (${totalMatches.length} matches)`
                            )
                        } catch (emailError) {
                            console.error(
                                `📧 ❌ [Trending] Failed to send email to ${userData.email}:`,
                                emailError
                            )
                        }
                    }
                }
            }
        }

        console.log(`📊 [Trending] Skipped ${skippedUsers} users (opted out or already seen)`)
        console.log(`📊 [Trending] Created ${notificationCount} notifications`)
        console.log(`📧 [Trending] Sent ${emailsSent} weekly digest emails`)

        // Update snapshot
        await db.doc('system/trending').set({
            moviesSnapshot: moviesData.results,
            tvSnapshot: tvData.results,
            lastRun: Date.now(),
            lastNewItems: newMovies.length + newShows.length,
            totalNotifications: (previousData.totalNotifications || 0) + notificationCount,
            demoMode: isDemoMode,
        })

        return NextResponse.json({
            success: true,
            newItems: newMovies.length + newShows.length,
            notifications: notificationCount,
            emailsSent,
            demoMode: isDemoMode,
        })
    } catch (error) {
        console.error('📊 ❌ Trending update error:', error)
        return NextResponse.json(
            {
                error: 'Failed to update trending',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}
