/**
 * System Collections
 *
 * Pre-configured collections that all users see by default.
 * These replace the old systemRows.ts with a unified Collection interface.
 *
 * Core collections (Trending/Top Rated) cannot be deleted.
 * Other system collections can be customized by users.
 */

import { Collection } from '../types/userLists'

/**
 * System collections for Movies page (mediaType: 'movie')
 */
export const SYSTEM_MOVIE_COLLECTIONS: Collection[] = [
    {
        id: 'system-movie-trending',
        name: 'Trending Movies',
        description: 'Popular movies trending right now',
        isPublic: false,
        createdAt: 0,
        updatedAt: 0,
        items: [],
        collectionType: 'tmdb-genre',
        displayAsRow: true,
        order: 0,
        enabled: true,
        genres: [],
        genreLogic: 'OR',
        mediaType: 'movie',
        isSpecialCollection: true,
        isSystemCollection: true,
        canDelete: false,
        canEdit: false,
    },
    {
        id: 'system-movie-top-rated',
        name: 'Top Rated Movies',
        description: 'Highest rated movies of all time',
        isPublic: false,
        createdAt: 0,
        updatedAt: 0,
        items: [],
        collectionType: 'tmdb-genre',
        displayAsRow: true,
        order: 1,
        enabled: true,
        genres: [],
        genreLogic: 'OR',
        mediaType: 'movie',
        isSpecialCollection: true,
        isSystemCollection: true,
        canDelete: false,
        canEdit: false,
    },
    {
        id: 'system-movie-action',
        name: 'Action-Packed',
        description: 'Explosive action movies',
        isPublic: false,
        createdAt: 0,
        updatedAt: 0,
        items: [],
        collectionType: 'tmdb-genre',
        displayAsRow: true,
        order: 2,
        enabled: true,
        genres: [28], // Action
        genreLogic: 'OR',
        mediaType: 'movie',
        isSystemCollection: true,
        canDelete: true,
        canEdit: true,
    },
    {
        id: 'system-movie-comedy',
        name: 'Comedy Classics',
        description: 'Hilarious comedy movies',
        isPublic: false,
        createdAt: 0,
        updatedAt: 0,
        items: [],
        collectionType: 'tmdb-genre',
        displayAsRow: true,
        order: 3,
        enabled: true,
        genres: [35], // Comedy
        genreLogic: 'OR',
        mediaType: 'movie',
        isSystemCollection: true,
        canDelete: true,
        canEdit: true,
    },
    {
        id: 'system-movie-scifi',
        name: 'Sci-Fi Adventures',
        description: 'Futuristic science fiction movies',
        isPublic: false,
        createdAt: 0,
        updatedAt: 0,
        items: [],
        collectionType: 'tmdb-genre',
        displayAsRow: true,
        order: 4,
        enabled: true,
        genres: [878], // Science Fiction
        genreLogic: 'OR',
        mediaType: 'movie',
        isSystemCollection: true,
        canDelete: true,
        canEdit: true,
    },
    {
        id: 'system-movie-horror',
        name: 'Horror Thrills',
        description: 'Spine-chilling horror movies',
        isPublic: false,
        createdAt: 0,
        updatedAt: 0,
        items: [],
        collectionType: 'tmdb-genre',
        displayAsRow: true,
        order: 5,
        enabled: true,
        genres: [27], // Horror
        genreLogic: 'OR',
        mediaType: 'movie',
        isSystemCollection: true,
        canDelete: true,
        canEdit: true,
    },
    {
        id: 'system-movie-romance',
        name: 'Romantic Films',
        description: 'Heartwarming romance movies',
        isPublic: false,
        createdAt: 0,
        updatedAt: 0,
        items: [],
        collectionType: 'tmdb-genre',
        displayAsRow: true,
        order: 6,
        enabled: true,
        genres: [10749], // Romance
        genreLogic: 'OR',
        mediaType: 'movie',
        isSystemCollection: true,
        canDelete: true,
        canEdit: true,
    },
]

