import { NextRequest, NextResponse } from 'next/server'
import { apiError } from '../../../../utils/debugLogger'
import { fetchWithPrioritizedGenres } from '../../../../utils/prioritizedGenreFetch'

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
        const childSafetyMode = searchParams.get('childSafetyMode')
        const childSafeMode = childSafetyMode === 'true'
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
                    results: enrichedResults,
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

        // No genres - use standard top-rated or child-safe discover
        // FALLBACK STRATEGY: TMDB's /movie/top_rated endpoint has limited content (~100-200 pages)
        // After page 100, fall back to discover with progressive filter relaxation
        let url: string
        const useFallback = pageNumber > 100 // Switch to discover after official top-rated runs dry

        if (childSafeMode) {
            // ✅ RATING-BASED FILTERING STRATEGY
            // Use discover endpoint with certification filter for all movies
            // certification.lte=PG-13 ensures only G, PG, and PG-13 rated movies
            // Sorted by rating for top-rated content
            if (useFallback) {
                // Pages 101+: Progressive filter relaxation
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
                url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&language=en-US&page=${pageNumber}&sort_by=vote_average.desc&vote_count.gte=${minVoteCount}&vote_average.gte=${minRating}&certification_country=US&certification.lte=PG-13&include_adult=false`
            } else {
                // Pages 1-100: Standard child-safe discover
                url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&language=en-US&page=${pageNumber}&sort_by=vote_average.desc&vote_count.gte=300&certification_country=US&certification.lte=PG-13&include_adult=false`
            }
        } else {
            // Normal mode
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
                url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&language=en-US&page=${pageNumber}&sort_by=vote_average.desc&vote_count.gte=${minVoteCount}&vote_average.gte=${minRating}&include_adult=false`
            } else {
                // Pages 1-100: Use official top_rated endpoint
                url = `${BASE_URL}/movie/top_rated?api_key=${API_KEY}&language=en-US&page=${pageNumber}`
            }
        }

        const response = await fetch(url)

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

        if (childSafeMode) {
            // OPTIMIZATION: Skip redundant post-processing for movies
            // The discover endpoint with certification.lte=PG-13 already filters by rating
            // TMDB's certification filter is authoritative - no need to double-check
            // This eliminates 20+ individual certification API calls per page
            return NextResponse.json(
                {
                    ...data,
                    results: enrichedResults,
                    child_safety_enabled: true,
                    filtered_at_source: true, // Filtered by TMDB discover endpoint
                },
                {
                    status: 200,
                    headers: {
                        'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800',
                    },
                }
            )
        }

        return NextResponse.json(
            {
                ...data,
                results: enrichedResults,
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
