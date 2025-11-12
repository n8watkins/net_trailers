/**
 * Notification Firestore Utilities
 *
 * Handles all Firestore operations for in-app notifications:
 * - Create/read/update/delete notifications
 * - Mark as read/unread
 * - Real-time subscription support
 * - Automatic cleanup of old notifications
 */

import { nanoid } from 'nanoid'
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    Timestamp,
    writeBatch,
} from 'firebase/firestore'
import { db } from '../../firebase'
import {
    Notification,
    CreateNotificationRequest,
    NotificationStats,
    NOTIFICATION_CONSTRAINTS,
} from '../../types/notifications'

/**
 * Get Firestore collection reference for user's notifications
 */
function getNotificationsCollection(userId: string) {
    return collection(db, `users/${userId}/notifications`)
}

/**
 * Get Firestore document reference for a notification
 */
function getNotificationDocRef(userId: string, notificationId: string) {
    return doc(db, `users/${userId}/notifications/${notificationId}`)
}

/**
 * Create a new notification for a user
 *
 * @param userId - User ID to create notification for
 * @param request - Notification data
 * @returns Created notification
 */
export async function createNotification(
    userId: string,
    request: CreateNotificationRequest
): Promise<Notification> {
    try {
        const notificationId = nanoid(12)
        const now = Date.now()

        // Calculate expiration
        const expirationDays = request.expiresIn || NOTIFICATION_CONSTRAINTS.DEFAULT_EXPIRATION_DAYS
        const expiresAt = now + expirationDays * 24 * 60 * 60 * 1000

        // Build notification object, only including defined optional fields
        const notification: Notification = {
            id: notificationId,
            userId,
            type: request.type,
            title: request.title,
            message: request.message,
            isRead: false,
            createdAt: now,
            expiresAt,
        }

        // Only add optional fields if they're defined (Firestore doesn't allow undefined)
        if (request.contentId !== undefined) {
            notification.contentId = request.contentId
        }
        if (request.collectionId !== undefined) {
            notification.collectionId = request.collectionId
        }
        if (request.shareId !== undefined) {
            notification.shareId = request.shareId
        }
        if (request.actionUrl !== undefined) {
            notification.actionUrl = request.actionUrl
        }
        if (request.imageUrl !== undefined) {
            notification.imageUrl = request.imageUrl
        }

        const notificationRef = getNotificationDocRef(userId, notificationId)
        await setDoc(notificationRef, notification)

        // Cleanup old notifications (async, don't await)
        cleanupOldNotifications(userId).catch((err) =>
            console.error('Failed to cleanup old notifications:', err)
        )

        return notification
    } catch (error) {
        console.error('Error creating notification:', error)
        throw error instanceof Error ? error : new Error('Failed to create notification')
    }
}

/**
 * Get all notifications for a user
 *
 * @param userId - User ID
 * @param fetchLimit - Maximum notifications to fetch
 * @returns Array of notifications (sorted by createdAt desc)
 */
export async function getAllNotifications(
    userId: string,
    fetchLimit: number = NOTIFICATION_CONSTRAINTS.FETCH_LIMIT
): Promise<Notification[]> {
    try {
        const notificationsRef = getNotificationsCollection(userId)
        const q = query(notificationsRef, orderBy('createdAt', 'desc'), limit(fetchLimit))

        const querySnapshot = await getDocs(q)
        const notifications: Notification[] = []

        querySnapshot.forEach((doc) => {
            notifications.push(doc.data() as Notification)
        })

        return notifications
    } catch (error) {
        console.error('Error fetching notifications:', error)
        return []
    }
}

/**
 * Get unread notifications for a user
 *
 * @param userId - User ID
 * @returns Array of unread notifications
 */
export async function getUnreadNotifications(userId: string): Promise<Notification[]> {
    try {
        const notificationsRef = getNotificationsCollection(userId)
        const q = query(
            notificationsRef,
            where('isRead', '==', false),
            limit(NOTIFICATION_CONSTRAINTS.FETCH_LIMIT)
        )

        const querySnapshot = await getDocs(q)
        const notifications: Notification[] = []

        querySnapshot.forEach((doc) => {
            notifications.push(doc.data() as Notification)
        })

        // Sort locally to keep newest first without needing a composite index
        return notifications.sort((a, b) => b.createdAt - a.createdAt)
    } catch (error) {
        console.error('Error fetching unread notifications:', error)
        return []
    }
}

/**
 * Mark a notification as read
 *
 * @param userId - User ID
 * @param notificationId - Notification ID to mark as read
 */
export async function markAsRead(userId: string, notificationId: string): Promise<void> {
    try {
        const notificationRef = getNotificationDocRef(userId, notificationId)
        await updateDoc(notificationRef, {
            isRead: true,
        })
    } catch (error) {
        console.error('Error marking notification as read:', error)
        throw error instanceof Error ? error : new Error('Failed to mark notification as read')
    }
}

/**
 * Mark all notifications as read
 *
 * @param userId - User ID
 */
