/**
 * Trending Ranking Changes Utility
 *
 * Detects significant changes in trending rankings, not just new items.
 * This generates more frequent and interesting notifications.
 */

export interface TrendingItem {
    id: number
    title?: string // movies
    name?: string // TV shows
    media_type?: string
    poster_path?: string
    [key: string]: any
}

export interface RankingChange {
    item: TrendingItem
    changeType:
        | 'new' // First time appearing in trending
        | 'big_jump' // Jumped 5+ positions
        | 'entered_top_10' // Moved into top 10
        | 'entered_top_5' // Moved into top 5
        | 'reached_number_1' // Became #1
    oldRank?: number // Previous position (undefined if new)
    newRank: number // Current position (1-based)
    rankChange?: number // How many positions moved (positive = moved up)
}

/**
 * Compare trending snapshots and detect significant ranking changes
 *
 * @param oldSnapshot - Previous trending snapshot (ordered by rank)
 * @param newSnapshot - Current trending snapshot (ordered by rank)
 * @param options - Detection options
 * @returns Array of significant ranking changes
 */
export function detectRankingChanges(
    oldSnapshot: TrendingItem[],
    newSnapshot: TrendingItem[],
    options: {
        minJumpPositions?: number // Minimum positions to jump to be "significant" (default: 5)
        notifyTop10Entry?: boolean // Notify when entering top 10 (default: true)
        notifyTop5Entry?: boolean // Notify when entering top 5 (default: true)
        notifyNumberOne?: boolean // Notify when reaching #1 (default: true)
    } = {}
): RankingChange[] {
    const {
        minJumpPositions = 5,
        notifyTop10Entry = true,
        notifyTop5Entry = true,
        notifyNumberOne = true,
    } = options

    const changes: RankingChange[] = []

    // Create a map of old rankings (1-based index)
    const oldRankings = new Map<number, number>()
    oldSnapshot.forEach((item, index) => {
        oldRankings.set(item.id, index + 1)
    })

    // Check each item in new snapshot for changes
    newSnapshot.forEach((item, index) => {
        const newRank = index + 1 // 1-based ranking
        const oldRank = oldRankings.get(item.id)

        // Case 1: Completely new to trending
        if (oldRank === undefined) {
            changes.push({
                item,
                changeType: 'new',
                newRank,
            })
            return
        }

        // Case 2: Reached #1
        if (notifyNumberOne && newRank === 1 && oldRank !== 1) {
            changes.push({
                item,
                changeType: 'reached_number_1',
                oldRank,
                newRank,
                rankChange: oldRank - newRank,
            })
            return // Most significant change, don't check others
        }

        // Case 3: Entered top 5
        if (notifyTop5Entry && newRank <= 5 && oldRank > 5) {
            changes.push({
                item,
                changeType: 'entered_top_5',
                oldRank,
                newRank,
                rankChange: oldRank - newRank,
            })
            return // Don't also trigger top 10 entry
        }

        // Case 4: Entered top 10
        if (notifyTop10Entry && newRank <= 10 && oldRank > 10) {
            changes.push({
                item,
                changeType: 'entered_top_10',
                oldRank,
                newRank,
                rankChange: oldRank - newRank,
            })
            return // Don't also trigger big jump
        }

        // Case 5: Big jump in ranking
        const rankChange = oldRank - newRank // Positive = moved up
        if (rankChange >= minJumpPositions) {
            changes.push({
                item,
                changeType: 'big_jump',
                oldRank,
                newRank,
                rankChange,
            })
        }
    })

    return changes
}

/**
 * Get a human-readable notification message for a ranking change
 *
 * @param change - Ranking change details
 * @returns Notification message
 */
export function getRankingChangeMessage(change: RankingChange): {
    title: string
    message: string
} {
    const itemTitle = change.item.title || change.item.name || 'Unknown'

    switch (change.changeType) {
        case 'new':
            return {
                title: 'New in Trending!',
                message: `${itemTitle} just entered trending at #${change.newRank}`,
            }

        case 'reached_number_1':
            return {
                title: 'Trending #1!',
                message: `${itemTitle} is now the #1 trending ${change.item.media_type === 'movie' ? 'movie' : 'show'}!`,
            }

        case 'entered_top_5':
            return {
                title: 'Trending Top 5!',
                message: `${itemTitle} jumped to #${change.newRank} (was #${change.oldRank})`,
            }

        case 'entered_top_10':
            return {
                title: 'Trending Top 10!',
                message: `${itemTitle} entered the top 10 at #${change.newRank}`,
            }

        case 'big_jump':
            return {
                title: 'Rising Fast!',
                message: `${itemTitle} jumped ${change.rankChange} spots to #${change.newRank}`,
            }

        default:
            return {
                title: 'Trending Update',
                message: `${itemTitle} is trending`,
            }
    }
}

/**
 * Filter ranking changes to only include items in a user's watchlist
 *
 * @param changes - All ranking changes
 * @param watchlist - User's watchlist items
 * @returns Changes that match watchlist items
 */
export function filterWatchlistChanges(
    changes: RankingChange[],
    watchlist: Array<{ id: number; media_type: string }>
): RankingChange[] {
    const watchlistIds = new Set(watchlist.map((item) => `${item.id}-${item.media_type}`))

    return changes.filter((change) => {
        const key = `${change.item.id}-${change.item.media_type}`
        return watchlistIds.has(key)
    })
}

/**
 * Get the top N most significant ranking changes
 *
 * Priority order:
 * 1. Reached #1
 * 2. Entered top 5
 * 3. Entered top 10
 * 4. Big jumps (sorted by size of jump)
 * 5. New entries (sorted by current rank)
 *
 * @param changes - All ranking changes
 * @param limit - Maximum number of changes to return
 * @returns Top N most significant changes
 */
export function getTopChanges(changes: RankingChange[], limit: number = 3): RankingChange[] {
    const priorityOrder = {
        reached_number_1: 1,
        entered_top_5: 2,
        entered_top_10: 3,
        big_jump: 4,
        new: 5,
    }

    return changes
        .sort((a, b) => {
            // First sort by change type priority
            const priorityDiff = priorityOrder[a.changeType] - priorityOrder[b.changeType]
            if (priorityDiff !== 0) return priorityDiff

            // Within same type, sort by significance
            if (a.changeType === 'big_jump' && b.changeType === 'big_jump') {
                // Bigger jumps first
                return (b.rankChange || 0) - (a.rankChange || 0)
            }

            // Otherwise sort by current rank (higher = better)
            return a.newRank - b.newRank
        })
        .slice(0, limit)
}
