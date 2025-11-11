/**
 * Personalized Recommendations API
 *
 * GET /api/recommendations/personalized
 * Returns personalized content recommendations based on user's preferences
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

export async function GET(request: NextRequest) {
    try {
        // Get user ID from header
        const userId = request.headers.get('x-user-id')
        if (!userId) {
            return NextResponse.json(
                { success: false, error: 'Authentication required' },
                { status: 401 }
            )
        }

        // Get query parameters
        const searchParams = request.nextUrl.searchParams
        const limit = Math.min(
            parseInt(searchParams.get('limit') || '20', 10),
            RECOMMENDATION_CONSTRAINTS.MAX_LIMIT
        )

        // Get user data from request body (passed from client)
        const userData = {
            userId,
            likedMovies: JSON.parse(searchParams.get('likedMovies') || '[]') as Content[],
            defaultWatchlist: JSON.parse(searchParams.get('watchlist') || '[]') as Content[],
            hiddenMovies: JSON.parse(searchParams.get('hiddenMovies') || '[]') as Content[],
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
        console.error('Error generating personalized recommendations:', error)
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