export async function markAllAsRead(userId: string): Promise<void> {
    try {
        const unreadNotifications = await getUnreadNotifications(userId)

        // Update all unread notifications in parallel
        const updatePromises = unreadNotifications.map((notification) =>
            markAsRead(userId, notification.id)
        )

        await Promise.all(updatePromises)
    } catch (error) {
        console.error('Error marking all notifications as read:', error)
        throw error instanceof Error ? error : new Error('Failed to mark all notifications as read')
    }
}

/**
 * Delete a notification
 *
 * @param userId - User ID
 * @param notificationId - Notification ID to delete
 */
export async function deleteNotification(userId: string, notificationId: string): Promise<void> {
    try {
        const notificationRef = getNotificationDocRef(userId, notificationId)
        await deleteDoc(notificationRef)
    } catch (error) {
        console.error('Error deleting notification:', error)
        throw error instanceof Error ? error : new Error('Failed to delete notification')
    }
}

/**
 * Delete all notifications for a user
 *
 * @param userId - User ID
 */
export async function deleteAllNotifications(userId: string): Promise<void> {
    try {
        const notifications = await getAllNotifications(userId, 1000) // Get all

        // Use writeBatch for atomic delete operations (max 500 per batch)
        const batches: any[] = []
        const batchSize = 500

        for (let i = 0; i < notifications.length; i += batchSize) {
            const batch = writeBatch(db)
            const batchNotifications = notifications.slice(i, i + batchSize)

            batchNotifications.forEach((notification) => {
                const notificationRef = getNotificationDocRef(userId, notification.id)
                batch.delete(notificationRef)
            })

            batches.push(batch.commit())
        }

        await Promise.all(batches)
    } catch (error) {
        console.error('Error deleting all notifications:', error)
        throw error instanceof Error ? error : new Error('Failed to delete all notifications')
    }
}

/**
 * Delete old notifications (expired or beyond threshold)
 *
 * @param userId - User ID
 * @param olderThanDays - Delete notifications older than this many days
 */
export async function cleanupOldNotifications(
    userId: string,
    olderThanDays: number = NOTIFICATION_CONSTRAINTS.CLEANUP_THRESHOLD_DAYS
): Promise<void> {
    try {
        const notifications = await getAllNotifications(userId, 1000) // Get all
        const now = Date.now()
        const threshold = now - olderThanDays * 24 * 60 * 60 * 1000

        // Find notifications to delete
        const toDelete = notifications.filter((notification) => {
            // Delete if expired
            if (notification.expiresAt && notification.expiresAt < now) {
                return true
            }

            // Delete if older than threshold
            if (notification.createdAt < threshold) {
                return true
            }

            return false
        })

        // Delete in parallel
        const deletePromises = toDelete.map((notification) =>
            deleteNotification(userId, notification.id)
        )

        await Promise.all(deletePromises)

        if (toDelete.length > 0) {
            console.log(`Cleaned up ${toDelete.length} old notifications`)
        }
    } catch (error) {
        console.error('Error cleaning up old notifications:', error)
        // Don't throw - cleanup is not critical
    }
}

/**
 * Get notification statistics for a user
 *
 * @param userId - User ID
 * @returns Notification statistics
 */
export async function getNotificationStats(userId: string): Promise<NotificationStats> {
    try {
        const notifications = await getAllNotifications(userId, 1000) // Get all for stats

        const stats: NotificationStats = {
            total: notifications.length,
            unread: notifications.filter((n) => !n.isRead).length,
            byType: {
                collection_update: notifications.filter((n) => n.type === 'collection_update')
                    .length,
                new_release: notifications.filter((n) => n.type === 'new_release').length,
                share_activity: notifications.filter((n) => n.type === 'share_activity').length,
                trending_update: notifications.filter((n) => n.type === 'trending_update').length,
                system: notifications.filter((n) => n.type === 'system').length,
            },
            mostRecent: notifications.length > 0 ? notifications[0] : undefined,
        }

        return stats
    } catch (error) {
        console.error('Error calculating notification stats:', error)
        return {
            total: 0,
            unread: 0,
            byType: {
                collection_update: 0,
                new_release: 0,
                share_activity: 0,
                trending_update: 0,
                system: 0,
            },
        }
    }
}

/**
 * Subscribe to real-time notification updates
 *
 * @param userId - User ID to subscribe to
 * @param onUpdate - Callback when notifications change
 * @returns Unsubscribe function
 */
export function subscribeToNotifications(
    userId: string,
    onUpdate: (notifications: Notification[]) => void
): () => void {
    try {
        const notificationsRef = getNotificationsCollection(userId)
        const q = query(
            notificationsRef,
            orderBy('createdAt', 'desc'),
            limit(NOTIFICATION_CONSTRAINTS.FETCH_LIMIT)
        )

        const unsubscribe = onSnapshot(
            q,
            (querySnapshot) => {
                const notifications: Notification[] = []
                querySnapshot.forEach((doc) => {
                    notifications.push(doc.data() as Notification)
                })
                onUpdate(notifications)
            },
            (error) => {
                console.error('Error in notification subscription:', error)
                onUpdate([]) // Return empty array on error
            }
        )

        return unsubscribe
    } catch (error) {
        console.error('Error subscribing to notifications:', error)
        return () => {} // Return no-op function
    }
}
