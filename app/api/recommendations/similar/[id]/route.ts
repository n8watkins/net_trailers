/**
 * Similar Content Recommendations API
 *
 * GET /api/recommendations/similar/[id]
 * Returns content similar to a specific movie/show
 */

import { NextRequest, NextResponse } from 'next/server'
import { getHybridRecommendationsOrThrow } from '@/utils/tmdb/recommendations'
import { Recommendation, RECOMMENDATION_CONSTRAINTS } from '@/types/recommendations'
import { apiError } from '@/utils/debugLogger'
import { tmdbFailureStatus } from '@/utils/tmdbErrorResponse'

// Cache this route for 30 minutes
export const revalidate = 1800

interface RouteParams {
    params: Promise<{
        id: string
    }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params

        // Validate ID
        const contentId = parseInt(id, 10)
        if (isNaN(contentId)) {
            return NextResponse.json(
                { success: false, error: 'Invalid content ID' },
                { status: 400 }
            )
        }

        // Get query parameters
        const searchParams = request.nextUrl.searchParams
        const mediaType = searchParams.get('mediaType') || 'movie'
        if (mediaType !== 'movie' && mediaType !== 'tv') {
            return NextResponse.json(
                { success: false, error: 'mediaType must be either "movie" or "tv"' },
                { status: 400 }
            )
        }
        const requestedLimit = parseInt(searchParams.get('limit') || '20', 10)
        const limit = Math.min(
            Number.isFinite(requestedLimit) && requestedLimit > 0 ? requestedLimit : 20,
            RECOMMENDATION_CONSTRAINTS.MAX_LIMIT
        )

        // Get hybrid recommendations (TMDB similar + recommended)
        const similarContent = await getHybridRecommendationsOrThrow(contentId, mediaType, limit)

        // Convert to Recommendation objects
        const recommendations: Recommendation[] = similarContent.map((content, index) => ({
            content,
            source: 'tmdb_similar',
            score: 100 - index * 2,
            reason: 'More like this',
            sourceContentId: contentId,
            generatedAt: Date.now(),
        }))

        return NextResponse.json(
            {
                success: true,
                recommendations,
                sourceId: contentId,
                totalCount: recommendations.length,
                generatedAt: Date.now(),
            },
            {
                status: 200,
                headers: {
                    'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
                },
            }
        )
    } catch (error) {
        apiError('Error fetching similar content recommendations:', error)
        // A title with nothing similar is an empty 200 above. This is a real failure:
        // TMDB down or rate limiting (502/429), or our own fault (500). Never cached.
        const status = tmdbFailureStatus(error)
        return NextResponse.json(
            {
                success: false,
                error:
                    status === 429
                        ? 'Too many requests. Please try again later.'
                        : 'Failed to fetch similar content',
            },
            {
                status,
                headers: {
                    'Cache-Control': 'no-store',
                    ...(status === 429 ? { 'Retry-After': '30' } : {}),
                },
            }
        )
    }
}
