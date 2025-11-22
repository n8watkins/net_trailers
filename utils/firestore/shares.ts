/**
 * Collection Sharing - Firestore Utilities (Admin SDK)
 *
 * All share management happens on the server, so this module is implemented
 * with the Firebase Admin SDK to avoid client-authenticated writes.
 */

import { nanoid } from 'nanoid'
import { FieldValue, Firestore } from 'firebase-admin/firestore'
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
import { UserList } from '../../types/collections'

/**
 * Fetch the user's collections array from their document.
 */
async function getUserData(db: Firestore, userId: string) {
    const userRef = db.collection('users').doc(userId)
    const userSnap = await userRef.get()
    return userSnap.exists ? userSnap.data() || {} : null
}

async function getUserCollection(
    db: Firestore,
    userId: string,
    collectionId: string
): Promise<UserList | null> {
    const userData = await getUserData(db, userId)
    if (!userData) return null
    const collections: UserList[] = userData.userCreatedWatchlists || []
    return collections.find((c) => c.id === collectionId) || null
}

async function updateUserCollection(
    db: Firestore,
    userId: string,
    collectionId: string,
    updates: Partial<UserList>
) {
    const userRef = db.collection('users').doc(userId)
    const userData = await getUserData(db, userId)

    if (!userData) {
        throw new Error('User not found')
    }

    const collections: UserList[] = userData.userCreatedWatchlists || []
    const updatedCollections = collections.map((c) =>
        c.id === collectionId ? { ...c, ...updates } : c
    )

    await userRef.update({
        userCreatedWatchlists: updatedCollections,
        lastActive: Date.now(),
    })
}

function isValidShareId(shareId: string): boolean {
    if (!shareId || typeof shareId !== 'string') return false
    const len = shareId.length
    return (
        len >= SHARE_CONSTRAINTS.MIN_SHARE_ID_LENGTH &&
        len <= SHARE_CONSTRAINTS.MAX_SHARE_ID_LENGTH &&
        /^[A-Za-z0-9_-]+$/.test(shareId)
    )
}

function isShareExpired(share: ShareableLink): boolean {
    return !!share.expiresAt && Date.now() > share.expiresAt
}

function resolveShareBaseUrl(): string {
    if (typeof window !== 'undefined' && window.location) {
        return window.location.origin
    }
    const envUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.APP_URL ||
        process.env.VERCEL_URL ||
        process.env.VERCEL_PROJECT_PRODUCTION_URL ||
        ''

    if (envUrl.startsWith('http://') || envUrl.startsWith('https://')) {
        return envUrl.replace(/\/$/, '')
    }

    if (envUrl) {
        return `https://${envUrl}`.replace(/\/$/, '')
    }

    return 'http://localhost:3000'
}

export async function createShareLink(
    db: Firestore,
    userId: string,
    collectionId: string,
    request: CreateShareRequest
): Promise<CreateShareResponse> {
    const collection = await getUserCollection(db, userId, collectionId)
    if (!collection) {
        throw new Error('Collection not found')
    }

    const userShares = await getUserShares(db, userId)
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

    const shareId = nanoid(12)
    const expiresIn = request.expiresIn || 'never'
    const expirationDuration = SHARE_EXPIRATION_DURATIONS[expiresIn]
    const expiresAt = expirationDuration ? Date.now() + expirationDuration : null
    const settings = {
        ...DEFAULT_SHARE_SETTINGS,
        ...request.settings,
    }

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
        allowDuplicates: request.allowDuplicates !== false,
        settings,
    }

    await db.collection('shares').doc(shareId).set(shareLink)
    await updateUserCollection(db, userId, collectionId, {
        sharedLinkId: shareId,
        shareSettings: settings,
    })

    const baseUrl = resolveShareBaseUrl()
    return {
        shareId,
        shareUrl: `${baseUrl}/shared/${shareId}`,
        share: shareLink,
    }
}

export async function getShareById(db: Firestore, shareId: string): Promise<ShareValidationResult> {
    if (!isValidShareId(shareId)) {
        return {
            valid: false,
            error: 'Invalid share link format',
        }
    }

    const shareSnap = await db.collection('shares').doc(shareId).get()
    if (!shareSnap.exists) {
        return {
            valid: false,
            error: 'Share link not found or has been deleted',
        }
    }

    const share = shareSnap.data() as ShareableLink

    if (!share.isActive) {
        return {
            valid: false,
            error: 'This share link has been deactivated by the owner',
        }
    }

    if (isShareExpired(share)) {
        return {
            valid: false,
            error: 'This share link has expired',
        }
    }

    return { valid: true, share }
}

export async function getSharedCollectionData(
    db: Firestore,
    shareId: string
): Promise<SharedCollectionData | null> {
    const validation = await getShareById(db, shareId)
    if (!validation.valid || !validation.share) {
        return null
    }

    const share = validation.share
    const collection = await getUserCollection(db, share.userId, share.collectionId)
    if (!collection) {
        return null
    }

    let ownerName: string | undefined
    if (share.settings.showOwnerName) {
        const userData = await getUserData(db, share.userId)
        if (userData) {
            ownerName = userData.displayName || userData.email || 'Anonymous'
        }
    }

    return {
        share,
        contentIds: collection.items.map((item) => item.id),
        ownerName,
        canDuplicate: share.allowDuplicates,
    }
}

export async function incrementViewCount(db: Firestore, shareId: string): Promise<void> {
    try {
        await db
            .collection('shares')
            .doc(shareId)
            .update({
                viewCount: FieldValue.increment(1),
                lastViewedAt: Date.now(),
            })
    } catch (error) {
        console.error('Error incrementing view count:', error)
    }
}

export async function deactivateShare(db: Firestore, shareId: string, userId: string) {
    const shareRef = db.collection('shares').doc(shareId)
    const shareSnap = await shareRef.get()

    if (!shareSnap.exists) {
        throw new Error('Share link not found')
    }

    const share = shareSnap.data() as ShareableLink
    if (share.userId !== userId) {
        throw new Error('Only the owner can deactivate this share link')
    }

    await shareRef.update({
        isActive: false,
        deactivatedAt: FieldValue.serverTimestamp(),
    })
}

export async function reactivateShare(db: Firestore, shareId: string, userId: string) {
    const shareRef = db.collection('shares').doc(shareId)
    const shareSnap = await shareRef.get()

    if (!shareSnap.exists) {
        throw new Error('Share link not found')
    }

    const share = shareSnap.data() as ShareableLink
    if (share.userId !== userId) {
        throw new Error('Only the owner can activate this share link')
    }

    await shareRef.update({
        isActive: true,
        reactivatedAt: FieldValue.serverTimestamp(),
    })
}

export async function deleteShare(db: Firestore, shareId: string, userId: string) {
    const shareRef = db.collection('shares').doc(shareId)
    const shareSnap = await shareRef.get()

    if (!shareSnap.exists) {
        throw new Error('Share link not found')
    }

    const share = shareSnap.data() as ShareableLink
    if (share.userId !== userId) {
        throw new Error('Only the owner can delete this share link')
    }

    await shareRef.delete()
}

export async function getUserShares(db: Firestore, userId: string): Promise<ShareableLink[]> {
    const snapshot = await db.collection('shares').where('userId', '==', userId).get()
    return snapshot.docs
        .map((docSnap) => docSnap.data() as ShareableLink)
        .sort((a, b) => b.createdAt - a.createdAt)
}

export async function getShareStats(db: Firestore, userId: string): Promise<ShareStats> {
    const shares = await getUserShares(db, userId)
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
}
