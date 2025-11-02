/**
 * TV Content Rating Utilities for Child Safety Mode
 * Handles server-side fetching and filtering of TV show content ratings from TMDB
 * Uses in-memory cache to reduce API calls
 */

import { certificationCache } from './certificationCache'

export interface ContentRating {
    iso_3166_1: string
    rating: string
}

interface TVContentRatingsResponse {
    results: ContentRating[]
    id: number
}

// Mature TV ratings that should be filtered in child safety mode
// Only block truly adult/mature content (18+, TV-MA)
// Allow: TV-14, TV-PG, TV-G, and international equivalents like 15, 16
export const MATURE_TV_RATINGS = new Set([
    'TV-MA', // TV Mature Audience (US) - BLOCKED
    'R', // Restricted (some regions use this for TV) - BLOCKED
    'NC-17', // No children under 17 - BLOCKED
    '18', // Age 18+ (various regions - UK, Germany, etc.) - BLOCKED
    '18+', // Age 18+ variant - BLOCKED
    'M', // Mature (Australia) - BLOCKED
    'MA15+', // Mature Accompanied (Australia) - BLOCKED
])

/**
 * Fetch content ratings for a TV show from TMDB (with caching)
 * @param tvId - The TMDB ID of the TV show
 * @param apiKey - TMDB API key
 * @returns Promise with content ratings or null if failed
 */
export async function fetchTVContentRatings(
    tvId: number,
    apiKey: string
): Promise<ContentRating[] | null> {
    // Check cache first
    const cached = certificationCache.getTV(tvId)
    if (cached !== undefined) {
        return cached
    }

    // Cache miss - fetch from API
    try {
        const url = `https://api.themoviedb.org/3/tv/${tvId}/content_ratings?api_key=${apiKey}`
        const response = await fetch(url)

        if (!response.ok) {
            certificationCache.setTV(tvId, null)
            return null
        }

        const data: TVContentRatingsResponse = await response.json()
        const ratings = data.results || []

        // Cache the result
        certificationCache.setTV(tvId, ratings)
        return ratings
    } catch (error) {
        console.error(`Failed to fetch content ratings for TV show ${tvId}:`, error)
        certificationCache.setTV(tvId, null)
        return null
    }
}

/**
 * Check if a TV show has a mature content rating OR lacks rating data
 * @param ratings - Array of content ratings from TMDB
 * @returns true if the show has a mature rating OR no ratings available
 */
export function hasMatureRating(ratings: ContentRating[]): boolean {
    if (!ratings || ratings.length === 0) {
        // SECURITY: No ratings available - exclude from child safety mode (fail closed)
        // We cannot verify content is appropriate without rating data
        return true
    }

    // Check US rating first (most reliable and standardized)
    const usRating = ratings.find((r) => r.iso_3166_1 === 'US')
    if (usRating && MATURE_TV_RATINGS.has(usRating.rating)) {
        return true
    }

    // If no US rating, check other regions
    return ratings.some((r) => MATURE_TV_RATINGS.has(r.rating))
}

/**
 * Filter TV shows based on content ratings (server-side)
 * @param tvShows - Array of TV show objects
 * @param apiKey - TMDB API key
 * @returns Promise with filtered TV shows (mature content removed)
 */
export async function filterMatureTVShows(tvShows: any[], apiKey: string): Promise<any[]> {
    if (!tvShows || tvShows.length === 0) {
        return []
    }

    // Batch fetch all TV show ratings in parallel
    const ratingsPromises = tvShows.map((show) => fetchTVContentRatings(show.id, apiKey))

    const ratingsResults = await Promise.all(ratingsPromises)

    // Filter out shows with mature ratings OR missing rating data
    return tvShows.filter((show, index) => {
        const ratings = ratingsResults[index]
        if (!ratings) {
            // SECURITY: If we couldn't fetch ratings, exclude the show (fail closed)
            // Cannot verify content is appropriate without rating data
            return false
        }
        return !hasMatureRating(ratings)
    })
}

/**
 * Get statistics about TV content filtering
 * @param tvShows - Original array of TV shows
 * @param filteredTVShows - Filtered array of TV shows
 * @returns Object with filtering statistics
 */
export function getTVFilterStats(tvShows: any[], filteredTVShows: any[]) {
    return {
        total: tvShows.length,
        shown: filteredTVShows.length,
        hidden: tvShows.length - filteredTVShows.length,
    }
}
