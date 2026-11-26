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
        const page = searchParams.get('page') || '1'
        const pageNumber = parseInt(page, 10)
        // The server decides (lib/childSafetyServer.ts); the parameter can only add filtering.
        const childSafeMode = await childSafetyForRequest(request)
        const genresParam = searchParams.get('genres') // Unified genre IDs (e.g., "action,comedy")

        // If genres are specified, use prioritized genre cascading
        if (genresParam && genresParam.trim().length > 0) {
            const unifiedGenreIds = genresParam.split(',').map((g) => g.trim())

            // For top-rated with genres, default to OR logic for broader results
            const data = await fetchWithPrioritizedGenres(
                unifiedGenreIds,
                'movie',
                'top-rated',
                pageNumber,
                API_KEY,
                childSafeMode,
                'OR' // Top-rated rows use OR logic by default
            )

            // Add media_type to each item for consistency
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const enrichedResults = data.results.map((item: any) => ({
                ...item,
                media_type: 'movie',
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
                        'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800',
                    },
                }
            )
        }

        // No genres: the official top-rated list.
        // FALLBACK STRATEGY: TMDB's /movie/top_rated endpoint has limited content (~100-200 pages)
        // After page 100, fall back to discover with progressive filter relaxation
        let url: string
        const useFallback = pageNumber > 100 // Switch to discover after official top-rated runs dry

        if (useFallback) {
            // Pages 101+: Use discover with vote_average sorting and progressive filters
            let minVoteCount: number
            let minRating: number
            if (pageNumber <= 150) {
                minVoteCount = 200
                minRating = 6.5
            } else if (pageNumber <= 200) {
                minVoteCount = 100
                minRating = 6.0
            } else if (pageNumber <= 250) {
                minVoteCount = 50
                minRating = 5.5
            } else {
                minVoteCount = 20
                minRating = 5.0
            }
            url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&language=en-US&page=${pageNumber}&sort_by=vote_average.desc&vote_count.gte=${minVoteCount}&vote_average.gte=${minRating}`
            // Child Safety Mode: ask TMDB for rated films only (a prefilter;
            // the rule below still checks every title).
            url += childSafeMode ? CHILD_SAFE_DISCOVER_QUERY : '&include_adult=false'
        } else {
            // Pages 1-100: Use official top_rated endpoint. With Child Safety Mode
            // on, the same list, minus the titles the rule hides (utils/childSafetyRule.ts).
            url = `${BASE_URL}/movie/top_rated?api_key=${API_KEY}&language=en-US&page=${pageNumber}`
        }

        // TMDB data changes slowly: keep it in the data cache (R2 on the Worker) for an hour
        const response = await fetch(url, { next: { revalidate: 3600 } })

        if (!response.ok) {
            throw new Error(`TMDB API error: ${response.status}`)
        }

        const data = await response.json()

        // Add media_type to each item for consistency
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const enrichedResults = data.results.map((item: any) => ({
            ...item,
            media_type: 'movie',
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
                    'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800',
                },
            }
        )
    } catch (error) {
        apiError('TMDB API error:', error)
        return NextResponse.json({ message: 'Failed to fetch top rated movies' }, { status: 500 })
    }
}
