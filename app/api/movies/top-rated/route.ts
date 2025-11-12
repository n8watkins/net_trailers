import { NextRequest, NextResponse } from 'next/server'
import { apiError } from '../../../../utils/debugLogger'

const API_KEY = process.env.TMDB_API_KEY
const BASE_URL = 'https://api.themoviedb.org/3'

export async function GET(request: NextRequest) {
    if (!API_KEY) {
        return NextResponse.json({ message: 'TMDB API key not configured' }, { status: 500 })
    }

    try {
        const searchParams = request.nextUrl.searchParams
        const page = searchParams.get('page') || '1'
        const childSafetyMode = searchParams.get('childSafetyMode')
        const childSafeMode = childSafetyMode === 'true'

        let url: string

        if (childSafeMode) {
            // ✅ RATING-BASED FILTERING STRATEGY
            // Use discover endpoint with certification filter for all movies
            // certification.lte=PG-13 ensures only G, PG, and PG-13 rated movies
            // Sorted by rating for top-rated content
            url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&language=en-US&page=${page}&sort_by=vote_average.desc&vote_count.gte=300&certification_country=US&certification.lte=PG-13&include_adult=false`
        } else {
            // Normal mode - use top_rated endpoint
            url = `${BASE_URL}/movie/top_rated?api_key=${API_KEY}&language=en-US&page=${page}`
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
