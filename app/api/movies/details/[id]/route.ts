import { NextRequest, NextResponse } from 'next/server'
import {
    TMDBApiClient,
    setCacheHeaders as _setCacheHeaders,
    handleApiError as _handleApiError,
} from '../../../../../utils/tmdbApi'
import { fetchTVContentRatings, hasMatureRating } from '../../../../../utils/tvContentRatings'
import { apiError } from '@/utils/debugLogger'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const searchParams = request.nextUrl.searchParams
    const media_type = searchParams.get('media_type') || 'movie'
    const childSafetyMode = searchParams.get('childSafetyMode')
    const childSafeMode = childSafetyMode === 'true'

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

        // Apply child safety filtering
        if (childSafeMode) {
            if (media_type === 'movie') {
                // Check adult flag for movies
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                if ((data as any).adult === true) {
                    return NextResponse.json(
                        {
                            message: 'Content blocked by child safety mode',
                            reason: 'adult_content',
                        },
                        { status: 403 }
                    )
                }
            } else if (media_type === 'tv') {
                // Check content ratings for TV shows
                const API_KEY = process.env.TMDB_API_KEY
                if (API_KEY) {
                    const contentId = parseInt(id)
                    const ratings = await fetchTVContentRatings(contentId, API_KEY)
                    if (ratings && hasMatureRating(ratings)) {
                        return NextResponse.json(
                            {
                                message: 'Content blocked by child safety mode',
                                reason: 'mature_rating',
                            },
                            { status: 403 }
                        )
                    }
                }
            }
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
        return NextResponse.json(
            { message: 'Failed to fetch movie/TV show details' },
            { status: 500 }
        )
    }
}
