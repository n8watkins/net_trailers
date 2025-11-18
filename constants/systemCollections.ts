/**
 * System Collections
 *
 * Pre-configured collections that all users see by default.
 * Streamlined to show unified collections with mediaType: 'both' by default.
 * Users can customize mediaType, genres, and other properties via the collection editor.
 *
 * Core collections (Trending/Top Rated) cannot be deleted but can be edited.
 * All other system collections can be customized or deleted by users.
 */

import { Collection } from '../types/userLists'

/**
 * All system collections - unified with mediaType: 'both'
 * Users can edit these to change mediaType to 'movie' or 'tv' only if desired
 */
export const ALL_SYSTEM_COLLECTIONS: Collection[] = [
    // Core collections - cannot be deleted but can be edited for mediaType
    {
        id: 'system-trending',
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
        canEdit: true, // Users can customize mediaType
    },
    {
        id: 'system-top-rated',
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
        canEdit: true, // Users can customize mediaType
    },
    // Genre collections - can be customized or deleted
    {
        id: 'system-action',
        name: 'Action-Packed',
        description: 'Explosive action movies and shows',
        isPublic: false,
        createdAt: 0,
        updatedAt: 0,
        items: [],
        collectionType: 'tmdb-genre',
        displayAsRow: true,
        order: 2,
        enabled: true,
        genres: ['action'],
        genreLogic: 'OR',
        mediaType: 'both',
        isSystemCollection: true,
        canDelete: true,
        canEdit: true,
    },
    {
        id: 'system-comedy',
        name: 'Comedy Favorites',
        description: 'Hilarious comedy movies and shows',
        isPublic: false,
        createdAt: 0,
        updatedAt: 0,
        items: [],
        collectionType: 'tmdb-genre',
        displayAsRow: true,
        order: 3,
        enabled: true,
        genres: ['comedy'],
        genreLogic: 'OR',
        mediaType: 'both',
        isSystemCollection: true,
        canDelete: true,
        canEdit: true,
    },
    {
        id: 'system-scifi',
        name: 'Sci-Fi & Fantasy',
        description: 'Futuristic science fiction and fantasy',
        isPublic: false,
        createdAt: 0,
        updatedAt: 0,
        items: [],
        collectionType: 'tmdb-genre',
        displayAsRow: true,
        order: 4,
        enabled: true,
        genres: ['scifi', 'fantasy'],
        genreLogic: 'OR',
        mediaType: 'both',
        isSystemCollection: true,
        canDelete: true,
        canEdit: true,
    },
    {
        id: 'system-animation',
        name: 'Animated Favorites',
        description: 'Best animated movies and shows',
        isPublic: false,
        createdAt: 0,
        updatedAt: 0,
        items: [],
        collectionType: 'tmdb-genre',
        displayAsRow: true,
        order: 5,
        enabled: true,
        genres: ['animation'],
        genreLogic: 'OR',
        mediaType: 'both',
        isSystemCollection: true,
        canDelete: true,
        canEdit: true,
    },
    {
        id: 'system-horror',
        name: 'Horror Thrills',
        description: 'Spine-chilling horror content',
        isPublic: false,
        createdAt: 0,
        updatedAt: 0,
        items: [],
        collectionType: 'tmdb-genre',
        displayAsRow: true,
        order: 6,
        enabled: true,
        genres: ['horror'],
        genreLogic: 'OR',
        mediaType: 'both',
        isSystemCollection: true,
        canDelete: true,
        canEdit: true,
    },
    {
        id: 'system-family',
        name: 'Family Fun',
        description: 'Great content for the whole family',
        isPublic: false,
        createdAt: 0,
        updatedAt: 0,
        items: [],
        collectionType: 'tmdb-genre',
        displayAsRow: true,
        order: 7,
        enabled: true,
        genres: ['family'],
        genreLogic: 'OR',
        mediaType: 'both',
        isSystemCollection: true,
        canDelete: true,
        canEdit: true,
    },
    {
        id: 'system-documentary',
        name: 'Documentaries',
        description: 'Informative and engaging documentaries',
        isPublic: false,
        createdAt: 0,
        updatedAt: 0,
        items: [],
        collectionType: 'tmdb-genre',
        displayAsRow: true,
        order: 8,
        enabled: true,
        genres: ['documentary'],
        genreLogic: 'OR',
        mediaType: 'both',
        isSystemCollection: true,
        canDelete: true,
        canEdit: true,
    },
    {
        id: 'system-romance-drama',
        name: 'Romantic Dramas',
        description: 'Heartfelt stories with romance and drama',
        isPublic: false,
        createdAt: 0,
        updatedAt: 0,
        items: [],
        collectionType: 'tmdb-genre',
        displayAsRow: true,
        order: 9,
        enabled: true,
        genres: ['romance', 'drama'],
        genreLogic: 'AND',
        mediaType: 'both',
        isSystemCollection: true,
        canDelete: true,
        canEdit: true,
    },
]

/**
 * @deprecated Legacy function - all collections are now unified
 * Get system collections by media type (returns all collections)
 */
export function getSystemCollectionsByMediaType(mediaType: 'movie' | 'tv' | 'both'): Collection[] {
    return ALL_SYSTEM_COLLECTIONS
}

/**
 * @deprecated Legacy function - pages no longer exist
 * Get system collections for a specific page (returns all enabled collections)
 */
export function getSystemCollectionsForPage(page: 'home' | 'movies' | 'tv'): Collection[] {
    return ALL_SYSTEM_COLLECTIONS.filter((c) => c.enabled)
}
