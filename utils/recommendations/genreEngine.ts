/**
 * Genre-Based Recommendation Engine
 *
 * Generates personalized recommendations based on user's genre preferences
 */

import { Content } from '../../types/collections'
import { GenrePreference, RecommendationProfile } from '../../types/recommendations'
import { MOVIE_GENRES, TV_GENRES } from '../../constants/genres'
import { UNIFIED_GENRES } from '../../constants/unifiedGenres'
import { discoverByPreferences, getTopRatedByGenre } from '../tmdb/recommendations'

// Quiz preference type (matches the type in PreferenceQuizModal)
export interface QuizGenrePreference {
    genreId: string // Unified genre ID (e.g., 'action', 'comedy')
    preference: 'like' | 'dislike' | 'neutral'
    updatedAt: number
}

// Quiz preference weights
const QUIZ_WEIGHTS = {
    like: 5, // Strong boost for liked genres
    neutral: 0, // No effect
    dislike: -5, // Strong penalty for disliked genres
}

/**
 * Calculate genre preference scores from user data
 *
 * @param userData - User's content collections
 * @param quizPreferences - Optional quiz-based genre preferences
 * @returns Genre preferences sorted by score
 */
export function calculateGenrePreferences(
    userData: {
        likedMovies: Content[]
        defaultWatchlist: Content[]
        collectionItems?: Content[]
        hiddenMovies: Content[]
    },
    quizPreferences?: QuizGenrePreference[]
): GenrePreference[] {
    const scores: Record<number, number> = {}
    const counts: Record<number, number> = {}

    const { likedMovies, defaultWatchlist, collectionItems = [], hiddenMovies } = userData

    // Apply quiz preferences first (convert unified IDs to TMDB IDs)
    if (quizPreferences && quizPreferences.length > 0) {
        quizPreferences.forEach((pref) => {
            const weight = QUIZ_WEIGHTS[pref.preference]
            if (weight === 0) return // Skip neutral

            // Find the unified genre and get its TMDB IDs
            const unifiedGenre = UNIFIED_GENRES.find((g) => g.id === pref.genreId)
            if (unifiedGenre) {
                // Apply to all movie IDs
                unifiedGenre.movieIds.forEach((tmdbId) => {
                    scores[tmdbId] = (scores[tmdbId] || 0) + weight
                })
                // Apply to all TV IDs
                unifiedGenre.tvIds.forEach((tmdbId) => {
                    scores[tmdbId] = (scores[tmdbId] || 0) + weight
                })
            }
        })
    }

    // Process liked content (highest weight: +3)
    likedMovies.forEach((content) => {
        content.genre_ids?.forEach((genreId) => {
            scores[genreId] = (scores[genreId] || 0) + 3
            counts[genreId] = (counts[genreId] || 0) + 1
        })
    })

    // Process watchlist (medium weight: +1)
    defaultWatchlist.forEach((content) => {
        content.genre_ids?.forEach((genreId) => {
            scores[genreId] = (scores[genreId] || 0) + 1
            counts[genreId] = (counts[genreId] || 0) + 1
        })
    })

    // Process collection items (medium weight: +1, same as watchlist)
    collectionItems.forEach((content) => {
        content.genre_ids?.forEach((genreId) => {
            scores[genreId] = (scores[genreId] || 0) + 1
            counts[genreId] = (counts[genreId] || 0) + 1
        })
    })

    // Process hidden content (negative signal: -2)
    hiddenMovies.forEach((content) => {
        content.genre_ids?.forEach((genreId) => {
            scores[genreId] = (scores[genreId] || 0) - 2
            // Don't count hidden in counts
        })
    })

    // Convert to GenrePreference array
    const preferences: GenrePreference[] = Object.entries(scores)
        .filter(([_, score]) => score > 0) // Only positive scores
        .map(([genreId, score]) => {
            const id = parseInt(genreId, 10)
            const genreName = getGenreName(id)
            return {
                genreId: id,
                genreName,
                score,
                count: counts[id] || 0,
            }
        })
        .sort((a, b) => b.score - a.score) // Sort by score descending

    return preferences
}

/**
 * Get genre name by ID
 */
function getGenreName(genreId: number): string {
    const movieGenre = MOVIE_GENRES.find((g) => g.id === genreId)
    if (movieGenre) return movieGenre.name

    const tvGenre = TV_GENRES.find((g) => g.id === genreId)
    if (tvGenre) return tvGenre.name

    return 'Unknown'
}

/**
 * Build user recommendation profile
 *
 * @param userData - User's content collections
 * @param quizPreferences - Optional quiz-based genre preferences
 * @returns Recommendation profile
 */
