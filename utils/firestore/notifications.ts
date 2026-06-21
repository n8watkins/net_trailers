/**
 * Notification client utilities — Turso/Drizzle edition.
 *
 * Previously this module wrapped Firestore client SDK calls. It now calls the
 * REST API routes under /api/notifications/*, which in turn hit the Turso DB
 * via db/queries/notifications.ts.
 *
 * PUBLIC SURFACE: every function that was exported before is still exported
 * with the same signature so that stores/notificationStore.ts and any other
 * callers continue to compile without changes.
 *
 * NOTE: `subscribeToNotifications` previously used a Firestore onSnapshot
 * listener for real-time updates. It now polls GET /api/notifications on a
 * 30-second interval and invokes the same `onUpdate` callback. The returned
 * unsubscribe function cancels the interval (identical contract to before).
 */

import { authenticatedFetch } from '@/lib/authenticatedFetch'
import {
    Notification,
    CreateNotificationRequest,
    NotificationStats,
    NOTIFICATION_CONSTRAINTS,
} from '../../types/notifications'
import { PaginatedResult, createPaginatedResult } from '../../types/pagination'

/* -------------------------------------------------------------------------- */
/*  Internal fetch helpers                                                     */
/* -------------------------------------------------------------------------- */

/** Polling interval for subscribeToNotifications (ms). */
const POLL_INTERVAL_MS = 30_000

async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
    return authenticatedFetch(path, init)
}

/** POST helper with JSON body. */
async function apiPost(path: string, body: unknown): Promise<Response> {
    return apiFetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    })
}

/* -------------------------------------------------------------------------- */
/*  Public API — mirroring the old Firestore module exactly                   */
/* -------------------------------------------------------------------------- */

/**
 * Create a notification (client-side path, used by the store's
 * createNotification action). The actual DB write is done server-side via the
 * API — this function posts to a dedicated route.
 *
 * NOTE: In the Turso architecture, notifications are typically created by
 * server-side code (cron jobs, ranking comment handlers, etc.) via
 * db/queries/notifications.ts createNotification(). The client-side creation
 * path is kept for backward-compat with the store but routes through the
 * server endpoint.
 */
export async function createNotification(
    userId: string,
    request: CreateNotificationRequest
): Promise<Notification> {
    const res = await apiPost('/api/notifications/create', { userId, ...request })

    if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`Failed to create notification (${res.status}): ${text}`)
    }

    const json = (await res.json()) as { success: boolean; notification: Notification }
    return json.notification
}

/**
 * Fetch all notifications for the authenticated user (paginated).
 *
 * The `startAfterDoc` parameter was a Firestore cursor — it is no longer used;
 * callers that passed it will simply get the first page. For true pagination use
 * the offset-based parameters of listNotifications in the query layer.
 */
export async function getAllNotifications(
    _userId: string,
    fetchLimit: number = NOTIFICATION_CONSTRAINTS.FETCH_LIMIT,
    _startAfterDoc?: unknown
): Promise<PaginatedResult<Notification>> {
    try {
        const res = await apiFetch(`/api/notifications?limit=${fetchLimit}&offset=0`)

        if (!res.ok) {
            console.error('[Notifications] getAllNotifications failed:', res.status)
            return createPaginatedResult([], null, fetchLimit)
        }

        const json = (await res.json()) as {
            success: boolean
            notifications: Notification[]
            unreadCount: number
        }

        return createPaginatedResult(json.notifications, null, fetchLimit)
    } catch (error) {
        console.error('[Notifications] getAllNotifications error:', error)
        return createPaginatedResult([], null, fetchLimit)
    }
}

/**
 * Fetch unread notifications for the authenticated user.
 * Filters the list response client-side (avoids a separate API endpoint).
 */
export async function getUnreadNotifications(
    userId: string,
    fetchLimit: number = NOTIFICATION_CONSTRAINTS.FETCH_LIMIT,
    startAfterDoc?: unknown
): Promise<PaginatedResult<Notification>> {
    const result = await getAllNotifications(userId, fetchLimit, startAfterDoc)
    const unread = result.data.filter((n) => !n.isRead)
    return createPaginatedResult(unread, null, fetchLimit)
}

/**
 * Mark a single notification as read.
 */
export async function markAsRead(userId: string, notificationId: string): Promise<void> {
    const res = await apiPost('/api/notifications/mark-read', { notificationId })

    if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`Failed to mark notification as read (${res.status}): ${text}`)
    }
}

/**
 * Mark all notifications as read.
 */
