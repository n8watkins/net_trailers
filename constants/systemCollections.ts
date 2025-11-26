/**
 * Default Genre Collections
 *
 * Pre-configured genre-based collections that new users see by default.
 * These are real collections stored in userCreatedWatchlists that users can fully edit.
 *
 * NOTE: Trending, Top Rated, and Recommended For You are now handled separately
 * as System Recommendations (see types/recommendations.ts), not as collections.
 * System Recommendations are TMDB-powered rows that users can customize but
 * cannot add manual content to.
 */

import { Collection } from '../types/collections'

/**
 * Default genre collections - seeded for new users
 * Users can edit, customize, or delete these
 */
export const ALL_SYSTEM_COLLECTIONS: Collection[] = [
    // Genre collections - can be customized or deleted by users
    {
        id: 'system-action',
        name: 'Action-Packed',
        description: 'Explosive action movies and shows',
        createdAt: 0,
        updatedAt: 0,
        items: [],
        collectionType: 'tmdb-genre',
        displayAsRow: true,
        order: 0,
        enabled: true,
        genres: ['action'],
        genreLogic: 'OR',
        mediaType: 'both',
        isSystemCollection: true,
        canDelete: true,
        canEdit: true,
        canGenerateMore: true,
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
        order: 1,
        enabled: true,
        genres: ['scifi', 'fantasy'],
        genreLogic: 'OR',
        mediaType: 'both',
        isSystemCollection: true,
        canDelete: true,
        canEdit: true,
        canGenerateMore: true,
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
        order: 2,
        enabled: true,
        genres: ['comedy'],
        genreLogic: 'OR',
        mediaType: 'both',
        isSystemCollection: true,
        canDelete: true,
        canEdit: true,
        canGenerateMore: true,
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
