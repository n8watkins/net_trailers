import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { validateAdminRequest } from '@/utils/adminMiddleware'
import { EmailService } from '@/lib/email/email-service'
import { Content } from '@/typings'
import { generateUnsubscribeToken } from '@/lib/email/unsubscribe-token'
import { db } from '@/db'
import { users, userPreferences } from '@/db/schema'
import { createNotification } from '@/db/queries/notifications'
import { getAdminUserId } from '@/db/queries/_helpers'

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

        // Check if it's an admin request via Auth.js session
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

        console.log('📊 [Trending] Starting weekly trending digest')

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

        console.log(
            `📊 [Trending] Fetched ${moviesData.results.length} movies, ${tvData.results.length} TV shows`
        )

        // Check if admin-only mode is enabled via query parameter
        const { searchParams } = new URL(req.url)
        const adminOnlyParam = searchParams.get('adminOnly')
        const adminOnly = adminOnlyParam === 'true'

        // Resolve the admin's Turso id from ADMIN_GITHUB_LOGIN (the old ADMIN_UID
        // env var was removed in the Firebase→Turso migration).
        const adminUserId = adminOnly ? await getAdminUserId() : null

        if (adminOnly) {
            console.log(`📊 [Trending] Running in ADMIN-ONLY mode`)
        } else {
            console.log(`📊 [Trending] Running in ALL USERS mode`)
        }

        // -----------------------------------------------------------------------
        // Enumerate all users from Turso/Drizzle.
        // We need: id, email, name from `users` table, and notification prefs
        // from the `userPreferences.data` JSON blob.
        // -----------------------------------------------------------------------
        const allUsers = await db.select().from(users)
        const allPrefs = await db.select().from(userPreferences)

        // Build a fast lookup map: userId -> preferences data
        const prefsMap = new Map(allPrefs.map((row) => [row.userId, row.data]))

        // Send weekly digest emails to all opted-in users
        let emailsSent = 0
        let skippedUsers = 0

        for (const user of allUsers) {
            const userId = user.id

            // ADMIN ONLY MODE: Skip all users except admin
            if (adminOnly && (!adminUserId || userId !== adminUserId)) {
                console.log(`📊 [Trending] Skipping non-admin user: ${userId}`)
                skippedUsers++
                continue
            }

            const prefs = prefsMap.get(userId)

            // Check if user has opted into trending notifications AND email
            const trendingEnabled = prefs?.notifications?.types?.trending_update ?? false
            const emailEnabled = prefs?.notifications?.email ?? false

            if (!trendingEnabled || !emailEnabled || !user.email) {
                skippedUsers++
                continue
            }

            try {
                // Generate unsubscribe token for this user
                let unsubscribeToken: string | undefined
                try {
                    unsubscribeToken = await generateUnsubscribeToken(userId)
                } catch (tokenError) {
                    console.warn(
                        `⚠️  [Trending] Failed to generate unsubscribe token for ${userId}:`,
                        tokenError
                    )
                    // Continue without token - email will link to settings page instead
                }

                // Prepare trending content for email (top 5 of each)
                const trendingMovies = moviesData.results.slice(0, 5).map((m: any) => ({
                    ...m,
                    media_type: 'movie' as const,
                }))
                const trendingShows = tvData.results.slice(0, 5).map((s: any) => ({
                    ...s,
                    media_type: 'tv' as const,
                }))

                const displayName = user.name || user.email.split('@')[0]

                await EmailService.sendTrendingContent({
                    to: user.email,
                    userName: displayName,
                    movies: trendingMovies as Content[],
                    tvShows: trendingShows as Content[],
                    unsubscribeToken,
                })
                emailsSent++
                console.log(`📧 [Trending] Sent email to ${user.email}`)
            } catch (emailError) {
                console.error(`📧 ❌ [Trending] Failed to send email to ${user.email}:`, emailError)
            }
        }

        console.log(`📊 [Trending] Skipped ${skippedUsers} users (opted out or no email)`)
        console.log(`📧 [Trending] Sent ${emailsSent} weekly digest emails`)

        // Create in-app notifications for all users with trending notifications enabled
        console.log('🔔 [Trending] Creating in-app notifications...')
        let notificationsCreated = 0
        let notificationsSkipped = 0

        // Prepare top trending items (top 3 movies + top 3 TV shows)
        const topMovies = moviesData.results.slice(0, 3)
        const topShows = tvData.results.slice(0, 3)
        const allTrendingItems = [
            ...topMovies.map((m: any) => ({ ...m, media_type: 'movie' })),
            ...topShows.map((s: any) => ({ ...s, media_type: 'tv' })),
        ]

        console.log(`🔔 [Trending] Will notify about ${allTrendingItems.length} trending items`)

        for (const user of allUsers) {
            const userId = user.id

            // ADMIN ONLY MODE: Skip all users except admin
            if (adminOnly && (!adminUserId || userId !== adminUserId)) {
                continue
            }

            const prefs = prefsMap.get(userId)

            // Check if user has in-app trending notifications enabled
            const trendingEnabled = prefs?.notifications?.types?.trending_update ?? false

            if (!trendingEnabled) {
                notificationsSkipped++
                continue
            }

            try {
                // Create individual notification for each trending item using the
                // Drizzle-backed createNotification (direct DB write, not an HTTP call)
                for (const item of allTrendingItems) {
                    const title = item.title || item.name
                    const mediaType = item.media_type === 'movie' ? 'movie' : 'tv'

                    await createNotification(userId, {
                        type: 'trending_update',
                        title: 'Now Trending! 🔥',
                        message: `${title} is currently trending this week!`,
                        contentId: item.id,
                        mediaType: mediaType,
                        imageUrl: item.poster_path
                            ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
                            : undefined,
                        actionUrl: `/${mediaType}/${item.id}`,
                        expiresIn: 7, // Expire after 7 days
                    })

                    notificationsCreated++

                    // Small delay between notifications to avoid rate limiting
                    await new Promise((resolve) => setTimeout(resolve, 50))
                }

                console.log(
                    `🔔 [Trending] Created ${allTrendingItems.length} notifications for user ${userId}`
                )
            } catch (notifError) {
                console.error(
                    `🔔 ❌ [Trending] Failed to create notifications for ${userId}:`,
                    notifError
                )
            }
        }

        console.log(`🔔 [Trending] Created ${notificationsCreated} total in-app notifications`)
        console.log(`🔔 [Trending] Skipped ${notificationsSkipped} users (trending disabled)`)

        return NextResponse.json({
            success: true,
            emailsSent,
            notificationsCreated,
            totalUsers: allUsers.length,
            skippedUsers,
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
