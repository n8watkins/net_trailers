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
        const childSafetyMode = searchParams.get('childSafetyMode')
        const childSafeMode = childSafetyMode === 'true'
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
                'tv',
                'trending',
                pageNumber,
                API_KEY,
                childSafeMode,
                'OR' // Trending rows use OR logic by default
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
                            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
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
                        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
                    },
                }
            )
        }

        // No genres - use standard trending or child-safe discover
        // FALLBACK STRATEGY: TMDB's /trending endpoint has limited content (~20-50 pages)
        // After page 20, fall back to discover with progressive filter relaxation
        let url: string
        const useFallback = pageNumber > 20 // Switch to discover after official trending runs dry

        if (childSafeMode) {
            // ✅ CURATED CONTENT STRATEGY: Use family-friendly TV genres
            // Animation (16), Kids (10762), Family (10751), Comedy (35), Sci-Fi & Fantasy (10765), Action & Adventure (10759)
            // This ensures more content availability without aggressive filtering
            if (useFallback) {
                // Pages 21+: Progressive filter relaxation with family-friendly genres
                let minVoteCount: number
                if (pageNumber <= 40) {
                    minVoteCount = 50
                } else if (pageNumber <= 60) {
                    minVoteCount = 20
                } else if (pageNumber <= 80) {
                    minVoteCount = 10
                } else {
                    minVoteCount = 5
                }
                url = `${BASE_URL}/discover/tv?api_key=${API_KEY}&language=en-US&page=${pageNumber}&sort_by=popularity.desc&with_genres=16,10762,10751,35,10765,10759&vote_count.gte=${minVoteCount}&include_adult=false`
            } else {
                // Pages 1-20: Standard child-safe discover
                url = `${BASE_URL}/discover/tv?api_key=${API_KEY}&language=en-US&page=${pageNumber}&sort_by=popularity.desc&with_genres=16,10762,10751,35,10765,10759&include_adult=false`
            }
        } else {
            // Normal mode
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
                url = `${BASE_URL}/discover/tv?api_key=${API_KEY}&language=en-US&page=${pageNumber}&sort_by=popularity.desc&vote_count.gte=${minVoteCount}&vote_average.gte=${minRating}&include_adult=false`
            } else {
                // Pages 1-20: Use official trending endpoint
                url = `${BASE_URL}/trending/tv/week?api_key=${API_KEY}&language=en-US&page=${pageNumber}`
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
                        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
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
                    'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
                },
            }
        )
    } catch (error) {
        apiError('TMDB API error:', error)
        return NextResponse.json({ message: 'Failed to fetch trending TV shows' }, { status: 500 })
    }
}
