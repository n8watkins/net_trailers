/**
 * Recommendation Feedback Processor
 * Phase 2: Feedback Loop Integration
 *
 * Analyzes user feedback on recommended content and uses it to improve future recommendations.
 */

import { RecommendationFeedback, FeedbackAction } from '@/types/recommendations'
import { Content } from '@/typings'

export interface FeedbackSignals {
    /** Content IDs that should be completely excluded (dismissed, hidden) */
    excludedContentIds: Set<number>

    /** Content IDs that received positive signals (liked, watchlisted) */
    positiveSignals: Map<number, number> // contentId -> boost score

    /** Content IDs that were viewed (implicit interest) */
    viewedContentIds: Set<number>

    /** Genre IDs that received positive signals (from liked/watchlisted content) */
    positiveGenres: Map<number, number> // genreId -> count

    /** Genre IDs that received negative signals (from dismissed/hidden content) */
    negativeGenres: Map<number, number> // genreId -> count
}

/**
 * Process feedback entries to extract actionable signals
 */
export function processFeedback(
    feedback: RecommendationFeedback[],
    contentGenreMap: Map<string, number[]>
): FeedbackSignals {
    const excludedContentIds = new Set<number>()
    const positiveSignals = new Map<number, number>()
    const viewedContentIds = new Set<number>()
    const positiveGenres = new Map<number, number>()
    const negativeGenres = new Map<number, number>()

    // Action weights for scoring
    const actionWeights: Record<FeedbackAction, number> = {
        liked: 10, // Strong positive signal
        watchlisted: 8, // Strong positive signal
        viewed: 1, // Weak positive signal (passive interest)
        dismissed: -10, // Strong negative signal (exclude)
        hidden: -10, // Strong negative signal (exclude)
        scrolled_past: 0, // Neutral (no action taken)
    }

    for (const entry of feedback) {
        const { contentId, action, mediaType } = entry

        // Handle negative actions (exclude from future recommendations)
        if (action === 'dismissed' || action === 'hidden') {
            excludedContentIds.add(contentId)

            // Track negative genre signals
            const key = `${contentId}-${mediaType}`
            const genres = contentGenreMap.get(key) || []
            for (const genreId of genres) {
                negativeGenres.set(genreId, (negativeGenres.get(genreId) || 0) + 1)
            }
            continue
        }

        // Handle positive actions (boost in future recommendations)
        if (action === 'liked' || action === 'watchlisted') {
            const weight = actionWeights[action]
            positiveSignals.set(contentId, (positiveSignals.get(contentId) || 0) + weight)

            // Track positive genre signals
            const key = `${contentId}-${mediaType}`
            const genres = contentGenreMap.get(key) || []
            for (const genreId of genres) {
                positiveGenres.set(genreId, (positiveGenres.get(genreId) || 0) + 1)
            }
        }

        // Track viewed content (implicit interest)
        if (action === 'viewed') {
            viewedContentIds.add(contentId)
        }
    }

    return {
        excludedContentIds,
        positiveSignals,
        viewedContentIds,
        positiveGenres,
        negativeGenres,
    }
}

/**
 * Apply feedback signals to recommendations
 * Returns filtered and re-scored recommendations
 */
export function applyFeedbackToRecommendations(
    content: Content[],
    signals: FeedbackSignals
): Content[] {
    // Filter out excluded content
    let filtered = content.filter((item) => !signals.excludedContentIds.has(item.id))

    // Apply score boosts based on feedback (modify vote_average as proxy for score)
    // This affects sorting in the recommendation engine
    filtered = filtered.map((item) => {
        const boost = signals.positiveSignals.get(item.id) || 0

        if (boost > 0) {
            // Create a new object to avoid mutating the original
            return {
                ...item,
                vote_average: Math.min(10, (item.vote_average || 0) + boost * 0.1), // Small boost
                _feedbackBoost: boost, // Track for debugging
            }
        }

        return item
    })

    return filtered
}

/**
 * Calculate engagement rate for analytics
 * Useful for understanding how users interact with recommendations
 */
export function calculateEngagementMetrics(feedback: RecommendationFeedback[]): {
    totalShown: number
    totalViewed: number
    totalEngaged: number // liked, watchlisted, dismissed, hidden
    viewRate: number // % of shown content that was viewed
    engagementRate: number // % of shown content that received explicit action
} {
    const uniqueContentShown = new Set<string>()
    const uniqueContentViewed = new Set<string>()
    const uniqueContentEngaged = new Set<string>()

    for (const entry of feedback) {
        const key = `${entry.contentId}-${entry.mediaType}`
        uniqueContentShown.add(key)

        if (entry.action === 'viewed') {
            uniqueContentViewed.add(key)
        }

        if (['liked', 'watchlisted', 'dismissed', 'hidden'].includes(entry.action)) {
            uniqueContentEngaged.add(key)
        }
    }

    const totalShown = uniqueContentShown.size
    const totalViewed = uniqueContentViewed.size
    const totalEngaged = uniqueContentEngaged.size

    return {
        totalShown,
        totalViewed,
        totalEngaged,
        viewRate: totalShown > 0 ? (totalViewed / totalShown) * 100 : 0,
        engagementRate: totalShown > 0 ? (totalEngaged / totalShown) * 100 : 0,
    }
}
