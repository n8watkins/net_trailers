/**
 * Server-side notification creator — Turso/Drizzle edition.
 *
 * Previously this module used the Firebase Admin SDK to write directly to
 * Firestore. It now delegates to the shared Drizzle query in
 * db/queries/notifications.ts, which writes to Turso.
 *
 * The public function signature (`createNotificationAdmin`) is preserved so
 * that existing callers (cron routes, ranking comment handlers, etc.) can be
 * migrated incrementally. The `db: Firestore` parameter is no longer needed;
 * it is accepted but ignored so callers that already pass it still compile.
 *
 * MIGRATION NOTE FOR CRON CALLERS:
 *   Old: import { createNotificationAdmin } from '@/utils/firestore/admin/notificationsAdmin'
 *        const db = getAdminDb()
 *        await createNotificationAdmin(db, userId, request)
 *
 *   New (preferred): import { createNotification } from '@/db/queries/notifications'
 *        await createNotification(userId, request)
 *
 *   Existing callers may keep using this wrapper; no behavior change.
 */

import { createNotification as createNotificationDrizzle } from '@/db/queries/notifications'
import { CreateNotificationRequest, Notification } from '../../../types/notifications'

/**
 * Create a notification for a target user from server-side code.
 *
 * @param _db     - Ignored (formerly a Firestore Admin instance). Kept for
 *                  call-site compat. Pass `null` or any value.
 * @param userId  - The recipient user's id (caller-validated).
 * @param request - Notification content.
 * @returns The created Notification row.
 */
export async function createNotificationAdmin(
    _db: unknown,
    userId: string,
    request: CreateNotificationRequest
): Promise<Notification> {
    return createNotificationDrizzle(userId, request)
}