/**
 * System collections for TV Shows page (mediaType: 'tv')
 */
export const SYSTEM_TV_COLLECTIONS: Collection[] = [
    {
        id: 'system-tv-trending',
        name: 'Trending TV Shows',
        description: 'Popular TV shows trending right now',
        isPublic: false,
        createdAt: 0,
        updatedAt: 0,
        items: [],
        collectionType: 'tmdb-genre',
        displayAsRow: true,
        order: 0,
        enabled: true,
        genres: [],
        genreLogic: 'OR',
        mediaType: 'tv',
        isSpecialCollection: true,
        isSystemCollection: true,
        canDelete: false,
        canEdit: false,
    },
    {
        id: 'system-tv-top-rated',
        name: 'Top Rated TV Shows',
        description: 'Highest rated TV shows of all time',
        isPublic: false,
        createdAt: 0,
        updatedAt: 0,
        items: [],
        collectionType: 'tmdb-genre',
        displayAsRow: true,
        order: 1,
        enabled: true,
        genres: [],
        genreLogic: 'OR',
        mediaType: 'tv',
        isSpecialCollection: true,
        isSystemCollection: true,
        canDelete: false,
        canEdit: false,
    },
    {
        id: 'system-tv-action',
        name: 'Action & Adventure',
        description: 'Thrilling action and adventure series',
        isPublic: false,
        createdAt: 0,
        updatedAt: 0,
        items: [],
        collectionType: 'tmdb-genre',
        displayAsRow: true,
        order: 2,
        enabled: true,
        genres: [10759], // Action & Adventure
        genreLogic: 'OR',
        mediaType: 'tv',
        isSystemCollection: true,
        canDelete: true,
        canEdit: true,
    },
    {
        id: 'system-tv-comedy',
        name: 'Comedy Series',
        description: 'Funny and entertaining comedy shows',
        isPublic: false,
        createdAt: 0,
        updatedAt: 0,
        items: [],
        collectionType: 'tmdb-genre',
        displayAsRow: true,
        order: 3,
        enabled: true,
        genres: [35], // Comedy
        genreLogic: 'OR',
        mediaType: 'tv',
        isSystemCollection: true,
        canDelete: true,
        canEdit: true,
    },
    {
        id: 'system-tv-scifi',
        name: 'Sci-Fi & Fantasy',
        description: 'Science fiction and fantasy series',
        isPublic: false,
        createdAt: 0,
        updatedAt: 0,
        items: [],
        collectionType: 'tmdb-genre',
        displayAsRow: true,
        order: 4,
        enabled: true,
        genres: [10765], // Sci-Fi & Fantasy
        genreLogic: 'OR',
        mediaType: 'tv',
        isSystemCollection: true,
        canDelete: true,
        canEdit: true,
    },
    {
        id: 'system-tv-kids',
        name: 'Kids Shows',
        description: 'Fun and educational shows for kids',
        isPublic: false,
        createdAt: 0,
        updatedAt: 0,
        items: [],
        collectionType: 'tmdb-genre',
        displayAsRow: true,
        order: 5,
        enabled: true,
        genres: [10762], // Kids
        genreLogic: 'OR',
        mediaType: 'tv',
        isSystemCollection: true,
        canDelete: true,
        canEdit: true,
    },
    {
        id: 'system-tv-reality',
        name: 'Reality TV',
        description: 'Entertaining reality television',
        isPublic: false,
        createdAt: 0,
        updatedAt: 0,
        items: [],
        collectionType: 'tmdb-genre',
        displayAsRow: true,
        order: 6,
        enabled: true,
        genres: [10764], // Reality
        genreLogic: 'OR',
        mediaType: 'tv',
        isSystemCollection: true,
        canDelete: true,
        canEdit: true,
    },
]

/**
 * System collections for Home page (mediaType: 'both')
 */
