/**
 * Personalized Recommendations API
 *
 * POST /api/recommendations/personalized - Initial fetch with full user data
 * GET /api/recommendations/personalized?page=N - Pagination for infinite scroll
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
import {
    Recommendation,
    RECOMMENDATION_CONSTRAINTS,
    RecommendationFeedback,
    FEEDBACK_CONSTRAINTS,
} from '@/types/recommendations'
import { Content, getTitle } from '@/typings'
import { withAuth } from '@/lib/auth-middleware'
import { apiError } from '@/utils/debugLogger'
import { VotedContent, RatedContent } from '@/types/shared'
import { getAdminDb } from '@/lib/firebase-admin'
import { InteractionSummary } from '@/utils/recommendations/interactionAggregator'
import {
    processFeedback,
    applyFeedbackToRecommendations,
    calculateEngagementMetrics,
} from '@/utils/recommendations/feedbackProcessor'

async function handlePersonalizedRecommendations(
    request: NextRequest,
    userId: string
): Promise<NextResponse> {
    try {
        // Get user data from request body
        const body = await request.json()
        const limit = Math.min(body.limit || 20, RECOMMENDATION_CONSTRAINTS.MAX_LIMIT)
        const page = Math.max(1, parseInt(body.page as string) || 1) // Default to page 1

        // V2: Check for interaction summary (Phase 1 - Deep History)
        const interactionSummary = body.interactionSummary as InteractionSummary | undefined

        // Support both new myRatings format and legacy likedMovies/hiddenMovies
        const myRatings = (body.myRatings || []) as RatedContent[]

        // Extract liked/hidden from myRatings if available, otherwise use legacy
        let likedMovies: Content[]
        let hiddenMovies: Content[]

        if (myRatings.length > 0) {
            // New system: extract from myRatings
            likedMovies = myRatings.filter((r) => r.rating === 'like').map((r) => r.content)
            hiddenMovies = myRatings.filter((r) => r.rating === 'dislike').map((r) => r.content)
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

        // V2: Add negative signals from interaction summary
        const negativeContentIds = interactionSummary?.negativeSignals.hiddenContent || []

        // Check if user has enough data (preferences and votes also count)
        // V2: Interaction summary also counts as preference data
        const hasPreferenceData =
            genrePreferences.length > 0 ||
            contentPreferences.length > 0 ||
            votedContent.length > 0 ||
            (interactionSummary && interactionSummary.totalInteractions > 0)

        if (!hasEnoughDataForRecommendations(userData) && !hasPreferenceData) {
            return NextResponse.json({
                success: true,
                recommendations: [],
                message:
                    'Add at least one item to your watchlist or like some content to see personalized recommendations.',
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

        // Phase 2: Fetch recent feedback data for learning
        let feedbackSignals: ReturnType<typeof processFeedback> | null = null
        let engagementMetrics: ReturnType<typeof calculateEngagementMetrics> | null = null

        try {
            const db = getAdminDb()
            const thirtyDaysAgo =
                Date.now() - FEEDBACK_CONSTRAINTS.RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000

            const feedbackSnapshot = await db
                .collection('recommendation_feedback')
                .where('userId', '==', userId)
                .where('timestamp', '>=', thirtyDaysAgo)
                .orderBy('timestamp', 'desc')
                .limit(500)
                .get()

            if (!feedbackSnapshot.empty) {
                const feedback: RecommendationFeedback[] = []
                feedbackSnapshot.forEach((doc) => {
                    feedback.push(doc.data() as RecommendationFeedback)
                })

                console.log(
                    `[Phase 2] Fetched ${feedback.length} feedback entries for user ${userId}`
                )

                // Process feedback to extract signals
                feedbackSignals = processFeedback(feedback, contentGenreMap)

                // Calculate engagement metrics for analytics
                engagementMetrics = calculateEngagementMetrics(feedback)

                console.log(
                    `[Phase 2] Engagement: ${engagementMetrics.viewRate.toFixed(1)}% view rate, ${engagementMetrics.engagementRate.toFixed(1)}% engagement rate`
                )
            }
        } catch (error) {
            console.warn('[Phase 2] Failed to fetch feedback, continuing without it:', error)
            // Continue without feedback - don't block recommendations
        }

        // Get content IDs to exclude (already seen + "not for me" votes + negative signals + dismissed/hidden from feedback)
        const seenIds = getSeenContentIds(userData)
        const feedbackExcludeIds = feedbackSignals
            ? Array.from(feedbackSignals.excludedContentIds)
            : []
        const excludeIds = [
            ...new Set([
                ...seenIds,
                ...dislikedContentIds,
                ...negativeContentIds,
                ...feedbackExcludeIds,
            ]),
        ]

        // Generate recommendations from multiple sources
        // For page 1, use 60/40 split between genre and similar
        // For subsequent pages, focus more on genre-based (80/20) for better variety
        const genreWeight = page === 1 ? 0.6 : 0.8
        const similarWeight = page === 1 ? 0.4 : 0.2

        // V2: Use top content from interaction summary for better similar content
        let similarContentIds: number[] = []
        if (interactionSummary && interactionSummary.topContent.length > 0) {
            // Use top 5 most-interacted content for similarity
            similarContentIds = interactionSummary.topContent
                .filter((item) => item.mediaType === 'movie') // getBatchSimilarContent expects movies
                .slice(0, 5)
                .map((item) => item.contentId)
        } else if (userData.likedMovies.length > 0) {
            // Fallback to first 3 liked movies (V1 behavior)
            similarContentIds = userData.likedMovies.slice(0, 3).map((c) => c.id)
        }

        const [genreBased, tmdbSimilar] = await Promise.all([
            // Genre-based recommendations with pagination
            getGenreBasedRecommendations(profile, Math.ceil(limit * genreWeight), excludeIds, page),

            // TMDB similar content - only for page 1 and if we have content to base it on
            page === 1 && similarContentIds.length > 0
                ? getBatchSimilarContent(
                      similarContentIds,
                      'movie',
                      Math.ceil(limit * similarWeight)
                  ).then((results) => results.filter((c) => !excludeIds.includes(c.id)))
                : Promise.resolve([]),
        ])

        // Merge recommendations with diversity
        let mergedContent = mergeRecommendations([genreBased, tmdbSimilar], limit)

        // Phase 2: Apply feedback signals to filter and boost recommendations
        if (feedbackSignals) {
            mergedContent = applyFeedbackToRecommendations(mergedContent, feedbackSignals)
            console.log(
                `[Phase 2] Applied feedback: filtered ${feedbackSignals.excludedContentIds.size} excluded items`
            )
        }

        // V2: Filter out content from disliked genres (3+ dislikes)
        const hiddenGenreIds = interactionSummary?.negativeSignals.hiddenGenres || []
        if (hiddenGenreIds.length > 0) {
            mergedContent = mergedContent.filter((content) => {
                // Check if content has any of the hidden genres
                const contentGenres = content.genre_ids || []
                const hasHiddenGenre = contentGenres.some((genreId) =>
                    hiddenGenreIds.includes(genreId)
                )
                return !hasHiddenGenre
            })
        }

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

        // Return response with V2 metadata if interaction summary was used
        return NextResponse.json({
            success: true,
            recommendations,
            profile: {
                topGenres: profile.topGenres.slice(0, 3),
                preferredRating: profile.preferredRating,
                // V2: Include interaction summary metadata
                ...(interactionSummary && {
                    v2Enabled: true,
                    totalInteractions: interactionSummary.totalInteractions,
                    summaryAge: Date.now() - interactionSummary.lastCalculated,
                }),
            },
            // Phase 2: Include feedback-based engagement metrics
            ...(engagementMetrics && {
                feedback: {
                    enabled: true,
                    metrics: engagementMetrics,
                    excludedCount: feedbackSignals?.excludedContentIds.size || 0,
                    boostedCount: feedbackSignals?.positiveSignals.size || 0,
                },
            }),
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

/**
 * GET handler for infinite scroll pagination
 * Uses cached user profile from Firestore to avoid sending full user data on each request
 */
