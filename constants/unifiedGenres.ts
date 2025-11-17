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
        tvIds: [], // No direct TV equivalent
        childSafe: true,
    },
    {
        id: 'horror',
        name: 'Horror',
        movieIds: [27], // Horror
        tvIds: [], // No direct TV equivalent
        childSafe: false,
    },
    {
        id: 'kids',
        name: 'Kids',
        movieIds: [], // No direct movie equivalent
        tvIds: [10762], // Kids
        childSafe: true,
    },
    {
        id: 'music',
        name: 'Music',
        movieIds: [10402], // Music
        tvIds: [], // No direct TV equivalent
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
        movieIds: [], // No direct movie equivalent
        tvIds: [10763], // News
        childSafe: false,
    },
    {
        id: 'reality',
        name: 'Reality',
        movieIds: [], // No direct movie equivalent
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
        movieIds: [], // No direct movie equivalent
        tvIds: [10766], // Soap
        childSafe: false,
    },
    {
        id: 'talk',
        name: 'Talk',
        movieIds: [], // No direct movie equivalent
        tvIds: [10767], // Talk
        childSafe: false,
    },
    {
        id: 'thriller',
        name: 'Thriller',
        movieIds: [53], // Thriller
        tvIds: [], // No direct TV equivalent
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
        movieIds: [], // No direct movie equivalent
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
 * For 'both', returns all genres
 * For 'movie', returns only genres with movie IDs
 * For 'tv', returns only genres with TV IDs
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

    // Filter by media type
    if (mediaType === 'movie') {
        return genres.filter((g) => g.movieIds.length > 0)
    } else if (mediaType === 'tv') {
        return genres.filter((g) => g.tvIds.length > 0)
    } else {
        // For 'both', return all genres (they'll map appropriately per media type)
        return genres
    }
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