export async function markAllAsRead(_userId: string): Promise<void> {
    const res = await apiPost('/api/notifications/mark-all-read', {})

    if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`Failed to mark all notifications as read (${res.status}): ${text}`)
    }
}

/**
 * Delete a single notification.
 */
export async function deleteNotification(_userId: string, notificationId: string): Promise<void> {
    const res = await apiFetch(`/api/notifications/${encodeURIComponent(notificationId)}`, {
        method: 'DELETE',
    })

    if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`Failed to delete notification (${res.status}): ${text}`)
    }
}

/**
 * Delete all notifications for the authenticated user.
 */
export async function deleteAllNotifications(_userId: string): Promise<void> {
    const res = await apiFetch('/api/notifications', { method: 'DELETE' })

    if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`Failed to delete all notifications (${res.status}): ${text}`)
    }
}

/**
 * Compute notification statistics from a local list of notifications.
 * (Previously this made a separate Firestore query; now derived client-side.)
 */
export async function getNotificationStats(userId: string): Promise<NotificationStats> {
    try {
        const result = await getAllNotifications(userId, 1000)
        const list = result.data

        return {
            total: list.length,
            unread: list.filter((n) => !n.isRead).length,
            byType: {
                collection_update: list.filter((n) => n.type === 'collection_update').length,
                new_release: list.filter((n) => n.type === 'new_release').length,
                trending_update: list.filter((n) => n.type === 'trending_update').length,
                system: list.filter((n) => n.type === 'system').length,
                ranking_comment: list.filter((n) => n.type === 'ranking_comment').length,
                ranking_like: list.filter((n) => n.type === 'ranking_like').length,
            },
            mostRecent: list.length > 0 ? list[0] : undefined,
        }
    } catch (error) {
        console.error('[Notifications] getNotificationStats error:', error)
        return {
            total: 0,
            unread: 0,
            byType: {
                collection_update: 0,
                new_release: 0,
                trending_update: 0,
                system: 0,
                ranking_comment: 0,
                ranking_like: 0,
            },
        }
    }
}

/**
 * Subscribe to notification updates via polling.
 *
 * Replaces the Firestore onSnapshot listener with a setInterval that calls
 * GET /api/notifications every POLL_INTERVAL_MS (30 s). The callback signature
 * and the returned unsubscribe function are identical to the old implementation
 * so stores/notificationStore.ts requires no changes.
 *
 * @param userId   - Authenticated user id (used only for the guard check; the
 *                   actual session cookie is what the API trusts).
 * @param onUpdate - Called immediately with the first poll result, then on
 *                   every subsequent interval tick.
 * @returns Unsubscribe function — call it to stop polling.
 */
export function subscribeToNotifications(
    userId: string,
    onUpdate: (notifications: Notification[]) => void
): () => void {
    if (!userId) {
        // No user — return a no-op immediately, same as old Firestore path
        return () => {}
    }

    let cancelled = false

    async function poll() {
        if (cancelled) return

        try {
            const res = await apiFetch(
                `/api/notifications?limit=${NOTIFICATION_CONSTRAINTS.FETCH_LIMIT}&offset=0`
            )

            if (cancelled) return // Guard against late response after unsubscribe

            if (!res.ok) {
                // Non-fatal — keep polling; the store will retain stale data
                console.error('[Notifications] Poll failed:', res.status)
                return
            }

            const json = (await res.json()) as {
                success: boolean
                notifications: Notification[]
            }

            if (!cancelled) {
                onUpdate(json.notifications)
            }
        } catch (error) {
            if (!cancelled) {
                console.error('[Notifications] Poll error:', error)
                // Do not invoke onUpdate([]) — keep showing stale data rather
                // than wiping the notification list on a transient network error.
            }
        }
    }

    // Fire the first poll immediately so the UI gets data without waiting 30 s
    poll()

    const intervalId = setInterval(poll, POLL_INTERVAL_MS)

    return () => {
        cancelled = true
        clearInterval(intervalId)
    }
}

/* -------------------------------------------------------------------------- */
/*  Cleanup utility (kept for cron lane parity)                               */
/* -------------------------------------------------------------------------- */

/**
 * Clean up old notifications client-side. In the Turso architecture the real
 * cleanup is handled server-side by pruneOldNotifications in
 * db/queries/notifications.ts (called automatically after createNotification
 * and available for cron jobs). This client-side stub is kept so any callers
 * that imported it continue to compile.
 */
export async function cleanupOldNotifications(
    _userId: string,
    _olderThanDays?: number
): Promise<void> {
    // No-op on the client — pruning is handled by the server query layer.
}