async function handlePersonalizedRecommendationsGet(
    request: NextRequest,
    userId: string
): Promise<NextResponse> {
    try {
        const { searchParams } = new URL(request.url)
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
        const limit = Math.min(
            parseInt(searchParams.get('limit') || '40'), // Increased default from 20 to 40
            RECOMMENDATION_CONSTRAINTS.MAX_LIMIT
        )

        // Get already-shown IDs from client to avoid duplicates
        const excludeParam = searchParams.get('exclude')
        const clientExcludeIds = excludeParam
            ? excludeParam
                  .split(',')
                  .map((id) => parseInt(id.trim()))
                  .filter((id) => !isNaN(id))
            : []

        // For GET requests (pagination), we need to fetch user data from Firestore
        // This is acceptable because pagination is infrequent (only when scrolling to end)
        const db = getAdminDb()
        const userDoc = await db.collection('users').doc(userId).get()

        if (!userDoc.exists) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'User not found',
                },
                { status: 404 }
            )
        }

        const userData = userDoc.data()
        if (!userData) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'User data not found',
                },
                { status: 404 }
            )
        }

        // Extract user preferences from Firestore
        const myRatings = (userData.myRatings || []) as RatedContent[]
        const genrePreferences = (userData.genrePreferences || []) as UserGenrePreference[]

        // Build minimal user data for recommendations
        let likedMovies: Content[]
        let hiddenMovies: Content[]

        if (myRatings.length > 0) {
            likedMovies = myRatings.filter((r) => r.rating === 'like').map((r) => r.content)
            hiddenMovies = myRatings.filter((r) => r.rating === 'dislike').map((r) => r.content)
        } else {
            // Legacy format
            likedMovies = (userData.likedMovies || []) as Content[]
            hiddenMovies = (userData.hiddenMovies || []) as Content[]
        }

        // CRITICAL: Also fetch watchlist and collection items to exclude from recommendations
        // Without this, pagination will return content the user already has, causing duplicate pages
        const watchlist = (userData.defaultWatchlist || []) as Content[]

        // Extract all items from user's collections
        const collectionItems: Content[] = []
        const userCreatedWatchlists = userData.userCreatedWatchlists || []
        for (const collection of userCreatedWatchlists) {
            if (collection.items && Array.isArray(collection.items)) {
                collectionItems.push(...collection.items)
            }
        }

        const userDataForRec = {
            userId,
            likedMovies: likedMovies.slice(0, 10),
            defaultWatchlist: watchlist.slice(0, 10), // Include watchlist for exclusion
            collectionItems: collectionItems.slice(0, 20), // Include collection items for exclusion
            hiddenMovies: hiddenMovies.slice(0, 10),
        }

        // Build recommendation profile
        const profile = buildRecommendationProfile(userDataForRec, genrePreferences)

        // Get content IDs to exclude (now includes watchlist + collections + client-shown)
        const seenIds = getSeenContentIds(userDataForRec)
        const excludeIds = [...new Set([...seenIds, ...clientExcludeIds])]

        // For page > 1, focus on genre-based recommendations (80% weight)
        const genreWeight = page === 1 ? 0.6 : 0.8
        const similarWeight = page === 1 ? 0.4 : 0.2

        // Generate recommendations (primarily genre-based for pagination)
        let genreBased = await getGenreBasedRecommendations(
            profile,
            Math.ceil(limit * genreWeight),
            excludeIds,
            page
        )

        // Fallback strategy: If genre-based is exhausted (empty or very few results),
        // mix in TMDB similar content and trending to keep the infinite scroll going
        const needsFallback = genreBased.length < limit / 2

        if (needsFallback) {
            // Try TMDB similar content if user has liked movies
            const fallbackContent: Content[] = []

            if (userDataForRec.likedMovies.length > 0) {
                const similarContent = await getBatchSimilarContent(
                    userDataForRec.likedMovies.slice(0, 3).map((c) => c.id),
                    'movie',
                    Math.ceil(limit * similarWeight)
                )
                fallbackContent.push(...similarContent.filter((c) => !excludeIds.includes(c.id)))
            }

            // If still not enough, fetch trending content as last resort
            // Use page number to vary the content and avoid returning same trending items
            if (genreBased.length + fallbackContent.length < limit / 2) {
                try {
                    // Alternate between movie and TV trending to increase variety
                    const useTvTrending = page % 2 === 0
                    const trendingEndpoint = useTvTrending
                        ? '/api/tv/trending'
                        : '/api/movies/trending'

                    // Use page number as offset to get different trending content each time
                    // TMDB trending endpoint supports time_window and page params
                    const trendingPage = Math.ceil(page / 2) // Converts page 1,2->1, 3,4->2, etc.

                    const trendingResponse = await fetch(
                        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}${trendingEndpoint}?page=${trendingPage}`
                    )
                    if (trendingResponse.ok) {
                        const trendingData = await trendingResponse.json()
                        const trending = (trendingData.results || []).filter(
                            (c: Content) => !excludeIds.includes(c.id)
                        )
                        fallbackContent.push(...trending.slice(0, limit - genreBased.length))
                    }
                } catch (error) {
                    console.error('Failed to fetch trending fallback:', error)
                }
            }

            // Merge genre-based with fallback content
            genreBased = [...genreBased, ...fallbackContent.slice(0, limit - genreBased.length)]
        }

        // Return TMDB-compatible format for Row component
        // Always return total_pages: 100 even if this page has few/no results
        // This ensures infinite scroll continues trying to load more content
        return NextResponse.json({
            page,
            results: genreBased.map((content) => ({
                ...content,
                media_type: content.media_type || 'movie',
            })),
            total_pages: 100, // Allow up to 100 pages (ensures continued loading)
            total_results: genreBased.length,
        })
    } catch (error) {
        apiError('Error generating paginated recommendations:', error)
        return NextResponse.json(
            {
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : 'Failed to generate paginated recommendations',
            },
            { status: 500 }
        )
    }
}

// Export authenticated handlers
export const POST = withAuth(handlePersonalizedRecommendations)
export const GET = withAuth(handlePersonalizedRecommendationsGet)
