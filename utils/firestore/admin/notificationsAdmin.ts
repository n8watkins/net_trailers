import type { Firestore } from 'firebase-admin/firestore'
import { nanoid } from 'nanoid'
import {
    CreateNotificationRequest,
    Notification,
    NOTIFICATION_CONSTRAINTS,
} from '../../../types/notifications'

/**
 * Server-side notification helper that uses the Firebase Admin SDK.
 */
export async function createNotificationAdmin(
    db: Firestore,
    userId: string,
    request: CreateNotificationRequest
): Promise<Notification> {
    const notificationId = nanoid(12)
    const now = Date.now()

    const expirationDays = request.expiresIn || NOTIFICATION_CONSTRAINTS.DEFAULT_EXPIRATION_DAYS
    const expiresAt = now + expirationDays * 24 * 60 * 60 * 1000

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

    if (request.contentId !== undefined) notification.contentId = request.contentId
    if (request.collectionId !== undefined) notification.collectionId = request.collectionId
    if (request.shareId !== undefined) notification.shareId = request.shareId
    if (request.actionUrl !== undefined) notification.actionUrl = request.actionUrl
    if (request.imageUrl !== undefined) notification.imageUrl = request.imageUrl

    await db
        .collection('users')
        .doc(userId)
        .collection('notifications')
        .doc(notificationId)
        .set(notification)

    return notification
}
