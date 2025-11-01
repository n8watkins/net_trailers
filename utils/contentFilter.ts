import { Content } from '../typings'
import { UserPreferences } from '../types/shared'

/**
 * Content filtering utilities for hiding disliked/hidden content from recommendations
 */

/**
 * Filter content array to exclude hidden items
 * @param content Array of content to filter
 * @param hiddenMovies User's hidden movies array
 * @returns Filtered content array without hidden items
 */
export function filterDislikedContent(content: Content[], hiddenMovies: Content[]): Content[] {
    if (!hiddenMovies || hiddenMovies.length === 0) {
        return content
    }

    // Create a Set of hidden content IDs for O(1) lookup
    const hiddenIds = new Set(hiddenMovies.map((item) => item.id))

    // Filter out hidden content
    return content.filter((item) => !hiddenIds.has(item.id))
}

/**
 * Enhanced filter function that works with UserPreferences
 * @param content Array of content to filter
 * @param userPreferences User's full preferences object
 * @returns Filtered content array without hidden items
 */
export function filterHiddenContent(
    content: Content[],
    userPreferences: UserPreferences | null
): Content[] {
    if (!userPreferences?.hiddenMovies || userPreferences.hiddenMovies.length === 0) {
        return content
    }

    return filterDislikedContent(content, userPreferences.hiddenMovies)
}

/**
 * Check if specific content is hidden
 * @param contentId The ID of the content to check
 * @param hiddenMovies User's hidden movies array
 * @returns true if content is hidden, false otherwise
 */
export function isContentDisliked(contentId: number, hiddenMovies: Content[]): boolean {
    return hiddenMovies.some((item) => item.id === contentId)
}

/**
 * Check if specific content is hidden by the user
 * @param contentId Content ID to check
 * @param userPreferences User's preferences containing hiddenMovies
 * @returns True if content is hidden, false otherwise
 */
export function isContentHidden(
    contentId: number,
    userPreferences: UserPreferences | null
): boolean {
    if (!userPreferences?.hiddenMovies) {
        return false
    }

    return isContentDisliked(contentId, userPreferences.hiddenMovies)
}

/**
 * Gets all hidden content from user preferences
 * @param userPreferences User's preferences containing hiddenMovies
 * @returns Array of hidden content items
 */
export function getHiddenContent(userPreferences: UserPreferences | null): Content[] {
    if (!userPreferences?.hiddenMovies) {
        return []
    }

    return userPreferences.hiddenMovies
}

/**
 * Applies content filtering with optional enable/disable toggle
 * @param content Array of content to filter
 * @param userPreferences User's preferences containing ratings
 * @param enableFiltering Whether to apply filtering (default: true)
 * @returns Filtered or unfiltered content based on enableFiltering flag
 */
export function applyContentFilter(
    content: Content[],
    userPreferences: UserPreferences | null,
    enableFiltering: boolean = true
): Content[] {
    if (!enableFiltering) {
        return content
    }

    return filterHiddenContent(content, userPreferences)
}

/**
 * Filter function specifically for search results
 * @param searchResults Array of search results to filter
 * @param userPreferences User's preferences
 * @returns Filtered search results without hidden content
 */
export function filterSearchResults(
    searchResults: Content[],
    userPreferences: UserPreferences | null
): Content[] {
    return filterHiddenContent(searchResults, userPreferences)
}

// ========================================
// Child Safety Mode Filtering
// ========================================

/**
 * Filter content array based on adult flag (Child Safety Mode)
 * This is a quick first-pass filter that doesn't require certification data
 *
 * @param items - Array of content items
 * @param childSafetyMode - Whether child safety mode is enabled
 * @returns Filtered array of content
 */
export function filterContentByAdultFlag(items: Content[], childSafetyMode: boolean): Content[] {
    if (!childSafetyMode) {
        return items
    }

    // Filter out adult content - only Movies have the adult flag, TVShows don't
    return items.filter((item) => {
        // If it's a Movie, check the adult flag
        if (item.media_type === 'movie') {
            return item.adult !== true
        }
        // TVShows don't have adult flag, so keep them (they use content_ratings instead)
        return true
    })
}

/**
 * Filter content array and return statistics
 *
 * @param items - Array of content items
 * @param childSafetyMode - Whether child safety mode is enabled
 * @returns Object with filtered items and statistics
 */
export function filterContentWithStats(
    items: Content[],
    childSafetyMode: boolean
): {
    items: Content[]
    shown: number
    hidden: number
    totalBefore: number
} {
    const totalBefore = items.length

    if (!childSafetyMode) {
        return {
            items,
            shown: totalBefore,
            hidden: 0,
            totalBefore,
        }
    }

    const filtered = filterContentByAdultFlag(items, true)

    return {
        items: filtered,
        shown: filtered.length,
        hidden: totalBefore - filtered.length,
        totalBefore,
    }
}

/**
 * Check if content should be blocked in Child Safety Mode
 * Uses adult flag as primary indicator
 *
 * @param content - Content item to check
 * @param childSafetyMode - Whether child safety mode is enabled
 * @returns true if content should be blocked
 */
export function isContentRestricted(
    content: { adult?: boolean },
    childSafetyMode: boolean
): boolean {
    if (!childSafetyMode) {
        return false
    }

    // Block if adult flag is true
    return content.adult === true
}

/**
 * Request multiplier for Child Safety Mode
 * When filtering client-side, we need to request more items
 * to compensate for items that will be filtered out
 *
 * @param childSafetyMode - Whether child safety mode is enabled
 * @param baseAmount - The desired number of items after filtering
 * @returns Adjusted amount to request from API
 */
export function getRequestMultiplier(childSafetyMode: boolean, baseAmount: number): number {
    // If child safety is OFF, request exactly what we need
    if (!childSafetyMode) {
        return baseAmount
    }

    // Request 2x items to compensate for filtering
    // This is a conservative estimate - actual filtering rate varies by content
    return baseAmount * 2
}
