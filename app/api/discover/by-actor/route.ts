import { NextRequest, NextResponse } from 'next/server'
import { apiError } from '../../../../utils/debugLogger'
import { childSafetyForRequest } from '@/lib/childSafetyServer'
import { filterWhenChildSafe } from '@/utils/childSafetyFilter'
import { CHILD_SAFE_DISCOVER_QUERY } from '@/utils/childSafetyRule'

const API_KEY = process.env.TMDB_API_KEY
const BASE_URL = 'https://api.themoviedb.org/3'

// Cache this route for 1 hour
export const revalidate = 3600

export async function GET(request: NextRequest) {
    if (!API_KEY) {
        return NextResponse.json({ message: 'TMDB API key not configured' }, { status: 500 })
    }

    try {
        const searchParams = request.nextUrl.searchParams
        const actorId = searchParams.get('actorId')
        const mediaType = searchParams.get('mediaType') || 'both' // 'movie', 'tv', or 'both'
        // The server decides (lib/childSafetyServer.ts); the parameter can only add filtering.
        const childSafetyMode = await childSafetyForRequest(request)

        if (!actorId) {
            return NextResponse.json({ message: 'actorId is required' }, { status: 400 })
        }

        // Validate and sanitize page parameter (1-500 as per TMDB limits)
        const rawPage = searchParams.get('page') || '1'
        const parsedPage = parseInt(rawPage, 10)
        const pageNumber = Math.max(1, Math.min(500, isNaN(parsedPage) ? 1 : parsedPage))

        // Sort by popularity by default
        const sortBy = searchParams.get('sort_by') || 'popularity.desc'

        const results: Array<{ media_type: string; [key: string]: unknown }> = []
        let totalResults = 0

        // Child Safety Mode: a prefilter only; every title still passes the rule below.
        const movieFilter = childSafetyMode ? CHILD_SAFE_DISCOVER_QUERY : '&include_adult=false'

        // Fetch movies with this actor
        if (mediaType === 'movie' || mediaType === 'both') {
            const movieUrl = `${BASE_URL}/discover/movie?api_key=${API_KEY}&language=en-US&page=${pageNumber}&with_people=${actorId}&sort_by=${sortBy}${movieFilter}`

            const movieResponse = await fetch(movieUrl)
            if (movieResponse.ok) {
                const movieData = await movieResponse.json()
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const movies = movieData.results.map((item: any) => ({
                    ...item,
                    media_type: 'movie',
                }))
                results.push(...movies)
                totalResults += movieData.total_results
            }
        }

        // Fetch TV shows with this actor
        if (mediaType === 'tv' || mediaType === 'both') {
            const tvUrl = `${BASE_URL}/discover/tv?api_key=${API_KEY}&language=en-US&page=${pageNumber}&with_people=${actorId}&sort_by=${sortBy}&include_adult=false`

            const tvResponse = await fetch(tvUrl)
            if (tvResponse.ok) {
                const tvData = await tvResponse.json()
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const tvShows = tvData.results.map((item: any) => ({
                    ...item,
                    media_type: 'tv',
                }))
                results.push(...tvShows)
                totalResults += tvData.total_results
            }
        }

        // Sort combined results by popularity
        results.sort((a, b) => ((b.popularity as number) || 0) - ((a.popularity as number) || 0))

        return NextResponse.json(
            {
                page: pageNumber,
                // Limit to 40 results (2 pages worth). Child Safety Mode: the
                // shared rule (utils/childSafetyRule.ts) for every title.
                results: await filterWhenChildSafe(childSafetyMode, results.slice(0, 40), API_KEY),
                total_results: totalResults,
                actor_id: actorId,
            },
            {
                status: 200,
                headers: {
                    'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
                },
            }
        )
    } catch (error) {
        apiError('TMDB API error:', error)
        return NextResponse.json({ message: 'Failed to fetch content by actor' }, { status: 500 })
    }
}
