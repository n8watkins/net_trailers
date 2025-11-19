import { NextRequest, NextResponse } from 'next/server'
import { apiError } from '../../../../utils/debugLogger'

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
        const page = Math.max(1, Math.min(500, isNaN(parsedPage) ? 1 : parsedPage)).toString()

        let url: string

        // If genres are specified, use discover endpoint with genre filtering
        if (genresParam && genresParam.trim().length > 0) {
            // Import genre mapping utility
            const { translateToTMDBGenres } = await import('../../../../utils/genreMapping')
            const unifiedGenreIds = genresParam.split(',').map((g) => g.trim())
            const tmdbGenreIds = translateToTMDBGenres(unifiedGenreIds, 'movie')
            const genreFilter = tmdbGenreIds.join('|') // OR logic (pipe-separated)

            url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&language=en-US&page=${page}&sort_by=popularity.desc&with_genres=${genreFilter}&include_adult=false&vote_count.gte=100`

            if (childSafeMode) {
                url += '&certification_country=US&certification.lte=PG-13'
            }
        } else if (childSafeMode) {
            // ✅ RATING-BASED FILTERING STRATEGY
            // Use discover endpoint with certification filter for all movies
            // certification.lte=PG-13 ensures only G, PG, and PG-13 rated movies
            // Sorted by popularity for trending content
            url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&language=en-US&page=${page}&sort_by=popularity.desc&certification_country=US&certification.lte=PG-13&include_adult=false&vote_count.gte=100`
        } else {
            // Normal mode - use trending endpoint for movies only
            url = `${BASE_URL}/trending/movie/week?api_key=${API_KEY}&language=en-US&page=${page}`
        }

        const response = await fetch(url)

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
        return NextResponse.json({ message: 'Failed to fetch trending movies' }, { status: 500 })
    }
}
