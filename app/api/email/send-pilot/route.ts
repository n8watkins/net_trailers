import { NextRequest, NextResponse } from 'next/server'
import { resend } from '../../../../lib/email/resend'
import { TrendingContentEmail } from '../../../../lib/email/templates/trending-content'
import { Content } from '../../../../typings'

const TMDB_API_KEY = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY
const TMDB_BASE_URL = 'https://api.themoviedb.org/3'

/**
 * Fetch trending content from TMDB
 */
async function fetchTrendingContent(): Promise<{ movies: Content[]; tvShows: Content[] }> {
    try {
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
        console.error('Error fetching trending content:', error)
        return { movies: [], tvShows: [] }
    }
}

/**
 * POST /api/email/send-pilot
 *
 * Send a pilot email with trending content
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { email, userName } = body

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 })
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
            return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
        }

        // Fetch trending content
        const { movies, tvShows } = await fetchTrendingContent()

        if (movies.length === 0 && tvShows.length === 0) {
            return NextResponse.json(
                { error: 'Unable to fetch trending content at this time' },
                { status: 500 }
            )
        }

        // Send email using Resend
        const { data, error } = await resend.emails.send({
            from: 'Net Trailers <onboarding@resend.dev>', // Use your verified domain
            to: email,
            subject: '🎬 This Week\'s Trending Movies & TV Shows',
            react: TrendingContentEmail({
                userName: userName || '',
                movies,
                tvShows,
            }),
        })

        if (error) {
            console.error('Error sending email:', error)
            return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            message: 'Pilot email sent successfully',
            emailId: data?.id,
        })
    } catch (error) {
        console.error('Error in send-pilot route:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
