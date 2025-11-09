/**
 * Content Deduplication Utilities
 *
 * Provides utilities for deduplicating content arrays to prevent
 * duplicate keys in React rendering and duplicate display to users.
 */

import { Content } from '../typings'

/**
 * Deduplicate content by media_type and id
 * Prevents duplicate keys in React rendering
 *
 * @param content - Array of content items to deduplicate
 * @returns Deduplicated array with unique content items
 *
 * @example
 * ```ts
 * const movies = [...movieResults, ...tvResults]
 * const unique = deduplicateContent(movies)
 * ```
 */
export function deduplicateContent(content: Content[]): Content[] {
    const seen = new Set<string>()
    return content.filter((item) => {
        const key = `${item.media_type || 'unknown'}-${item.id}`
        if (seen.has(key)) {
            return false
        }
        seen.add(key)
        return true
    })
}

/**
 * Randomize array using Fisher-Yates shuffle algorithm
 *
 * @param arr - Array to randomize
 * @returns New shuffled array
 */
export function randomizeArray<T>(arr: T[]): T[] {
    const shuffled = [...arr]
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
}

/**
 * Deduplicate and randomize content in one operation
 *
 * @param content - Array of content items
 * @returns Deduplicated and randomized array
 *
 * @example
 * ```ts
 * const trending = dedupeAndRandomize([...movies, ...tvShows])
 * ```
 */
export function dedupeAndRandomize(content: Content[]): Content[] {
    return randomizeArray(deduplicateContent(content))
}
