/**
 * Notifications queries (Drizzle / Turso).
 *
 * Replaces the Firestore sub-collection at /users/{userId}/notifications.
 *
 * Ownership rules:
 *  - All reads and mutations derive the user id from the session (via
 *    currentUserId in the calling API route), never from the request body.
 *  - Users can only see and mutate their OWN notifications.
 *
 * Column mapping vs. the Notification TypeScript type:
 *  - id, userId, type, title, message, isRead, createdAt → top-level columns
 *  - everything else (contentId, mediaType, collectionId, shareId, actionUrl,
 *    imageUrl, rankingId, rankingTitle, commenterName, commentText, commentId,
 *    isReply, parentCommentText, likerNames, emailSent, expiresAt) → `data` JSON
 */

import { and, desc, eq, lt, sql } from 'drizzle-orm'

import { db } from '@/db'
import { notifications } from '@/db/schema'
import {
    Notification,
    CreateNotificationRequest,
    NOTIFICATION_CONSTRAINTS,
} from '@/types/notifications'

/* -------------------------------------------------------------------------- */
/*  Internal helpers                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Fields stored in the `data` JSON column.
 * These are all the optional/ancillary fields from the Notification type that
 * don't have dedicated columns in db/schema.ts.
 */
interface NotificationData {
    contentId?: number
    mediaType?: 'movie' | 'tv'
    collectionId?: string
    shareId?: string
    actionUrl?: string
    imageUrl?: string
    expiresAt?: number
    rankingId?: string
    rankingTitle?: string
    commenterName?: string
    commentText?: string
    commentId?: string
    isReply?: boolean
    parentCommentText?: string
    likerNames?: string[]
    emailSent?: boolean
}

/** Convert a raw DB row to the canonical Notification type used by the app. */
function rowToNotification(row: typeof notifications.$inferSelect): Notification {
    const data = (row.data ?? {}) as NotificationData

    return {
        id: row.id,
        userId: row.userId,
        type: row.type as Notification['type'],
        title: row.title ?? '',
        message: row.message ?? '',
        isRead: row.isRead,
        createdAt: row.createdAt,
        // Spread optional fields from the JSON blob
        ...(data.contentId !== undefined && { contentId: data.contentId }),
        ...(data.mediaType !== undefined && { mediaType: data.mediaType }),
        ...(data.collectionId !== undefined && { collectionId: data.collectionId }),
        ...(data.shareId !== undefined && { shareId: data.shareId }),
        ...(data.actionUrl !== undefined && { actionUrl: data.actionUrl }),
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
        ...(data.expiresAt !== undefined && { expiresAt: data.expiresAt }),
        ...(data.rankingId !== undefined && { rankingId: data.rankingId }),
        ...(data.rankingTitle !== undefined && { rankingTitle: data.rankingTitle }),
        ...(data.commenterName !== undefined && { commenterName: data.commenterName }),
        ...(data.commentText !== undefined && { commentText: data.commentText }),
        ...(data.commentId !== undefined && { commentId: data.commentId }),
        ...(data.isReply !== undefined && { isReply: data.isReply }),
        ...(data.parentCommentText !== undefined && {
            parentCommentText: data.parentCommentText,
        }),
        ...(data.likerNames !== undefined && { likerNames: data.likerNames }),
        ...(data.emailSent !== undefined && { emailSent: data.emailSent }),
    }
}

/* -------------------------------------------------------------------------- */
/*  Queries                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * List notifications for a user, newest-first, with offset pagination.
 *
 * @param userId   - Auth session user id (never client-supplied)
 * @param limit    - Page size (default FETCH_LIMIT = 50)
 * @param offset   - Row offset for pagination (default 0)
 */
export async function listNotifications(
    userId: string,
    limit: number = NOTIFICATION_CONSTRAINTS.FETCH_LIMIT,
    offset: number = 0
): Promise<Notification[]> {
    const rows = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt))
        .limit(limit)
        .offset(offset)

    return rows.map(rowToNotification)
}

