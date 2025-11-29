/**
 * Interaction Aggregator - Phase 1: Deep History Utilization
 *
 * Aggregates full user interaction history into compact summaries for
 * improved recommendation personalization. Replaces shallow 10-20 item
 * slices with comprehensive weighted analysis.
 */

import { UserInteraction, INTERACTION_WEIGHTS, GenrePreference } from '@/types/interactions'
import { RatedContent } from '@/types/shared'

/**
 * Time ranges for preference calculation
 */
const TIME_RANGES = {
    RECENT: 30 * 24 * 60 * 60 * 1000, // Last 30 days
    MEDIUM: 90 * 24 * 60 * 60 * 1000, // 30-90 days ago
    LONG_TERM: Infinity, // All time
} as const

/**
 * Time decay weights (more recent = higher weight)
 */
const TIME_DECAY_WEIGHTS = {
    RECENT: 1.0, // Full weight
    MEDIUM: 0.6, // 60% weight
    LONG_TERM: 0.3, // 30% weight
} as const

/**
 * Top content item with weighted score
 */
export interface TopContent {
    contentId: number
    mediaType: 'movie' | 'tv'
    totalScore: number
    lastInteraction: number
    interactionCount: number
}

/**
 * Negative signals for filtering
 */
export interface NegativeSignals {
    hiddenGenres: number[]
    hiddenContent: number[]
}

/**
 * Genre preference with time range context
 */
export interface TimeRangedGenrePreference {
    genreId: number
    genreName: string
    score: number
    count: number
    averageWeight: number
}

/**
 * Comprehensive interaction summary for recommendations
 * Replaces shallow data slices with full history analysis
 */
export interface InteractionSummary {
    userId: string
    totalInteractions: number
    genreScores: Record<number, number> // genreId → weighted score
    contentScores: Record<number, number> // contentId → weighted score
    timeRangePreferences: {
        recent: TimeRangedGenrePreference[]
        medium: TimeRangedGenrePreference[]
        longTerm: TimeRangedGenrePreference[]
    }
    topContent: TopContent[]
    negativeSignals: NegativeSignals
    lastCalculated: number
}

/**
 * Calculate genre preferences within a time range
 */
function calculateTimeRangedPreferences(
    interactions: UserInteraction[],
    startTime: number,
    endTime: number,
    genreNames: Map<number, string>
): TimeRangedGenrePreference[] {
    const genreData = new Map<number, { score: number; count: number; totalWeight: number }>()

    const now = Date.now()

    interactions.forEach((interaction) => {
        const timestamp = interaction.timestamp

        // Filter by time range
        if (timestamp < startTime || timestamp > endTime) {
            return
        }

        const weight = INTERACTION_WEIGHTS[interaction.interactionType]

        // Skip neutral interactions
        if (weight === 0) {
            return
        }

        // Apply time decay based on how old the interaction is
        const age = now - timestamp
        let decayMultiplier = 1.0
        if (age > TIME_RANGES.MEDIUM) {
            decayMultiplier = TIME_DECAY_WEIGHTS.LONG_TERM
        } else if (age > TIME_RANGES.RECENT) {
            decayMultiplier = TIME_DECAY_WEIGHTS.MEDIUM
        } else {
            decayMultiplier = TIME_DECAY_WEIGHTS.RECENT
        }

        const finalWeight = weight * decayMultiplier

        // Aggregate by genre
        interaction.genreIds.forEach((genreId) => {
            const current = genreData.get(genreId) || {
                score: 0,
                count: 0,
                totalWeight: 0,
            }

            genreData.set(genreId, {
                score: current.score + finalWeight,
                count: current.count + 1,
                totalWeight: current.totalWeight + Math.abs(finalWeight),
            })
        })
    })

    // Convert to array and calculate averages
    const preferences: TimeRangedGenrePreference[] = []

    genreData.forEach((data, genreId) => {
        preferences.push({
            genreId,
            genreName: genreNames.get(genreId) || `Genre ${genreId}`,
            score: data.score,
            count: data.count,
            averageWeight: data.totalWeight / data.count,
        })
    })

    // Sort by score descending
    return preferences.sort((a, b) => b.score - a.score)
}

/**
 * Extract negative signals from interactions and ratings
 *
 * Fix: Removed genre tracking from individual content hides (too aggressive)
 * Fix: Optimized O(n²) dislike detection to O(n) using Map
 */
function extractNegativeSignals(
    interactions: UserInteraction[],
    ratings: RatedContent[]
): NegativeSignals {
    const hiddenContent = new Set<number>()

    // From interactions - track only hidden content IDs
    interactions.forEach((interaction) => {
        if (interaction.interactionType === 'hide_content') {
            hiddenContent.add(interaction.contentId)
        } else if (interaction.interactionType === 'unhide_content') {
            // Remove from hidden if unhidden
            hiddenContent.delete(interaction.contentId)
        }
    })

    // From disliked content (negative signal for genres)
    // Optimized: Single O(n) pass to count dislikes per genre
    const dislikesByGenre = new Map<number, number>()

    ratings.forEach((rating) => {
        if (rating.rating === 'dislike') {
            rating.content.genre_ids?.forEach((genreId: number) => {
                dislikesByGenre.set(genreId, (dislikesByGenre.get(genreId) || 0) + 1)
            })
        }
    })

    // Filter genres with 3+ dislikes
    const hiddenGenres: number[] = []
    dislikesByGenre.forEach((count, genreId) => {
        if (count >= 3) {
            hiddenGenres.push(genreId)
        }
    })

    return {
        hiddenContent: Array.from(hiddenContent),
        hiddenGenres,
    }
}

