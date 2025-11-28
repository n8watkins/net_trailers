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
import { calculateGenreYearPreferences } from './yearPreferenceDetector'
import { convertLegacyGenresToUnified } from '../genreMapping'

// Genre preference type (matches the type in PreferenceCustomizerModal)
export interface UserGenrePreference {
    genreId: string // Unified genre ID (e.g., 'action', 'comedy')
    preference: 'love' | 'not_for_me'
    updatedAt: number
}

// Content preference type (from preference customizer)
export interface UserContentPreference {
    contentId: number
    mediaType: 'movie' | 'tv'
    preference: 'love' | 'not_for_me'
    shownAt: number
}

// Voted content type (from title quiz)
export interface UserVotedContent {
    contentId: number
    mediaType: 'movie' | 'tv'
    vote: 'like' | 'dislike'
    votedAt: number
    genreIds?: number[] // Genre IDs from the content (populated when processing)
}

// Preference weights for genre/content preference customizer (uses 'love'/'not_for_me')
const PREFERENCE_WEIGHTS = {
    love: 5, // Strong boost for loved genres/content
    not_for_me: -5, // Strong penalty for disliked genres/content
}

// Vote weights for title quiz (uses 'like'/'dislike')
const VOTE_WEIGHTS = {
    like: 4, // Strong boost (slightly less than explicit genre preference)
    dislike: -3, // Moderate penalty (less than explicit genre preference)
}

// Legacy type alias for backwards compatibility
export type QuizGenrePreference = UserGenrePreference

/**
 * Calculate genre preference scores from user data
 *
 * @param userData - User's content collections
 * @param genrePreferences - Optional user genre preferences (from preference customizer)
 * @param contentPreferences - Optional user content preferences (from preference customizer)
 * @param votedContent - Optional voted content with genre IDs (from title quiz)
 * @returns Genre preferences sorted by score
 */
