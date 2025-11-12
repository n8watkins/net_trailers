import { NextRequest, NextResponse } from 'next/server'
import { filterContentByAdultFlag } from '../../../../../utils/contentFilter'

const API_KEY = process.env.TMDB_API_KEY
const BASE_URL = 'https://api.themoviedb.org/3'

// Genre mapping
const genreMap: Record<string, number> = {
    action: 28,
    comedy: 35,
    horror: 27,
    romance: 10749,
    documentary: 99,
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ genre: string }> }
) {
    if (!API_KEY) {
        return NextResponse.json({ message: 'TMDB API key not configured' }, { status: 500 })
    }

    const { genre } = await params
    const searchParams = request.nextUrl.searchParams
    const page = searchParams.get('page') || '1'
    const childSafetyMode = searchParams.get('childSafetyMode')
    const childSafeMode = childSafetyMode === 'true'

    if (!genreMap[genre.toLowerCase()]) {
        return NextResponse.json(
            {
                message:
                    'Invalid genre. Available genres: action, comedy, horror, romance, documentary',
            },
            { status: 400 }
        )
    }

    const genreId = genreMap[genre.toLowerCase()]

    try {
        // Build URL with certification filtering for child safety mode
        const url = new URL(`${BASE_URL}/discover/movie`)
        // API key moved to Authorization header for security
        url.searchParams.append('language', 'en-US')
        url.searchParams.append('with_genres', genreId.toString())
        url.searchParams.append('page', page)

        // Server-side filtering: Use TMDB's certification.lte for US ratings
        if (childSafeMode) {
            url.searchParams.append('certification_country', 'US')
            url.searchParams.append('certification.lte', 'PG-13')
        }

        // Use Authorization header instead of query parameter for security
        const response = await fetch(url.toString(), {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
            },
        })

        if (!response.ok) {
            throw new Error(`TMDB API error: ${response.status}`)
        }

        const data = await response.json()

        // Add media_type to each item for consistency
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let enrichedResults = data.results.map((item: any) => ({
            ...item,
            media_type: 'movie',
        }))

        // Apply additional client-side filtering for adult flag
        // (Server-side certification.lte already filtered by rating)
        if (childSafeMode) {
            const beforeCount = enrichedResults.length
            enrichedResults = filterContentByAdultFlag(enrichedResults, true)
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
        console.error('TMDB API error:', error)
        return NextResponse.json({ message: `Failed to fetch ${genre} movies` }, { status: 500 })
    }
}
