/**
 * Collection Sharing - Firestore Utilities
 *
 * Handles all Firestore operations for collection sharing:
 * - Create/read/update/delete share links
 * - View count tracking with spam prevention
 * - Share validation and expiration
 * - User share management
 */

import { nanoid } from 'nanoid'
import {
    doc,
    getDoc,
    setDoc,
    deleteDoc,
    updateDoc,
    collection,
    query,
    where,
    getDocs,
    serverTimestamp,
    increment,
} from 'firebase/firestore'
import { db } from '../../firebase'
import {
    ShareableLink,
    CreateShareRequest,
    CreateShareResponse,
    ShareValidationResult,
    ShareStats,
    SharedCollectionData,
    SHARE_CONSTRAINTS,
    SHARE_EXPIRATION_DURATIONS,
    DEFAULT_SHARE_SETTINGS,
} from '../../types/sharing'
import { UserList } from '../../types/userLists'

/**
 * Get Firestore document reference for a share link
 */
function getShareDocRef(shareId: string) {
    return doc(db, `shares/${shareId}`)
}

/**
 * Get user's collection from their userCreatedWatchlists array
 *
 * IMPORTANT: Collections are stored in the userCreatedWatchlists array
 * on the user document, NOT in a separate subcollection.
 */
async function getUserCollection(userId: string, collectionId: string): Promise<UserList | null> {
    try {
        const userRef = doc(db, `users/${userId}`)
        const userSnap = await getDoc(userRef)

        if (!userSnap.exists()) {
            return null
        }

        const userData = userSnap.data()
        const collections: UserList[] = userData.userCreatedWatchlists || []

        // Find the collection by ID
        const collection = collections.find((c) => c.id === collectionId)
        return collection || null
    } catch (error) {
        console.error('Error fetching user collection:', error)
        return null
    }
}

/**
 * Update a specific collection in the user's userCreatedWatchlists array
 */
async function updateUserCollection(
    userId: string,
    collectionId: string,
    updates: Partial<UserList>
): Promise<void> {
    const userRef = doc(db, `users/${userId}`)
    const userSnap = await getDoc(userRef)

    if (!userSnap.exists()) {
        throw new Error('User not found')
    }

    const userData = userSnap.data()
    const collections: UserList[] = userData.userCreatedWatchlists || []

    // Find and update the collection
    const updatedCollections = collections.map((c) =>
        c.id === collectionId ? { ...c, ...updates } : c
    )

    await updateDoc(userRef, {
        userCreatedWatchlists: updatedCollections,
    })
}

/**
 * Generate unique share ID
 *
 * Uses nanoid for short, URL-safe IDs (default 12 characters)
 */
function generateShareId(): string {
    return nanoid(12) // e.g., "V1StGXR8_Z5j"
}

/**
 * Validate share ID format
 */
function isValidShareId(shareId: string): boolean {
    if (!shareId || typeof shareId !== 'string') return false

    const len = shareId.length
    if (len < SHARE_CONSTRAINTS.MIN_SHARE_ID_LENGTH) return false
    if (len > SHARE_CONSTRAINTS.MAX_SHARE_ID_LENGTH) return false

    // Only allow alphanumeric, hyphen, and underscore (nanoid safe characters)
    return /^[A-Za-z0-9_-]+$/.test(shareId)
}

/**
 * Check if share link has expired
 */
function isShareExpired(share: ShareableLink): boolean {
    if (!share.expiresAt) return false // Never expires
    return Date.now() > share.expiresAt
}

/**
 * Create a shareable link for a collection
 *
 * @param userId - Owner user ID
 * @param collectionId - Collection to share
 * @param request - Share creation options
 * @returns Created share link with URL
 */
