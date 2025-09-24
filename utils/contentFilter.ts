import { Content } from '../typings'
import { UserRating, UserPreferences } from '../atoms/userDataAtom'

/**
 * Content filtering utilities for hiding disliked/hidden content from recommendations
 */

/**
 * Filter content array to exclude disliked items
 * @param content Array of content to filter
 * @param ratings User ratings array
 * @returns Filtered content array without disliked items
 */
export function filterDislikedContent(content: Content[], ratings: UserRating[]): Content[] {
    if (!ratings || ratings.length === 0) {
        return content
    }

    // Create a Set of disliked content IDs for O(1) lookup
    const dislikedIds = new Set(
        ratings.filter((rating) => rating.rating === 'disliked').map((rating) => rating.contentId)
    )

    // Filter out disliked content
    return content.filter((item) => !dislikedIds.has(item.id))
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
    if (!userPreferences?.ratings || userPreferences.ratings.length === 0) {
        return content
    }

    return filterDislikedContent(content, userPreferences.ratings)
}

/**
 * Check if specific content is disliked
 * @param contentId The ID of the content to check
 * @param ratings User ratings array
 * @returns true if content is disliked, false otherwise
 */
export function isContentDisliked(contentId: number, ratings: UserRating[]): boolean {
    return ratings.some((rating) => rating.contentId === contentId && rating.rating === 'disliked')
}

/**
 * Check if specific content is hidden by the user
 * @param contentId Content ID to check
 * @param userPreferences User's preferences containing ratings
 * @returns True if content is hidden, false otherwise
 */
export function isContentHidden(
    contentId: number,
    userPreferences: UserPreferences | null
): boolean {
    if (!userPreferences?.ratings) {
        return false
    }

    return isContentDisliked(contentId, userPreferences.ratings)
}

/**
 * Gets all hidden content from user preferences
 * @param userPreferences User's preferences containing ratings and content
 * @returns Array of hidden content items
 */
export function getHiddenContent(userPreferences: UserPreferences | null): Content[] {
    if (!userPreferences?.ratings) {
        return []
    }

    // Find the actual content objects from ratings that include content data
    const hiddenContent: Content[] = []

    userPreferences.ratings.forEach((rating) => {
        if (rating.rating === 'disliked' && rating.content) {
            hiddenContent.push(rating.content)
        }
    })

    return hiddenContent
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
