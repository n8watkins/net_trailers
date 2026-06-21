/**
 * Drizzle query layer — watch_history table.
 *
 * Column reference (db/schema.ts):
 *   watch_history: id, userId, contentId(int), mediaType, watchedAt(int),
 *                  content(json Content)
 *
 * Public-read semantics: a viewer may fetch another user's history only when
 * the owner has enabled showWatchHistory in their profile visibility settings.
 * That visibility check is enforced at the API route layer (not here) to keep
 * this module agnostic of the profiles table.
 */

import { and, desc, eq } from 'drizzle-orm'

import { db } from '@/db'
import { watchHistory } from '@/db/schema'
import { now } from '@/db/queries/_helpers'
import type { WatchHistoryEntry } from '@/types/watchHistory'
import type { Content } from '@/typings'

/* -------------------------------------------------------------------------- */
/*  Write operations                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Upsert a watch history entry.
 *
 * If a row with the same (userId, contentId, mediaType) already exists it is
 * updated in-place (watchedAt refreshed, content snapshot refreshed). This
 * mirrors the Firestore transaction behaviour in the old watchHistory utility.
 *
 * SQLite does not support multi-column conflict targets in `onConflictDoUpdate`
 * via Drizzle unless a unique index exists. The table has a plain PK (`id`), so
 * we do an explicit SELECT + INSERT/UPDATE instead.
 */
export async function addWatchEntry(
    userId: string,
    contentId: number,
    mediaType: 'movie' | 'tv',
    content: Content
): Promise<WatchHistoryEntry> {
    const watchedAt = now()

    // Check for an existing row for this (user, content, mediaType) triple.
    const existing = await db
        .select({ id: watchHistory.id })
        .from(watchHistory)
        .where(
            and(
                eq(watchHistory.userId, userId),
                eq(watchHistory.contentId, contentId),
                eq(watchHistory.mediaType, mediaType)
            )
        )
        .limit(1)

    let id: string

    if (existing.length > 0) {
        // Update the existing row.
        id = existing[0].id
        await db.update(watchHistory).set({ watchedAt, content }).where(eq(watchHistory.id, id))
    } else {
        // Insert a new row.
        id = crypto.randomUUID()
        await db.insert(watchHistory).values({
            id,
            userId,
            contentId,
            mediaType,
            watchedAt,
            content,
        })
    }

    return { id, contentId, mediaType, watchedAt, content }
}

/* -------------------------------------------------------------------------- */
/*  Read operations                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Return a user's watch history sorted most-recent first.
 *
 * The `limitCount` cap (default 500) matches the old Firestore utility's
 * safety limit. Callers can lower it for paginated views.
 */
export async function listWatchHistory(
    userId: string,
    limitCount = 500
): Promise<WatchHistoryEntry[]> {
    const rows = await db
        .select()
        .from(watchHistory)
        .where(eq(watchHistory.userId, userId))
        .orderBy(desc(watchHistory.watchedAt))
        .limit(limitCount)

    return rows.map(rowToEntry)
}

/**
 * Look up a single watch history entry by (contentId, mediaType) for a user.
 * Returns null when not found.
 */
export async function getWatchEntry(
    userId: string,
    contentId: number,
    mediaType: 'movie' | 'tv'
): Promise<WatchHistoryEntry | null> {
    const rows = await db
        .select()
        .from(watchHistory)
        .where(
            and(
                eq(watchHistory.userId, userId),
                eq(watchHistory.contentId, contentId),
                eq(watchHistory.mediaType, mediaType)
            )
        )
        .limit(1)

    return rows.length > 0 ? rowToEntry(rows[0]) : null
}

/* -------------------------------------------------------------------------- */
/*  Delete operations                                                          */
/* -------------------------------------------------------------------------- */

/** Delete a specific watch history entry by its UUID. */
export async function deleteWatchEntry(userId: string, entryId: string): Promise<void> {
    // Scope by userId so a user can only delete their own rows.
    await db
        .delete(watchHistory)
        .where(and(eq(watchHistory.userId, userId), eq(watchHistory.id, entryId)))
}

/** Delete ALL watch history rows for a user. */
export async function clearWatchHistory(userId: string): Promise<void> {
    await db.delete(watchHistory).where(eq(watchHistory.userId, userId))
}

/* -------------------------------------------------------------------------- */
/*  Internal helper                                                            */
/* -------------------------------------------------------------------------- */

type WatchHistoryRow = typeof watchHistory.$inferSelect

function rowToEntry(row: WatchHistoryRow): WatchHistoryEntry {
    return {
        id: row.id,
        contentId: row.contentId,
        mediaType: row.mediaType as 'movie' | 'tv',
        watchedAt: row.watchedAt,
        content: row.content as Content,
    }
}
