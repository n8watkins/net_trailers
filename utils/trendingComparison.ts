/**
 * Trending Comparison Utility
 *
 * Compares old and new trending snapshots to find newly trending content
 */

export interface TrendingItem {
    id: number
    title?: string // movies
    name?: string // TV shows
    media_type?: string
    poster_path?: string
    [key: string]: any
}

/**
 * Compare two trending snapshots and return new items
 *
 * @param oldSnapshot - Previous trending snapshot
 * @param newSnapshot - Current trending snapshot
 * @returns Array of newly trending items
 */
export function compareTrendingContent(
    oldSnapshot: TrendingItem[],
    newSnapshot: TrendingItem[]
): TrendingItem[] {
    // Create a set of IDs from the old snapshot for fast lookup
    const oldIds = new Set(oldSnapshot.map((item) => item.id))

    // Filter new snapshot for items not in old snapshot
    return newSnapshot.filter((item) => !oldIds.has(item.id))
}

/**
 * Get the top N items from a trending snapshot
 *
 * @param snapshot - Trending snapshot
 * @param limit - Maximum number of items to return
 * @returns Top N items
 */
export function getTopTrending(snapshot: TrendingItem[], limit: number = 20): TrendingItem[] {
    return snapshot.slice(0, limit)
}

/**
 * Get the title of a trending item (handles both movies and TV shows)
 *
 * @param item - Trending item
 * @returns Title or name
 */
export function getTrendingTitle(item: TrendingItem): string {
    return item.title || item.name || 'Unknown'
}