export function calculateGenrePreferences(
    userData: {
        likedMovies: Content[]
        defaultWatchlist: Content[]
        collectionItems?: Content[]
        hiddenMovies: Content[]
    },
    genrePreferences?: UserGenrePreference[],
    contentPreferences?: UserContentPreference[],
    votedContent?: UserVotedContent[]
): GenrePreference[] {
    const scores: Record<number, number> = {}
    const counts: Record<number, number> = {}

    const { likedMovies, defaultWatchlist, collectionItems = [], hiddenMovies } = userData

    // Apply genre preferences first (convert unified IDs to TMDB IDs)
    if (genrePreferences && genrePreferences.length > 0) {
        genrePreferences.forEach((pref) => {
            const weight = PREFERENCE_WEIGHTS[pref.preference]

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

    // Apply content preferences (extract genres from loved/not-for-me content)
    // This is handled by the API route which adds loved content to the userData

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

    // Process voted content from title quiz (apply genre signals based on votes)
    if (votedContent && votedContent.length > 0) {
        votedContent.forEach((vote) => {
            const weight = VOTE_WEIGHTS[vote.vote]
            if (weight !== 0 && vote.genreIds) {
                vote.genreIds.forEach((genreId) => {
                    scores[genreId] = (scores[genreId] || 0) + weight
                    if (vote.vote === 'like') {
                        counts[genreId] = (counts[genreId] || 0) + 1
                    }
                })
            }
        })
    }

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
 * @param genrePreferences - Optional user genre preferences
 * @param contentPreferences - Optional user content preferences
 * @param votedContent - Optional voted content with genre IDs (from title quiz)
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
    genrePreferences?: UserGenrePreference[],
    contentPreferences?: UserContentPreference[],
    votedContent?: UserVotedContent[]
): RecommendationProfile {
    const topGenres = calculateGenrePreferences(
        userData,
        genrePreferences,
        contentPreferences,
        votedContent
    )

    // Calculate preferred rating (average of liked movies)
    const likedRatings = userData.likedMovies
        .map((c) => c.vote_average)
        .filter((r): r is number => r !== undefined)

    const preferredRating =
        likedRatings.length > 0
            ? likedRatings.reduce((sum, r) => sum + r, 0) / likedRatings.length
            : undefined

    // Calculate genre-specific year preferences using decade-based clustering
    const genreYearPreferences = calculateGenreYearPreferences({
        likedMovies: userData.likedMovies,
        defaultWatchlist: userData.defaultWatchlist,
        collectionItems: userData.collectionItems,
    })

    return {
        userId: userData.userId,
        topGenres: topGenres.slice(0, 5), // Top 5 genres
        genreYearPreferences,
        preferredRating,
        updatedAt: Date.now(),
    }
}

/**
 * Generate genre-based recommendations with pagination support
 *
 * Progressive filter relaxation ensures endless content generation:
 * - Pages 1-10: Strict filters (rating 6.0+, votes 200+, year ranges)
 * - Pages 11-20: Relaxed filters (rating 5.5+, votes 100+, year ranges)
 * - Pages 21-30: Loose filters (rating 5.0+, votes 50+, year ranges)
 * - Pages 31-40: Minimal filters (rating 4.5+, votes 20+, no year ranges)
 * - Pages 41+: Trending/popular fallback (no filters, just user's genres)
 *
 * @param profile - User recommendation profile
 * @param limit - Number of recommendations
 * @param excludeIds - Content IDs to exclude
 * @param page - Page number for pagination (1-indexed)
 * @returns Array of recommended content
 */
export async function getGenreBasedRecommendations(
    profile: RecommendationProfile,
    limit: number = 20,
    excludeIds: number[] = [],
    page: number = 1
): Promise<Content[]> {
    if (profile.topGenres.length === 0) {
        return []
    }

    try {
        // Progressive filter relaxation based on page number
        let minRating: number
        let minVoteCount: number
        let useYearRange: boolean
        let genreCount: number

        if (page <= 10) {
            // Strict filters for first 10 pages
            minRating = profile.preferredRating ? profile.preferredRating - 1 : 6.0
            minVoteCount = 200
            useYearRange = true
            genreCount = 3
        } else if (page <= 20) {
            // Relaxed filters for pages 11-20
            minRating = profile.preferredRating ? Math.max(5.5, profile.preferredRating - 1.5) : 5.5
            minVoteCount = 100
            useYearRange = true
            genreCount = 5
        } else if (page <= 30) {
            // Loose filters for pages 21-30
            minRating = 5.0
            minVoteCount = 50
            useYearRange = true
            genreCount = Math.min(7, profile.topGenres.length)
        } else if (page <= 40) {
            // Minimal filters for pages 31-40
            minRating = 4.5
            minVoteCount = 20
            useYearRange = false
            genreCount = Math.min(10, profile.topGenres.length)
        } else {
            // Fallback: trending/popular content in user's genres (pages 41+)
            minRating = 4.0
            minVoteCount = 10
            useYearRange = false
            genreCount = profile.topGenres.length // Use all genres
        }

        // Use more genres as we paginate for increased variety
        const topGenres = profile.topGenres.slice(0, Math.max(genreCount, 3))

        // For page 1, use top 3 genres. For subsequent pages, rotate through more genres
        // This provides variety as users scroll through recommendations
        const genreRotation = page === 1 ? 3 : Math.min(genreCount, topGenres.length)
        const genreOffset = ((page - 1) * 2) % topGenres.length // Rotate starting genre
        const selectedGenres = []

        for (let i = 0; i < genreRotation; i++) {
            const genreIndex = (genreOffset + i) % topGenres.length
            selectedGenres.push(topGenres[genreIndex])
        }

        const selectedGenreIds = selectedGenres.map((g) => g.genreId)

        // Look up year preferences for selected genres (convert TMDB IDs to unified IDs first)
        const yearRanges: Array<{ min: number; max: number }> = []
        if (
            useYearRange &&
            profile.genreYearPreferences &&
            profile.genreYearPreferences.length > 0
        ) {
            for (const selectedGenre of selectedGenres) {
                // Convert TMDB genre ID to unified genre IDs to match year preferences
                // Try both movie and TV conversions since the same TMDB ID might map to different unified genres
                const movieUnifiedIds = convertLegacyGenresToUnified(
                    [selectedGenre.genreId],
                    'movie'
                )
                const tvUnifiedIds = convertLegacyGenresToUnified([selectedGenre.genreId], 'tv')
                const unifiedIds = [...new Set([...movieUnifiedIds, ...tvUnifiedIds])] // Deduplicate

                // Look for year preference for this genre
                for (const unifiedId of unifiedIds) {
                    const yearPref = profile.genreYearPreferences.find(
                        (pref) => pref.genreId === unifiedId
                    )

                    // Add year range if found and has medium/high confidence
                    if (yearPref?.effectiveYearRange) {
                        yearRanges.push(yearPref.effectiveYearRange)
                        break // Only use first matching preference
                    }
                }
            }
        }

        // Merge year ranges from selected genres (use union: min of mins, max of maxes)
        const yearRange =
            useYearRange && yearRanges.length > 0
                ? {
                      min: Math.min(...yearRanges.map((r) => r.min)),
                      max: Math.max(...yearRanges.map((r) => r.max)),
                  }
                : undefined

        // Log filtering strategy for debugging
        console.log(`[Recommendations Page ${page}] Filters:`, {
            minRating,
            minVoteCount,
            yearRange: yearRange ? `${yearRange.min}-${yearRange.max}` : 'none',
            genres: selectedGenres.map((g) => g.genreName).join(', '),
        })

        // For pagination beyond page 1, fetch multiple TMDB pages to ensure we have enough content
        // Each TMDB page has ~20 items, so we fetch enough to fill our limit
        const tmdbPagesToFetch = Math.ceil(limit / 20)
        const startTmdbPage = (page - 1) * tmdbPagesToFetch + 1

        // Rotate through multiple sorting strategies for maximum variety
        const sortStrategies = [
            'vote_average.desc',
            'popularity.desc',
            'release_date.desc',
            'vote_count.desc',
        ]
        const sortBy = sortStrategies[page % sortStrategies.length]

        const fetchPromises = []
        for (let i = 0; i < tmdbPagesToFetch; i++) {
            // Fetch both movies and TV shows for maximum content pool
            fetchPromises.push(
                discoverByPreferences({
                    genreIds: selectedGenreIds,
                    mediaType: 'movie',
                    minRating,
                    minVoteCount,
                    yearRange,
                    page: startTmdbPage + i,
                    sortBy,
                })
            )
            fetchPromises.push(
                discoverByPreferences({
                    genreIds: selectedGenreIds,
                    mediaType: 'tv',
                    minRating,
                    minVoteCount,
                    yearRange,
                    page: startTmdbPage + i,
                    sortBy,
                })
            )
        }

        const allResults = await Promise.all(fetchPromises)
        const combined = allResults.flat()

        // Filter out excluded content
        const filtered = combined.filter((content) => !excludeIds.includes(content.id))

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
 * @param minItems - Minimum items required (default: 1)
 * @returns True if user has enough data
 */
export function hasEnoughDataForRecommendations(
    userData: {
        likedMovies: Content[]
        defaultWatchlist: Content[]
        collectionItems?: Content[]
    },
    minItems: number = 1
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
