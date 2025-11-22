/**
 * TMDB Recommendation Utilities
 *
 * Utilities for fetching recommendations from TMDB API
 */

import { TMDBApiClient } from '../tmdbApi'
import { Content } from '../../types/collections'

const tmdb = TMDBApiClient.getInstance()

/**
 * TMDB response interface
 */
interface TMDBResponse {
    page: number
    results: Content[]
    total_pages: number
    total_results: number
}

/**
 * Get similar movies/shows from TMDB
 *
 * @param contentId - TMDB content ID
 * @param mediaType - movie or tv
 * @param page - Page number
 * @returns Array of similar content
 */
export async function getSimilarContent(
    contentId: number,
    mediaType: 'movie' | 'tv' = 'movie',
    page: number = 1
): Promise<Content[]> {
    try {
        const response = await tmdb.fetch<TMDBResponse>(`/${mediaType}/${contentId}/similar`, {
            page,
        })

        return response.results.map(
            (item) =>
                ({
                    ...item,
                    media_type: mediaType,
                }) as Content
        )
    } catch (error) {
        console.error(`Error fetching similar content for ${contentId}:`, error)
        return []
    }
}

/**
 * Get TMDB recommendations for a specific movie/show
 *
 * Uses TMDB's ML-based recommendation algorithm
 *
 * @param contentId - TMDB content ID
 * @param mediaType - movie or tv
 * @param page - Page number
 * @returns Array of recommended content
 */
export async function getTMDBRecommendations(
    contentId: number,
    mediaType: 'movie' | 'tv' = 'movie',
    page: number = 1
): Promise<Content[]> {
    try {
        const response = await tmdb.fetch<TMDBResponse>(
            `/${mediaType}/${contentId}/recommendations`,
            { page }
        )

        return response.results.map(
            (item) =>
                ({
                    ...item,
                    media_type: mediaType,
                }) as Content
        )
    } catch (error) {
        console.error(`Error fetching TMDB recommendations for ${contentId}:`, error)
        return []
    }
}

/**
 * Get trending content filtered by genre
 *
 * @param genreId - Genre ID to filter by
 * @param timeWindow - day or week
 * @param mediaType - movie, tv, or all
 * @returns Array of trending content in genre
 */
export async function getTrendingByGenre(
    genreId: number,
    timeWindow: 'day' | 'week' = 'week',
    mediaType: 'movie' | 'tv' | 'all' = 'all'
): Promise<Content[]> {
    try {
        // TMDB doesn't support genre filtering in trending endpoint
        // So we fetch trending and filter client-side
        const response = await tmdb.fetch<TMDBResponse>(`/trending/${mediaType}/${timeWindow}`, {
            page: 1,
        })

        // Filter by genre
        const filtered = response.results.filter((item) => item.genre_ids?.includes(genreId))

        return filtered
    } catch (error) {
        console.error(`Error fetching trending by genre ${genreId}:`, error)
        return []
    }
}

/**
 * Discover content by multiple genres with filters
 *
 * @param params - Discovery parameters
 * @returns Array of discovered content
 */
export async function discoverByPreferences(params: {
    genreIds: number[]
    mediaType?: 'movie' | 'tv'
    minRating?: number
    minVoteCount?: number
    yearRange?: { min?: number; max?: number }
    page?: number
}): Promise<Content[]> {
    const {
        genreIds,
        mediaType = 'movie',
        minRating = 6.0,
        minVoteCount = 100,
        yearRange,
        page = 1,
    } = params

    try {
        const queryParams: Record<string, string | number> = {
            with_genres: genreIds.join(','),
            'vote_average.gte': minRating,
            'vote_count.gte': minVoteCount,
            sort_by: 'vote_average.desc',
            page,
        }

        // Add year range if provided
        if (yearRange?.min) {
            queryParams['primary_release_date.gte'] = `${yearRange.min}-01-01`
        }
        if (yearRange?.max) {
            queryParams['primary_release_date.lte'] = `${yearRange.max}-12-31`
        }

        const response = await tmdb.fetch<TMDBResponse>(`/discover/${mediaType}`, queryParams)

        return response.results.map(
            (item) =>
                ({
                    ...item,
                    media_type: mediaType,
                }) as Content
        )
    } catch (error) {
        console.error('Error discovering content by preferences:', error)
        return []
    }
}

/**
 * Get top-rated content by genre
 *
 * @param genreId - Genre ID
 * @param mediaType - movie or tv
 * @param page - Page number
 * @returns Array of top-rated content in genre
 */
export async function getTopRatedByGenre(
    genreId: number,
    mediaType: 'movie' | 'tv' = 'movie',
    page: number = 1
): Promise<Content[]> {
    try {
        const response = await tmdb.fetch<TMDBResponse>(`/discover/${mediaType}`, {
            with_genres: genreId,
            sort_by: 'vote_average.desc',
            'vote_count.gte': 500, // Minimum votes for quality
            page,
        })

        return response.results.map(
            (item) =>
                ({
                    ...item,
                    media_type: mediaType,
                }) as Content
        )
    } catch (error) {
        console.error(`Error fetching top rated by genre ${genreId}:`, error)
        return []
    }
}

/**
 * Batch fetch similar content for multiple items
 *
 * Useful for generating "More Like This" from user's watchlist/liked content
 *
 * @param contentIds - Array of content IDs
 * @param mediaType - movie or tv
 * @param limit - Max results per item
 * @returns Deduplicated array of similar content
 */
export async function getBatchSimilarContent(
    contentIds: number[],
    mediaType: 'movie' | 'tv' = 'movie',
    limit: number = 5
): Promise<Content[]> {
    try {
        // Fetch similar content for each ID in parallel
        const promises = contentIds.slice(0, 5).map((id) => getSimilarContent(id, mediaType, 1))

        const results = await Promise.all(promises)

        // Flatten and deduplicate
        const allSimilar = results.flat()
        const seen = new Set<number>()
        const deduplicated: Content[] = []

        for (const item of allSimilar) {
            if (!seen.has(item.id) && deduplicated.length < limit) {
                seen.add(item.id)
                deduplicated.push(item)
            }
        }

        return deduplicated
    } catch (error) {
        console.error('Error batch fetching similar content:', error)
        return []
    }
}

/**
 * Get hybrid recommendations combining similar and recommended
 *
 * @param contentId - TMDB content ID
 * @param mediaType - movie or tv
 * @param limit - Total results to return
 * @returns Mixed array of similar and recommended content
 */
export async function getHybridRecommendations(
    contentId: number,
    mediaType: 'movie' | 'tv' = 'movie',
    limit: number = 20
): Promise<Content[]> {
    try {
        // Fetch both similar and recommendations in parallel
        const [similar, recommended] = await Promise.all([
            getSimilarContent(contentId, mediaType, 1),
            getTMDBRecommendations(contentId, mediaType, 1),
        ])

        // Mix results (50% similar, 50% recommended)
        const halfLimit = Math.floor(limit / 2)
        const mixed = [...similar.slice(0, halfLimit), ...recommended.slice(0, halfLimit)]

        // Deduplicate
        const seen = new Set<number>()
        const deduplicated: Content[] = []

        for (const item of mixed) {
            if (!seen.has(item.id)) {
                seen.add(item.id)
                deduplicated.push(item)
            }
        }

        return deduplicated.slice(0, limit)
    } catch (error) {
        console.error(`Error fetching hybrid recommendations for ${contentId}:`, error)
        return []
    }
}
