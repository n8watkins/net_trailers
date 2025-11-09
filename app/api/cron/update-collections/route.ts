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
import { CustomRowsFirestore } from '@/utils/firestore/customRows'
import {
    checkForNewContent,
    addContentToCollection,
    getCollectionsDueForUpdate,
} from '@/utils/tmdb/contentDiscovery'
import { createNotification } from '@/utils/firestore/notifications'
import { CustomRow } from '@/types/customRows'

export const runtime = 'nodejs' // Use Node.js runtime for longer execution time
export const maxDuration = 60 // Maximum 60 seconds execution (Vercel limit)

export async function POST(request: NextRequest) {
    try {
        // Verify authorization (protect against unauthorized calls)
        const authHeader = request.headers.get('authorization')
        const cronSecret = process.env.CRON_SECRET || 'dev-secret-change-in-production'

        if (authHeader !== `Bearer ${cronSecret}`) {
            console.warn('Unauthorized cron job attempt')
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        console.log('[Cron] Starting collection auto-update job...')

        // Get all users with custom rows
        // Note: This is a simplified approach. In production, you might want to
        // paginate through users or use Firebase Cloud Functions for better scalability
        const allUserIds = await getAllUserIds()

        let totalChecked = 0
        let totalUpdated = 0
        const errors: string[] = []

        // Process each user's collections
        for (const userId of allUserIds) {
            try {
                const result = await processUserCollections(userId)
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
    userId: string
): Promise<{ checked: number; updated: number }> {
    try {
        // Get user's custom rows
        const allCollections = await CustomRowsFirestore.getUserCustomRows(userId)

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
                const hasUpdates = await processCollection(userId, collection)
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
async function processCollection(userId: string, collection: CustomRow): Promise<boolean> {
    try {
        // Check TMDB for new content
        const newContentIds = await checkForNewContent(collection)

        if (newContentIds.length === 0) {
            // Update lastCheckedAt even if no new content
            await CustomRowsFirestore.updateCustomRow(userId, collection.id, {
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
        await CustomRowsFirestore.updateCustomRow(userId, collection.id, {
            advancedFilters: updatedCollection.advancedFilters,
            lastCheckedAt: updatedCollection.lastCheckedAt,
            lastUpdateCount: updatedCollection.lastUpdateCount,
            updatedAt: updatedCollection.updatedAt,
        })

        // Create notification for user
        await createNotification(userId, {
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
 * Note: This is a simplified implementation that returns a sample of users.
 * In production, you should:
 * 1. Query Firestore for all users with customRows collection
 * 2. Implement pagination for large user bases
 * 3. Consider using Firebase Cloud Functions for better scalability
 */
async function getAllUserIds(): Promise<string[]> {
    // TODO: Implement proper user enumeration from Firestore
    // For now, this is a placeholder that would need to be replaced with
    // actual Firestore queries to get users with auto-updating collections

    // Temporary implementation - in production you would query Firestore
    // to get all users who have collections with autoUpdateEnabled: true

    console.warn('[Cron] getAllUserIds() needs production implementation')
    return []

    // Production implementation would look like:
    /*
    import { db } from '@/firebase'
    import { collection, getDocs, query, where } from 'firebase/firestore'

    const usersRef = collection(db, 'users')
    const snapshot = await getDocs(usersRef)

    const userIds: string[] = []
    for (const doc of snapshot.docs) {
        // Check if user has any custom rows (could optimize with subcollection query)
        const customRowsRef = collection(db, `users/${doc.id}/customRows`)
        const rowsSnapshot = await getDocs(customRowsRef)

        if (!rowsSnapshot.empty) {
            userIds.push(doc.id)
        }
    }

    return userIds
    */
}

/**
 * Manual trigger for testing (GET request)
 *
 * GET /api/cron/update-collections?secret=YOUR_SECRET
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const secret = searchParams.get('secret')
    const cronSecret = process.env.CRON_SECRET || 'dev-secret-change-in-production'

    if (secret !== cronSecret) {
        return NextResponse.json({ success: false, error: 'Invalid secret' }, { status: 401 })
    }

    // Forward to POST handler
    return POST(request)
}
