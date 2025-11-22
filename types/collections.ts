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

/**
 * Base configuration shared by both system and user collections
 */
export interface BaseCollectionConfig {
    id: string // UUID v4 or system-{type}-{name}
    name: string // User-facing title (3-50 chars)
    genres: string[] // Unified genre IDs like 'action', 'fantasy' (1-5 genres for custom, 0 for special system)
    genreLogic: 'AND' | 'OR' // How to combine genres
    mediaType: 'movie' | 'tv' | 'both' // Content type(s) to show
    order: number // Display order (0-based, lower = higher)
    isSpecialCollection?: boolean // true for Trending/Top Rated that don't use genre filtering
    canDelete?: boolean // false for core system collections (Trending/Top Rated), undefined for user collections
    canEdit?: boolean // false for core system collections (Trending/Top Rated), undefined/true for others
}

/**
 * System/default collections that all users see
 * Core collections (Trending/Top Rated with canDelete: false) cannot be deleted or edited
 */
export type SystemCollectionConfig = BaseCollectionConfig

/**
 * User-created collections with full CRUD operations
 */
export interface UserCollection extends BaseCollectionConfig {
    userId: string // Firebase Auth UID or Guest ID
    enabled: boolean // Toggle visibility without deletion
    createdAt: number // Unix timestamp
    updatedAt: number // Unix timestamp
    advancedFilters?: AdvancedFilters // Advanced filtering options

    // Auto-update settings
    autoUpdateEnabled?: boolean // Owner setting: allow auto-updates from TMDB
    updateFrequency?: 'daily' | 'weekly' | 'never' // How often to check for new content
    lastCheckedAt?: number // Last time we checked TMDB for new content
    lastUpdateCount?: number // Number of items added in last update
}

/**
 * Combined type for rendering collections in UI
 * Includes both system and user collections with their enabled state
 */
export interface DisplayCollection extends BaseCollectionConfig {
    isSystemCollection: boolean // true for system collections, false for user collections
    enabled: boolean // Current enabled state for this user
    userId?: string // Only present for user collections
    createdAt?: number // Only present for user collections
    updatedAt?: number // Only present for user collections
    canDelete?: boolean // false for core system collections, true/undefined for deletable collections
    // Auto-update fields - Only present for user collections
    autoUpdateEnabled?: boolean
    updateFrequency?: 'daily' | 'weekly' | 'never'
    lastCheckedAt?: number
    lastUpdateCount?: number
}

/**
 * User preferences for system collection visibility and order
 * Stored per user in Firestore
 */
export interface SystemCollectionPreference {
    enabled: boolean // Whether the collection is enabled
    order: number // Custom order position (overrides default)
    customName?: string // Custom name override (only for editable system collections)
    customGenres?: string[] // Custom unified genre IDs (only for editable system collections)
    customGenreLogic?: 'AND' | 'OR' // Custom genre logic override
}

export interface SystemCollectionPreferences {
    [systemCollectionId: string]: SystemCollectionPreference // systemCollectionId -> preference
}

/**
 * Form data for creating/updating collections
 * Excludes auto-generated fields (id, timestamps)
 */
export interface CollectionFormData {
    name: string
    genres: string[] // Unified genre IDs like 'action', 'fantasy'
    genreLogic: 'AND' | 'OR'
    mediaType: 'movie' | 'tv' | 'both'
    enabled: boolean
    advancedFilters?: AdvancedFilters
    autoUpdateEnabled?: boolean
    updateFrequency?: 'daily' | 'weekly' | 'never'
    previewContent?: any[] // Preview content from TMDB (for collections)
    displayAsRow?: boolean // Whether to display the collection as a row on home
    enableInfiniteContent?: boolean // Whether to allow infinite TMDB content
}

/**
 * Collection Update Tracking
 * Tracks when collections are checked for new content and what was added
 */
export interface CollectionUpdateRecord {
    id: string // Update ID
    collectionId: string // Collection ID
    userId: string // Collection owner
    newContentIds: number[] // TMDB IDs of new matches found
    checkedAt: number // When the check was performed
    notificationSent: boolean // Whether notification was created
    addedCount: number // Number of items actually added
}

/**
 * API response types for collection operations
 */
export interface CreateCollectionResponse {
    success: boolean
    collectionId: string
}

export interface GetCollectionsResponse {
    collections: UserCollection[]
}

export interface CollectionContentResponse {
    results: any[] // TMDB content array
    page: number
    total_pages: number
    total_results: number
    child_safety_enabled?: boolean
    hidden_count?: number
}

// ============================================================
// LEGACY TYPE ALIASES (for backward compatibility during migration)
// These map old "Row" terminology to new "Collection" terminology
// ============================================================
/** @deprecated Use BaseCollectionConfig instead */
export type BaseRowConfig = BaseCollectionConfig
/** @deprecated Use SystemCollectionConfig instead */
export type SystemRowConfig = SystemCollectionConfig
/** @deprecated Use UserCollection instead */
export type CustomRow = UserCollection
/** @deprecated Use DisplayCollection instead */
export type DisplayRow = DisplayCollection
/** @deprecated Use SystemCollectionPreference instead */
export type SystemRowPreference = SystemCollectionPreference
/** @deprecated Use SystemCollectionPreferences instead */
export type SystemRowPreferences = SystemCollectionPreferences
/** @deprecated Use CollectionFormData instead */
export type CustomRowFormData = CollectionFormData
/** @deprecated Use CollectionUpdateRecord instead */
export type CollectionUpdate = CollectionUpdateRecord
/** @deprecated Use CollectionValidationError instead */
export type CustomRowValidationError = CollectionValidationError
/** @deprecated Use CreateCollectionResponse instead */
export type CreateCustomRowResponse = CreateCollectionResponse
/** @deprecated Use GetCollectionsResponse instead */
export type GetCustomRowsResponse = GetCollectionsResponse
/** @deprecated Use CollectionContentResponse instead */
export type CustomRowContentResponse = CollectionContentResponse

/** @deprecated Use COLLECTION_CONSTRAINTS instead */
export const CUSTOM_ROW_CONSTRAINTS = {
    MAX_ROWS_PER_AUTH_USER: COLLECTION_CONSTRAINTS.MAX_COLLECTIONS_PER_AUTH_USER,
    MAX_ROWS_PER_GUEST_USER: COLLECTION_CONSTRAINTS.MAX_COLLECTIONS_PER_GUEST_USER,
    MAX_GENRES_PER_ROW: COLLECTION_CONSTRAINTS.MAX_GENRES_PER_COLLECTION,
    MIN_GENRES_PER_ROW: COLLECTION_CONSTRAINTS.MIN_GENRES_PER_COLLECTION,
    MIN_GENRES_PER_SPECIAL_ROW: 0,
    MIN_NAME_LENGTH: COLLECTION_CONSTRAINTS.MIN_NAME_LENGTH,
    MAX_NAME_LENGTH: COLLECTION_CONSTRAINTS.MAX_NAME_LENGTH,
} as const

/** @deprecated Use getMaxCollectionsForUser instead */
export function getMaxRowsForUser(isGuest: boolean): number {
    return getMaxCollectionsForUser(isGuest)
}
