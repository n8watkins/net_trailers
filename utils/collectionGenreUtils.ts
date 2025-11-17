import { Content, isMovie, isTVShow } from '../typings'
import { getUnifiedGenreFromTMDBId } from '../constants/unifiedGenres'

/**
 * Extract unique genre IDs from a piece of content.
 */
export const getGenreIds = (content: Content): number[] => {
    if (content.genre_ids && content.genre_ids.length > 0) {
        return Array.from(new Set(content.genre_ids.filter((id) => Number.isFinite(id))))
    }
    if (content.genres && content.genres.length > 0) {
        return Array.from(
            new Set(
                content.genres
                    .map((genre) => genre.id)
                    .filter((id): id is number => typeof id === 'number' && Number.isFinite(id))
            )
        )
    }
    return []
}

/**
 * Infer the most representative UNIFIED genres for a collection of content.
 * Returns unified genre IDs like ['action', 'fantasy'] instead of TMDB IDs.
 * Genres are weighted by appearance, vote average, and popularity to prioritize standouts.
 */
export function inferTopGenresFromContent(content: Content[], limit: number = 2): string[] {
    if (!content || content.length === 0) {
        return []
    }

    const genreScores = new Map<string, number>()

    content.forEach((item) => {
        const tmdbGenreIds = getGenreIds(item)
        if (tmdbGenreIds.length === 0) return

        // Determine media type for this item
        const mediaType: 'movie' | 'tv' = isMovie(item) ? 'movie' : 'tv'

        const voteBoost = Number.isFinite(item.vote_average) ? item.vote_average / 15 : 0
        const popularityBoost = Number.isFinite(item.popularity)
            ? Math.min(item.popularity / 200, 0.75)
            : 0

        tmdbGenreIds.slice(0, 5).forEach((tmdbId, index) => {
            // Convert TMDB ID to unified genre ID
            const unifiedGenre = getUnifiedGenreFromTMDBId(tmdbId, mediaType)
            if (!unifiedGenre) return // Skip if no mapping found

            const positionPenalty = index * 0.05
            const weight = Math.max(0.1, 1 + voteBoost + popularityBoost - positionPenalty)
            const current = genreScores.get(unifiedGenre.id) ?? 0
            genreScores.set(unifiedGenre.id, current + weight)
        })
    })

    return Array.from(genreScores.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([genreId]) => genreId)
}

/**
 * Infer the dominant media type across a list of content items.
 */
export function inferMediaTypeFromContent(
    content: Content[],
    fallback: 'movie' | 'tv' | 'both' = 'both'
): 'movie' | 'tv' | 'both' {
    if (!content || content.length === 0) {
        return fallback
    }

    const hasMovies = content.some((item) => isMovie(item))
    const hasTv = content.some((item) => isTVShow(item))

    if (hasMovies && hasTv) return 'both'
    if (hasMovies) return 'movie'
    if (hasTv) return 'tv'
    return fallback
}
