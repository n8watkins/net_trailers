/**
 * Genre Mapping Utilities
 *
 * Translates between unified genre IDs and TMDB genre IDs based on media type.
 * Handles the complexity of different genre structures between movies and TV.
 */

import { UNIFIED_GENRES, findUnifiedGenre } from '../constants/unifiedGenres'

/**
 * Translate unified genre IDs to TMDB genre IDs for a specific media type
 *
 * @param unifiedGenreIds - Array of unified genre IDs (e.g., ['action', 'fantasy'])
 * @param mediaType - Target media type
 * @returns Array of TMDB genre IDs appropriate for the media type
 *
 * @example
 * // User selects "Fantasy" and "Sci-Fi" for TV
 * translateToTMDBGenres(['fantasy', 'scifi'], 'tv')
 * // Returns: [10765] (Sci-Fi & Fantasy - deduplicated)
 *
 * @example
 * // User selects "Action" and "Adventure" for movies
 * translateToTMDBGenres(['action', 'adventure'], 'movie')
 * // Returns: [28, 12] (Action, Adventure)
 */
export function translateToTMDBGenres(
    unifiedGenreIds: string[],
    mediaType: 'movie' | 'tv'
): number[] {
    const tmdbIds = new Set<number>()

    for (const genreId of unifiedGenreIds) {
        const unifiedGenre = findUnifiedGenre(genreId)
        if (!unifiedGenre) continue

        // Add appropriate TMDB IDs based on media type
        const ids = mediaType === 'movie' ? unifiedGenre.movieIds : unifiedGenre.tvIds
        ids.forEach((id) => tmdbIds.add(id))
    }

    return Array.from(tmdbIds)
}

/**
 * Translate unified genre IDs for 'both' media type
 * Returns separate arrays for movies and TV
 *
 * @param unifiedGenreIds - Array of unified genre IDs
 * @returns Object with movieIds and tvIds arrays
 *
 * @example
 * translateToTMDBGenresForBoth(['action', 'fantasy'])
 * // Returns: { movieIds: [28, 14], tvIds: [10759, 10765] }
 */
export function translateToTMDBGenresForBoth(unifiedGenreIds: string[]): {
    movieIds: number[]
    tvIds: number[]
} {
    return {
        movieIds: translateToTMDBGenres(unifiedGenreIds, 'movie'),
        tvIds: translateToTMDBGenres(unifiedGenreIds, 'tv'),
    }
}

/**
 * Legacy support: Convert old TMDB genre IDs to unified genre IDs
 * Used for migrating existing collections to the new system
 *
 * @param tmdbGenreIds - Array of TMDB genre IDs
 * @param mediaType - Media type these IDs belong to
 * @returns Array of unified genre IDs
 *
 * @example
 * // Migrate old movie collection with [28, 14] (Action, Fantasy)
 * convertLegacyGenresToUnified([28, 14], 'movie')
 * // Returns: ['action', 'fantasy']
 */
export function convertLegacyGenresToUnified(
    tmdbGenreIds: number[],
    mediaType: 'movie' | 'tv'
): string[] {
    const unifiedIds = new Set<string>()

    for (const tmdbId of tmdbGenreIds) {
        const unifiedGenre = UNIFIED_GENRES.find((g) => {
            const ids = mediaType === 'movie' ? g.movieIds : g.tvIds
            return ids.includes(tmdbId)
        })

        if (unifiedGenre) {
            unifiedIds.add(unifiedGenre.id)
        }
    }

    return Array.from(unifiedIds)
}

/**
 * Check if a unified genre is available for a given media type
 *
 * @param unifiedGenreId - Unified genre ID to check
 * @param mediaType - Media type to check against
 * @returns True if the genre has TMDB mappings for this media type
 *
 * @example
 * isGenreAvailableForMediaType('horror', 'tv') // false (no TV horror genre in TMDB)
 * isGenreAvailableForMediaType('horror', 'movie') // true
 */
export function isGenreAvailableForMediaType(
    unifiedGenreId: string,
    mediaType: 'movie' | 'tv'
): boolean {
    const genre = findUnifiedGenre(unifiedGenreId)
    if (!genre) return false

    const ids = mediaType === 'movie' ? genre.movieIds : genre.tvIds
    return ids.length > 0
}

/**
 * Get display name for a unified genre
 *
 * @param unifiedGenreId - Unified genre ID
 * @returns Display name or undefined if not found
 */
export function getGenreDisplayName(unifiedGenreId: string): string | undefined {
    return findUnifiedGenre(unifiedGenreId)?.name
}

/**
 * Format genre IDs for TMDB API calls based on genre logic
 *
 * @param tmdbGenreIds - Array of TMDB genre IDs
 * @param genreLogic - How to combine genres ('AND' or 'OR')
 * @returns Formatted genre string for TMDB API
 *
 * @example
 * formatGenresForAPI([28, 14], 'AND') // "28,14" (comma-separated for AND)
 * formatGenresForAPI([28, 14], 'OR') // "28|14" (pipe-separated for OR)
 */
export function formatGenresForAPI(tmdbGenreIds: number[], genreLogic: 'AND' | 'OR'): string {
    const separator = genreLogic === 'AND' ? ',' : '|'
    return tmdbGenreIds.join(separator)
}

/**
 * Validate that unified genre IDs are valid
 *
 * @param unifiedGenreIds - Array of unified genre IDs to validate
 * @returns Array of valid genre IDs (invalid ones filtered out)
 */
export function validateUnifiedGenreIds(unifiedGenreIds: string[]): string[] {
    return unifiedGenreIds.filter((id) => findUnifiedGenre(id) !== undefined)
}
