/**
 * Year Preference Detection for Genre-Based Recommendations
 *
 * Detects user's preferred decades per genre using decade-based clustering.
 * Supports unified genre system with automatic TMDB ID translation.
 */

import { Content } from '@/types/collections'
import { GenreYearPreference } from '@/types/recommendations'
import { convertLegacyGenresToUnified } from '@/utils/genreMapping'
import { getGenreDisplayName } from '@/utils/genreMapping'

/**
 * Configuration constants for year preference detection
 */
export const YEAR_PREFERENCE_CONFIG = {
    // Sample size thresholds
    LOW_CONFIDENCE_MAX: 3, // 1-3 items = low confidence
    MEDIUM_CONFIDENCE_MAX: 7, // 4-7 items = medium
    // 8+ items = high confidence

    // Decade thresholding
    MIN_ITEMS_PER_DECADE: 2, // Need at least 2 items to consider a decade
    DECADE_COVERAGE_THRESHOLD: 0.6, // Decades must cover 60% of content

    // Year range buffers
    HIGH_CONFIDENCE_BUFFER: 2, // Small buffer for edge cases (e.g., 1998-2002 → 1988-2012)
    MEDIUM_CONFIDENCE_BUFFER: 5, // Larger buffer for flexibility

    // Fallback
    DEFAULT_YEAR_BUFFER: 10, // ±10 years if using weighted average fallback
} as const

/**
 * Extract year from content's release date or first air date
 *
 * @param content - Content item (movie or TV show)
 * @returns Year as number, or undefined if date is missing/malformed
 */
function extractYear(content: Content): number | undefined {
    try {
        const dateString =
            content.media_type === 'movie' ? content.release_date : content.first_air_date

        if (!dateString) return undefined

        const year = new Date(dateString).getFullYear()

        // Validate year is reasonable (1900-2050 range)
        // Reject NaN, negative years, and unrealistic values
        if (isNaN(year) || year < 1900 || year > 2050) {
            return undefined
        }

        return year
    } catch {
        return undefined
    }
}

/**
 * Calculate genre-specific year preferences from user content
 *
 * @param userData - User's content collections
 * @returns Array of genre year preferences sorted by sample size
 */
export function calculateGenreYearPreferences(userData: {
    likedMovies: Content[]
    defaultWatchlist: Content[]
    collectionItems?: Content[]
}): GenreYearPreference[] {
    const { likedMovies, defaultWatchlist, collectionItems = [] } = userData

    // Combine all content for analysis
    const allContent = [...likedMovies, ...defaultWatchlist, ...collectionItems]

    // Map: unified genre ID → array of years
    const genreYearsMap = new Map<string, number[]>()

    // Process each content item
    for (const content of allContent) {
        // Extract year
        const year = extractYear(content)
        if (year === undefined) continue // Skip items with missing/malformed dates

        // Convert TMDB genre IDs to unified genre IDs
        if (!content.genre_ids || content.genre_ids.length === 0) continue

        const unifiedGenreIds = convertLegacyGenresToUnified(
            content.genre_ids,
            content.media_type as 'movie' | 'tv'
        )

        // Add year to each unified genre
        for (const genreId of unifiedGenreIds) {
            if (!genreYearsMap.has(genreId)) {
                genreYearsMap.set(genreId, [])
            }
            genreYearsMap.get(genreId)!.push(year)
        }
    }

    // Calculate preferences for each genre
    const preferences: GenreYearPreference[] = []

    for (const [genreId, years] of genreYearsMap.entries()) {
        const sampleSize = years.length

        // Skip if no data
        if (sampleSize === 0) {
            console.debug(`[YearPreferences] Skipping genre ${genreId}: no valid years`)
            continue
        }

        // Calculate statistics
        const sortedYears = [...years].sort((a, b) => a - b)
        const yearMin = sortedYears[0]
        const yearMax = sortedYears[sortedYears.length - 1]
        // Correct median calculation for both odd and even-length arrays
        const yearMedian =
            sortedYears.length % 2 === 1
                ? sortedYears[Math.floor(sortedYears.length / 2)] // Odd: middle value
                : Math.round(
                      (sortedYears[sortedYears.length / 2 - 1] +
                          sortedYears[sortedYears.length / 2]) /
                          2
                  ) // Even: average of two middle values

        // Determine confidence level
        let confidence: 'low' | 'medium' | 'high'
        if (sampleSize <= YEAR_PREFERENCE_CONFIG.LOW_CONFIDENCE_MAX) {
            confidence = 'low'
        } else if (sampleSize <= YEAR_PREFERENCE_CONFIG.MEDIUM_CONFIDENCE_MAX) {
            confidence = 'medium'
        } else {
            confidence = 'high'
        }

        // Extract preferred decades
        const preferredDecades = extractPreferredDecades(years)

        // Calculate effective year range (null for low confidence)
        const effectiveYearRange =
            confidence === 'low'
                ? undefined
                : calculateEffectiveYearRange(preferredDecades, confidence)

        // Get genre display name
        const genreName = getGenreDisplayName(genreId) || genreId

        preferences.push({
            genreId,
            genreName,
            preferredDecades,
            sampleSize,
            yearMedian,
            yearMin,
            yearMax,
            confidence,
            effectiveYearRange,
        })
    }

    // Sort by sample size descending (most data first)
    return preferences.sort((a, b) => b.sampleSize - a.sampleSize)
}