export async function createShareLink(
    userId: string,
    collectionId: string,
    request: CreateShareRequest
): Promise<CreateShareResponse> {
    try {
        // Fetch the collection to get metadata
        const collection = await getUserCollection(userId, collectionId)

        if (!collection) {
            throw new Error('Collection not found')
        }

        // Check user's share limit
        const userShares = await getUserShares(userId)
        const activeShares = userShares.filter((s) => s.isActive)

        if (userShares.length >= SHARE_CONSTRAINTS.MAX_SHARES_PER_USER) {
            throw new Error(
                `Maximum ${SHARE_CONSTRAINTS.MAX_SHARES_PER_USER} shares reached. Delete old shares to create new ones.`
            )
        }

        if (activeShares.length >= SHARE_CONSTRAINTS.MAX_ACTIVE_SHARES) {
            throw new Error(
                `Maximum ${SHARE_CONSTRAINTS.MAX_ACTIVE_SHARES} active shares reached. Deactivate some shares first.`
            )
        }

        // Generate unique share ID
        const shareId = generateShareId()

        // Calculate expiration
        const expiresIn = request.expiresIn || 'never'
        const expirationDuration = SHARE_EXPIRATION_DURATIONS[expiresIn]
        const expiresAt = expirationDuration ? Date.now() + expirationDuration : null

        // Merge settings with defaults
        const settings = {
            ...DEFAULT_SHARE_SETTINGS,
            ...request.settings,
        }

        // Create share link
        const shareLink: ShareableLink = {
            id: shareId,
            collectionId,
            userId,
            collectionName: collection.name,
            itemCount: collection.items.length,
            createdAt: Date.now(),
            expiresAt,
            isActive: true,
            viewCount: 0,
            allowDuplicates: request.allowDuplicates !== false, // Default true
            settings,
        }

        // Save to Firestore
        const shareRef = getShareDocRef(shareId)
        await setDoc(shareRef, shareLink)

        // Update collection with share link reference
        await updateUserCollection(userId, collectionId, {
            sharedLinkId: shareId,
            shareSettings: settings,
        })

        // Generate full URL
        const shareUrl =
            typeof window !== 'undefined'
                ? `${window.location.origin}/shared/${shareId}`
                : `https://nettrailers.com/shared/${shareId}`

        return {
            shareId,
            shareUrl,
            share: shareLink,
        }
    } catch (error) {
        console.error('Error creating share link:', error)
        throw error instanceof Error ? error : new Error('Failed to create share link')
    }
}

/**
 * Get share link by ID with validation
 *
 * @param shareId - Share ID to retrieve
 * @returns Validation result with share data if valid
 */
export async function getShareById(shareId: string): Promise<ShareValidationResult> {
    try {
        // Validate share ID format
        if (!isValidShareId(shareId)) {
            return {
                valid: false,
                error: 'Invalid share link format',
            }
        }

        // Fetch share from Firestore
        const shareRef = getShareDocRef(shareId)
        const shareSnap = await getDoc(shareRef)

        if (!shareSnap.exists()) {
            return {
                valid: false,
                error: 'Share link not found or has been deleted',
            }
        }

        const share = shareSnap.data() as ShareableLink

        // Check if share is active
        if (!share.isActive) {
            return {
                valid: false,
                error: 'This share link has been deactivated by the owner',
            }
        }

        // Check if share has expired
        if (isShareExpired(share)) {
            return {
                valid: false,
                error: 'This share link has expired',
            }
        }

        return {
            valid: true,
            share,
        }
    } catch (error) {
        console.error('Error validating share link:', error)
        return {
            valid: false,
            error: 'Failed to validate share link',
        }
    }
}

/**
 * Get shared collection data for public view
 *
 * @param shareId - Share ID
 * @returns Collection data with owner info (if allowed)
 */
export async function getSharedCollectionData(
    shareId: string
): Promise<SharedCollectionData | null> {
    try {
        // Validate and get share
        const validation = await getShareById(shareId)
        if (!validation.valid || !validation.share) {
            return null
        }

        const share = validation.share

        // Fetch collection data
        const collection = await getUserCollection(share.userId, share.collectionId)

        if (!collection) {
            throw new Error('Collection not found')
        }

        // Get owner name if settings allow
        let ownerName: string | undefined
        if (share.settings.showOwnerName) {
            const userRef = doc(db, `users/${share.userId}`)
            const userSnap = await getDoc(userRef)
            if (userSnap.exists()) {
                const userData = userSnap.data()
                ownerName = userData.displayName || userData.email || 'Anonymous'
            }
        }

        return {
            share,
            contentIds: collection.items.map((item) => item.id),
            ownerName,
            canDuplicate: share.allowDuplicates,
        }
    } catch (error) {
        console.error('Error fetching shared collection data:', error)
        return null
    }
}

/**
 * Increment view count for a share link (with spam prevention)
 *
 * Uses a simple localStorage-based cooldown to prevent spam.
 * Server-side rate limiting should be added for production.
 *
 * @param shareId - Share ID to increment
 */
export async function incrementViewCount(shareId: string): Promise<void> {
    try {
        // Client-side spam prevention
        const viewKey = `share_view_${shareId}`
        const lastView = localStorage.getItem(viewKey)

        if (lastView) {
            const timeSinceLastView = Date.now() - parseInt(lastView, 10)
            if (timeSinceLastView < SHARE_CONSTRAINTS.VIEW_COUNT_COOLDOWN) {
                // Don't increment if within cooldown period
                return
            }
        }

        // Increment view count in Firestore
        const shareRef = getShareDocRef(shareId)
        await updateDoc(shareRef, {
            viewCount: increment(1),
        })

        // Update last view timestamp
        localStorage.setItem(viewKey, Date.now().toString())
    } catch (error) {
        console.error('Error incrementing view count:', error)
        // Don't throw - view count is not critical
    }
}

