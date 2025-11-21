/**
 * Sample Content for Seeding
 *
 * Contains sample movies and TV shows used across all seed functions
 */

import { Content } from '../../typings'

// Re-export from original file for now to avoid duplicating 800 lines
// TODO: Move the actual data here and delete from seedData.ts
export { sampleMovies, sampleTVShows } from '../seedData'
import { sampleMovies, sampleTVShows } from '../seedData'

// Helper to get combined and shuffled content
export function getShuffledContent(): Content[] {
    return [...sampleMovies, ...sampleTVShows].sort(() => Math.random() - 0.5)
}

// Helper to get content slice
export function getContentSlice(start: number, count: number): Content[] {
    const shuffled = getShuffledContent()
    return shuffled.slice(start, start + count)
}
