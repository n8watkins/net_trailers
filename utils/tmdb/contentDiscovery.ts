/**
 * TMDB Content Discovery for Auto-Updating Collections
 *
 * Utilities for finding new content that matches collection criteria
 */

import { TMDBApiClient } from '../tmdbApi'
import { CustomRow, AdvancedFilters } from '../../types/collections'
import { Content } from '../../types/collections'

const tmdb = TMDBApiClient.getInstance()

interface TMDBDiscoverResponse {
    page: number
    results: Content[]
    total_pages: number
    total_results: number
}

/**
 * Check TMDB for new content matching a collection's criteria
 * NOTE: Auto-update feature was removed during refactor. This function is deprecated.
 *
 * @param collection - CustomRow to check for updates
 * @returns Array of new TMDB content IDs
 * @deprecated Auto-update feature has been removed
 */
export async function checkForNewContent(collection: CustomRow): Promise<number[]> {
    // NOTE: Auto-update feature was removed during refactor
    // This function is kept for backward compatibility but will always return empty array
    return []

    // Don't check if auto-update is disabled
    // if (!collection.autoUpdateEnabled) {
    //     return []
    // }

    // Special handling for curated collections (contentIds-based)
    if (
        collection.advancedFilters?.contentIds &&
        Array.isArray(collection.advancedFilters!.contentIds) &&
        collection.advancedFilters!.contentIds!.length > 0
    ) {
        // Curated collections don't auto-update from TMDB
        // They're manually curated, so no new content to discover
        return []
    }

    try {
        const newContentIds: number[] = []

        // Check for movies if mediaType is 'movie' or 'both'
        if (collection.mediaType === 'movie' || collection.mediaType === 'both') {
            const movieIds = await discoverNewContent(collection, 'movie')
            newContentIds.push(...movieIds)
        }

        // Check for TV shows if mediaType is 'tv' or 'both'
        if (collection.mediaType === 'tv' || collection.mediaType === 'both') {
            const tvIds = await discoverNewContent(collection, 'tv')
            newContentIds.push(...tvIds)
        }

        // Remove duplicates and filter out existing content
        const uniqueIds = Array.from(new Set(newContentIds))
        const existingIds = collection.advancedFilters?.contentIds || []
        const newIds = uniqueIds.filter((id) => !existingIds.includes(id))

        return newIds
    } catch (error) {
        console.error('Error checking for new content:', error)
        return []
    }
}

/**
 * Discover new content for a specific media type
 *
 * @param collection - CustomRow configuration
 * @param mediaType - 'movie' or 'tv'
 * @returns Array of TMDB content IDs
 */
async function discoverNewContent(
    collection: CustomRow,
    mediaType: 'movie' | 'tv'
): Promise<number[]> {
    const params = buildDiscoverParams(collection, mediaType)

    try {
        // Fetch first page of results
        const response = await tmdb.fetch<TMDBDiscoverResponse>(
            `/discover/${mediaType}`,
            params as Record<string, string | number>
        )

        // Extract content IDs
        return response.results.map((item) => item.id)
    } catch (error) {
        console.error(`Error discovering ${mediaType} content:`, error)
        return []
    }
}

/**
 * Build TMDB discover API parameters from collection criteria
 *
 * @param collection - CustomRow configuration
 * @param mediaType - 'movie' or 'tv'
 * @returns Query parameters for TMDB API
 */
function buildDiscoverParams(
    collection: CustomRow,
    mediaType: 'movie' | 'tv'
): Record<string, string | number> {
    const params: Record<string, string | number> = {
        sort_by: 'release_date.desc', // Newest first
        include_adult: 'false',
        page: 1,
    }

    // Genre filtering
    if (collection.genres && collection.genres.length > 0) {
        if (collection.genreLogic === 'AND') {
            // All genres must match
            params.with_genres = collection.genres.join(',')
        } else {
            // Any genre matches (OR logic)
            params.with_genres = collection.genres.join('|')
        }
    }

    // NOTE: Auto-update feature was removed during refactor
    // Release date filter - only get content released after last check
    // if (collection.lastCheckedAt) {
    //     const lastCheckDate = new Date(collection.lastCheckedAt)
    //     const formattedDate = lastCheckDate.toISOString().split('T')[0] // YYYY-MM-DD
    //
    //     if (mediaType === 'movie') {
    //         params['primary_release_date.gte'] = formattedDate
    //     } else {
    //         params['first_air_date.gte'] = formattedDate
    //     }
    // } else {
    //     // If never checked, get content from last 30 days
    //     const thirtyDaysAgo = new Date()
    //     thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    //     const formattedDate = thirtyDaysAgo.toISOString().split('T')[0]
    //
    //     if (mediaType === 'movie') {
    //         params['primary_release_date.gte'] = formattedDate
    //     } else {
    //         params['first_air_date.gte'] = formattedDate
    //     }
    // }

    // Advanced filters
    if (collection.advancedFilters) {
        applyAdvancedFilters(params, collection.advancedFilters, mediaType)
    }

    return params
}

/**
 * Apply advanced filters to discover params
 *
 * @param params - Existing params object to modify
 * @param filters - AdvancedFilters from collection
 * @param mediaType - 'movie' or 'tv'
 */
