import { NextRequest, NextResponse } from 'next/server'
import { tmdbContentCache } from '../../../../utils/apiCache'
import { childSafetyForRequest } from '@/lib/childSafetyServer'
import { childSafetyBlocked, isChildSafe } from '@/utils/childSafetyFilter'
import { apiError } from '../../../../utils/debugLogger'

// Cache this route for 1 hour
export const revalidate = 3600

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const searchParams = request.nextUrl.searchParams
    // The server decides (lib/childSafetyServer.ts); the parameter can only add filtering.
    const childSafeMode = await childSafetyForRequest(request)

    if (!id) {
        return NextResponse.json({ error: 'Content ID is required' }, { status: 400 })
    }

    const contentId = parseInt(id)
    if (isNaN(contentId)) {
        return NextResponse.json({ error: 'Invalid content ID' }, { status: 400 })
    }

    const API_KEY = process.env.TMDB_API_KEY
    if (!API_KEY) {
        apiError('TMDB_API_KEY is not configured')
        return NextResponse.json({ error: 'API configuration error' }, { status: 500 })
    }

    // Create cache key including child safety mode since filtered data differs
    const cacheKey = `content-${contentId}-childSafe-${childSafeMode}`

    try {
        // Check cache first
        const cachedData = tmdbContentCache.get(cacheKey)
        if (cachedData) {
            return NextResponse.json(cachedData, { status: 200 })
        }

        // Try to fetch as a movie first
        const movieResponse = await fetch(
            `https://api.themoviedb.org/3/movie/${contentId}?api_key=${API_KEY}&language=en-US`
        )

        if (movieResponse.ok) {
            const movieData = await movieResponse.json()

            // Child Safety Mode: the shared rule (adult flag and US certification)
            if (
                childSafeMode &&
                !(await isChildSafe({ ...movieData, media_type: 'movie' }, API_KEY))
            ) {
                return childSafetyBlocked()
            }

            // Add media_type to distinguish from TV shows
            const enrichedMovieData = {
                ...movieData,
                media_type: 'movie',
            }

            // Cache the result (30 minutes TTL)
            tmdbContentCache.set(cacheKey, enrichedMovieData)

            return NextResponse.json(enrichedMovieData, {
                status: 200,
                headers: {
                    'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
                },
            })
        }

        // If movie fetch failed, try as a TV show
        const tvResponse = await fetch(
            `https://api.themoviedb.org/3/tv/${contentId}?api_key=${API_KEY}&language=en-US`
        )

        if (tvResponse.ok) {
            const tvData = await tvResponse.json()

            // Child Safety Mode: the shared rule (content ratings; none found blocks it)
            if (childSafeMode && !(await isChildSafe({ ...tvData, media_type: 'tv' }, API_KEY))) {
                return childSafetyBlocked()
            }

            // Add media_type and transform TV show data to match movie structure
            const enrichedTvData = {
                ...tvData,
                media_type: 'tv',
            }

            // Cache the result (30 minutes TTL)
            tmdbContentCache.set(cacheKey, enrichedTvData)

            return NextResponse.json(enrichedTvData, {
                status: 200,
                headers: {
                    'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
                },
            })
        }

        // If both failed, the content doesn't exist
        return NextResponse.json({ error: 'Content not found' }, { status: 404 })
    } catch (error) {
        apiError('Error fetching content details:', error)
        return NextResponse.json({ error: 'Failed to fetch content details' }, { status: 500 })
    }
}
