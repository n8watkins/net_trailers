/**
 * Collection Auto-Update Cron Job
 *
 * POST /api/cron/update-collections
 * Runs daily to check collections for new content and send notifications
 *
 * This endpoint should be called by:
 * - Vercel Cron (vercel.json configuration)
 * - Manual trigger for testing
 */

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import {
    checkForNewContent,
    addContentToCollection,
    getCollectionsDueForUpdate,
} from '@/utils/tmdb/contentDiscovery'
import { CustomRow } from '@/types/customRows'
import { getAdminDb } from '@/lib/firebase-admin'
import { Firestore } from 'firebase-admin/firestore'
import {
    getUserCustomRowsAdmin,
    updateCustomRowAdmin,
} from '@/utils/firestore/admin/customRowsAdmin'
import { createNotificationAdmin } from '@/utils/firestore/admin/notificationsAdmin'

/**
 * TEMPORARY: Auto-update cron is paused while the feature is de-scoped.
 * Set to true once we are ready to re-enable the scheduled job.
 */
const AUTO_UPDATE_CRON_ENABLED = false

export const runtime = 'nodejs' // Use Node.js runtime for longer execution time
export const maxDuration = 60 // Maximum 60 seconds execution (Vercel limit)

export async function POST(request: NextRequest) {
    try {
        // Verify authorization (protect against unauthorized calls)
        const authHeader = request.headers.get('authorization')
        const cronSecret = process.env.CRON_SECRET

        if (!cronSecret) {
            console.error('[Cron] CRON_SECRET is not configured')
            return NextResponse.json(
                { success: false, error: 'Cron secret is not configured on the server' },
                { status: 500 }
            )
        }

        // Use constant-time comparison to prevent timing attacks
        const expectedHeader = `Bearer ${cronSecret}`

        if (!authHeader || authHeader.length !== expectedHeader.length) {
            console.warn('Unauthorized cron job attempt - invalid header format')
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        // Constant-time comparison using crypto.timingSafeEqual
        const authBuffer = Buffer.from(authHeader)
        const expectedBuffer = Buffer.from(expectedHeader)

        let isValid = false
        try {
            isValid = crypto.timingSafeEqual(authBuffer, expectedBuffer)
        } catch {
            // Lengths don't match or other error - already handled by length check above
            isValid = false
        }

        if (!isValid) {
            console.warn('Unauthorized cron job attempt - invalid credentials')
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        if (!AUTO_UPDATE_CRON_ENABLED) {
            console.warn('[Cron] Auto-update cron is currently disabled.')
            return NextResponse.json(
                {
                    success: false,
                    message: 'Collection auto-update cron is temporarily disabled.',
                },
                { status: 503 }
            )
        }

        console.log('[Cron] Starting collection auto-update job...')
        const db = getAdminDb()

        // Get all users with custom rows
        // Note: This is a simplified approach. In production, you might want to
        // paginate through users or use Firebase Cloud Functions for better scalability
        const allUserIds = await getAllUserIds(db)

        let totalChecked = 0
        let totalUpdated = 0
        const errors: string[] = []

        // Process each user's collections
        for (const userId of allUserIds) {
            try {
                const result = await processUserCollections(db, userId)
                totalChecked += result.checked
                totalUpdated += result.updated
            } catch (error) {
                const errorMsg = `Error processing user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`
                console.error(errorMsg)
                errors.push(errorMsg)
            }
        }

        console.log('[Cron] Collection update job complete', {
            totalChecked,
            totalUpdated,
            errorCount: errors.length,
        })

        return NextResponse.json({
            success: true,
            stats: {
                usersProcessed: allUserIds.length,
                collectionsChecked: totalChecked,
                collectionsUpdated: totalUpdated,
                errors: errors.length,
            },
            errors: errors.length > 0 ? errors : undefined,
        })
    } catch (error) {
        console.error('[Cron] Fatal error in update job:', error)
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}

/**
 * Process all collections for a single user
 */
async function processUserCollections(
    db: Firestore,
    userId: string
): Promise<{ checked: number; updated: number }> {
    try {
        // Get user's custom rows
        const allCollections = await getUserCustomRowsAdmin(db, userId)

        // Filter to collections due for update
        const dueCollections = getCollectionsDueForUpdate(allCollections)

        if (dueCollections.length === 0) {
            return { checked: 0, updated: 0 }
        }

        console.log(`[Cron] Checking ${dueCollections.length} collections for user ${userId}`)

        let updated = 0

        // Process each collection
        for (const collection of dueCollections) {
            try {
                const hasUpdates = await processCollection(db, userId, collection)
                if (hasUpdates) {
                    updated++
                }
            } catch (error) {
                console.error(`[Cron] Error processing collection ${collection.id}:`, error)
                // Continue with other collections even if one fails
            }
        }

        return { checked: dueCollections.length, updated }
    } catch (error) {
        console.error(`[Cron] Error loading collections for user ${userId}:`, error)
        return { checked: 0, updated: 0 }
    }
}

/**
 * Process a single collection - check for new content and notify
 */
async function processCollection(
    db: Firestore,
    userId: string,
    collection: CustomRow
): Promise<boolean> {
    try {
        // Check TMDB for new content
        const newContentIds = await checkForNewContent(collection)

        if (newContentIds.length === 0) {
            // Update lastCheckedAt even if no new content
            await updateCustomRowAdmin(db, userId, collection.id, {
                lastCheckedAt: Date.now(),
            })
            return false
        }

        console.log(
            `[Cron] Found ${newContentIds.length} new items for collection "${collection.name}"`
        )

        // Add new content to collection
        const updatedCollection = addContentToCollection(collection, newContentIds)

        // Save updated collection to Firestore
        await updateCustomRowAdmin(db, userId, collection.id, {
            advancedFilters: updatedCollection.advancedFilters,
            lastCheckedAt: updatedCollection.lastCheckedAt,
            lastUpdateCount: updatedCollection.lastUpdateCount,
        })

        // Create notification for user
        await createNotificationAdmin(db, userId, {
            type: 'collection_update',
            title: `${newContentIds.length} new ${newContentIds.length === 1 ? 'item' : 'items'} in "${collection.name}"`,
            message: `Your collection has been updated with new matching content`,
            collectionId: collection.id,
            actionUrl: `/rows`, // Link to rows page where they can see their custom rows
        })

        console.log(`[Cron] Created notification for user ${userId}`)

        return true
    } catch (error) {
        console.error(`[Cron] Error in processCollection:`, error)
        throw error
    }
}

/**
 * Get all user IDs that have custom rows
 *
 * ARCHITECTURE NOTE:
 * Custom rows are stored in the user document's customRows field (map),
 * NOT in a subcollection. This matches the CustomRowsFirestore implementation.
 *
 * For large user bases, consider implementing pagination and processing users in batches.
 */
async function getAllUserIds(db: Firestore): Promise<string[]> {
    try {
        // Get all users
        const usersSnapshot = await db.collection('users').get()

        const userIds: string[] = []

        // Check each user for custom rows
        for (const userDoc of usersSnapshot.docs) {
            try {
                const userData = userDoc.data()

                // Check if user has custom rows stored in the customRows field (map)
                const customRows = userData.customRows

                // Custom rows are stored as a map: { [rowId]: CustomRow }
                if (
                    customRows &&
                    typeof customRows === 'object' &&
                    Object.keys(customRows).length > 0
                ) {
                    // Check if any custom row has auto-update enabled
                    // Schema: CustomRow has flat autoUpdateEnabled field and updateFrequency
                    const hasAutoUpdateRows = Object.values(customRows).some(
                        (row: any) =>
                            row?.autoUpdateEnabled === true && row?.updateFrequency !== 'never'
                    )

                    if (hasAutoUpdateRows) {
                        userIds.push(userDoc.id)
                    }
                }
            } catch (error) {
                console.error(`[Cron] Error checking user ${userDoc.id}:`, error)
                // Continue with next user
            }
        }

        console.log(`[Cron] Found ${userIds.length} users with auto-update enabled custom rows`)
        return userIds
    } catch (error) {
        console.error('[Cron] Error in getAllUserIds:', error)
        return []
    }
}

/**
 * Manual trigger for testing (GET request)
 *
 * GET /api/cron/update-collections?secret=YOUR_SECRET
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const secret = searchParams.get('secret')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret || secret !== cronSecret) {
        return NextResponse.json({ success: false, error: 'Invalid secret' }, { status: 401 })
    }

    // Forward to POST handler
    return POST(request)
}
