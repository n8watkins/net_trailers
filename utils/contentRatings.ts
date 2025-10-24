/**
 * Content Rating Classification System
 * Determines if content is safe for children based on MPAA/TV Parental Guidelines
 */

// US Movie Ratings (MPAA)
export const SAFE_US_MOVIE_RATINGS = ['G', 'PG', 'PG-13']
export const RESTRICTED_US_MOVIE_RATINGS = ['R', 'NC-17', 'NR', 'UR']

// US TV Ratings (TV Parental Guidelines)
export const SAFE_US_TV_RATINGS = ['TV-Y', 'TV-Y7', 'TV-Y7-FV', 'TV-G', 'TV-PG', 'TV-14']
export const RESTRICTED_US_TV_RATINGS = ['TV-MA']

// UK Ratings (BBFC)
export const SAFE_UK_MOVIE_RATINGS = ['U', 'PG', '12', '12A']
export const RESTRICTED_UK_MOVIE_RATINGS = ['15', '18', 'R18']

// Canadian Ratings
export const SAFE_CA_MOVIE_RATINGS = ['G', 'PG', '14A']
export const RESTRICTED_CA_MOVIE_RATINGS = ['18A', 'R', 'A']

// German Ratings (FSK)
export const SAFE_DE_MOVIE_RATINGS = ['0', '6', '12']
export const RESTRICTED_DE_MOVIE_RATINGS = ['16', '18']

/**
 * Check if a certification rating is safe for children
 *
 * @param certification - The content rating (e.g., "PG-13", "TV-14", "R")
 * @param mediaType - The type of media ("movie" or "tv")
 * @param country - The country code (default: "US")
 * @returns true if safe for children, false if restricted
 *
 * @example
 * isSafeRating('PG-13', 'movie', 'US') // true
 * isSafeRating('R', 'movie', 'US') // false
 * isSafeRating('TV-14', 'tv', 'US') // true
 * isSafeRating('TV-MA', 'tv', 'US') // false
 * isSafeRating(null, 'movie', 'US') // true (permissive default)
 */
export function isSafeRating(
    certification: string | null | undefined,
    mediaType: 'movie' | 'tv',
    country: string = 'US'
): boolean {
    // Null/undefined = unknown = show (permissive default)
    // This handles unrated content gracefully
    if (!certification) {
        return true
    }

    // Normalize certification (trim, uppercase)
    const cert = certification.trim().toUpperCase()

    // Handle by country
    switch (country.toUpperCase()) {
        case 'US':
            if (mediaType === 'movie') {
                return SAFE_US_MOVIE_RATINGS.includes(cert)
            } else {
                return SAFE_US_TV_RATINGS.includes(cert)
            }

        case 'GB':
        case 'UK':
            return SAFE_UK_MOVIE_RATINGS.includes(cert)

        case 'CA':
            return SAFE_CA_MOVIE_RATINGS.includes(cert)

        case 'DE':
            return SAFE_DE_MOVIE_RATINGS.includes(cert)

        default:
            // Unknown country = check if it's explicitly restricted in any system
            // If not found in any restricted list, allow (permissive for unknown)
            const allRestrictedRatings = [
                ...RESTRICTED_US_MOVIE_RATINGS,
                ...RESTRICTED_US_TV_RATINGS,
                ...RESTRICTED_UK_MOVIE_RATINGS,
                ...RESTRICTED_CA_MOVIE_RATINGS,
                ...RESTRICTED_DE_MOVIE_RATINGS,
            ]

            // If it matches a known restricted rating, block it
            if (allRestrictedRatings.includes(cert)) {
                return false
            }

            // Otherwise, allow unknown ratings (permissive)
            return true
    }
}

/**
 * Get all safe certifications for a given media type and country
 * Useful for building TMDB API query parameters
 *
 * @param mediaType - The type of media ("movie" or "tv")
 * @param country - The country code (default: "US")
 * @returns Array of safe certification strings
 *
 * @example
 * getSafeCertifications('movie', 'US') // ['G', 'PG', 'PG-13']
 * getSafeCertifications('tv', 'US') // ['TV-Y', 'TV-Y7', ...]
 */
export function getSafeCertifications(mediaType: 'movie' | 'tv', country: string = 'US'): string[] {
    switch (country.toUpperCase()) {
        case 'US':
            return mediaType === 'movie' ? SAFE_US_MOVIE_RATINGS : SAFE_US_TV_RATINGS

        case 'GB':
        case 'UK':
            return SAFE_UK_MOVIE_RATINGS

        case 'CA':
            return SAFE_CA_MOVIE_RATINGS

        case 'DE':
            return SAFE_DE_MOVIE_RATINGS

        default:
            // Default to US ratings for unknown countries
            return mediaType === 'movie' ? SAFE_US_MOVIE_RATINGS : SAFE_US_TV_RATINGS
    }
}

/**
 * Extract certification from TMDB movie data
 * Movies store certification in release_dates.results[]
 *
 * @param movieData - TMDB movie details object
 * @param country - The country code to extract certification for (default: "US")
 * @returns The certification rating or null if not found
 */
export function getMovieCertification(movieData: any, country: string = 'US'): string | null {
    if (!movieData?.release_dates?.results) {
        return null
    }

    const countryData = movieData.release_dates.results.find(
        (r: any) => r.iso_3166_1 === country.toUpperCase()
    )

    if (!countryData?.release_dates?.length) {
        return null
    }

    // Get the first certification (usually the main theatrical release)
    return countryData.release_dates[0]?.certification || null
}

/**
 * Extract certification from TMDB TV show data
 * TV shows store certification in content_ratings.results[]
 *
 * @param tvData - TMDB TV show details object
 * @param country - The country code to extract certification for (default: "US")
 * @returns The certification rating or null if not found
 */
export function getTVCertification(tvData: any, country: string = 'US'): string | null {
    if (!tvData?.content_ratings?.results) {
        return null
    }

    const countryData = tvData.content_ratings.results.find(
        (r: any) => r.iso_3166_1 === country.toUpperCase()
    )

    return countryData?.rating || null
}

/**
 * Classify content based on its certification
 *
 * @param content - Content object with certification data
 * @param mediaType - The type of media ("movie" or "tv")
 * @param country - The country code (default: "US")
 * @returns 'safe', 'restricted', or 'unknown'
 */
export function classifyContent(
    content: any,
    mediaType: 'movie' | 'tv',
    country: string = 'US'
): 'safe' | 'restricted' | 'unknown' {
    // Check adult flag first (quick filter)
    if (content.adult === true) {
        return 'restricted'
    }

    // Extract certification
    const certification =
        mediaType === 'movie'
            ? getMovieCertification(content, country)
            : getTVCertification(content, country)

    // If no certification, classify as unknown (will be shown with permissive default)
    if (!certification) {
        return 'unknown'
    }

    // Check if safe
    return isSafeRating(certification, mediaType, country) ? 'safe' : 'restricted'
}
