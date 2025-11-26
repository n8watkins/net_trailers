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
    UserGenrePreference,
    UserContentPreference,
    UserVotedContent,
} from '@/utils/recommendations/genreEngine'
import { getBatchSimilarContent } from '@/utils/tmdb/recommendations'
import { Recommendation, RECOMMENDATION_CONSTRAINTS } from '@/types/recommendations'
import { Content, getTitle } from '@/typings'
import { withAuth } from '@/lib/auth-middleware'
import { apiError } from '@/utils/debugLogger'
import { VotedContent, RatedContent } from '@/types/shared'

async function handlePersonalizedRecommendations(
    request: NextRequest,
    userId: string
): Promise<NextResponse> {
    try {
        // Get user data from request body
        const body = await request.json()
        const limit = Math.min(body.limit || 20, RECOMMENDATION_CONSTRAINTS.MAX_LIMIT)

        // Support both new myRatings format and legacy likedMovies/hiddenMovies
        const myRatings = (body.myRatings || []) as RatedContent[]

        // Extract liked/hidden from myRatings if available, otherwise use legacy
        let likedMovies: Content[]
        let hiddenMovies: Content[]

        if (myRatings.length > 0) {
            // New system: extract from myRatings
            likedMovies = myRatings
                .filter((r) => r.rating === 'like')
                .map((r) => r.content)
            hiddenMovies = myRatings
                .filter((r) => r.rating === 'dislike')
                .map((r) => r.content)
        } else {
            // Legacy system: use separate arrays
            likedMovies = (body.likedMovies || []) as Content[]
            hiddenMovies = (body.hiddenMovies || []) as Content[]
        }

        const userData = {
            userId,
            likedMovies,
            defaultWatchlist: (body.watchlist || []) as Content[],
            collectionItems: (body.collectionItems || []) as Content[], // Items from all user collections
            hiddenMovies,
        }

        // Get user preferences from preference customizer
        const genrePreferences = (body.genrePreferences || []) as UserGenrePreference[]
        const contentPreferences = (body.contentPreferences || []) as UserContentPreference[]
        const rawVotedContent = (body.votedContent || []) as VotedContent[]

        // Build a map of content IDs to genre IDs from all user collections
        // This allows us to extract genre signals from title votes
        const contentGenreMap = new Map<string, number[]>()
        const allContent = [
            ...userData.likedMovies,
            ...userData.defaultWatchlist,
            ...userData.collectionItems,
            ...userData.hiddenMovies,
        ]
        allContent.forEach((content) => {
            if (content.genre_ids && content.genre_ids.length > 0) {
                const key = `${content.id}-${content.media_type}`
                contentGenreMap.set(key, content.genre_ids)
            }
        })

        // Enrich votedContent with genre IDs for the recommendation engine
        // Also include ratings from myRatings for vote signals
        let votedContent: UserVotedContent[]

        if (myRatings.length > 0) {
            // Convert myRatings to votedContent format
            votedContent = myRatings.map((r) => ({
                contentId: r.content.id,
                mediaType: r.content.media_type as 'movie' | 'tv',
                vote: r.rating,
                votedAt: r.ratedAt,
                genreIds: r.content.genre_ids || undefined,
            }))
        } else {
            // Legacy: use rawVotedContent
            votedContent = rawVotedContent.map((vote) => {
                const key = `${vote.contentId}-${vote.mediaType}`
                return {
                    contentId: vote.contentId,
                    mediaType: vote.mediaType,
                    vote: vote.vote,
                    votedAt: vote.votedAt,
                    genreIds: contentGenreMap.get(key) || undefined,
                }
            })
        }

        // Extract content IDs that user marked as "dislike" to exclude
        const dislikedContentIds = votedContent
            .filter((v) => v.vote === 'dislike')
            .map((v) => v.contentId)

        // Check if user has enough data (preferences and votes also count)
        const hasPreferenceData =
            genrePreferences.length > 0 || contentPreferences.length > 0 || votedContent.length > 0
        if (!hasEnoughDataForRecommendations(userData) && !hasPreferenceData) {
            return NextResponse.json({
                success: true,
                recommendations: [],
                message:
                    'Not enough user data for personalized recommendations. Add items to your watchlist or like some content to get started.',
                requiresData: true,
            })
        }

        // Build recommendation profile (includes user preferences and title votes with genre signals)
        const profile = buildRecommendationProfile(
            userData,
            genrePreferences,
            contentPreferences,
            votedContent
        )

        // Get content IDs to exclude (already seen + "not for me" votes)
        const seenIds = getSeenContentIds(userData)
        const excludeIds = [...new Set([...seenIds, ...dislikedContentIds])]

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
