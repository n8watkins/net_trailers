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
import { apiLog, apiError, apiWarn } from '@/utils/debugLogger'
import { EmailService } from '@/lib/email/email-service'
import { Content } from '@/typings'

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
            apiError('[Cron] CRON_SECRET is not configured')
            return NextResponse.json(
                { success: false, error: 'Cron secret is not configured on the server' },
                { status: 500 }
            )
        }

        // Use constant-time comparison to prevent timing attacks
        const expectedHeader = `Bearer ${cronSecret}`

        if (!authHeader || authHeader.length !== expectedHeader.length) {
            apiWarn('Unauthorized cron job attempt - invalid header format')
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        // Constant-time comparison using crypto.timingSafeEqual
        const encoder = new TextEncoder()
        const authBuffer = encoder.encode(authHeader)
        const expectedBuffer = encoder.encode(expectedHeader)

        let isValid = false
        try {
            isValid = crypto.timingSafeEqual(authBuffer, expectedBuffer)
        } catch {
            // Lengths don't match or other error - already handled by length check above
            isValid = false
        }

        if (!isValid) {
            apiWarn('Unauthorized cron job attempt - invalid credentials')
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        if (!AUTO_UPDATE_CRON_ENABLED) {
            apiWarn('[Cron] Auto-update cron is currently disabled.')
            return NextResponse.json(
                {
                    success: false,
                    message: 'Collection auto-update cron is temporarily disabled.',
                },
                { status: 503 }
            )
        }

        apiLog('[Cron] Starting collection auto-update job...')
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
                apiError(errorMsg)
                errors.push(errorMsg)
            }
        }

        apiLog('[Cron] Collection update job complete', {
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
        apiError('[Cron] Fatal error in update job:', error)
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

        apiLog(`[Cron] Checking ${dueCollections.length} collections for user ${userId}`)

        let updated = 0

        // Process each collection
        for (const collection of dueCollections) {
            try {
                const hasUpdates = await processCollection(db, userId, collection)
                if (hasUpdates) {
                    updated++
                }
            } catch (error) {
                apiError(`[Cron] Error processing collection ${collection.id}:`, error)
                // Continue with other collections even if one fails
            }
        }

        return { checked: dueCollections.length, updated }
    } catch (error) {
        apiError(`[Cron] Error loading collections for user ${userId}:`, error)
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

        apiLog(`[Cron] Found ${newContentIds.length} new items for collection "${collection.name}"`)

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

        apiLog(`[Cron] Created notification for user ${userId}`)

        // Send email notification if user has email notifications enabled
        try {
            await sendCollectionUpdateEmail(db, userId, collection, newContentIds)
        } catch (emailError) {
            apiError(`[Cron] Error sending email notification:`, emailError)
            // Don't fail the whole operation if email fails
        }

        return true
    } catch (error) {
        apiError(`[Cron] Error in processCollection:`, error)
        throw error
    }
}

/**
 * Send collection update email notification
 */
async function sendCollectionUpdateEmail(
    db: Firestore,
    userId: string,
    collection: CustomRow,
    newContentIds: number[]
): Promise<void> {
    try {
        // Get user profile for email and username
        const userDoc = await db.collection('users').doc(userId).get()

        if (!userDoc.exists) {
            apiLog(`[Cron] User ${userId} not found, skipping email`)
            return
        }

        const userData = userDoc.data()
        const email = userData?.profile?.email || userData?.email
        const username = userData?.profile?.username || userData?.username

        // Check if user has email notifications enabled
        const notificationPreferences = userData?.notificationPreferences
        const emailEnabled = notificationPreferences?.email === true
        const collectionUpdateEnabled = notificationPreferences?.types?.collection_update !== false

        if (!email) {
            apiLog(`[Cron] User ${userId} has no email, skipping email notification`)
            return
        }

        if (!emailEnabled || !collectionUpdateEnabled) {
            apiLog(`[Cron] Email notifications disabled for user ${userId}, skipping`)
            return
        }

        // Fetch content details from TMDB for the new items
        const contentItems = await fetchContentDetails(
            newContentIds,
            collection.mediaType === 'both' ? undefined : collection.mediaType
        )

        if (contentItems.length === 0) {
            apiLog(`[Cron] No content details fetched, skipping email`)
            return
        }

        // Send email using EmailService
        await EmailService.sendCollectionUpdate({
            to: email,
            userName: username,
            collectionName: collection.name,
            collectionId: collection.id,
            newItems: contentItems,
            totalNewItems: newContentIds.length,
        })

        apiLog(`[Cron] Sent email notification to ${email} for collection "${collection.name}"`)
    } catch (error) {
        apiError(`[Cron] Error in sendCollectionUpdateEmail:`, error)
        throw error
    }
}

/**
 * Fetch content details from TMDB API
 */
async function fetchContentDetails(
    contentIds: number[],
    mediaType?: 'movie' | 'tv'
): Promise<Content[]> {
    const TMDB_API_KEY = process.env.TMDB_API_KEY
    const TMDB_BASE_URL = 'https://api.themoviedb.org/3'

    if (!TMDB_API_KEY) {
        apiError('[Cron] TMDB_API_KEY not configured')
        return []
    }

    try {
        // Fetch details for each content item (limit to first 10 for email)
        const fetchPromises = contentIds.slice(0, 10).map(async (id) => {
            try {
                // Determine media type if not provided
                const type = mediaType

                if (!type) {
                    // Try to fetch as movie first, then TV
                    const movieRes = await fetch(
                        `${TMDB_BASE_URL}/movie/${id}?api_key=${TMDB_API_KEY}`
                    )

                    if (movieRes.ok) {
                        const movieData = await movieRes.json()
                        return { ...movieData, media_type: 'movie' as const }
                    }

                    const tvRes = await fetch(`${TMDB_BASE_URL}/tv/${id}?api_key=${TMDB_API_KEY}`)
                    if (tvRes.ok) {
                        const tvData = await tvRes.json()
                        return { ...tvData, media_type: 'tv' as const }
                    }

                    return null
                }

                const endpoint = type === 'movie' ? 'movie' : 'tv'
                const response = await fetch(
                    `${TMDB_BASE_URL}/${endpoint}/${id}?api_key=${TMDB_API_KEY}`
                )

                if (!response.ok) {
                    return null
                }

                const data = await response.json()
                return { ...data, media_type: type }
            } catch (error) {
                apiError(`[Cron] Error fetching content ${id}:`, error)
                return null
            }
        })

        const results = await Promise.all(fetchPromises)
        return results.filter((item): item is Content => item !== null)
    } catch (error) {
        apiError('[Cron] Error in fetchContentDetails:', error)
        return []
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
                apiError(`[Cron] Error checking user ${userDoc.id}:`, error)
                // Continue with next user
            }
        }

        apiLog(`[Cron] Found ${userIds.length} users with auto-update enabled custom rows`)
        return userIds
    } catch (error) {
        apiError('[Cron] Error in getAllUserIds:', error)
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
