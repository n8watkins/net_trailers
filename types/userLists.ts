import { Content } from '../typings'
import { ShareSettings } from './sharing'

// Re-export Content for convenience
export type { Content }

/**
 * Collection types define how content is sourced
 */
export type CollectionType =
    | 'ai-generated' // AI-generated from Gemini smart search
    | 'tmdb-genre' // TMDB genre-based (infinite scrolling, dynamic from TMDB API)
    | 'manual' // Manually curated by user (static items array)

/**
 * Advanced filter options for TMDB-based collections
 */
export interface AdvancedFilters {
    // Year filters
    yearMin?: number // e.g., 1990
    yearMax?: number // e.g., 2024

    // Rating filters (0-10 scale, whole numbers)
    ratingMin?: number // e.g., 3 (for "bad" movies)
    ratingMax?: number // e.g., 6 (max rating for "bad" movies)

    // Popularity filter (0-5 scale: None, Low, Medium, High, Very High)
    // Maps to TMDB values: 0, 10, 50, 100, 200
    popularity?: number // 0-4 (index in popularity scale)

    // Vote count filter (0-5 scale: None, Few, Some, Many, Tons)
    // Maps to values: 0, 100, 1000, 5000, 10000
    voteCount?: number // 0-4 (index in vote count scale)

    // Cast/Crew filters
    withCast?: string[] // Actor names or TMDB person IDs
    withDirector?: string // Director name or TMDB person ID

    // Curated content list (Gemini AI recommendations)
    contentIds?: number[] // Specific TMDB IDs for concept-based collections
}

/**
 * Unified Collection Interface
 * Replaces both UserList and CustomRow systems
 * Supports both manual (curated) and dynamic (TMDB-based) collections
 */
export interface UserList {
    // Core identification
    id: string
    name: string
    description?: string
    isPublic: boolean
    createdAt: number
    updatedAt: number

    // Visual customization
    color?: string // Optional theme color for the collection
    emoji?: string // Optional emoji icon for the collection

    // Collection content and type
    items: Content[] // For manual/ai-generated collections: static curated list
    collectionType: CollectionType // How the collection content is sourced
    displayAsRow: boolean // Display collection as a row on home/browse pages (default: true)

    // Display and ordering
    order: number // Display order (lower = higher priority)
    enabled: boolean // Toggle visibility without deletion

    // TMDB-based collection settings (for collectionType: 'tmdb-genre')
    genres?: string[] // Unified genre IDs like 'action', 'fantasy', 'romance' (required for tmdb-genre type)
    genreLogic?: 'AND' | 'OR' // How to combine genres (default: 'OR')
    mediaType?: 'movie' | 'tv' | 'both' // Content type(s) to show (default: 'both')
    advancedFilters?: AdvancedFilters // Advanced filtering options
    isSpecialCollection?: boolean // true for Trending/Top Rated that don't use genre filtering

    // Auto-update settings (for TMDB-based collections)
    autoUpdateEnabled?: boolean // Allow auto-updates from TMDB
    updateFrequency?: 'daily' | 'weekly' | 'never' // How often to check for new content
    lastCheckedAt?: number // Last time we checked TMDB for new content
    lastUpdateCount?: number // Number of items added in last update

    // AI-generated collection metadata (for collectionType: 'ai-generated')
    originalQuery?: string // Original search query for AI-generated collections
    canGenerateMore?: boolean // Can generate more similar content (infinite collection)

    // System collection flags
    isSystemCollection?: boolean // true for built-in collections (Trending, Top Rated, genre collections)
    canDelete?: boolean // false for core system collections, undefined/true for user collections
    canEdit?: boolean // false for core system collections, undefined/true for others

    // Sharing settings
    shareSettings?: ShareSettings // Optional share settings for this collection
    sharedLinkId?: string // Active share link ID (if collection is currently shared)
}

// DEPRECATED - OLD SCHEMA
// UserListsState is no longer used in new schema
// New schema uses: userCreatedWatchlists: UserList[] directly
// Keeping temporarily for backward compatibility during migration
export interface UserListsState {
    lists: UserList[]
    defaultListIds: {
        watchlist: string
        liked: string
        disliked: string
    }
}

export interface UserListItem {
    listId: string
    contentId: number
    addedAt: number
}

/**
 * Request type for creating a new collection
 */
export interface CreateListRequest {
    name: string
    isPublic?: boolean
    color?: string
    emoji?: string
    description?: string

    // Collection type and display
    collectionType: CollectionType // Required
    displayAsRow?: boolean // Defaults to true

    // TMDB-based collection options
    genres?: string[]
    genreLogic?: 'AND' | 'OR'
    mediaType?: 'movie' | 'tv' | 'both'
    advancedFilters?: AdvancedFilters

    // Auto-update settings
    autoUpdateEnabled?: boolean
    updateFrequency?: 'daily' | 'weekly' | 'never'

    // AI-generated metadata
    originalQuery?: string
    canGenerateMore?: boolean
}

/**
 * Request type for updating an existing collection
 */
export interface UpdateListRequest {
    id: string
    name?: string
    isPublic?: boolean
    color?: string
    emoji?: string
    description?: string
    displayAsRow?: boolean
    enabled?: boolean
    order?: number

    // TMDB-based collection options
    genres?: string[]
    genreLogic?: 'AND' | 'OR'
    mediaType?: 'movie' | 'tv' | 'both'
    advancedFilters?: AdvancedFilters

    // Auto-update settings
    autoUpdateEnabled?: boolean
    updateFrequency?: 'daily' | 'weekly' | 'never'

    // Infinite content settings
    canGenerateMore?: boolean
}

export interface AddToListRequest {
    listId: string
    content: Content
}

export interface RemoveFromListRequest {
    listId: string
    contentId: number
}

/**
 * Type alias for clarity - Collections are UserLists
 */
export type Collection = UserList

/**
 * Validation constraints for collections
 */
export const COLLECTION_CONSTRAINTS = {
    MAX_COLLECTIONS_PER_AUTH_USER: 20, // Authenticated users can create up to 20 collections
    MAX_COLLECTIONS_PER_GUEST_USER: 3, // Guest users can create 3 collections
    MAX_GENRES_PER_COLLECTION: 5,
    MIN_GENRES_PER_COLLECTION: 1, // Only applies to TMDB-based; special collections can have 0 genres
    MIN_NAME_LENGTH: 3,
    MAX_NAME_LENGTH: 50,
    MAX_DESCRIPTION_LENGTH: 200,
} as const

/**
 * Helper to get max collections based on user type
 */
export function getMaxCollectionsForUser(isGuest: boolean): number {
    return isGuest
        ? COLLECTION_CONSTRAINTS.MAX_COLLECTIONS_PER_GUEST_USER
        : COLLECTION_CONSTRAINTS.MAX_COLLECTIONS_PER_AUTH_USER
}

/**
 * Validation errors for collection operations
 */
export type CollectionValidationError =
    | 'MAX_COLLECTIONS_EXCEEDED'
    | 'MAX_GENRES_EXCEEDED'
    | 'MIN_GENRES_REQUIRED'
    | 'NAME_TOO_SHORT'
    | 'NAME_TOO_LONG'
    | 'DESCRIPTION_TOO_LONG'
    | 'INVALID_GENRE_LOGIC'
    | 'INVALID_MEDIA_TYPE'
    | 'INVALID_COLLECTION_TYPE'
