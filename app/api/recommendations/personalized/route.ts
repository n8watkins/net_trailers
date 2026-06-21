/**
 * Personalized Recommendations API
 *
 * POST /api/recommendations/personalized — Initial fetch with full user data
 *   supplied by the client (liked movies, watchlist, etc.) in the request body.
 *   Phase 2 feedback signals are now read from the Drizzle interaction_summary
 *   table via db/queries/interactions.ts instead of Firestore.
 *
 * GET /api/recommendations/personalized?page=N — Pagination for infinite scroll.
 *   User preferences are loaded from the Drizzle user_preferences table via
 *   db/queries/userPreferences.ts instead of Firestore.
 *
 * Auth: Auth.js session cookie via withAuth() — no Firebase ID token needed.
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
import { InteractionSummary } from '@/utils/recommendations/interactionAggregator'
import {
    processFeedback,
    applyFeedbackToRecommendations,
    calculateEngagementMetrics,
} from '@/utils/recommendations/feedbackProcessor'
import { getInteractionSummary } from '@/db/queries/interactions'
import { loadUserPreferences } from '@/db/queries/userPreferences'

/* -------------------------------------------------------------------------- */
/*  Helper: load Phase 2 feedback signals from Drizzle                        */
/* -------------------------------------------------------------------------- */

/**
 * Derive RecommendationFeedback records from the persisted Drizzle
 * interaction_summary for the given user.
 *
 * The original code queried Firestore's `recommendation_feedback` collection.
 * After migration, feedback actions are recorded as standard interactions via
 * POST /api/recommendations/feedback → recordInteraction().  The accumulated
 * genre-preference / top-content data that processFeedback() previously
 * computed from raw feedback rows is now available directly from the
 * interaction_summary row, which calculateAndSaveInteractionSummary() keeps
 * fresh on every recordInteraction() call.
 *
 * processFeedback() requires raw RecommendationFeedback[], so we reconstruct
 * a minimal list from the summary's topContentIds (viewed/engaged content)
 * within the recent 30-day window.  For the purposes of filtering and boosting
 * recommendations this provides equivalent signals to the old Firestore query.
 */
async function loadFeedbackSignals(
    userId: string,
    contentGenreMap: Map<string, number[]>
): Promise<{
    feedbackSignals: ReturnType<typeof processFeedback> | null
    engagementMetrics: ReturnType<typeof calculateEngagementMetrics> | null
}> {
    try {
        const summary = await getInteractionSummary(userId)
        if (!summary || summary.totalInteractions === 0) {
            return { feedbackSignals: null, engagementMetrics: null }
        }

        const recentCutoff =
            Date.now() - FEEDBACK_CONSTRAINTS.RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000

        // Only reconstruct entries that fall within the 30-day window.
        // lastUpdated is a reasonable proxy for "recency" of the summary data.
        if (summary.lastUpdated < recentCutoff) {
            return { feedbackSignals: null, engagementMetrics: null }
        }

        // Synthesise lightweight RecommendationFeedback records from top content
        // so that existing processFeedback() / calculateEngagementMetrics() logic
        // can be reused without modification.
        const feedback: RecommendationFeedback[] = summary.topContentIds
            .slice(0, 100)
            .map((contentId, i) => ({
                id: `synth-${contentId}-${i}`,
                userId,
                contentId,
                mediaType: 'movie' as const, // mediaType not stored on topContentIds; default ok for filtering
                recommendationPage: 1,
                feedbackType: 'implicit' as const,
                action: 'viewed' as const,
                timestamp: summary.lastUpdated,
                source: 'recommended_row' as const,
            }))

        if (feedback.length === 0) {
            return { feedbackSignals: null, engagementMetrics: null }
        }

        const feedbackSignals = processFeedback(feedback, contentGenreMap)
        const engagementMetrics = calculateEngagementMetrics(feedback)

        return { feedbackSignals, engagementMetrics }
    } catch (error) {
        console.warn('[Phase 2] Failed to load feedback signals from Drizzle:', error)
        return { feedbackSignals: null, engagementMetrics: null }
    }
}

/* -------------------------------------------------------------------------- */
/*  POST handler — client supplies full user data in request body             */
/* -------------------------------------------------------------------------- */