export const SYSTEM_HOME_COLLECTIONS: Collection[] = [
    {
        id: 'system-home-trending',
        name: 'Trending',
        description: 'Popular movies and TV shows trending right now',
        isPublic: false,
        createdAt: 0,
        updatedAt: 0,
        items: [],
        collectionType: 'tmdb-genre',
        displayAsRow: true,
        order: 0,
        enabled: true,
        genres: [],
        genreLogic: 'OR',
        mediaType: 'both',
        isSpecialCollection: true,
        isSystemCollection: true,
        canDelete: false,
        canEdit: false,
    },
    {
        id: 'system-home-top-rated',
        name: 'Top Rated',
        description: 'Highest rated movies and TV shows',
        isPublic: false,
        createdAt: 0,
        updatedAt: 0,
        items: [],
        collectionType: 'tmdb-genre',
        displayAsRow: true,
        order: 1,
        enabled: true,
        genres: [],
        genreLogic: 'OR',
        mediaType: 'both',
        isSpecialCollection: true,
        isSystemCollection: true,
        canDelete: false,
        canEdit: false,
    },
    {
        id: 'system-home-animation',
        name: 'Animated Favorites',
        description: 'Best animated movies and shows',
        isPublic: false,
        createdAt: 0,
        updatedAt: 0,
        items: [],
        collectionType: 'tmdb-genre',
        displayAsRow: true,
        order: 2,
        enabled: true,
        genres: [16], // Animation
        genreLogic: 'OR',
        mediaType: 'both',
        isSystemCollection: true,
        canDelete: true,
        canEdit: true,
    },
    {
        id: 'system-home-family',
        name: 'Family Fun',
        description: 'Great content for the whole family',
        isPublic: false,
        createdAt: 0,
        updatedAt: 0,
        items: [],
        collectionType: 'tmdb-genre',
        displayAsRow: true,
        order: 3,
        enabled: true,
        genres: [10751], // Family
        genreLogic: 'OR',
        mediaType: 'both',
        isSystemCollection: true,
        canDelete: true,
        canEdit: true,
    },
    {
        id: 'system-home-documentary',
        name: 'Documentaries',
        description: 'Informative and engaging documentaries',
        isPublic: false,
        createdAt: 0,
        updatedAt: 0,
        items: [],
        collectionType: 'tmdb-genre',
        displayAsRow: true,
        order: 4,
        enabled: true,
        genres: [99], // Documentary
        genreLogic: 'OR',
        mediaType: 'both',
        isSystemCollection: true,
        canDelete: true,
        canEdit: true,
    },
    {
        id: 'system-home-mystery',
        name: 'Mystery & Suspense',
        description: 'Edge-of-your-seat mysteries and thrillers',
        isPublic: false,
        createdAt: 0,
        updatedAt: 0,
        items: [],
        collectionType: 'tmdb-genre',
        displayAsRow: true,
        order: 5,
        enabled: true,
        genres: [9648], // Mystery
        genreLogic: 'OR',
        mediaType: 'both',
        isSystemCollection: true,
        canDelete: true,
        canEdit: true,
    },
]

/**
 * All system collections combined
 */
export const ALL_SYSTEM_COLLECTIONS: Collection[] = [
    ...SYSTEM_MOVIE_COLLECTIONS,
    ...SYSTEM_TV_COLLECTIONS,
    ...SYSTEM_HOME_COLLECTIONS,
]

/**
 * Get system collections by media type
 */
export function getSystemCollectionsByMediaType(mediaType: 'movie' | 'tv' | 'both'): Collection[] {
    switch (mediaType) {
        case 'movie':
            return SYSTEM_MOVIE_COLLECTIONS
        case 'tv':
            return SYSTEM_TV_COLLECTIONS
        case 'both':
            return SYSTEM_HOME_COLLECTIONS
    }
}

/**
 * Get system collections for a specific page (includes enabled collections)
 */
export function getSystemCollectionsForPage(page: 'home' | 'movies' | 'tv'): Collection[] {
    const mediaType = page === 'home' ? 'both' : page === 'movies' ? 'movie' : 'tv'
    return getSystemCollectionsByMediaType(mediaType).filter((c) => c.enabled)
}