export function buildRecommendationProfile(
    userData: {
        userId: string
        likedMovies: Content[]
        defaultWatchlist: Content[]
        collectionItems?: Content[]
        hiddenMovies: Content[]
    },
    quizPreferences?: QuizGenrePreference[]
): RecommendationProfile {
    const topGenres = calculateGenrePreferences(userData, quizPreferences)

    // Calculate preferred rating (average of liked movies)
    const likedRatings = userData.likedMovies
        .map((c) => c.vote_average)
        .filter((r): r is number => r !== undefined)

    const preferredRating =
        likedRatings.length > 0
            ? likedRatings.reduce((sum, r) => sum + r, 0) / likedRatings.length
            : undefined

    // Calculate preferred year range (include collection items)
    const collectionItems = userData.collectionItems || []
    const allYears = [...userData.likedMovies, ...userData.defaultWatchlist, ...collectionItems]
        .map((c) => {
            if (c.media_type === 'movie') {
                return c.release_date ? new Date(c.release_date).getFullYear() : undefined
            } else {
                return c.first_air_date ? new Date(c.first_air_date).getFullYear() : undefined
            }
        })
        .filter((y): y is number => y !== undefined)

    const preferredYearRange =
        allYears.length > 0
            ? {
                  min: Math.min(...allYears),
                  max: Math.max(...allYears),
              }
            : undefined

    return {
        userId: userData.userId,
        topGenres: topGenres.slice(0, 5), // Top 5 genres
        preferredRating,
        preferredYearRange,
        updatedAt: Date.now(),
    }
}

/**
 * Generate genre-based recommendations
 *
 * @param profile - User recommendation profile
 * @param limit - Number of recommendations
 * @param excludeIds - Content IDs to exclude
 * @returns Array of recommended content
 */
export async function getGenreBasedRecommendations(
    profile: RecommendationProfile,
    limit: number = 20,
    excludeIds: number[] = []
): Promise<Content[]> {
    if (profile.topGenres.length === 0) {
        return []
    }

    try {
        // Get top 3 genres
        const topGenreIds = profile.topGenres.slice(0, 3).map((g) => g.genreId)

        // Fetch content matching top genres
        const results = await discoverByPreferences({
            genreIds: topGenreIds,
            mediaType: 'movie',
            minRating: profile.preferredRating ? profile.preferredRating - 1 : 6.0,
            minVoteCount: 200,
            page: 1,
        })

        // Filter out excluded content
        const filtered = results.filter((content) => !excludeIds.includes(content.id))

        return filtered.slice(0, limit)
    } catch (error) {
        console.error('Error generating genre-based recommendations:', error)
        return []
    }
}

/**
 * Get recommendations for a specific genre
 *
 * @param genreId - Genre ID
 * @param limit - Number of recommendations
 * @param excludeIds - Content IDs to exclude
 * @returns Array of recommended content
 */
export async function getGenreRecommendations(
    genreId: number,
    limit: number = 20,
    excludeIds: number[] = []
): Promise<Content[]> {
    try {
        const results = await getTopRatedByGenre(genreId, 'movie', 1)

        // Filter out excluded content
        const filtered = results.filter((content) => !excludeIds.includes(content.id))

        return filtered.slice(0, limit)
    } catch (error) {
        console.error(`Error getting recommendations for genre ${genreId}:`, error)
        return []
    }
}

/**
 * Get list of content IDs user has already seen
 *
 * @param userData - User's content collections
 * @returns Array of content IDs
 */
export function getSeenContentIds(userData: {
    likedMovies: Content[]
    defaultWatchlist: Content[]
    collectionItems?: Content[]
    hiddenMovies: Content[]
}): number[] {
    const seenIds = new Set<number>()
    const collectionItems = userData.collectionItems || []

    ;[
        ...userData.likedMovies,
        ...userData.defaultWatchlist,
        ...collectionItems,
        ...userData.hiddenMovies,
    ].forEach((content) => {
        seenIds.add(content.id)
    })

    return Array.from(seenIds)
}

/**
 * Check if user has enough data for personalized recommendations
 *
 * @param userData - User's content collections
 * @param minItems - Minimum items required (default: 3)
 * @returns True if user has enough data
 */
export function hasEnoughDataForRecommendations(
    userData: {
        likedMovies: Content[]
        defaultWatchlist: Content[]
        collectionItems?: Content[]
    },
    minItems: number = 3
): boolean {
    const collectionItemsCount = userData.collectionItems?.length || 0
    const totalItems =
        userData.likedMovies.length + userData.defaultWatchlist.length + collectionItemsCount
    return totalItems >= minItems
}

/**
 * Merge and deduplicate recommendations from multiple sources
 *
 * @param sources - Arrays of content from different sources
 * @param limit - Maximum recommendations to return
 * @returns Deduplicated array
 */
export function mergeRecommendations(sources: Content[][], limit: number): Content[] {
    const seen = new Set<number>()
    const merged: Content[] = []

    // Round-robin through sources for diversity
    let index = 0
    const maxIterations = limit * sources.length // Prevent infinite loop

    for (let i = 0; i < maxIterations && merged.length < limit; i++) {
        const source = sources[index % sources.length]
        const itemIndex = Math.floor(i / sources.length)

        if (itemIndex < source.length) {
            const item = source[itemIndex]
            if (!seen.has(item.id)) {
                seen.add(item.id)
                merged.push(item)
            }
        }

        index++
    }

    return merged.slice(0, limit)
}
