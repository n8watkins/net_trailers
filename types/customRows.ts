/**
 * Custom Rows Types
 * V1 MVP - Simplified scope without AI generation and advanced filters
 */

/**
 * Base row configuration shared by both system and custom rows
 */
export interface BaseRowConfig {
    id: string // UUID v4 or system-{type}-{name}
    name: string // User-facing title (3-50 chars)
    genres: string[] // Unified genre IDs like 'action', 'fantasy' (1-5 genres for custom rows, 0 for special system rows)
    genreLogic: 'AND' | 'OR' // How to combine genres
    mediaType: 'movie' | 'tv' | 'both' // Content type(s) to show
    order: number // Display order (0-based, lower = higher)
    isSpecialRow?: boolean // true for Trending/Top Rated rows that don't use genre filtering
    canDelete?: boolean // false for core system rows (Trending/Top Rated), undefined for custom rows
    canEdit?: boolean // false for core system rows (Trending/Top Rated), undefined/true for others
}

/**
 * System/default rows that all users see
 * Core rows (Trending/Top Rated with canDelete: false) cannot be deleted or edited
 * Other system rows can be:
 *   - Deleted and restored via "Reset Default Rows"
 *   - Edited (custom name only)
 *   - Enabled/disabled per user
 */
export type SystemRowConfig = BaseRowConfig

/**
 * Advanced filter options for custom rows
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
    contentIds?: number[] // Specific TMDB IDs for concept-based rows (e.g., "comedy of errors")
}

/**
 * Custom rows created by users
 * Full CRUD operations available
 */
export interface CustomRow extends BaseRowConfig {
    userId: string // Firebase Auth UID or Guest ID
    enabled: boolean // Toggle visibility without deletion
    createdAt: number // Unix timestamp
    updatedAt: number // Unix timestamp
    advancedFilters?: AdvancedFilters // Advanced filtering options

    // Auto-update settings (Phase 5)
    autoUpdateEnabled?: boolean // Owner setting: allow auto-updates from TMDB
    updateFrequency?: 'daily' | 'weekly' | 'never' // How often to check for new content
    lastCheckedAt?: number // Last time we checked TMDB for new content
    lastUpdateCount?: number // Number of items added in last update
}

/**
 * Combined type for rendering rows in UI
 * Includes both system and custom rows with their enabled state
 */
export interface DisplayRow extends BaseRowConfig {
    isSystemRow: boolean // true for system rows, false for custom rows
    enabled: boolean // Current enabled state for this user
    userId?: string // Only present for custom rows
    createdAt?: number // Only present for custom rows
    updatedAt?: number // Only present for custom rows
    canDelete?: boolean // false for core system rows, true/undefined for deletable rows
    // Auto-update fields (Phase 5) - Only present for custom rows
    autoUpdateEnabled?: boolean
    updateFrequency?: 'daily' | 'weekly' | 'never'
    lastCheckedAt?: number
    lastUpdateCount?: number
}

/**
 * User preferences for system row visibility and order
 * Stored per user in Firestore
 */
export interface SystemRowPreference {
    enabled: boolean // Whether the row is enabled
    order: number // Custom order position (overrides default)
    customName?: string // Custom name override (only for editable system rows)
    customGenres?: string[] // Custom unified genre IDs (only for editable system rows)
    customGenreLogic?: 'AND' | 'OR' // Custom genre logic override
}

export interface SystemRowPreferences {
    [systemRowId: string]: SystemRowPreference // systemRowId -> preference
}

/**
 * Form data for creating/updating custom rows
 * Excludes auto-generated fields (id, timestamps)
 */
export interface CustomRowFormData {
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
 * Collection Update Tracking (Phase 5)
 * Tracks when collections are checked for new content and what was added
 */
export interface CollectionUpdate {
    id: string // Update ID
    collectionId: string // CustomRow ID
    userId: string // Collection owner
    newContentIds: number[] // TMDB IDs of new matches found
    checkedAt: number // When the check was performed
    notificationSent: boolean // Whether notification was created
    addedCount: number // Number of items actually added
}

/**
 * Validation constraints
 */
export const CUSTOM_ROW_CONSTRAINTS = {
    MAX_ROWS_PER_AUTH_USER: 10, // Authenticated users can create up to 10 custom rows
    MAX_ROWS_PER_GUEST_USER: 1, // Guest users can create 1 custom row
    MAX_GENRES_PER_ROW: 5,
    MIN_GENRES_PER_ROW: 1, // Only applies to custom rows; special system rows can have 0 genres
    MIN_GENRES_PER_SPECIAL_ROW: 0, // Special rows (Trending, Top Rated) have no genre requirements
    MIN_NAME_LENGTH: 3,
    MAX_NAME_LENGTH: 50,
} as const

/**
 * Helper to get max rows based on user type
 */
export function getMaxRowsForUser(isGuest: boolean): number {
    return isGuest
        ? CUSTOM_ROW_CONSTRAINTS.MAX_ROWS_PER_GUEST_USER
        : CUSTOM_ROW_CONSTRAINTS.MAX_ROWS_PER_AUTH_USER
}

/**
 * Validation errors
 */
export type CustomRowValidationError =
    | 'MAX_ROWS_EXCEEDED'
    | 'MAX_GENRES_EXCEEDED'
    | 'MIN_GENRES_REQUIRED'
    | 'NAME_TOO_SHORT'
    | 'NAME_TOO_LONG'
    | 'INVALID_GENRE_LOGIC'
    | 'INVALID_MEDIA_TYPE'

/**
 * API response types
 */
export interface CreateCustomRowResponse {
    success: boolean
    rowId: string
}

export interface GetCustomRowsResponse {
    rows: CustomRow[]
}

export interface CustomRowContentResponse {
    results: any[] // TMDB content array
    page: number
    total_pages: number
    total_results: number
    child_safety_enabled?: boolean
    hidden_count?: number
}
