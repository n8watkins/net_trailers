import { NextRequest, NextResponse } from 'next/server'
import { UserList, CacheMetadata } from '../../../../types/collections'
import { buildInitialCache, CascadingConfig } from '../../../../utils/unifiedCascadingFetch'
import { apiError, apiWarn } from '../../../../utils/debugLogger'
import { db } from '@/db'
import { users, userPreferences } from '@/db/schema'
import { loadUserPreferences, saveUserPreferences } from '@/db/queries/userPreferences'
import { createNotification } from '@/db/queries/notifications'
import { getAdminUserId } from '@/db/queries/_helpers'

const CRON_SECRET = process.env.CRON_SECRET
const API_KEY = process.env.TMDB_API_KEY

/**
 * Weekly Cron Job: Refresh collection caches
 *
 * Runs every Sunday at 2 AM UTC to check for new content in collections with actor/director filters.
 * Only updates cache if the top 50 results have changed.
 * Creates notifications when new content is detected.
 *
 * Collections are stored in userPreferences.data.userCreatedWatchlists (JSON blob).
 * When the cache changes we load the full preferences, patch the specific collection,
 * and write the entire blob back via saveUserPreferences — matching the existing
 * single-document storage model.
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

        // Check if admin-only mode is enabled via query parameter
        const { searchParams } = new URL(request.url)
        const adminOnlyParam = searchParams.get('adminOnly')
        const adminOnly = adminOnlyParam === 'true'

        // Resolve the admin's Turso id from ADMIN_GITHUB_LOGIN (the old ADMIN_UID
        // env var was removed in the Firebase→Turso migration).
        const adminUserId = adminOnly ? await getAdminUserId() : null

        if (adminOnly) {
            console.log(`🔄 [Collection Cache] Running in ADMIN-ONLY mode`)
        } else {
            console.log(`🔄 [Collection Cache] Running in ALL USERS mode`)
        }

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
                                // Don't throw — notification failure should not stop cache refresh
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
