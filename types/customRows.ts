/**
 * Custom Rows Types
 * V1 MVP - Simplified scope without AI generation and advanced filters
 */

export interface CustomRow {
    // Identity
    id: string // UUID v4
    userId: string // Firebase Auth UID or Guest ID

    // Configuration
    name: string // User-facing title (3-50 chars)
    genres: number[] // TMDB genre IDs (1-5 genres)
    genreLogic: 'AND' | 'OR' // How to combine genres
    mediaType: 'movie' | 'tv' | 'both' // Content type(s) to show

    // Organization
    order: number // Display order (0-based, lower = higher)
    enabled: boolean // Toggle visibility without deletion

    // Metadata
    createdAt: number // Unix timestamp
    updatedAt: number // Unix timestamp
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
    MAX_ROWS_PER_USER: 10,
    MAX_GENRES_PER_ROW: 5,
    MIN_GENRES_PER_ROW: 1,
    MIN_NAME_LENGTH: 3,
    MAX_NAME_LENGTH: 50,
} as const

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
