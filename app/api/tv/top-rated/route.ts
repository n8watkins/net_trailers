import { NextRequest, NextResponse } from 'next/server'
import { filterMatureTVShows } from '../../../../utils/tvContentRatings'
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
                'tv',
                'top-rated',
                pageNumber,
                API_KEY,
                childSafeMode,
                'OR' // Top-rated rows use OR logic by default
            )

            // Add media_type to each item for consistency
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let enrichedResults = data.results.map((item: any) => ({
                ...item,
                media_type: 'tv',
            }))

            // Apply child safety filtering if enabled (TV shows need content rating checks)
            if (childSafeMode) {
                const beforeCount = enrichedResults.length
                enrichedResults = await filterMatureTVShows(enrichedResults, API_KEY!)
                const hiddenCount = beforeCount - enrichedResults.length

                return NextResponse.json(
                    {
                        ...data,
                        results: enrichedResults,
                        child_safety_enabled: true,
                        hidden_count: hiddenCount,
                    },
                    {
                        status: 200,
                        headers: {
                            'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
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
                        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
                    },
                }
            )
        }

        // No genres - use standard top-rated or child-safe discover
        // FALLBACK STRATEGY: TMDB's /tv/top_rated endpoint has limited content (~100-200 pages)
        // After page 100, fall back to discover with progressive filter relaxation
        let url: string
        const useFallback = pageNumber > 100 // Switch to discover after official top-rated runs dry

        if (childSafeMode) {
            // ✅ CURATED CONTENT STRATEGY: Use family-friendly TV genres sorted by rating
            // Animation (16), Kids (10762), Family (10751), Comedy (35), Sci-Fi & Fantasy (10765), Action & Adventure (10759)
            // This ensures more content availability without aggressive filtering
            if (useFallback) {
                // Pages 101+: Progressive filter relaxation with family-friendly genres
                let minVoteCount: number
                let minRating: number
                if (pageNumber <= 150) {
                    minVoteCount = 100
                    minRating = 6.5
                } else if (pageNumber <= 200) {
                    minVoteCount = 50
                    minRating = 6.0
                } else if (pageNumber <= 250) {
                    minVoteCount = 20
                    minRating = 5.5
                } else {
                    minVoteCount = 10
                    minRating = 5.0
                }
                url = `${BASE_URL}/discover/tv?api_key=${API_KEY}&language=en-US&page=${pageNumber}&sort_by=vote_average.desc&vote_count.gte=${minVoteCount}&vote_average.gte=${minRating}&with_genres=16,10762,10751,35,10765,10759&include_adult=false`
            } else {
                // Pages 1-100: Standard child-safe discover
                url = `${BASE_URL}/discover/tv?api_key=${API_KEY}&language=en-US&page=${pageNumber}&sort_by=vote_average.desc&vote_count.gte=100&with_genres=16,10762,10751,35,10765,10759&include_adult=false`
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
                url = `${BASE_URL}/discover/tv?api_key=${API_KEY}&language=en-US&page=${pageNumber}&sort_by=vote_average.desc&vote_count.gte=${minVoteCount}&vote_average.gte=${minRating}&include_adult=false`
            } else {
                // Pages 1-100: Use official top_rated endpoint
                url = `${BASE_URL}/tv/top_rated?api_key=${API_KEY}&language=en-US&page=${pageNumber}`
            }
        }

        const response = await fetch(url)

        if (!response.ok) {
            throw new Error(`TMDB API error: ${response.status}`)
        }

        const data = await response.json()

        // Add media_type to each item for consistency
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let enrichedResults = data.results.map((item: any) => ({
            ...item,
            media_type: 'tv',
        }))

        // Apply child safety filtering if enabled
        if (childSafeMode) {
            const beforeCount = enrichedResults.length

            // CRITICAL: Even with genre filtering, we MUST filter TV-MA content
            // Genres like Comedy, Sci-Fi, Animation can have TV-MA shows
            enrichedResults = await filterMatureTVShows(enrichedResults, API_KEY!)

            const hiddenCount = beforeCount - enrichedResults.length

            return NextResponse.json(
                {
                    ...data,
                    results: enrichedResults,
                    child_safety_enabled: true,
                    hidden_count: hiddenCount,
                },
                {
                    status: 200,
                    headers: {
                        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
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
                    'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
                },
            }
        )
    } catch (error) {
        apiError('TMDB API error:', error)
        return NextResponse.json({ message: 'Failed to fetch top-rated TV shows' }, { status: 500 })
    }
}