/**
 * Count unread notifications for a user.
 * Returned as a plain number so the API can send `{ unreadCount: n }`.
 */
export async function getUnreadCount(userId: string): Promise<number> {
    const rows = await db
        .select({ count: sql<number>`count(*)` })
        .from(notifications)
        .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))

    return Number(rows[0]?.count ?? 0)
}

/**
 * Mark a single notification as read.
 * Silently ignores the call if the notification doesn't belong to userId
 * (the WHERE clause ensures ownership).
 */
export async function markOneRead(userId: string, notificationId: string): Promise<void> {
    await db
        .update(notifications)
        .set({ isRead: true })
        .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
}

/**
 * Mark all of a user's notifications as read in a single UPDATE.
 */
export async function markAllRead(userId: string): Promise<void> {
    await db
        .update(notifications)
        .set({ isRead: true })
        .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
}

/**
 * Delete a single notification owned by userId.
 */
export async function deleteOneNotification(userId: string, notificationId: string): Promise<void> {
    await db
        .delete(notifications)
        .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
}

/**
 * Delete all notifications for a user.
 */
export async function deleteAllNotificationsForUser(userId: string): Promise<void> {
    await db.delete(notifications).where(eq(notifications.userId, userId))
}

/**
 * Create a notification for a user.
 *
 * Intended to be called from server-side code only (cron jobs, forum reply
 * handlers, ranking comment handlers, etc.). The caller is responsible for
 * supplying a validated userId — this function does NOT derive it from a
 * session because it may be called on behalf of another user (e.g. cron
 * notifying every user whose watchlist item is trending).
 *
 * @param userId  - The target user (recipient), validated by the caller
 * @param request - Notification content
 * @returns The created Notification row
 */
export async function createNotification(
    userId: string,
    request: CreateNotificationRequest
): Promise<Notification> {
    const now = Date.now()

    const expirationDays = request.expiresIn ?? NOTIFICATION_CONSTRAINTS.DEFAULT_EXPIRATION_DAYS
    const expiresAt = now + expirationDays * 24 * 60 * 60 * 1000

    // Build the JSON data blob from optional fields
    const data: NotificationData = { expiresAt }
    if (request.contentId !== undefined) data.contentId = request.contentId
    if (request.mediaType !== undefined) data.mediaType = request.mediaType
    if (request.collectionId !== undefined) data.collectionId = request.collectionId
    if (request.shareId !== undefined) data.shareId = request.shareId
    if (request.actionUrl !== undefined) data.actionUrl = request.actionUrl
    if (request.imageUrl !== undefined) data.imageUrl = request.imageUrl

    const [inserted] = await db
        .insert(notifications)
        .values({
            userId,
            type: request.type,
            title: request.title,
            message: request.message,
            isRead: false,
            createdAt: now,
            data,
        })
        .returning()

    // Async cleanup — do not await so it doesn't slow down the caller
    pruneOldNotifications(userId).catch((err) =>
        console.error('[Notifications] Background cleanup failed:', err)
    )

    return rowToNotification(inserted)
}

/**
 * Delete notifications older than CLEANUP_THRESHOLD_DAYS or past their
 * expiresAt. Called automatically after createNotification but can also be
 * invoked directly by a cron job.
 *
 * NOTE: expiresAt lives inside the JSON `data` column, so we can only prune
 * by the createdAt column here. An explicit cleanup cron can handle expiresAt
 * if needed; for now we match the Firestore behaviour of pruning by age.
 */
export async function pruneOldNotifications(
    userId: string,
    olderThanDays: number = NOTIFICATION_CONSTRAINTS.CLEANUP_THRESHOLD_DAYS
): Promise<number> {
    const threshold = Date.now() - olderThanDays * 24 * 60 * 60 * 1000

    const result = await db
        .delete(notifications)
        .where(and(eq(notifications.userId, userId), lt(notifications.createdAt, threshold)))

    // libSQL's RunResult has `rowsAffected`
    return (result as unknown as { rowsAffected: number }).rowsAffected ?? 0
}
