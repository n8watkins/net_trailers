import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getAdminDb } from '@/lib/firebase-admin'
import { validateAdminRequest } from '@/utils/adminMiddleware'
import { EmailService } from '@/lib/email/email-service'
import { Content } from '@/typings'
import { generateUnsubscribeToken } from '../../email/unsubscribe/route'

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

        // Send weekly digest emails to all opted-in users
        let emailsSent = 0
        let skippedUsers = 0

        const db = getAdminDb()
        const usersSnapshot = await db.collection('users').get()

        for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data()

            // Check if user has opted into trending notifications AND email
            const trendingEnabled = userData.notifications?.types?.trending_update ?? false
            const emailEnabled = userData.notifications?.email ?? false

            if (!trendingEnabled || !emailEnabled || !userData.email) {
                skippedUsers++
                continue
            }

            try {
                // Generate unsubscribe token for this user
                let unsubscribeToken: string | undefined
                try {
                    unsubscribeToken = await generateUnsubscribeToken(userDoc.id)
                } catch (tokenError) {
                    console.warn(
                        `⚠️  [Trending] Failed to generate unsubscribe token for ${userDoc.id}:`,
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

                await EmailService.sendTrendingContent({
                    to: userData.email,
                    userName: userData.displayName || userData.email.split('@')[0],
                    movies: trendingMovies as Content[],
                    tvShows: trendingShows as Content[],
                    unsubscribeToken,
                })
                emailsSent++
                console.log(`📧 [Trending] Sent email to ${userData.email}`)
            } catch (emailError) {
                console.error(
                    `📧 ❌ [Trending] Failed to send email to ${userData.email}:`,
                    emailError
                )
            }
        }

        console.log(`📊 [Trending] Skipped ${skippedUsers} users (opted out or no email)`)
        console.log(`📧 [Trending] Sent ${emailsSent} weekly digest emails`)

        // Update snapshot for reference
        await db.doc('system/trending').set({
            moviesSnapshot: moviesData.results,
            tvSnapshot: tvData.results,
            lastRun: Date.now(),
            emailsSent,
        })

        return NextResponse.json({
            success: true,
            emailsSent,
            totalUsers: usersSnapshot.size,
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
