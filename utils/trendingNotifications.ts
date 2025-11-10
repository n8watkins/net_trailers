/**
 * Trending Notifications Utility
 *
 * Compares cached trending content with new trending data
 * and creates notifications for newly trending items
 */

import { Content, getTitle } from '../typings'
import { createNotification } from './firestore/notifications'

export interface TrendingComparisonResult {
    newTrendingItems: Content[]
    removedItems: Content[]
    totalChanges: number
}

/**
 * Compare old and new trending arrays to find new items
 *
 * @param oldTrending - Previously cached trending content
 * @param newTrending - Newly fetched trending content
 * @returns Comparison result with new and removed items
 */
export function compareTrendingContent(
    oldTrending: Content[],
    newTrending: Content[]
): TrendingComparisonResult {
    // Extract IDs from old trending for quick lookup
    const oldIds = new Set(oldTrending.map((item) => item.id))
    const newIds = new Set(newTrending.map((item) => item.id))

    // Find items that are in new trending but not in old (newly trending)
    const newTrendingItems = newTrending.filter((item) => !oldIds.has(item.id))

    // Find items that were in old trending but not in new (fell off trending)
    const removedItems = oldTrending.filter((item) => !newIds.has(item.id))

    return {
        newTrendingItems,
        removedItems,
        totalChanges: newTrendingItems.length + removedItems.length,
    }
}

/**
 * Create notifications for newly trending content
 *
 * @param userId - User ID to create notifications for
 * @param newTrendingItems - Array of newly trending content
 * @param notificationsEnabled - Whether trending notifications are enabled for this user
 * @returns Number of notifications created
 */
export async function createTrendingNotifications(
    userId: string,
    newTrendingItems: Content[],
    notificationsEnabled: boolean = true
): Promise<number> {
    if (!userId || !notificationsEnabled) {
        return 0
    }

    if (newTrendingItems.length === 0) {
        return 0
    }

    let notificationsCreated = 0

    try {
        // Limit to top 5 new trending items to avoid spam
        const itemsToNotify = newTrendingItems.slice(0, 5)

        // Create notifications in parallel
        const notificationPromises = itemsToNotify.map(async (content) => {
            try {
                const title = getTitle(content)
                const posterPath = content.poster_path
                const mediaType = content.media_type === 'movie' ? 'Movie' : 'TV Show'

                await createNotification(userId, {
                    type: 'trending_update',
                    title: title, // Just the content title, no prefix
                    message: `${title} (${mediaType}) just entered the trending list!`,
                    contentId: content.id,
                    actionUrl: `/`, // Could link to content detail page in future
                    imageUrl: posterPath
                        ? `https://image.tmdb.org/t/p/w500${posterPath}`
                        : undefined,
                    expiresIn: 7, // Expire after 7 days
                })

                notificationsCreated++
            } catch (error) {
                console.error(`Failed to create trending notification for ${content.id}:`, error)
            }
        })

        await Promise.all(notificationPromises)

        if (notificationsCreated > 0) {
            console.log(`✅ Created ${notificationsCreated} trending notifications`)
        }
    } catch (error) {
        console.error('Error creating trending notifications:', error)
    }

    return notificationsCreated
}

/**
 * Process trending updates and create notifications if needed
 *
 * @param userId - User ID
 * @param oldTrending - Previously cached trending content (or null if no cache)
 * @param newTrending - Newly fetched trending content
 * @param notificationsEnabled - Whether user has trending notifications enabled
 * @returns Comparison result
 */
export async function processTrendingUpdates(
    userId: string | null,
    oldTrending: Content[] | null,
    newTrending: Content[],
    notificationsEnabled: boolean = true
): Promise<TrendingComparisonResult | null> {
    // Don't process if no user or no old data to compare against
    if (!userId || !oldTrending || oldTrending.length === 0) {
        return null
    }

    // Compare old vs new trending
    const comparison = compareTrendingContent(oldTrending, newTrending)

    // Log changes for debugging
    if (comparison.totalChanges > 0) {
        console.log(`📊 Trending changes detected:`)
        console.log(`   New items: ${comparison.newTrendingItems.length}`)
        console.log(`   Removed items: ${comparison.removedItems.length}`)
    }

    // Create notifications for newly trending items
    if (comparison.newTrendingItems.length > 0 && notificationsEnabled) {
        await createTrendingNotifications(userId, comparison.newTrendingItems, notificationsEnabled)
    }

    return comparison
}
