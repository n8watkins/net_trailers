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

import { Collection } from '../types/collections'

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
        color: '#6366f1', // Indigo
    },
    {
        id: 'system-top-rated',
        name: 'Top Rated',
        description: 'Highest rated movies and TV shows',
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
        color: '#6366f1', // Indigo
    },
    // Genre collections - can be customized or deleted
    {
        id: 'system-action',
        name: 'Action-Packed',
        description: 'Explosive action movies and shows',
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
        color: '#6366f1', // Indigo
    },
    {
        id: 'system-scifi',
        name: 'Sci-Fi & Fantasy',
        description: 'Futuristic science fiction and fantasy',
        createdAt: 0,
        updatedAt: 0,
        items: [],
        collectionType: 'tmdb-genre',
        displayAsRow: true,
        order: 3,
        enabled: true,
        genres: ['scifi', 'fantasy'],
        genreLogic: 'OR',
        mediaType: 'both',
        isSystemCollection: true,
        canDelete: true,
        canEdit: true,
        color: '#6366f1', // Indigo
    },
    {
        id: 'system-comedy',
        name: 'Comedy',
        description: 'Hilarious comedy movies and shows',
        createdAt: 0,
        updatedAt: 0,
        items: [],
        collectionType: 'tmdb-genre',
        displayAsRow: true,
        order: 4,
        enabled: true,
        genres: ['comedy'],
        genreLogic: 'OR',
        mediaType: 'both',
        isSystemCollection: true,
        canDelete: true,
        canEdit: true,
        color: '#6366f1', // Indigo
    },
]

/**
 * Create default collections for a new user
 * Returns fresh copies of the default collections with proper timestamps
 * These become real UserList collections that the user can fully edit
 */
export function createDefaultCollectionsForUser(): Collection[] {
    const now = Date.now()
    return ALL_SYSTEM_COLLECTIONS.map((template) => ({
        ...template,
        createdAt: now,
        updatedAt: now,
    }))
}

/**
 * Check if a user needs default collections seeded
 * Returns true if they have no collections yet
 */
export function needsDefaultCollections(existingCollections: Collection[]): boolean {
    return !existingCollections || existingCollections.length === 0
}

/**
 * @deprecated Legacy function - all collections are now unified
 * Get system collections by media type (returns all collections)
 */
export function getSystemCollectionsByMediaType(_mediaType: 'movie' | 'tv' | 'both'): Collection[] {
    return ALL_SYSTEM_COLLECTIONS
}

/**
 * @deprecated Legacy function - pages no longer exist
 * Get system collections for a specific page (returns all enabled collections)
 */
export function getSystemCollectionsForPage(_page: 'home' | 'movies' | 'tv'): Collection[] {
    return ALL_SYSTEM_COLLECTIONS.filter((c) => c.enabled)
}
