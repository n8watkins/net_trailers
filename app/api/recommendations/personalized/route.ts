/**
 * Personalized Recommendations API
 *
 * POST /api/recommendations/personalized
 * Returns personalized content recommendations based on user's preferences
 *
 * SECURITY: Requires valid Firebase ID token in Authorization header
 */

import { NextRequest, NextResponse } from 'next/server'
import {
    buildRecommendationProfile,
    getGenreBasedRecommendations,
    getSeenContentIds,
    hasEnoughDataForRecommendations,
    mergeRecommendations,
} from '@/utils/recommendations/genreEngine'
import { getBatchSimilarContent } from '@/utils/tmdb/recommendations'
import { Recommendation, RECOMMENDATION_CONSTRAINTS } from '@/types/recommendations'
import { Content, getTitle } from '@/typings'
import { withAuth } from '@/lib/auth-middleware'
import { apiError } from '@/utils/debugLogger'

async function handlePersonalizedRecommendations(
    request: NextRequest,
    userId: string
): Promise<NextResponse> {
    try {
        // Get user data from request body
        const body = await request.json()
        const limit = Math.min(body.limit || 20, RECOMMENDATION_CONSTRAINTS.MAX_LIMIT)

        const userData = {
            userId,
            likedMovies: (body.likedMovies || []) as Content[],
            defaultWatchlist: (body.watchlist || []) as Content[],
            hiddenMovies: (body.hiddenMovies || []) as Content[],
        }

        // Check if user has enough data
        if (!hasEnoughDataForRecommendations(userData)) {
            return NextResponse.json({
                success: true,
                recommendations: [],
                message:
                    'Not enough user data for personalized recommendations. Add items to your watchlist or like some content to get started.',
                requiresData: true,
            })
        }

        // Build recommendation profile
        const profile = buildRecommendationProfile(userData)

        // Get content IDs to exclude (already seen)
        const excludeIds = getSeenContentIds(userData)

        // Generate recommendations from multiple sources
        const [genreBased, tmdbSimilar] = await Promise.all([
            // Genre-based recommendations (60% weight)
            getGenreBasedRecommendations(profile, Math.ceil(limit * 0.6), excludeIds),

            // TMDB similar content (40% weight) - only if user has liked movies
            userData.likedMovies.length > 0
                ? getBatchSimilarContent(
                      userData.likedMovies.slice(0, 3).map((c) => c.id),
                      'movie',
                      Math.ceil(limit * 0.4)
                  ).then((results) => results.filter((c) => !excludeIds.includes(c.id)))
                : Promise.resolve([]),
        ])

        // Merge recommendations with diversity
        const mergedContent = mergeRecommendations([genreBased, tmdbSimilar], limit)

        // Convert to Recommendation objects with metadata
        const recommendations: Recommendation[] = mergedContent.map((content, index) => {
            // Determine source
            const isFromGenre = genreBased.some((c) => c.id === content.id)
            const source = isFromGenre ? 'genre_based' : 'tmdb_similar'

            // Calculate score (higher for earlier recommendations)
            const score = 100 - index * 2

            // Generate reason
            let reason = ''
            if (source === 'genre_based' && profile.topGenres.length > 0) {
                reason = `Trending in ${profile.topGenres[0].genreName}`
            } else if (source === 'tmdb_similar' && userData.likedMovies.length > 0) {
                const sourceMovie = userData.likedMovies[0]
                reason = `Similar to ${getTitle(sourceMovie)}`
            }

            return {
                content,
                source,
                score,
                reason,
                generatedAt: Date.now(),
            }
        })

        // Return response
        return NextResponse.json({
            success: true,
            recommendations,
            profile: {
                topGenres: profile.topGenres.slice(0, 3),
                preferredRating: profile.preferredRating,
            },
            totalCount: recommendations.length,
            generatedAt: Date.now(),
        })
    } catch (error) {
        apiError('Error generating personalized recommendations:', error)
        return NextResponse.json(
            {
                success: false,
                error:
                    error instanceof Error ? error.message : 'Failed to generate recommendations',
            },
            { status: 500 }
        )
    }
}

// Export authenticated handler
export const POST = withAuth(handlePersonalizedRecommendations)
