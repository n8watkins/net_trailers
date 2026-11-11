import { NextRequest, NextResponse } from 'next/server'
import { EmailService } from '../../../../lib/email/email-service'
import { Content } from '../../../../typings'
import { withAuth } from '../../../../lib/auth-middleware'
import { apiError, apiWarn } from '@/utils/debugLogger'
import { generateUnsubscribeToken } from '@/lib/email/unsubscribe-token'
import { isCurrentUserAdmin } from '@/db/queries/_helpers'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { users } from '@/db/schema'
import { EmailLimitError } from '@/lib/email/gate'
import { readLimit } from '@/lib/durableLimit'

const TMDB_API_KEY = process.env.TMDB_API_KEY
const TMDB_BASE_URL = 'https://api.themoviedb.org/3'
const EMAIL_RATE_LIMIT = readLimit('PILOT_EMAIL_MAX_PER_DAY', 3)

/**
 * Fetch trending content from TMDB
 */
async function fetchTrendingContent(): Promise<{ movies: Content[]; tvShows: Content[] }> {
    try {
        // TMDB API v3 requires authentication via api_key query parameter
        const [moviesRes, tvRes] = await Promise.all([
            fetch(`${TMDB_BASE_URL}/trending/movie/week?api_key=${TMDB_API_KEY}`),
            fetch(`${TMDB_BASE_URL}/trending/tv/week?api_key=${TMDB_API_KEY}`),
        ])

        const moviesData = await moviesRes.json()
        const tvData = await tvRes.json()

        return {
            movies: (moviesData.results || []).map((item: any) => ({
                ...item,
                media_type: 'movie' as const,
            })),
            tvShows: (tvData.results || []).map((item: any) => ({
                ...item,
                media_type: 'tv' as const,
            })),
        }
    } catch (error) {
        apiError('Error fetching trending content:', error)
        return { movies: [], tvShows: [] }
    }
}

/**
 * POST /api/email/send-pilot
 *
 * Send a pilot email with trending content (ADMIN ONLY - sends to admin's email)
 */
async function handleSendPilot(request: NextRequest, userId: string): Promise<NextResponse> {
    try {
        // ADMIN ONLY: identity comes from the Auth.js session (ADMIN_EMAILS),
        // not the removed ADMIN_UID env var.
        if (!(await isCurrentUserAdmin())) {
            console.error('[PilotEmail] User is not admin:', userId)
            return NextResponse.json(
                { error: 'Forbidden - Admin access required' },
                { status: 403 }
            )
        }

        const body = (await request.json().catch(() => ({}))) as { userName?: unknown }
        const userName = typeof body.userName === 'string' ? body.userName : ''

        // ADMIN ONLY: the pilot goes to the admin's own address, never to one
        // taken from the request.
        const [admin] = await db
            .select({ email: users.email })
            .from(users)
            .where(eq(users.id, userId))
            .limit(1)
        const email = admin?.email
        if (!email) {
            return NextResponse.json(
                { error: 'Your account has no email address' },
                { status: 400 }
            )
        }

        // Fetch trending content
        const { movies, tvShows } = await fetchTrendingContent()

        if (movies.length === 0 && tvShows.length === 0) {
            return NextResponse.json(
                { error: 'Unable to fetch trending content at this time' },
                { status: 500 }
            )
        }

        // Generate unsubscribe token for this user
        let unsubscribeToken: string | undefined
        try {
            unsubscribeToken = await generateUnsubscribeToken(userId)
        } catch (error) {
            apiWarn('[PilotEmail] Failed to generate unsubscribe token:', error)
            // Continue without token - email will link to settings page instead
        }

        // Through the email gate, with a durable daily limit for pilots.
        let emailResult: { id: string | null } | null
        try {
            emailResult = await EmailService.sendTrendingContent(
                { to: email, userName, movies, tvShows, unsubscribeToken },
                [{ key: `email:pilot:${userId}`, limit: EMAIL_RATE_LIMIT, window: 'day' }]
            )
        } catch (sendError) {
            if (sendError instanceof EmailLimitError) {
                return NextResponse.json(
                    { error: 'Pilot email limit reached. Try again later.' },
                    { status: 429 }
                )
            }
            apiError('Error sending email:', sendError)
            return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
        }

        if (!emailResult) {
            apiWarn('[PilotEmail] Email service unavailable - skipping send')
        }

        return NextResponse.json({
            success: true,
            message: emailResult
                ? 'Pilot email sent successfully'
                : 'Email service unavailable; pilot email skipped',
            emailSent: Boolean(emailResult),
            emailId: emailResult?.id,
        })
    } catch (error) {
        apiError('Error in send-pilot route:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export const POST = withAuth(handleSendPilot)