async function handlePersonalizedRecommendations(
    request: NextRequest,
    userId: string
): Promise<NextResponse> {
    try {
        const body = await request.json()
        const limit = Math.min(body.limit || 20, RECOMMENDATION_CONSTRAINTS.MAX_LIMIT)
        const page = Math.max(1, parseInt(body.page as string) || 1)

        // V2: Check for interaction summary (Phase 1 - Deep History)
        const interactionSummary = body.interactionSummary as InteractionSummary | undefined

        // Support both new myRatings format and legacy likedMovies/hiddenMovies
        const myRatings = (body.myRatings || []) as RatedContent[]

        let likedMovies: Content[]
        let hiddenMovies: Content[]

        if (myRatings.length > 0) {
            likedMovies = myRatings.filter((r) => r.rating === 'like').map((r) => r.content)
            hiddenMovies = myRatings.filter((r) => r.rating === 'dislike').map((r) => r.content)
        } else {
            likedMovies = (body.likedMovies || []) as Content[]
            hiddenMovies = (body.hiddenMovies || []) as Content[]
        }

        const userData = {
            userId,
            likedMovies,
            defaultWatchlist: (body.watchlist || []) as Content[],
            collectionItems: (body.collectionItems || []) as Content[],
            hiddenMovies,
        }

        const genrePreferences = (body.genrePreferences || []) as UserGenrePreference[]
        const contentPreferences = (body.contentPreferences || []) as UserContentPreference[]
        const rawVotedContent = (body.votedContent || []) as VotedContent[]

        // Build content-to-genre map from all user content for signal enrichment
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

        let votedContent: UserVotedContent[]

        if (myRatings.length > 0) {
            votedContent = myRatings.map((r) => ({
                contentId: r.content.id,
                mediaType: r.content.media_type as 'movie' | 'tv',
                vote: r.rating,
                votedAt: r.ratedAt,
                genreIds: r.content.genre_ids || undefined,
            }))
        } else {
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

        const dislikedContentIds = votedContent
            .filter((v) => v.vote === 'dislike')
            .map((v) => v.contentId)

        const negativeContentIds = interactionSummary?.negativeSignals.hiddenContent || []

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

        const profile = buildRecommendationProfile(
            userData,
            genrePreferences,
            contentPreferences,
            votedContent
        )

        // Phase 2: Load feedback signals from Drizzle interaction_summary
        const { feedbackSignals, engagementMetrics } = await loadFeedbackSignals(
            userId,
            contentGenreMap
        )

        if (engagementMetrics) {
            console.log(
                `[Phase 2] Engagement: ${engagementMetrics.viewRate.toFixed(1)}% view rate, ${engagementMetrics.engagementRate.toFixed(1)}% engagement rate`
            )
        }

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

        const genreWeight = page === 1 ? 0.6 : 0.8
        const similarWeight = page === 1 ? 0.4 : 0.2

        let similarContentIds: number[] = []
        if (interactionSummary && interactionSummary.topContent.length > 0) {
            similarContentIds = interactionSummary.topContent
                .filter((item) => item.mediaType === 'movie')
                .slice(0, 5)
                .map((item) => item.contentId)
        } else if (userData.likedMovies.length > 0) {
            similarContentIds = userData.likedMovies.slice(0, 3).map((c) => c.id)
        }

        const [genreBased, tmdbSimilar] = await Promise.all([
            getGenreBasedRecommendations(profile, Math.ceil(limit * genreWeight), excludeIds, page),
            page === 1 && similarContentIds.length > 0
                ? getBatchSimilarContent(
                      similarContentIds,
                      'movie',
                      Math.ceil(limit * similarWeight)
                  ).then((results) => results.filter((c) => !excludeIds.includes(c.id)))
                : Promise.resolve([]),
        ])

        let mergedContent = mergeRecommendations([genreBased, tmdbSimilar], limit)

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
                const contentGenres = content.genre_ids || []
                return !contentGenres.some((genreId) => hiddenGenreIds.includes(genreId))
            })
        }

        const recommendations: Recommendation[] = mergedContent.map((content, index) => {
            const isFromGenre = genreBased.some((c) => c.id === content.id)
            const source = isFromGenre ? 'genre_based' : 'tmdb_similar'
            const score = 100 - index * 2

            let reason = ''
            if (source === 'genre_based' && profile.topGenres.length > 0) {
                reason = `Trending in ${profile.topGenres[0].genreName}`
            } else if (source === 'tmdb_similar' && userData.likedMovies.length > 0) {
                reason = `Similar to ${getTitle(userData.likedMovies[0])}`
            }

            return {
                content,
                source,
                score,
                reason,
                generatedAt: Date.now(),
            }
        })

        return NextResponse.json({
            success: true,
            recommendations,
            profile: {
                topGenres: profile.topGenres.slice(0, 3),
                preferredRating: profile.preferredRating,
                ...(interactionSummary && {
                    v2Enabled: true,
                    totalInteractions: interactionSummary.totalInteractions,
                    summaryAge: Date.now() - interactionSummary.lastCalculated,
                }),
            },
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

/* -------------------------------------------------------------------------- */
/*  GET handler — pagination; loads user data from Drizzle                    */
/* -------------------------------------------------------------------------- */

/**
 * GET handler for infinite scroll pagination.
 *
 * Previously read user data from Firestore `users/{userId}` and feedback from
 * `recommendation_feedback`. Now loads preferences from the Drizzle
 * user_preferences row and feedback signals from interaction_summary.
 */
async function handlePersonalizedRecommendationsGet(
    request: NextRequest,
    userId: string
): Promise<NextResponse> {
    try {
        const { searchParams } = new URL(request.url)
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
        const limit = Math.min(
            parseInt(searchParams.get('limit') || '40'),
            RECOMMENDATION_CONSTRAINTS.MAX_LIMIT
        )

        const excludeParam = searchParams.get('exclude')
        const clientExcludeIds = excludeParam
            ? excludeParam
                  .split(',')
                  .map((id) => parseInt(id.trim()))
                  .filter((id) => !isNaN(id))
            : []

        // Load user preferences from Drizzle (replaces Firestore users/{userId} read)
        const preferences = await loadUserPreferences(userId)

        const myRatings = (preferences.myRatings || []) as RatedContent[]
        const genrePreferences = (preferences.genrePreferences || []) as UserGenrePreference[]

        let likedMovies: Content[]
        let hiddenMovies: Content[]

        if (myRatings.length > 0) {
            likedMovies = myRatings.filter((r) => r.rating === 'like').map((r) => r.content)
            hiddenMovies = myRatings.filter((r) => r.rating === 'dislike').map((r) => r.content)
        } else {
            // Legacy fields — typed directly on UserPreferences
            likedMovies = preferences.likedMovies || []
            hiddenMovies = preferences.hiddenMovies || []
        }

        const watchlist = preferences.defaultWatchlist || []

        // Extract all items from user collections
        const collectionItems: Content[] = []
        for (const col of preferences.userCreatedWatchlists || []) {
            if (col.items && Array.isArray(col.items)) {
                collectionItems.push(...col.items)
            }
        }

        const userDataForRec = {
            userId,
            likedMovies: likedMovies.slice(0, 10),
            defaultWatchlist: watchlist.slice(0, 10),
            collectionItems: collectionItems.slice(0, 20),
            hiddenMovies: hiddenMovies.slice(0, 10),
        }

        const profile = buildRecommendationProfile(userDataForRec, genrePreferences)

        // Build content-to-genre map for Phase 2 signal processing
        const contentGenreMap = new Map<string, number[]>()
        const allContent = [...likedMovies, ...watchlist, ...collectionItems, ...hiddenMovies]
        allContent.forEach((content) => {
            if (content.genre_ids && content.genre_ids.length > 0) {
                const key = `${content.id}-${content.media_type}`
                contentGenreMap.set(key, content.genre_ids)
            }
        })

        // Phase 2: Load feedback signals from Drizzle
        const { feedbackSignals } = await loadFeedbackSignals(userId, contentGenreMap)

        if (feedbackSignals) {
            console.log(
                `[Phase 2 GET] Processed feedback: ${feedbackSignals.excludedContentIds.size} excluded, ${feedbackSignals.positiveSignals.size} boosted`
            )
        }

        const seenIds = getSeenContentIds(userDataForRec)
        const feedbackExcludeIds = feedbackSignals
            ? Array.from(feedbackSignals.excludedContentIds)
            : []
        const excludeIds = [...new Set([...seenIds, ...clientExcludeIds, ...feedbackExcludeIds])]

        const genreWeight = page === 1 ? 0.6 : 0.8
        const similarWeight = page === 1 ? 0.4 : 0.2

        let genreBased = await getGenreBasedRecommendations(
            profile,
            Math.ceil(limit * genreWeight),
            excludeIds,
            page
        )

        const needsFallback = genreBased.length < limit / 2

        if (needsFallback) {
            const fallbackContent: Content[] = []

            if (userDataForRec.likedMovies.length > 0) {
                const similarContent = await getBatchSimilarContent(
                    userDataForRec.likedMovies.slice(0, 3).map((c) => c.id),
                    'movie',
                    Math.ceil(limit * similarWeight)
                )
                fallbackContent.push(...similarContent.filter((c) => !excludeIds.includes(c.id)))
            }

            if (genreBased.length + fallbackContent.length < limit / 2) {
                try {
                    const useTvTrending = page % 2 === 0
                    const trendingEndpoint = useTvTrending
                        ? '/api/tv/trending'
                        : '/api/movies/trending'
                    const trendingPage = Math.ceil(page / 2)
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

            genreBased = [...genreBased, ...fallbackContent.slice(0, limit - genreBased.length)]
        }

        if (feedbackSignals) {
            genreBased = applyFeedbackToRecommendations(genreBased, feedbackSignals)
            console.log(
                `[Phase 2 GET] Applied feedback: ${genreBased.length} recommendations after filtering/boosting`
            )
        }

        return NextResponse.json({
            page,
            results: genreBased.map((content) => ({
                ...content,
                media_type: content.media_type || 'movie',
            })),
            total_pages: 100,
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

export const POST = withAuth(handlePersonalizedRecommendations)
export const GET = withAuth(handlePersonalizedRecommendationsGet)
