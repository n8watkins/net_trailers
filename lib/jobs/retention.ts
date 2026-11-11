/**
 * Page-view retention: signed-in page views (`user_activity` rows of type
 * `view`) are kept for 90 days, then deleted by the weekly collection cache
 * run (lib/jobs/collectionCache.ts). Logins are kept: they are few and the
 * admin pages read them.
 */

import { and, eq, lt } from 'drizzle-orm'

import { db } from '@/db'
import { userActivity } from '@/db/schema'

export const PAGE_VIEW_RETENTION_DAYS = 90

/** Delete page views older than the retention window; returns how many went. */
export async function deleteOldPageViews(now: number = Date.now()): Promise<number> {
    const cutoff = now - PAGE_VIEW_RETENTION_DAYS * 24 * 60 * 60 * 1000
    const result = await db
        .delete(userActivity)
        .where(and(eq(userActivity.type, 'view'), lt(userActivity.timestamp, cutoff)))
    return result.rowsAffected ?? 0
}
