/**
 * Recommendation System Types
 *
 * Defines data structures for personalized content recommendations.
 */

import { Content } from './collections'

/**
 * System recommendation IDs - these are built-in recommendation rows
 * that users can customize but cannot add manual content to
 */
export type SystemRecommendationId = 'trending' | 'top-rated' | 'recommended-for-you'

/**
 * System Recommendation Settings
 *
 * These are TMDB-powered rows that users can customize (name, media type, genres)
 * but cannot add manual content to. They are separate from user collections.
 */
export interface SystemRecommendation {
    /** Unique identifier */
    id: SystemRecommendationId

    /** Display name (user can customize) */
    name: string

    /** Whether this recommendation row is enabled */
    enabled: boolean

    /** Display order on homepage (lower = higher) */
    order: number

    /** Media type filter: movie, tv, or both */
    mediaType: 'movie' | 'tv' | 'both'

    /** Genre filters (unified genre IDs) */
    genres: string[]

    /** Optional color for UI customization */
    color?: string

    /** Optional emoji for display */
    emoji?: string
}

/**
 * Default system recommendations for new users
 */
export const DEFAULT_SYSTEM_RECOMMENDATIONS: SystemRecommendation[] = [
    {
        id: 'trending',
        name: 'Trending',
        enabled: true,
        order: 0,
        mediaType: 'both',
        genres: [],
        emoji: '🔥',
    },
    {
        id: 'top-rated',
        name: 'Top Rated',
        enabled: true,
        order: 1,
        mediaType: 'both',
        genres: [],
        emoji: '⭐',
    },
    {
        id: 'recommended-for-you',
        name: 'Recommended For You',
        enabled: true,
        order: 2,
        mediaType: 'both',
        genres: [],
        emoji: '✨',
    },
]

/**
 * Helper to create fresh default recommendations for a new user
 */
export function createDefaultSystemRecommendations(): SystemRecommendation[] {
    return DEFAULT_SYSTEM_RECOMMENDATIONS.map((rec) => ({ ...rec }))
}

/**
 * Recommendation source types
 */
export type RecommendationSource =
    | 'tmdb_similar' // TMDB similar content API
    | 'tmdb_recommended' // TMDB recommendations API
    | 'genre_based' // Genre preference engine
    | 'collaborative' // Similar users (future)
    | 'trending' // Trending in user's genres
    | 'new_release' // New releases matching preferences

/**
 * Recommendation strategy types
 */
export type RecommendationStrategy =
    | 'more_like_this' // Similar to specific content
    | 'personalized' // Based on user history
    | 'genre_discovery' // Explore user's favorite genres
    | 'trending_personalized' // Trending filtered by preferences

/**
 * Recommendation with metadata
 */
export interface Recommendation {
    /** Content item */
    content: Content

    /** Source of recommendation */
    source: RecommendationSource

    /** Confidence score (0-100) */
    score: number

    /** Human-readable reason */
    reason: string

    /** Source content ID (if from similar/recommended) */
    sourceContentId?: number

    /** Timestamp when generated */
    generatedAt: number
}

/**
 * Recommendation request parameters
 */
export interface RecommendationRequest {
    /** User ID */
    userId: string

    /** Strategy to use */
    strategy: RecommendationStrategy

    /** Limit results */
    limit?: number

    /** Content ID for "more like this" */
    contentId?: number

    /** Genre ID for genre-based */
    genreId?: number

    /** Exclude already seen content */
    excludeSeen?: boolean
}

/**
 * Recommendation response
 */
export interface RecommendationResponse {
    recommendations: Recommendation[]
    strategy: RecommendationStrategy
    totalCount: number
    generatedAt: number
}

/**
 * Genre preference score
 */
export interface GenrePreference {
    genreId: number
    genreName: string
    score: number
    /** Number of items contributing to score */
    count: number
}

/**
 * User recommendation profile
 */
export interface RecommendationProfile {
    userId: string
    /** Top genres by preference score */
    topGenres: GenrePreference[]
    /** Favorite directors/actors (future) */
    favoriteCreators?: string[]
    /** Average rating preference */
    preferredRating?: number
    /** Preferred year range */
    preferredYearRange?: { min: number; max: number }
    /** Last updated */
    updatedAt: number
}

/**
 * Recommendation constraints
 */
export const RECOMMENDATION_CONSTRAINTS = {
    /** Default limit for recommendations */
    DEFAULT_LIMIT: 20,

    /** Maximum recommendations to return */
    MAX_LIMIT: 50,

    /** Minimum score to include recommendation */
    MIN_SCORE: 10,

    /** Cache duration (1 hour) */
    CACHE_DURATION: 3600000,

    /** Minimum user data for personalized recs */
    MIN_USER_DATA: 3, // At least 3 liked/watchlist items
} as const

/**
 * Recommendation explanation templates
 */
export const RECOMMENDATION_REASONS = {
    tmdb_similar: (title: string) => `Similar to ${title}`,
    tmdb_recommended: (title: string) => `Because you watched ${title}`,
    genre_based: (genre: string) => `Trending in ${genre}`,
    collaborative: () => 'Popular with similar users',
    trending: (genre: string) => `Trending in ${genre}`,
    new_release: () => 'New release matching your taste',
} as const
