/**
 * Unified Genre System
 *
 * This system provides a seamless genre experience across movies and TV shows.
 * Users see consistent genre names, and the system automatically maps to the correct
 * TMDB genre IDs based on media type.
 *
 * Example: User selects "Fantasy"
 * - For movies: Maps to genre ID 14 (Fantasy)
 * - For TV: Maps to genre ID 10765 (Sci-Fi & Fantasy)
 * - For both: Fetches using both IDs appropriately
 */

export interface UnifiedGenre {
    id: string // Unique identifier for unified genre
    name: string // Display name shown to users
    movieIds: number[] // TMDB genre IDs for movies
    tvIds: number[] // TMDB genre IDs for TV shows
    childSafe: boolean // Whether this genre is child-safe
}

/**
 * Unified Genre Definitions
 * Each genre maps to appropriate TMDB IDs for movies and TV
 */
export const UNIFIED_GENRES: UnifiedGenre[] = [
    {
        id: 'action',
        name: 'Action',
        movieIds: [28], // Action
        tvIds: [10759], // Action & Adventure
        childSafe: true,
    },
    {
        id: 'adventure',
        name: 'Adventure',
        movieIds: [12], // Adventure
        tvIds: [10759], // Action & Adventure
        childSafe: true,
    },
    {
        id: 'animation',
        name: 'Animation',
        movieIds: [16], // Animation
        tvIds: [16], // Animation
        childSafe: true,
    },
    {
        id: 'comedy',
        name: 'Comedy',
        movieIds: [35], // Comedy
        tvIds: [35], // Comedy
        childSafe: true,
    },
    {
        id: 'crime',
        name: 'Crime',
        movieIds: [80], // Crime
        tvIds: [80], // Crime (exists for TV)
        childSafe: false,
    },
    {
        id: 'documentary',
        name: 'Documentary',
        movieIds: [99], // Documentary
        tvIds: [99], // Documentary
        childSafe: true,
    },
    {
        id: 'drama',
        name: 'Drama',
        movieIds: [18], // Drama
        tvIds: [18], // Drama (exists for TV)
        childSafe: true,
    },
    {
        id: 'family',
        name: 'Family',
        movieIds: [10751], // Family
        tvIds: [10751], // Family
        childSafe: true,
    },
    {
        id: 'fantasy',
        name: 'Fantasy',
        movieIds: [14], // Fantasy
        tvIds: [10765], // Sci-Fi & Fantasy (combined with Sci-Fi on TV)
        childSafe: true,
    },
    {
        id: 'history',
        name: 'History',
        movieIds: [36], // History
        tvIds: [99], // Documentary (closest TV equivalent for historical content)
        childSafe: true,
    },
    {
        id: 'horror',
        name: 'Horror',
        movieIds: [27], // Horror
        tvIds: [10765, 9648], // Sci-Fi & Fantasy + Mystery (TV horror shows are typically tagged as these)
        childSafe: false,
    },
    {
        id: 'kids',
        name: 'Kids',
        movieIds: [10751, 16], // Family + Animation (kid-friendly movies)
        tvIds: [10762], // Kids
        childSafe: true,
    },
    {
        id: 'music',
        name: 'Music',
        movieIds: [10402], // Music
        tvIds: [10402], // Music (exists for TV)
        childSafe: true,
    },
    {
        id: 'mystery',
        name: 'Mystery',
        movieIds: [9648], // Mystery
        tvIds: [9648], // Mystery
        childSafe: true,
    },
    {
        id: 'news',
        name: 'News',
        movieIds: [99], // Documentary (news-style movies are typically documentaries)
        tvIds: [10763], // News
        childSafe: false,
    },
    {
        id: 'reality',
        name: 'Reality',
        movieIds: [99], // Documentary (reality-style movies are typically documentaries)
        tvIds: [10764], // Reality
        childSafe: false,
    },
    {
        id: 'romance',
        name: 'Romance',
        movieIds: [10749], // Romance
        tvIds: [18], // Drama (closest TV equivalent for romance)
        childSafe: true,
    },
    {
        id: 'scifi',
        name: 'Science Fiction',
        movieIds: [878], // Science Fiction
        tvIds: [10765], // Sci-Fi & Fantasy (combined with Fantasy on TV)
        childSafe: true,
    },
    {
        id: 'soap',
        name: 'Soap',
        movieIds: [10749, 18], // Romance + Drama (soap opera style movies)
        tvIds: [10766], // Soap
        childSafe: false,
    },
    {
        id: 'thriller',
        name: 'Thriller',
        movieIds: [53], // Thriller
        tvIds: [9648, 80], // Mystery + Crime (TV thrillers are typically tagged as mystery/crime)
        childSafe: false,
    },
    {
        id: 'war',
        name: 'War',
        movieIds: [10752], // War
        tvIds: [10768], // War & Politics (combined with Politics on TV)
        childSafe: true,
    },
    {
        id: 'politics',
        name: 'Politics',
        movieIds: [18, 36], // Drama + History (political movies are typically dramas or historical)
        tvIds: [10768], // War & Politics (combined with War on TV)
        childSafe: false,
    },
    {
        id: 'western',
        name: 'Western',
        movieIds: [37], // Western
        tvIds: [37], // Western
        childSafe: true,
    },
]

/**
 * Get unified genres filtered by media type
 * Returns ALL genres regardless of media type for consistency.
 * If a genre doesn't have a mapping for the selected media type, it simply won't return results.
 * This provides a consistent UX where genres don't disappear when switching media types.
 */
export function getUnifiedGenresByMediaType(
    mediaType: 'movie' | 'tv' | 'both',
    childSafeMode = false
): UnifiedGenre[] {
    let genres = UNIFIED_GENRES

    // Filter by child safety if enabled
    if (childSafeMode) {
        genres = genres.filter((g) => g.childSafe)
    }

    // Return all genres regardless of media type for consistent UX
    // If a genre doesn't have IDs for the selected media type, the API will handle it gracefully
    return genres
}

/**
 * Get child-safe unified genres by media type
 */
export function getChildSafeUnifiedGenres(mediaType: 'movie' | 'tv' | 'both'): UnifiedGenre[] {
    return getUnifiedGenresByMediaType(mediaType, true)
}

/**
 * Find a unified genre by its ID
 */
export function findUnifiedGenre(genreId: string): UnifiedGenre | undefined {
    return UNIFIED_GENRES.find((g) => g.id === genreId)
}

/**
 * Get unified genre by TMDB genre ID (legacy support)
 * This helps with backwards compatibility for existing collections
 */
export function getUnifiedGenreFromTMDBId(
    tmdbId: number,
    mediaType: 'movie' | 'tv'
): UnifiedGenre | undefined {
    return UNIFIED_GENRES.find((g) => {
        if (mediaType === 'movie') {
            return g.movieIds.includes(tmdbId)
        } else {
            return g.tvIds.includes(tmdbId)
        }
    })
}