function applyAdvancedFilters(
    params: Record<string, string | number>,
    filters: AdvancedFilters,
    mediaType: 'movie' | 'tv'
): void {
    // Year filters
    if (filters.yearMin) {
        if (mediaType === 'movie') {
            params['primary_release_date.gte'] = `${filters.yearMin}-01-01`
        } else {
            params['first_air_date.gte'] = `${filters.yearMin}-01-01`
        }
    }

    if (filters.yearMax) {
        if (mediaType === 'movie') {
            params['primary_release_date.lte'] = `${filters.yearMax}-12-31`
        } else {
            params['first_air_date.lte'] = `${filters.yearMax}-12-31`
        }
    }

    // Rating filters (0-10 scale)
    if (filters.ratingMin !== undefined) {
        params['vote_average.gte'] = filters.ratingMin
    }

    if (filters.ratingMax !== undefined) {
        params['vote_average.lte'] = filters.ratingMax
    }

    // Vote count filter
    if (filters.voteCount !== undefined) {
        const voteCountMap = [0, 100, 1000, 5000, 10000]
        const minVotes = voteCountMap[filters.voteCount] || 0
        if (minVotes > 0) {
            params['vote_count.gte'] = minVotes
        }
    }

    // Popularity filter
    if (filters.popularity !== undefined) {
        const popularityMap = [0, 10, 50, 100, 200]
        const minPopularity = popularityMap[filters.popularity] || 0
        if (minPopularity > 0) {
            params['popularity.gte'] = minPopularity
        }
    }

    // Cast/Director filters (TMDB person IDs)
    if (filters.withCast && filters.withCast.length > 0) {
        // Filter to only numeric IDs (person IDs)
        const personIds = filters.withCast.filter((id) => !isNaN(Number(id))).join(',')
        if (personIds) {
            params.with_cast = personIds
        }
    }

    if (filters.withDirector && filters.withDirector.length > 0) {
        // Use first director if it's a numeric ID
        const firstDirector = filters.withDirector[0]
        if (!isNaN(Number(firstDirector))) {
            params.with_crew = firstDirector
        }
    }
}

/**
 * Add new content IDs to a collection
 * NOTE: Auto-update feature was removed during refactor. This function is deprecated.
 *
 * @param collection - CustomRow to update
 * @param newContentIds - Array of TMDB IDs to add
 * @returns Updated collection with new content
 * @deprecated Auto-update feature has been removed
 */
export function addContentToCollection(collection: CustomRow, newContentIds: number[]): CustomRow {
    if (newContentIds.length === 0) {
        return collection
    }

    // Initialize advancedFilters if not exists
    const advancedFilters = collection.advancedFilters || {}

    // Get existing content IDs
    const existingIds = advancedFilters.contentIds || []

    // Merge and deduplicate
    const updatedIds = Array.from(new Set([...existingIds, ...newContentIds]))

    // Update collection (without auto-update fields that were removed)
    return {
        ...collection,
        advancedFilters: {
            ...advancedFilters,
            contentIds: updatedIds,
        },
        // NOTE: Auto-update feature was removed during refactor
        // lastCheckedAt: Date.now(),
        // lastUpdateCount: newContentIds.length,
        updatedAt: Date.now(),
    }
}

/**
 * Get collections that need to be checked for updates
 * NOTE: Auto-update feature was removed during refactor. This function is deprecated.
 *
 * @param allCollections - Array of all CustomRows
 * @returns Collections that are due for update check
 * @deprecated Auto-update feature has been removed
 */
export function getCollectionsDueForUpdate(allCollections: CustomRow[]): CustomRow[] {
    // NOTE: Auto-update feature was removed during refactor
    // This function is kept for backward compatibility but will always return empty array
    return []

    // const now = Date.now()
    //
    // return allCollections.filter((collection) => {
    //     // Must have auto-update enabled
    //     if (!collection.autoUpdateEnabled) {
    //         return false
    //     }
    //
    //     // Skip if frequency is 'never'
    //     if (collection.updateFrequency === 'never') {
    //         return false
    //     }
    //
    //     // If never checked, include it
    //     if (!collection.lastCheckedAt) {
    //         return true
    //     }
    //
    //     // Check based on frequency
    //     const timeSinceLastCheck = now - collection.lastCheckedAt
    //     const oneDayMs = 24 * 60 * 60 * 1000
    //     const oneWeekMs = 7 * oneDayMs
    //
    //     if (collection.updateFrequency === 'daily') {
    //         return timeSinceLastCheck >= oneDayMs
    //     } else if (collection.updateFrequency === 'weekly') {
    //         return timeSinceLastCheck >= oneWeekMs
    //     }
    //
    //     return false
    // })
}

/**
 * Validate collection can be auto-updated
 * NOTE: Auto-update feature was removed during refactor. This function is deprecated.
 *
 * @param collection - CustomRow to validate
 * @returns True if collection can be auto-updated
 * @deprecated Auto-update feature has been removed
 */
export function canAutoUpdate(collection: CustomRow): boolean {
    // NOTE: Auto-update feature was removed during refactor
    // This function is kept for backward compatibility but will always return false
    return false

    // Can't auto-update if disabled
    // if (!collection.autoUpdateEnabled) {
    //     return false
    // }

    // Can't auto-update curated collections (manually selected content)
    if (
        collection.advancedFilters?.contentIds &&
        Array.isArray(collection.advancedFilters!.contentIds) &&
        collection.advancedFilters!.contentIds!.length > 0
    ) {
        // Exception: If it has other filters too, it might be discoverable
        const hasOtherFilters =
            collection.genres.length > 0 ||
            collection.advancedFilters?.yearMin !== undefined ||
            collection.advancedFilters?.ratingMin !== undefined

        if (!hasOtherFilters) {
            return false
        }
    }

    // Must have at least one genre or advanced filter for discovery
    const hasDiscoveryCriteria =
        collection.genres.length > 0 ||
        collection.advancedFilters?.yearMin !== undefined ||
        collection.advancedFilters?.ratingMin !== undefined ||
        collection.advancedFilters?.withCast !== undefined ||
        collection.advancedFilters?.withDirector !== undefined

    return hasDiscoveryCriteria
}
