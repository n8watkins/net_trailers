/**
 * The weekly collection cache refresh (cron: Sundays 02:00 UTC). Re-fetches
 * the top 50 of every TMDB genre collection with actor or director filters
 * not refreshed in 7 days, saves the ones that changed and notifies their
 * owners about new titles. `adminOnly` limits it to the admin's collections.
 *
 * Collections live in userPreferences.data.userCreatedWatchlists (JSON blob),
 * so a changed collection is patched into the user's preferences and the
 * whole blob is saved once per user.
 *
 * The same weekly run applies the page-view retention (lib/jobs/retention.ts).
 */

import { db } from '@/db'
import { getAdminUserId } from '@/db/queries/_helpers'
import { createNotification } from '@/db/queries/notifications'
import { loadUserPreferences, saveUserPreferences } from '@/db/queries/userPreferences'
import { userPreferences } from '@/db/schema'
import type { CacheMetadata, UserList } from '@/types/collections'
import { apiError, apiWarn } from '@/utils/debugLogger'
import { buildInitialCache, type CascadingConfig } from '@/utils/unifiedCascadingFetch'

import { deleteOldPageViews } from './retention'

export async function runCollectionCacheRefresh({ adminOnly }: { adminOnly: boolean }) {
    const API_KEY = process.env.TMDB_API_KEY
    if (!API_KEY) throw new Error('TMDB API key not configured')

    const adminUserId = adminOnly ? await getAdminUserId() : null

    let collectionsChecked = 0
    let collectionsUpdated = 0
    let notificationsCreated = 0

    // -----------------------------------------------------------------------
    // Enumerate all users that have a preferences row.
    // userPreferences rows map 1:1 with users and contain the full
    // userCreatedWatchlists array inside the `data` JSON blob.
    // -----------------------------------------------------------------------
    const allPrefs = await db.select().from(userPreferences)

    for (const prefRow of allPrefs) {
        const userId = prefRow.userId

        // ADMIN ONLY MODE: Skip all users except admin
        if (adminOnly && (!adminUserId || userId !== adminUserId)) {
            console.log(`🔄 [Collection Cache] Skipping non-admin user: ${userId}`)
            continue
        }

        // Collections live inside the JSON blob as userCreatedWatchlists
        const collections: UserList[] = prefRow.data?.userCreatedWatchlists ?? []

        // We may need to patch the preferences blob if any cache changes.
        // Load a mutable copy upfront; if changed, we'll save it once at the end.
        let prefsChanged = false
        const updatedCollections = [...collections]

        for (let i = 0; i < updatedCollections.length; i++) {
            const collection = updatedCollections[i]

            // Skip if no actor/director filters
            const hasActorFilters =
                collection.advancedFilters?.withCastIds &&
                collection.advancedFilters.withCastIds.length > 0
            const hasDirectorFilter =
                !!collection.advancedFilters?.withDirectorId ||
                !!collection.advancedFilters?.withDirectorIds?.length

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

                    // Patch the collection in our local mutable copy
                    updatedCollections[i] = {
                        ...collection,
                        cachedContentIds: freshTop50,
                        cacheMetadata: updatedMetadata,
                    }
                    prefsChanged = true
                    collectionsUpdated++

                    // Create in-app notification if there are new items.
                    // Uses the Drizzle-backed createNotification directly.
                    if (newItemCount > 0) {
                        try {
                            await createNotification(userId, {
                                type: 'collection_update',
                                title: 'New content available',
                                message: `${newItemCount} new ${newItemCount === 1 ? 'item' : 'items'} added to "${collection.name}"`,
                                collectionId: collection.id,
                                actionUrl: `/collections/${collection.id}`,
                                expiresIn: 30,
                            })
                            notificationsCreated++
                        } catch (notifError) {
                            apiWarn('Failed to create notification:', notifError)
                            // Don't throw - notification failure should not stop cache refresh
                        }
                    }
                }
            } catch (error) {
                apiError(`Failed to refresh cache for collection ${collection.id}:`, error)
                // Continue to next collection
            }
        }

        // Persist the entire preferences blob back if any collection changed.
        // We do a single write per user to minimise round-trips.
        if (prefsChanged) {
            try {
                const latestPrefs = await loadUserPreferences(userId)
                await saveUserPreferences(userId, {
                    ...latestPrefs,
                    userCreatedWatchlists: updatedCollections,
                })
            } catch (saveError) {
                apiError(`Failed to save updated preferences for user ${userId}:`, saveError)
            }
        }
    }

    // Page views older than the retention window go in the same weekly run
    // (all users' rows, so only on the scheduled or all-users run).
    const pageViewsDeleted = adminOnly ? 0 : await deleteOldPageViews()

    return { collectionsChecked, collectionsUpdated, notificationsCreated, pageViewsDeleted }
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
