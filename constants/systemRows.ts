/**
 * System/Default Rows
 *
 * Pre-configured rows that all users see by default.
 * Core rows (Trending/Top Rated) cannot be deleted, only disabled.
 * Other system rows can be deleted and restored via "Reset Default Rows".
 */

import { SystemRowConfig } from '../types/customRows'

/**
 * System rows for Movies page (mediaType: 'movie')
 */
export const SYSTEM_MOVIE_ROWS: SystemRowConfig[] = [
    {
        id: 'system-movie-trending',
        name: 'Trending Movies',
        genres: [], // Special: uses trending API
        genreLogic: 'OR',
        mediaType: 'movie',
        order: 0,
        isSpecialRow: true,
        canDelete: false, // Core row - cannot be deleted
        canEdit: false, // Core row - cannot be edited
    },
    {
        id: 'system-movie-top-rated',
        name: 'Top Rated Movies',
        genres: [], // Special: uses top-rated API
        genreLogic: 'OR',
        mediaType: 'movie',
        order: 1,
        isSpecialRow: true,
        canDelete: false, // Core row - cannot be deleted
        canEdit: false, // Core row - cannot be edited
    },
    {
        id: 'system-movie-action',
        name: 'Action-Packed',
        genres: [28], // Action
        genreLogic: 'OR',
        mediaType: 'movie',
        order: 2,
    },
    {
        id: 'system-movie-comedy',
        name: 'Comedy Classics',
        genres: [35], // Comedy
        genreLogic: 'OR',
        mediaType: 'movie',
        order: 3,
    },
    {
        id: 'system-movie-scifi',
        name: 'Sci-Fi Adventures',
        genres: [878], // Science Fiction
        genreLogic: 'OR',
        mediaType: 'movie',
        order: 4,
    },
    {
        id: 'system-movie-horror',
        name: 'Horror Thrills',
        genres: [27], // Horror
        genreLogic: 'OR',
        mediaType: 'movie',
        order: 5,
    },
    {
        id: 'system-movie-romance',
        name: 'Romantic Films',
        genres: [10749], // Romance
        genreLogic: 'OR',
        mediaType: 'movie',
        order: 6,
    },
]

/**
 * System rows for TV Shows page (mediaType: 'tv')
 */
export const SYSTEM_TV_ROWS: SystemRowConfig[] = [
    {
        id: 'system-tv-trending',
        name: 'Trending TV Shows',
        genres: [], // Special: uses trending API
        genreLogic: 'OR',
        mediaType: 'tv',
        order: 0,
        isSpecialRow: true,
        canDelete: false, // Core row - cannot be deleted
        canEdit: false, // Core row - cannot be edited
    },
    {
        id: 'system-tv-top-rated',
        name: 'Top Rated TV Shows',
        genres: [], // Special: uses top-rated API
        genreLogic: 'OR',
        mediaType: 'tv',
        order: 1,
        isSpecialRow: true,
        canDelete: false, // Core row - cannot be deleted
        canEdit: false, // Core row - cannot be edited
    },
    {
        id: 'system-tv-action',
        name: 'Action & Adventure',
        genres: [10759], // Action & Adventure
        genreLogic: 'OR',
        mediaType: 'tv',
        order: 2,
    },
    {
        id: 'system-tv-comedy',
        name: 'Comedy Series',
        genres: [35], // Comedy
        genreLogic: 'OR',
        mediaType: 'tv',
        order: 3,
    },
    {
        id: 'system-tv-scifi',
        name: 'Sci-Fi & Fantasy',
        genres: [10765], // Sci-Fi & Fantasy
        genreLogic: 'OR',
        mediaType: 'tv',
        order: 4,
    },
    {
        id: 'system-tv-kids',
        name: 'Kids Shows',
        genres: [10762], // Kids
        genreLogic: 'OR',
        mediaType: 'tv',
        order: 5,
    },
    {
        id: 'system-tv-reality',
        name: 'Reality TV',
        genres: [10764], // Reality
        genreLogic: 'OR',
        mediaType: 'tv',
        order: 6,
    },
]

/**
 * System rows for Home page (mediaType: 'both')
 */
export const SYSTEM_HOME_ROWS: SystemRowConfig[] = [
    {
        id: 'system-home-trending',
        name: 'Trending',
        genres: [], // Special: uses trending API
        genreLogic: 'OR',
        mediaType: 'both',
        order: 0,
        isSpecialRow: true,
        canDelete: false, // Core row - cannot be deleted
        canEdit: false, // Core row - cannot be edited
    },
    {
        id: 'system-home-top-rated',
        name: 'Top Rated',
        genres: [], // Special: uses top-rated API
        genreLogic: 'OR',
        mediaType: 'both',
        order: 1,
        isSpecialRow: true,
        canDelete: false, // Core row - cannot be deleted
        canEdit: false, // Core row - cannot be edited
    },
    {
        id: 'system-home-animation',
        name: 'Animated Favorites',
        genres: [16], // Animation
        genreLogic: 'OR',
        mediaType: 'both',
        order: 2,
    },
    {
        id: 'system-home-family',
        name: 'Family Fun',
        genres: [10751], // Family
        genreLogic: 'OR',
        mediaType: 'both',
        order: 3,
    },
    {
        id: 'system-home-documentary',
        name: 'Documentaries',
        genres: [99], // Documentary
        genreLogic: 'OR',
        mediaType: 'both',
        order: 4,
    },
    {
        id: 'system-home-mystery',
        name: 'Mystery & Suspense',
        genres: [9648], // Mystery
        genreLogic: 'OR',
        mediaType: 'both',
        order: 5,
    },
]

/**
 * All system rows combined
 */
export const ALL_SYSTEM_ROWS: SystemRowConfig[] = [
    ...SYSTEM_MOVIE_ROWS,
    ...SYSTEM_TV_ROWS,
    ...SYSTEM_HOME_ROWS,
]

/**
 * Get system rows by media type
 */
export function getSystemRowsByMediaType(mediaType: 'movie' | 'tv' | 'both'): SystemRowConfig[] {
    switch (mediaType) {
        case 'movie':
            return SYSTEM_MOVIE_ROWS
        case 'tv':
            return SYSTEM_TV_ROWS
        case 'both':
            return SYSTEM_HOME_ROWS
    }
}
