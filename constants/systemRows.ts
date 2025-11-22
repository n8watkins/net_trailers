/**
 * System/Default Rows
 *
 * @deprecated - This file is deprecated in favor of systemCollections.ts
 * which uses the unified Collection interface.
 *
 * This file is kept for backward compatibility with legacy code
 * that may still reference SystemRowConfig types.
 *
 * Pre-configured rows that all users see by default.
 * All rows are now unified with mediaType: 'both' by default.
 * Users can customize mediaType via the collection editor.
 */

import { SystemRowConfig } from '../types/collections'

/**
 * All system rows - unified with mediaType: 'both'
 * Users can edit these to change mediaType to 'movie' or 'tv' only if desired
 */
export const ALL_SYSTEM_ROWS: SystemRowConfig[] = [
    // Core rows - cannot be deleted but can be edited
    {
        id: 'system-trending',
        name: 'Trending',
        genres: [], // Special: uses trending API
        genreLogic: 'OR',
        mediaType: 'both',
        order: 0,
        isSpecialCollection: true,
        canDelete: false, // Core row - cannot be deleted
        canEdit: true, // Can customize mediaType
    },
    {
        id: 'system-top-rated',
        name: 'Top Rated',
        genres: [], // Special: uses top-rated API
        genreLogic: 'OR',
        mediaType: 'both',
        order: 1,
        isSpecialCollection: true,
        canDelete: false, // Core row - cannot be deleted
        canEdit: true, // Can customize mediaType
    },
    // Genre rows - can be customized or deleted
    {
        id: 'system-action',
        name: 'Action-Packed',
        genres: ['action'],
        genreLogic: 'OR',
        mediaType: 'both',
        order: 2,
    },
    {
        id: 'system-comedy',
        name: 'Comedy Favorites',
        genres: ['comedy'],
        genreLogic: 'OR',
        mediaType: 'both',
        order: 3,
    },
    {
        id: 'system-scifi',
        name: 'Sci-Fi & Fantasy',
        genres: ['scifi', 'fantasy'],
        genreLogic: 'OR',
        mediaType: 'both',
        order: 4,
    },
    {
        id: 'system-animation',
        name: 'Animated Favorites',
        genres: ['animation'],
        genreLogic: 'OR',
        mediaType: 'both',
        order: 5,
    },
    {
        id: 'system-horror',
        name: 'Horror Thrills',
        genres: ['horror'],
        genreLogic: 'OR',
        mediaType: 'both',
        order: 6,
    },
    {
        id: 'system-family',
        name: 'Family Fun',
        genres: ['family'],
        genreLogic: 'OR',
        mediaType: 'both',
        order: 7,
    },
    {
        id: 'system-documentary',
        name: 'Documentaries',
        genres: ['documentary'],
        genreLogic: 'OR',
        mediaType: 'both',
        order: 8,
    },
    {
        id: 'system-romance-drama',
        name: 'Romantic Dramas',
        genres: ['romance', 'drama'],
        genreLogic: 'AND',
        mediaType: 'both',
        order: 9,
    },
]

/**
 * @deprecated Legacy exports - all rows are now unified
 * Kept for backward compatibility only
 */
export const SYSTEM_MOVIE_ROWS: SystemRowConfig[] = ALL_SYSTEM_ROWS
export const SYSTEM_TV_ROWS: SystemRowConfig[] = ALL_SYSTEM_ROWS
export const SYSTEM_HOME_ROWS: SystemRowConfig[] = ALL_SYSTEM_ROWS

/**
 * @deprecated Legacy function - all rows are now unified
 * Get system rows by media type (returns all rows)
 */
export function getSystemRowsByMediaType(mediaType: 'movie' | 'tv' | 'both'): SystemRowConfig[] {
    return ALL_SYSTEM_ROWS
}
