/**
 * TV Content Rating Utilities for Child Safety Mode
 * Handles server-side fetching and filtering of TV show content ratings from TMDB
 */

export interface ContentRating {
    iso_3166_1: string
    rating: string
}

interface TVContentRatingsResponse {
    results: ContentRating[]
    id: number
}

// Mature TV ratings that should be filtered in child safety mode
// TV-14 is ALLOWED (suitable for ages 14+)
export const MATURE_TV_RATINGS = new Set([
    'TV-MA', // TV Mature Audience (US) - BLOCKED
    'R', // Restricted (some regions use this for TV) - BLOCKED
    'NC-17', // No children under 17 - BLOCKED
    '18', // Age 18+ (various regions - UK, Germany, etc.) - BLOCKED
    '18+', // Age 18+ variant - BLOCKED
    'M', // Mature (Australia) - BLOCKED
    'MA15+', // Mature Accompanied (Australia) - BLOCKED
    '16', // Age 16+ (various regions) - BLOCKED
    '15', // Age 15+ (UK) - BLOCKED
])

/**
 * Fetch content ratings for a TV show from TMDB
 * @param tvId - The TMDB ID of the TV show
 * @param apiKey - TMDB API key
 * @returns Promise with content ratings or null if failed
 */
export async function fetchTVContentRatings(
    tvId: number,
    apiKey: string
): Promise<ContentRating[] | null> {
    try {
        const url = `https://api.themoviedb.org/3/tv/${tvId}/content_ratings?api_key=${apiKey}`
        const response = await fetch(url)

        if (!response.ok) {
            return null
        }

        const data: TVContentRatingsResponse = await response.json()
        return data.results || []
    } catch (error) {
        console.error(`Failed to fetch content ratings for TV show ${tvId}:`, error)
        return null
    }
}

/**
 * Check if a TV show has a mature content rating
 * @param ratings - Array of content ratings from TMDB
 * @returns true if the show has a mature rating
 */
export function hasMatureRating(ratings: ContentRating[]): boolean {
    if (!ratings || ratings.length === 0) {
        // No ratings available - default to allowing it (fail open)
        return false
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

    // Filter out shows with mature ratings
    return tvShows.filter((show, index) => {
        const ratings = ratingsResults[index]
        if (!ratings) {
            // If we couldn't fetch ratings, keep the show (fail open for better UX)
            return true
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
