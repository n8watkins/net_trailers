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
        const childSafetyMode = searchParams.get('childSafetyMode')
        const childSafeMode = childSafetyMode === 'true'

        // Validate and sanitize page parameter (1-500 as per TMDB limits)
        const rawPage = searchParams.get('page') || '1'
        const parsedPage = parseInt(rawPage, 10)
        const page = Math.max(1, Math.min(500, isNaN(parsedPage) ? 1 : parsedPage)).toString()

        let urlObj: URL

        if (childSafeMode) {
            // ✅ RATING-BASED FILTERING STRATEGY
            // Use discover endpoint with certification filter for all movies
            // certification.lte=PG-13 ensures only G, PG, and PG-13 rated movies
            // Sorted by popularity for trending content
            urlObj = new URL(`${BASE_URL}/discover/movie`)
            urlObj.searchParams.set('language', 'en-US')
            urlObj.searchParams.set('page', page)
            urlObj.searchParams.set('sort_by', 'popularity.desc')
            urlObj.searchParams.set('certification_country', 'US')
            urlObj.searchParams.set('certification.lte', 'PG-13')
            urlObj.searchParams.set('include_adult', 'false')
            urlObj.searchParams.set('vote_count.gte', '100')
        } else {
            // Normal mode - use trending endpoint for movies only
            urlObj = new URL(`${BASE_URL}/trending/movie/week`)
            urlObj.searchParams.set('language', 'en-US')
            urlObj.searchParams.set('page', page)
        }

        // Use Authorization header instead of query parameter for security
        const response = await fetch(urlObj.toString(), {
            headers: getTMDBHeaders(),
        })

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
        console.error('TMDB API error:', error)
        return NextResponse.json({ message: 'Failed to fetch trending movies' }, { status: 500 })
    }
}
