import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '../../../../lib/firebase-admin'
import { UserList, CacheMetadata } from '../../../../types/collections'
import { buildInitialCache, CascadingConfig } from '../../../../utils/unifiedCascadingFetch'
import { apiError, apiWarn } from '../../../../utils/debugLogger'

const CRON_SECRET = process.env.CRON_SECRET
const API_KEY = process.env.TMDB_API_KEY

/**
 * Weekly Cron Job: Refresh collection caches
 *
 * Runs every Sunday at 2 AM UTC to check for new content in collections with actor/director filters.
 * Only updates cache if the top 50 results have changed.
 * Creates notifications when new content is detected.
 */
export async function GET(request: NextRequest) {
    try {
        // Verify cron secret
        const authHeader = request.headers.get('authorization')
        if (authHeader !== `Bearer ${CRON_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (!API_KEY) {
            return NextResponse.json({ error: 'TMDB API key not configured' }, { status: 500 })
        }

        const db = getAdminDb()

        let collectionsChecked = 0
        let collectionsUpdated = 0
        let notificationsCreated = 0

        // Get all users
        const usersSnapshot = await db.collection('users').get()

        for (const userDoc of usersSnapshot.docs) {
            const userId = userDoc.id

            // Get user's custom collections
            const collectionsSnapshot = await db
                .collection('users')
                .doc(userId)
                .collection('customRows')
                .get()

            for (const collectionDoc of collectionsSnapshot.docs) {
                const collection = { id: collectionDoc.id, ...collectionDoc.data() } as UserList

                // Skip if no actor/director filters
                const hasActorFilters =
                    collection.advancedFilters?.withCastIds &&
                    collection.advancedFilters.withCastIds.length > 0
                const hasDirectorFilter = !!collection.advancedFilters?.withDirectorId

                if (!hasActorFilters && !hasDirectorFilter) {
                    continue
                }

                // Skip if not TMDB genre-based collection
                if (collection.collectionType !== 'tmdb-genre') {
                    continue
                }

                // Skip if cache was updated less than 7 days ago
                const lastFetched = collection.cacheMetadata?.lastFetched || 0
                const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
                if (lastFetched > sevenDaysAgo) {
                    continue
                }

                collectionsChecked++

                try {
                    // Build config for cascading fetch
                    const config: CascadingConfig = {
                        actorIds: collection.advancedFilters?.withCastIds || [],
                        directorId: collection.advancedFilters?.withDirectorId,
                        genres: collection.genres || [],
                        mediaType: collection.mediaType || 'both',
                        genreLogic: collection.genreLogic,
                        childSafeMode: false, // Cache without child safety, apply filter on serve
                        infiniteEnabled: collection.canGenerateMore ?? false,
                    }

                    // Fetch fresh top 50 results
                    const freshTop50 = await buildInitialCache(config, API_KEY)

                    // Compare with existing cache
                    const currentCache = collection.cachedContentIds || []
                    const hasChanged = !arraysEqual(freshTop50, currentCache.slice(0, 50))

                    if (hasChanged) {
                        // Determine how many new items were added
                        const newItems = freshTop50.filter((id) => !currentCache.includes(id))
                        const newItemCount = newItems.length

                        // Update cache metadata
                        const updatedMetadata: CacheMetadata = {
                            lastFetched: Date.now(),
                            totalResultsAvailable: freshTop50.length,
                            cacheSource: 'refresh',
                            needsRefresh: false,
                        }

                        // Update collection in Firestore
                        await collectionDoc.ref.update({
                            cachedContentIds: freshTop50,
                            cacheMetadata: updatedMetadata,
                        })

                        collectionsUpdated++

                        // Create notification if there are new items
                        if (newItemCount > 0) {
                            await createNotification(
                                userId,
                                collection.id,
                                collection.name,
                                newItemCount
                            )
                            notificationsCreated++
                        }
                    }
                } catch (error) {
                    apiError(`Failed to refresh cache for collection ${collection.id}:`, error)
                    // Continue to next collection
                }
            }
        }

        return NextResponse.json({
            success: true,
            collectionsChecked,
            collectionsUpdated,
            notificationsCreated,
            timestamp: new Date().toISOString(),
        })
    } catch (error) {
        apiError('Cron job failed:', error)
        return NextResponse.json(
            {
                error: 'Internal server error',
                message:
                    process.env.NODE_ENV === 'development'
                        ? (error as Error).message
                        : 'Cron job failed',
            },
            { status: 500 }
        )
    }
}

/**
 * Compare two arrays for equality
 */
function arraysEqual(a: number[], b: number[]): boolean {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false
    }
    return true
}

/**
 * Create a notification for the user about new collection content
 */
async function createNotification(
    userId: string,
    collectionId: string,
    collectionName: string,
    newItemCount: number
): Promise<void> {
    try {
        const db = getAdminDb()

        const notification = {
            type: 'collection_updated',
            title: 'New content available',
            message: `${newItemCount} new ${newItemCount === 1 ? 'item' : 'items'} added to "${collectionName}"`,
            collectionId,
            collectionName,
            newItemCount,
            createdAt: Date.now(),
            read: false,
            dismissed: false,
        }

        await db.collection('users').doc(userId).collection('notifications').add(notification)
    } catch (error) {
        apiWarn('Failed to create notification:', error)
        // Don't throw - notification failure shouldn't stop cache refresh
    }
}
