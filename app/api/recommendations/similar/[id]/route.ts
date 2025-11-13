/**
 * Similar Content Recommendations API
 *
 * GET /api/recommendations/similar/[id]
 * Returns content similar to a specific movie/show
 */

import { NextRequest, NextResponse } from 'next/server'
import { getHybridRecommendations } from '@/utils/tmdb/recommendations'
import { Recommendation, RECOMMENDATION_CONSTRAINTS } from '@/types/recommendations'
import { apiError } from '@/utils/debugLogger'

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
        const mediaType = (searchParams.get('mediaType') as 'movie' | 'tv') || 'movie'
        const limit = Math.min(
            parseInt(searchParams.get('limit') || '20', 10),
            RECOMMENDATION_CONSTRAINTS.MAX_LIMIT
        )

        // Get hybrid recommendations (TMDB similar + recommended)
        const similarContent = await getHybridRecommendations(contentId, mediaType, limit)

        // Convert to Recommendation objects
        const recommendations: Recommendation[] = similarContent.map((content, index) => ({
            content,
            source: 'tmdb_similar',
            score: 100 - index * 2,
            reason: 'More like this',
            sourceContentId: contentId,
            generatedAt: Date.now(),
        }))

        return NextResponse.json({
            success: true,
            recommendations,
            sourceId: contentId,
            totalCount: recommendations.length,
            generatedAt: Date.now(),
        })
    } catch (error) {
        apiError('Error fetching similar content recommendations:', error)
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch similar content',
            },
            { status: 500 }
        )
    }
}