/**
 * Build genre name lookup map from various sources
 */
function buildGenreNameMap(
    interactions: UserInteraction[],
    ratings: RatedContent[]
): Map<number, string> {
    const genreNames = new Map<number, string>()

    // We'll use TMDB genre IDs - names would come from constants
    // For now, just use IDs as fallback
    const allGenreIds = new Set<number>()

    interactions.forEach((interaction) => {
        interaction.genreIds.forEach((id) => allGenreIds.add(id))
    })

    ratings.forEach((rating) => {
        rating.content.genre_ids?.forEach((id: number) => allGenreIds.add(id))
    })

    // TODO: Import from constants/unifiedGenres.ts for proper names
    // For now, just use numeric labels
    allGenreIds.forEach((id) => {
        genreNames.set(id, `Genre ${id}`)
    })

    return genreNames
}

/**
 * Calculate top content by weighted interaction score
 */
function calculateTopContent(interactions: UserInteraction[], limit: number = 50): TopContent[] {
    const contentData = new Map<
        string,
        {
            contentId: number
            mediaType: 'movie' | 'tv'
            score: number
            lastInteraction: number
            count: number
        }
    >()

    const now = Date.now()

    interactions.forEach((interaction) => {
        const key = `${interaction.mediaType}-${interaction.contentId}`
        const weight = INTERACTION_WEIGHTS[interaction.interactionType]

        // Apply time decay
        const age = now - interaction.timestamp
        let decayMultiplier = 1.0
        if (age > TIME_RANGES.MEDIUM) {
            decayMultiplier = TIME_DECAY_WEIGHTS.LONG_TERM
        } else if (age > TIME_RANGES.RECENT) {
            decayMultiplier = TIME_DECAY_WEIGHTS.MEDIUM
        }

        const finalWeight = weight * decayMultiplier

        const current = contentData.get(key) || {
            contentId: interaction.contentId,
            mediaType: interaction.mediaType,
            score: 0,
            lastInteraction: 0,
            count: 0,
        }

        contentData.set(key, {
            contentId: interaction.contentId,
            mediaType: interaction.mediaType,
            score: current.score + finalWeight,
            lastInteraction: Math.max(current.lastInteraction, interaction.timestamp),
            count: current.count + 1,
        })
    })

    // Convert to array and sort by score
    return Array.from(contentData.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map((item) => ({
            contentId: item.contentId,
            mediaType: item.mediaType,
            totalScore: item.score,
            lastInteraction: item.lastInteraction,
            interactionCount: item.count,
        }))
}

/**
 * Aggregate user interactions into a compact summary
 *
 * @param userId - User ID
 * @param interactions - Full interaction history
 * @param ratings - User ratings (like/dislike)
 * @returns Comprehensive interaction summary
 */
export function aggregateUserInteractions(
    userId: string,
    interactions: UserInteraction[],
    ratings: RatedContent[]
): InteractionSummary {
    const now = Date.now()

    // Build genre name lookup
    const genreNames = buildGenreNameMap(interactions, ratings)

    // Calculate time-ranged preferences
    const recentStart = now - TIME_RANGES.RECENT
    const mediumStart = now - TIME_RANGES.MEDIUM
    const mediumEnd = recentStart

    const recentPreferences = calculateTimeRangedPreferences(
        interactions,
        recentStart,
        now,
        genreNames
    )

    const mediumPreferences = calculateTimeRangedPreferences(
        interactions,
        mediumStart,
        mediumEnd,
        genreNames
    )

    const longTermPreferences = calculateTimeRangedPreferences(interactions, 0, now, genreNames)

    // Build genre scores map (for quick lookup)
    const genreScores: Record<number, number> = {}
    longTermPreferences.forEach((pref) => {
        genreScores[pref.genreId] = pref.score
    })

    // Calculate top content
    const topContent = calculateTopContent(interactions)

    // Build content scores map
    const contentScores: Record<number, number> = {}
    topContent.forEach((item) => {
        contentScores[item.contentId] = item.totalScore
    })

    // Extract negative signals
    const negativeSignals = extractNegativeSignals(interactions, ratings)

    return {
        userId,
        totalInteractions: interactions.length,
        genreScores,
        contentScores,
        timeRangePreferences: {
            recent: recentPreferences,
            medium: mediumPreferences,
            longTerm: longTermPreferences,
        },
        topContent,
        negativeSignals,
        lastCalculated: now,
    }
}

/**
 * Check if interaction summary needs refresh
 */
export function shouldRefreshSummary(
    summary: InteractionSummary | null,
    newInteractionCount: number
): boolean {
    if (!summary) {
        return true
    }

    const now = Date.now()
    const age = now - summary.lastCalculated

    // Refresh if older than 24 hours
    const MAX_AGE = 24 * 60 * 60 * 1000
    if (age > MAX_AGE) {
        return true
    }

    // Refresh if 10+ new interactions since last calculation
    const significantChange = newInteractionCount - summary.totalInteractions
    if (significantChange >= 10) {
        return true
    }

    return false
}
