import { NextRequest, NextResponse } from 'next/server'
import {
    TMDBApiClient,
    setCacheHeaders as _setCacheHeaders,
    handleApiError as _handleApiError,
} from '../../../../../utils/tmdbApi'
import { fetchTVContentRatings, hasMatureRating } from '../../../../../utils/tvContentRatings'
import { apiError } from '@/utils/debugLogger'

// Cache this route for 6 hours
export const revalidate = 21600

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const searchParams = request.nextUrl.searchParams
    const childSafetyMode = searchParams.get('childSafetyMode')
    const childSafeMode = childSafetyMode === 'true'

    if (!id) {
        return NextResponse.json({ message: 'TV show ID is required' }, { status: 400 })
    }

    try {
        const tmdbClient = TMDBApiClient.getInstance()
        const data = await tmdbClient.getMovieDetails(id, 'tv')

        // Apply child safety filtering for TV shows
        if (childSafeMode) {
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

        // Cache for 6 hours (TV details don't change often)
        return NextResponse.json(data, {
            status: 200,
            headers: {
                'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400',
            },
        })
    } catch (error) {
        apiError('Failed to fetch TV show details:', error)
        return NextResponse.json({ message: 'Failed to fetch TV show details' }, { status: 500 })
    }
}
