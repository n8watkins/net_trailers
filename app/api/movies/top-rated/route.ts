import { NextRequest, NextResponse } from 'next/server'
import { getTMDBHeaders } from '../../../../utils/tmdbFetch'

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

        let url: URL

        if (childSafeMode) {
            // ✅ RATING-BASED FILTERING STRATEGY
            // Use discover endpoint with certification filter for all movies
            // certification.lte=PG-13 ensures only G, PG, and PG-13 rated movies
            // Sorted by rating for top-rated content
            url = new URL(`${BASE_URL}/discover/movie`)
            url.searchParams.set('language', 'en-US')
            url.searchParams.set('page', page)
            url.searchParams.set('sort_by', 'vote_average.desc')
            url.searchParams.set('vote_count.gte', '300')
            url.searchParams.set('certification_country', 'US')
            url.searchParams.set('certification.lte', 'PG-13')
            url.searchParams.set('include_adult', 'false')
        } else {
            // Normal mode - use top_rated endpoint
            url = new URL(`${BASE_URL}/movie/top_rated`)
            url.searchParams.set('language', 'en-US')
            url.searchParams.set('page', page)
        }

        const response = await fetch(url.toString(), { headers: getTMDBHeaders() })

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
        console.error('TMDB API error:', error)
        return NextResponse.json({ message: 'Failed to fetch top rated movies' }, { status: 500 })
    }
}
