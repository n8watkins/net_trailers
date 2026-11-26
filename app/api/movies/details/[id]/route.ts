import { NextRequest, NextResponse } from 'next/server'
import {
    TMDBApiClient,
    setCacheHeaders as _setCacheHeaders,
    handleApiError as _handleApiError,
} from '../../../../../utils/tmdbApi'
import { childSafetyForRequest } from '@/lib/childSafetyServer'
import { childSafetyBlocked, isChildSafe } from '@/utils/childSafetyFilter'
import { apiError } from '@/utils/debugLogger'
import { tmdbErrorResponse } from '@/utils/tmdbErrorResponse'

// Cache this route for 6 hours
export const revalidate = 21600

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const searchParams = request.nextUrl.searchParams
    const media_type = searchParams.get('media_type') || 'movie'
    // The server decides (lib/childSafetyServer.ts); the parameter can only add filtering.
    const childSafeMode = await childSafetyForRequest(request)

    if (!id) {
        return NextResponse.json({ message: 'Movie/TV show ID is required' }, { status: 400 })
    }

    // Validate media_type
    if (media_type !== 'movie' && media_type !== 'tv') {
        return NextResponse.json(
            { message: 'media_type must be either "movie" or "tv"' },
            { status: 400 }
        )
    }

    try {
        const tmdbClient = TMDBApiClient.getInstance()
        const data = await tmdbClient.getMovieDetails(id, media_type as 'movie' | 'tv')

        // Child Safety Mode: the shared rule, from the ratings appended to the
        // details (release_dates for movies, content_ratings for shows)
        if (
            childSafeMode &&
            !(await isChildSafe(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                { ...(data as any), media_type },
                process.env.TMDB_API_KEY ?? ''
            ))
        ) {
            return childSafetyBlocked()
        }

        // Cache for 6 hours (movie/TV details don't change often)
        return NextResponse.json(data, {
            status: 200,
            headers: {
                'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400',
            },
        })
    } catch (error) {
        apiError('Failed to fetch movie/TV show details:', error)
        return tmdbErrorResponse(error, 'Failed to fetch movie/TV show details')
    }
}
