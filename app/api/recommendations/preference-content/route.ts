/**
 * Preference Content API
 *
 * POST /api/recommendations/preference-content
 * Returns top-rated content for users to rate in the preference customizer.
 * Mixes movies and TV shows for variety.
 */

import { NextRequest, NextResponse } from 'next/server'
import { Content } from '@/typings'

const TMDB_API_KEY = process.env.TMDB_API_KEY
const TMDB_BASE_URL = 'https://api.themoviedb.org/3'

interface RequestBody {
    excludeIds?: number[]
    limit?: number
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const body: RequestBody = await request.json()
        const excludeIds = new Set(body.excludeIds || [])
        const limit = Math.min(body.limit || 20, 50)

        // Fetch top-rated movies and TV shows in parallel
        const [moviesResponse, tvResponse] = await Promise.all([
            fetch(
                `${TMDB_BASE_URL}/movie/top_rated?api_key=${TMDB_API_KEY}&language=en-US&page=${Math.floor(Math.random() * 5) + 1}`
            ),
            fetch(
                `${TMDB_BASE_URL}/tv/top_rated?api_key=${TMDB_API_KEY}&language=en-US&page=${Math.floor(Math.random() * 5) + 1}`
            ),
        ])

        if (!moviesResponse.ok || !tvResponse.ok) {
            throw new Error('Failed to fetch content from TMDB')
        }

        const [moviesData, tvData] = await Promise.all([moviesResponse.json(), tvResponse.json()])

        // Process and tag content with media_type
        const movies: Content[] = (moviesData.results || []).map((m: Content) => ({
            ...m,
            media_type: 'movie',
        }))

        const tvShows: Content[] = (tvData.results || []).map((t: Content) => ({
            ...t,
            media_type: 'tv',
        }))

        // Combine and filter out excluded IDs
        const allContent = [...movies, ...tvShows].filter((content) => !excludeIds.has(content.id))

        // Shuffle for variety
        const shuffled = allContent.sort(() => Math.random() - 0.5)

        // Take requested limit
        const content = shuffled.slice(0, limit)

        return NextResponse.json({
            success: true,
            content,
            totalAvailable: shuffled.length,
        })
    } catch (error) {
        console.error('Error fetching preference content:', error)
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch content',
            },
            { status: 500 }
        )
    }
}
