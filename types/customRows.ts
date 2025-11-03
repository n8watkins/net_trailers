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
    genres: number[] // TMDB genre IDs (1-5 genres for custom rows, 0 for special system rows like Trending/Top Rated)
    genreLogic: 'AND' | 'OR' // How to combine genres
    mediaType: 'movie' | 'tv' | 'both' // Content type(s) to show
    order: number // Display order (0-based, lower = higher)
    isSpecialRow?: boolean // true for Trending/Top Rated rows that don't use genre filtering
}

/**
 * System/default rows that all users see
 * Cannot be edited or deleted, only enabled/disabled per user
 */
export type SystemRowConfig = BaseRowConfig

/**
 * Custom rows created by users
 * Full CRUD operations available
 */
export interface CustomRow extends BaseRowConfig {
    userId: string // Firebase Auth UID or Guest ID
    enabled: boolean // Toggle visibility without deletion
    createdAt: number // Unix timestamp
    updatedAt: number // Unix timestamp
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
}

/**
 * User preferences for system row visibility and order
 * Stored per user in Firestore
 */
export interface SystemRowPreference {
    enabled: boolean // Whether the row is enabled
    order: number // Custom order position (overrides default)
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
    genres: number[]
    genreLogic: 'AND' | 'OR'
    mediaType: 'movie' | 'tv' | 'both'
    enabled: boolean
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
