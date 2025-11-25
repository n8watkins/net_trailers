/**
 * Auto-generate display names for system recommendations
 * based on mediaType and genre selections
 */

import { SystemRecommendationId } from '../types/recommendations'
import { findUnifiedGenre } from '../constants/unifiedGenres'

interface NameGeneratorOptions {
    recommendationId: SystemRecommendationId
    mediaType: 'movie' | 'tv' | 'both'
    genres?: string[] // unified genre IDs
}

/**
 * Get genre names from unified genre IDs
 */
function getGenreNames(genreIds: string[]): string[] {
    return genreIds.map((id) => findUnifiedGenre(id)?.name).filter((name): name is string => !!name)
}

/**
 * Format genre names for display (e.g., "Action & Comedy")
 */
function formatGenreNames(names: string[]): string {
    if (names.length === 0) return ''
    if (names.length === 1) return names[0]
    if (names.length === 2) return `${names[0]} & ${names[1]}`
    // 3+ genres: "Action, Comedy & Drama"
    const last = names[names.length - 1]
    const rest = names.slice(0, -1)
    return `${rest.join(', ')} & ${last}`
}

/**
 * Generate display name for a system recommendation
 */
export function generateSystemRecommendationName(options: NameGeneratorOptions): string {
    const { recommendationId, mediaType, genres = [] } = options
    const genreNames = getGenreNames(genres)
    const genreStr = formatGenreNames(genreNames)

    switch (recommendationId) {
        case 'trending': {
            if (mediaType === 'tv') {
                return genreStr ? `Trending TV ${genreStr}` : 'Trending TV'
            }
            if (mediaType === 'movie') {
                return genreStr ? `Trending ${genreStr} Movies` : 'Trending Movies'
            }
            // both
            return genreStr ? `Trending ${genreStr}` : 'Trending'
        }

        case 'top-rated': {
            if (mediaType === 'tv') {
                return genreStr ? `Top Rated TV ${genreStr}` : 'Top Rated TV'
            }
            if (mediaType === 'movie') {
                return genreStr ? `Top Rated ${genreStr} Movies` : 'Top Rated Movies'
            }
            // both
            return genreStr ? `Top Rated ${genreStr}` : 'Top Rated'
        }

        case 'trending-actors':
        case 'trending-movie-actors':
        case 'trending-tv-actors': {
            if (mediaType === 'tv') {
                return 'Trending TV Actors'
            }
            if (mediaType === 'movie') {
                return 'Trending Movie Actors'
            }
            return 'Trending Actors'
        }

        case 'trending-directors':
        case 'trending-movie-directors':
        case 'trending-tv-directors': {
            if (mediaType === 'tv') {
                return 'Trending TV Directors'
            }
            if (mediaType === 'movie') {
                return 'Trending Movie Directors'
            }
            return 'Trending Directors'
        }

        case 'recommended-for-you': {
            // This one stays static
            return 'Recommended For You'
        }

        default:
            return 'Recommendations'
    }
}

/**
 * Get the default emoji for a system recommendation
 */
export function getSystemRecommendationEmoji(recommendationId: SystemRecommendationId): string {
    switch (recommendationId) {
        case 'trending':
            return '🔥'
        case 'top-rated':
            return '⭐'
        case 'trending-actors':
        case 'trending-movie-actors':
        case 'trending-tv-actors':
            return '🎭'
        case 'trending-directors':
        case 'trending-movie-directors':
        case 'trending-tv-directors':
            return '🎬'
        case 'recommended-for-you':
            return '✨'
        default:
            return '📺'
    }
}