/**
 * Deactivate a share link (without deleting)
 *
 * @param shareId - Share ID to deactivate
 * @param userId - User ID (must be owner)
 */
export async function deactivateShare(shareId: string, userId: string): Promise<void> {
    try {
        // Fetch share to verify ownership
        const shareRef = getShareDocRef(shareId)
        const shareSnap = await getDoc(shareRef)

        if (!shareSnap.exists()) {
            throw new Error('Share link not found')
        }

        const share = shareSnap.data() as ShareableLink

        // Verify ownership
        if (share.userId !== userId) {
            throw new Error('Only the owner can deactivate this share link')
        }

        // Deactivate
        await updateDoc(shareRef, {
            isActive: false,
        })

        // Remove from collection
        await updateUserCollection(userId, share.collectionId, {
            sharedLinkId: undefined,
        })
    } catch (error) {
        console.error('Error deactivating share:', error)
        throw error instanceof Error ? error : new Error('Failed to deactivate share link')
    }
}

/**
 * Reactivate a previously deactivated share link
 *
 * @param shareId - Share ID to reactivate
 * @param userId - User ID (must be owner)
 */
export async function reactivateShare(shareId: string, userId: string): Promise<void> {
    try {
        const shareRef = getShareDocRef(shareId)
        const shareSnap = await getDoc(shareRef)

        if (!shareSnap.exists()) {
            throw new Error('Share link not found')
        }

        const share = shareSnap.data() as ShareableLink

        // Verify ownership
        if (share.userId !== userId) {
            throw new Error('Only the owner can reactivate this share link')
        }

        // Check expiration
        if (isShareExpired(share)) {
            throw new Error('Cannot reactivate expired share link')
        }

        // Reactivate
        await updateDoc(shareRef, {
            isActive: true,
        })

        // Update collection
        await updateUserCollection(userId, share.collectionId, {
            sharedLinkId: shareId,
        })
    } catch (error) {
        console.error('Error reactivating share:', error)
        throw error instanceof Error ? error : new Error('Failed to reactivate share link')
    }
}

/**
 * Delete a share link permanently
 *
 * @param shareId - Share ID to delete
 * @param userId - User ID (must be owner)
 */
export async function deleteShare(shareId: string, userId: string): Promise<void> {
    try {
        const shareRef = getShareDocRef(shareId)
        const shareSnap = await getDoc(shareRef)

        if (!shareSnap.exists()) {
            throw new Error('Share link not found')
        }

        const share = shareSnap.data() as ShareableLink

        // Verify ownership
        if (share.userId !== userId) {
            throw new Error('Only the owner can delete this share link')
        }

        // Delete from Firestore
        await deleteDoc(shareRef)

        // Remove from collection if it's the active share
        const collection = await getUserCollection(userId, share.collectionId)

        if (collection && collection.sharedLinkId === shareId) {
            await updateUserCollection(userId, share.collectionId, {
                sharedLinkId: undefined,
            })
        }
    } catch (error) {
        console.error('Error deleting share:', error)
        throw error instanceof Error ? error : new Error('Failed to delete share link')
    }
}

/**
 * Get all shares for a user
 *
 * @param userId - User ID
 * @returns Array of user's share links
 */
export async function getUserShares(userId: string): Promise<ShareableLink[]> {
    try {
        const sharesRef = collection(db, 'shares')
        const q = query(sharesRef, where('userId', '==', userId))
        const querySnapshot = await getDocs(q)

        const shares: ShareableLink[] = []
        querySnapshot.forEach((doc) => {
            shares.push(doc.data() as ShareableLink)
        })

        // Sort by creation date (newest first)
        return shares.sort((a, b) => b.createdAt - a.createdAt)
    } catch (error) {
        console.error('Error fetching user shares:', error)
        return []
    }
}

/**
 * Get share statistics for a user
 *
 * @param userId - User ID
 * @returns Share statistics
 */
export async function getShareStats(userId: string): Promise<ShareStats> {
    try {
        const shares = await getUserShares(userId)

        const activeShares = shares.filter((s) => s.isActive)
        const totalViews = shares.reduce((sum, s) => sum + s.viewCount, 0)

        let mostViewedShare: ShareStats['mostViewedShare']
        if (shares.length > 0) {
            const mostViewed = shares.reduce((max, s) => (s.viewCount > max.viewCount ? s : max))
            if (mostViewed.viewCount > 0) {
                mostViewedShare = {
                    shareId: mostViewed.id,
                    collectionName: mostViewed.collectionName,
                    viewCount: mostViewed.viewCount,
                }
            }
        }

        return {
            totalShares: shares.length,
            activeShares: activeShares.length,
            totalViews,
            mostViewedShare,
        }
    } catch (error) {
        console.error('Error calculating share stats:', error)
        return {
            totalShares: 0,
            activeShares: 0,
            totalViews: 0,
        }
    }
}