/**
 * Extract preferred decades for a genre using relative threshold
 *
 * @param years - Array of years from user's content in this genre
 * @param threshold - Coverage threshold (default 0.6 = 60%)
 * @returns Array of preferred decades (e.g., [1990, 2010])
 */
function extractPreferredDecades(years: number[], threshold: number = 0.6): number[] {
    if (years.length === 0) return []

    // Group years into decades
    const decadeMap = new Map<number, number>() // decade → count

    for (const year of years) {
        const decade = Math.floor(year / 10) * 10
        decadeMap.set(decade, (decadeMap.get(decade) || 0) + 1)
    }

    // Filter decades with minimum items
    const validDecades = Array.from(decadeMap.entries()).filter(
        ([_, count]) => count >= YEAR_PREFERENCE_CONFIG.MIN_ITEMS_PER_DECADE
    )

    // If no valid decades, return empty array
    if (validDecades.length === 0) return []

    // Sort by count descending
    validDecades.sort((a, b) => b[1] - a[1])

    // Calculate total items
    const totalItems = years.length

    // Select top decades that cover threshold percentage
    const selectedDecades: number[] = []
    let coveredItems = 0

    for (const [decade, count] of validDecades) {
        selectedDecades.push(decade)
        coveredItems += count

        // Check if we've covered enough content
        if (coveredItems / totalItems >= threshold) {
            break
        }
    }

    // Sort decades chronologically
    return selectedDecades.sort((a, b) => a - b)
}

/**
 * Calculate effective year range from preferred decades and confidence level
 *
 * @param preferredDecades - Array of preferred decades (e.g., [1990, 2010])
 * @param confidence - Confidence level
 * @returns Year range object with min and max
 */
function calculateEffectiveYearRange(
    preferredDecades: number[],
    confidence: 'low' | 'medium' | 'high'
): { min: number; max: number } | undefined {
    // Low confidence should never call this function, but handle it safely
    if (confidence === 'low' || preferredDecades.length === 0) {
        return undefined
    }

    // Determine buffer based on confidence
    const buffer =
        confidence === 'high'
            ? YEAR_PREFERENCE_CONFIG.HIGH_CONFIDENCE_BUFFER
            : YEAR_PREFERENCE_CONFIG.MEDIUM_CONFIDENCE_BUFFER

    // Calculate range
    const minDecade = preferredDecades[0]
    const maxDecade = preferredDecades[preferredDecades.length - 1]

    const min = minDecade - buffer
    const max = maxDecade + 10 + buffer // +10 to include the entire last decade

    return { min, max }
}
