/**
 * Movie Certification Utilities for Child Safety Mode
 * Handles server-side fetching and filtering of movie certifications from TMDB
 * Uses in-memory cache to reduce API calls
 */

import { certificationCache } from './certificationCache'

export interface MovieCertification {
    iso_3166_1: string
    certification: string
    release_date?: string
}

interface MovieReleaseDatesResponse {
    results: {
        iso_3166_1: string
        release_dates: MovieCertification[]
    }[]
    id: number
}

// Child-safe US MPAA ratings (G, PG, PG-13)
// Block: R, NC-17, and unrated content
export const CHILD_SAFE_CERTIFICATIONS = new Set([
    'G', // General Audiences
    'PG', // Parental Guidance Suggested
    'PG-13', // Parents Strongly Cautioned
])

// Mature ratings that should be blocked in child safety mode
export const MATURE_CERTIFICATIONS = new Set([
    'R', // Restricted (under 17 requires parent)
    'NC-17', // No one 17 and under admitted
    'NR', // Not Rated
    'UR', // Unrated
    '', // Empty string (unrated)
])

/**
 * Fetch certification data for a movie from TMDB (with caching)
 * @param movieId - The TMDB ID of the movie
 * @param apiKey - TMDB API key
 * @returns Promise with certifications or null if failed
 */
export async function fetchMovieCertification(
    movieId: number,
    apiKey: string
): Promise<string | null> {
    // Check cache first
    const cached = certificationCache.getMovie(movieId)
    if (cached !== undefined) {
        return cached
    }

    // Cache miss - fetch from API
    try {
        const url = `https://api.themoviedb.org/3/movie/${movieId}/release_dates?api_key=${apiKey}`
        const response = await fetch(url)

        if (!response.ok) {
            certificationCache.setMovie(movieId, null)
            return null
        }

        const data: MovieReleaseDatesResponse = await response.json()

        // Find US certification (most reliable and standardized)
        const usRelease = data.results.find((r) => r.iso_3166_1 === 'US')
        let certification: string | null = null

        if (usRelease && usRelease.release_dates.length > 0) {
            // Get the first certification (usually theatrical release)
            certification = usRelease.release_dates[0].certification || null
        }

        // Cache the result (even if null)
        certificationCache.setMovie(movieId, certification)
        return certification
    } catch (error) {
        console.error(`Failed to fetch certification for movie ${movieId}:`, error)
        certificationCache.setMovie(movieId, null)
        return null
    }
}

/**
 * Check if a movie certification is child-safe
 * @param certification - Movie certification string (e.g., "PG-13", "R")
 * @returns true if the certification is NOT child-safe (R, NC-17, or unrated)
 */
export function hasMatureCertification(certification: string | null): boolean {
    if (!certification || certification.trim() === '') {
        // SECURITY: No certification available - exclude from child safety mode (fail closed)
        // We cannot verify content is appropriate without rating data
        return true
    }

    // Check if it's explicitly mature
    if (MATURE_CERTIFICATIONS.has(certification)) {
        return true
    }

    // Check if it's NOT in the child-safe list
    return !CHILD_SAFE_CERTIFICATIONS.has(certification)
}

/**
 * Filter movies based on certifications (server-side)
 * Makes individual API calls to verify each movie's rating
 * @param movies - Array of movie objects
 * @param apiKey - TMDB API key
 * @returns Promise with filtered movies (mature content removed)
 */
export async function filterMatureMovies(movies: any[], apiKey: string): Promise<any[]> {
    if (!movies || movies.length === 0) {
        return []
    }

    // Batch fetch all movie certifications in parallel
    const certificationPromises = movies.map((movie) => fetchMovieCertification(movie.id, apiKey))

    const certificationResults = await Promise.all(certificationPromises)

    // Filter out movies with mature certifications OR missing certification data
    return movies.filter((movie, index) => {
        const certification = certificationResults[index]
        if (!certification) {
            // SECURITY: If we couldn't fetch certification, exclude the movie (fail closed)
            // Cannot verify content is appropriate without rating data
            return false
        }
        return !hasMatureCertification(certification)
    })
}

/**
 * Get statistics about movie content filtering
 * @param movies - Original array of movies
 * @param filteredMovies - Filtered array of movies
 * @returns Object with filtering statistics
 */
export function getMovieFilterStats(movies: any[], filteredMovies: any[]) {
    return {
        total: movies.length,
        shown: filteredMovies.length,
        hidden: movies.length - filteredMovies.length,
    }
}
