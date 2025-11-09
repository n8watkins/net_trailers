/**
 * User Interaction Types
 * Phase 7.1 - Foundation for improved personalized recommendations
 */

/**
 * Types of user interactions we track
 */
export type InteractionType =
    | 'view_modal' // User opened content modal (light signal)
    | 'add_to_watchlist' // Added to watchlist (strong positive signal)
    | 'remove_from_watchlist' // Removed from watchlist (negative signal)
    | 'like' // Liked content (strong positive signal)
    | 'unlike' // Unliked content (negative signal)
    | 'play_trailer' // Started playing trailer (medium signal)
    | 'hide_content' // Hidden content (strong negative signal)
    | 'unhide_content' // Unhidden content (neutral/positive signal)
    | 'search' // Searched for content (weak signal)
    | 'voice_search' // Used voice search (medium signal)

/**
 * Individual user interaction event
 */
export interface UserInteraction {
    id: string // Interaction ID
    userId: string // Firebase Auth UID or Guest ID
    contentId: number // TMDB content ID
    mediaType: 'movie' | 'tv' // Content type
    interactionType: InteractionType
    genreIds: number[] // TMDB genre IDs for this content
    timestamp: number // Unix timestamp when interaction occurred

    // Optional metadata
    trailerDuration?: number // Seconds of trailer watched (for play_trailer)
    searchQuery?: string // Search term (for search interactions)
    collectionId?: string // Collection ID if interaction was from a collection
    source?: string // Where interaction came from (home, search, collection, etc.)
}

/**
 * Interaction weights for recommendation scoring
 * Higher weight = stronger signal for recommendations
 */
export const INTERACTION_WEIGHTS: Record<InteractionType, number> = {
    like: 5, // Strongest positive signal
    add_to_watchlist: 3, // Strong positive signal
    play_trailer: 2, // Medium positive signal
    voice_search: 2, // Medium positive signal (shows interest)
    view_modal: 1, // Light positive signal
    search: 1, // Light positive signal
    unhide_content: 0, // Neutral (reversal of negative action)
    unlike: -2, // Negative signal
    remove_from_watchlist: -2, // Negative signal
    hide_content: -5, // Strongest negative signal
}

/**
 * User interaction summary (aggregated data)
 * Used for efficient recommendation generation
 */
export interface UserInteractionSummary {
    userId: string
    totalInteractions: number
    genrePreferences: GenrePreference[] // Sorted by score descending
    lastUpdated: number // When summary was last calculated
    topContentIds: number[] // Most interacted-with content (for similarity)
}

/**
 * Genre preference with score
 */
export interface GenrePreference {
    genreId: number
    genreName: string
    score: number // Weighted sum of interactions
    count: number // Number of interactions
}

/**
 * Privacy settings for interaction tracking
 */
export interface InteractionPrivacySettings {
    enabled: boolean // Master toggle for all tracking
    improveRecommendations: boolean // Allow using data for recommendations
    anonymizeData: boolean // Strip identifying info (for analytics)
}

/**
 * Batch interaction logging request
 */
export interface BatchInteractionRequest {
    interactions: Omit<UserInteraction, 'id' | 'timestamp'>[]
}

/**
 * Interaction analytics response
 */
export interface InteractionAnalytics {
    totalInteractions: number
    interactionsByType: Record<InteractionType, number>
    topGenres: GenrePreference[]
    recentInteractions: UserInteraction[]
    trailerEngagement: {
        totalPlays: number
        averageDuration: number
        totalDuration: number
    }
}

/**
 * Constraints for interaction tracking
 */
export const INTERACTION_CONSTRAINTS = {
    MAX_INTERACTIONS_PER_USER: 10000, // Per user limit
    MAX_BATCH_SIZE: 50, // Max interactions per batch write
    RETENTION_DAYS: 90, // Keep interactions for 90 days
    SUMMARY_REFRESH_HOURS: 24, // Recalculate summary every 24 hours
    MIN_INTERACTIONS_FOR_RECOMMENDATIONS: 5, // Minimum to generate recommendations
} as const

/**
 * Interaction source tracking
 */
export type InteractionSource =
    | 'home' // Home page row
    | 'search' // Search results
    | 'collection' // Custom collection
    | 'recommended' // Recommended for you row
    | 'similar' // More like this section
    | 'trending' // Trending row
    | 'watchlist' // Watchlist
    | 'modal' // Content modal
    | 'voice' // Voice search
