import { NextRequest, NextResponse } from 'next/server'
import { filterMatureMovies } from '../../../../utils/movieCertifications'

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

        let url: string

        if (childSafeMode) {
            // ✅ RATING-BASED FILTERING STRATEGY
            // Use discover endpoint with certification filter for all movies
            // certification.lte=PG-13 ensures only G, PG, and PG-13 rated movies
            // Sorted by popularity for trending content
            url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&language=en-US&page=1&sort_by=popularity.desc&certification_country=US&certification.lte=PG-13&include_adult=false&vote_count.gte=100`
        } else {
            // Normal mode - use trending endpoint for mixed content
            url = `${BASE_URL}/trending/all/week?api_key=${API_KEY}&language=en-US&page=1`
        }

        const response = await fetch(url)

        if (!response.ok) {
            throw new Error(`TMDB API error: ${response.status}`)
        }

        const data = await response.json()

        // Add media_type to results if not present (discover doesn't include it)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let enrichedResults = data.results.map((item: any) => ({
            ...item,
            media_type: item.media_type || 'movie',
        }))

        if (childSafeMode) {
            // Apply post-fetch certification filtering for maximum safety
            const beforeCount = enrichedResults.length
            enrichedResults = await filterMatureMovies(enrichedResults, API_KEY!)
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
        console.error('TMDB API error:', error)
        return NextResponse.json({ message: 'Failed to fetch trending movies' }, { status: 500 })
    }
}
