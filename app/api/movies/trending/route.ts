import { NextRequest, NextResponse } from 'next/server'
import { apiError } from '../../../../utils/debugLogger'
import { fetchWithPrioritizedGenres } from '../../../../utils/prioritizedGenreFetch'
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
        // The server decides (lib/childSafetyServer.ts); the parameter can only add filtering.
        const childSafeMode = await childSafetyForRequest(request)
        const genresParam = searchParams.get('genres') // Unified genre IDs (e.g., "action,comedy")

        // Validate and sanitize page parameter (1-500 as per TMDB limits)
        const rawPage = searchParams.get('page') || '1'
        const parsedPage = parseInt(rawPage, 10)
        const pageNumber = Math.max(1, Math.min(500, isNaN(parsedPage) ? 1 : parsedPage))

        // If genres are specified, use prioritized genre cascading
        if (genresParam && genresParam.trim().length > 0) {
            const unifiedGenreIds = genresParam.split(',').map((g) => g.trim())

            // For trending with genres, default to OR logic for broader results
            const data = await fetchWithPrioritizedGenres(
                unifiedGenreIds,
                'movie',
                'trending',
                pageNumber,
                API_KEY,
                childSafeMode,
                'OR' // Trending rows use OR logic by default
            )

            // Add media_type to results if not present

            const enrichedResults = await filterWhenChildSafe(
                childSafeMode,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                data.results.map((item: any) => ({
                    ...item,
                    media_type: item.media_type || 'movie',
                })),
                API_KEY
            )

            return NextResponse.json(
                {
                    ...data,
                    results: enrichedResults,
                    child_safety_enabled: childSafeMode || undefined,
                },
                {
                    status: 200,
                    headers: {
                        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
                    },
                }
            )
        }

        // No genres: the official trending list.
        // FALLBACK STRATEGY: TMDB's /trending endpoint has limited content (~20-50 pages)
        // After page 20, fall back to discover with progressive filter relaxation
        let url: string
        const useFallback = pageNumber > 20 // Switch to discover after official trending runs dry

        if (useFallback) {
            // Pages 21+: Use discover with popularity sorting and progressive filters
            let minVoteCount: number
            let minRating: number
            if (pageNumber <= 40) {
                minVoteCount = 50
                minRating = 5.5
            } else if (pageNumber <= 60) {
                minVoteCount = 20
                minRating = 5.0
            } else if (pageNumber <= 80) {
                minVoteCount = 10
                minRating = 4.5
            } else {
                minVoteCount = 5
                minRating = 4.0
            }
            url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&language=en-US&page=${pageNumber}&sort_by=popularity.desc&vote_count.gte=${minVoteCount}&vote_average.gte=${minRating}`
            // Child Safety Mode: ask TMDB for rated films only (a prefilter;
            // the rule below still checks every title).
            url += childSafeMode ? CHILD_SAFE_DISCOVER_QUERY : '&include_adult=false'
        } else {
            // Pages 1-20: Use official trending endpoint. With Child Safety Mode
            // on, the same list, minus the titles the rule hides (utils/childSafetyRule.ts).
            url = `${BASE_URL}/trending/movie/week?api_key=${API_KEY}&language=en-US&page=${pageNumber}`
        }

        // TMDB data changes slowly: keep it in the data cache (R2 on the Worker) for an hour
        const response = await fetch(url, { next: { revalidate: 3600 } })

        if (!response.ok) {
            throw new Error(`TMDB API error: ${response.status}`)
        }

        const data = await response.json()

        // Add media_type to results if not present (discover doesn't include it)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const enrichedResults = data.results.map((item: any) => ({
            ...item,
            media_type: item.media_type || 'movie',
        }))

        return NextResponse.json(
            {
                ...data,
                results: await filterWhenChildSafe(childSafeMode, enrichedResults, API_KEY),
                child_safety_enabled: childSafeMode || undefined,
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
        return NextResponse.json({ message: 'Failed to fetch trending movies' }, { status: 500 })
    }
}
