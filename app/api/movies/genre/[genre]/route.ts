import { NextRequest, NextResponse } from 'next/server'
import { childSafetyForRequest } from '@/lib/childSafetyServer'
import { filterChildSafe } from '@/utils/childSafetyFilter'
import { CHILD_SAFE_DISCOVER_PARAMS } from '@/utils/childSafetyRule'
import { apiError } from '@/utils/debugLogger'

const API_KEY = process.env.TMDB_API_KEY
const BASE_URL = 'https://api.themoviedb.org/3'

// Cache this route for 30 minutes
export const revalidate = 1800

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
    // The server decides (lib/childSafetyServer.ts); the parameter can only add filtering.
    const childSafeMode = await childSafetyForRequest(request)

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
        // TMDB API v3 requires authentication via api_key query parameter
        url.searchParams.append('api_key', API_KEY)
        url.searchParams.append('language', 'en-US')
        url.searchParams.append('with_genres', genreId.toString())
        url.searchParams.append('page', page)

        // Child Safety Mode: a prefilter only; every title still passes the rule below.
        if (childSafeMode) {
            for (const [key, value] of Object.entries(CHILD_SAFE_DISCOVER_PARAMS)) {
                url.searchParams.set(key, value)
            }
        }

        const response = await fetch(url.toString())

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

        // Child Safety Mode: the shared rule (utils/childSafetyRule.ts) for every title.
        if (childSafeMode) {
            const beforeCount = enrichedResults.length
            enrichedResults = await filterChildSafe(enrichedResults, API_KEY)
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
        return NextResponse.json({ message: `Failed to fetch ${genre} movies` }, { status: 500 })
    }
}
