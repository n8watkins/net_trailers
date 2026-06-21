/**
 * Drizzle query layer — interactions + interaction_summary.
 *
 * Rules enforced here:
 * - userId is always taken from the Auth.js session (via currentUserId) by
 *   the calling API route; this module accepts a validated userId only.
 * - The PIN hash is never returned to the caller.
 * - 90-day pruning matches INTERACTION_CONSTRAINTS.RETENTION_DAYS.
 *
 * Column reference (db/schema.ts):
 *   interactions:        id, userId, contentId(int), mediaType, interactionType,
 *                        genreIds(json number[]), timestamp(int), trailerDuration(int),
 *                        searchQuery, collectionId, source
 *   interaction_summary: userId(pk), totalInteractions(int), genrePreferences(json),
 *                        topContentIds(json number[]), lastUpdated(int)
 */

import { and, desc, eq, lt } from 'drizzle-orm'

import { db } from '@/db'
import { interactions, interactionSummary } from '@/db/schema'
import { now } from '@/db/queries/_helpers'
import {
    type UserInteraction,
    type UserInteractionSummary,
    type GenrePreference,
    type InteractionType,
    INTERACTION_WEIGHTS,
    INTERACTION_CONSTRAINTS,
} from '@/types/interactions'

/* -------------------------------------------------------------------------- */
/*  Record a single interaction                                                */
/* -------------------------------------------------------------------------- */

/**
 * Persist one interaction row and fire-and-forget a summary refresh.
 * Returns the full interaction including the generated id and timestamp.
 */
export async function recordInteraction(
    userId: string,
    payload: Omit<UserInteraction, 'id' | 'timestamp' | 'userId'>
): Promise<UserInteraction> {
    const id = crypto.randomUUID()
    const timestamp = now()

    await db.insert(interactions).values({
        id,
        userId,
        contentId: payload.contentId,
        mediaType: payload.mediaType,
        interactionType: payload.interactionType,
        genreIds: payload.genreIds ?? [],
        timestamp,
        trailerDuration: payload.trailerDuration ?? null,
        searchQuery: payload.searchQuery ?? null,
        collectionId: payload.collectionId ?? null,
        source: payload.source ?? null,
    })

    // Kick off summary refresh asynchronously — never block the caller.
    refreshInteractionSummaryIfNeeded(userId).catch((err) =>
        console.error('[interactions] background summary refresh failed:', err)
    )

    return { id, userId, timestamp, ...payload }
}

/* -------------------------------------------------------------------------- */
/*  Query interactions                                                         */
/* -------------------------------------------------------------------------- */

/** Return the most-recent `limitCount` interactions for a user. */
export async function getRecentInteractions(
    userId: string,
    limitCount = 50
): Promise<UserInteraction[]> {
    const rows = await db
        .select()
        .from(interactions)
        .where(eq(interactions.userId, userId))
        .orderBy(desc(interactions.timestamp))
        .limit(limitCount)

    return rows.map(rowToInteraction)
}

/** Return interactions filtered by type (most recent first). */
export async function getInteractionsByType(
    userId: string,
    interactionType: InteractionType,
    limitCount = 50
): Promise<UserInteraction[]> {
    const rows = await db
        .select()
        .from(interactions)
        .where(
            and(eq(interactions.userId, userId), eq(interactions.interactionType, interactionType))
        )
        .orderBy(desc(interactions.timestamp))
        .limit(limitCount)

    return rows.map(rowToInteraction)
}

/* -------------------------------------------------------------------------- */
/*  Interaction summary                                                        */
/* -------------------------------------------------------------------------- */

/** Read the cached interaction summary row, or null when none exists. */
export async function getInteractionSummary(
    userId: string
): Promise<UserInteractionSummary | null> {
    const rows = await db
        .select()
        .from(interactionSummary)
        .where(eq(interactionSummary.userId, userId))
        .limit(1)

    if (rows.length === 0) return null

    const row = rows[0]
    return {
        userId: row.userId,
        totalInteractions: row.totalInteractions,
        // genrePreferences is stored as raw JSON; cast safely.
        genrePreferences: (row.genrePreferences as GenrePreference[] | null) ?? [],
        topContentIds: row.topContentIds ?? [],
        lastUpdated: row.lastUpdated,
    }
}

/**
 * Recompute the genre preferences and top-content aggregation from raw
 * interaction rows, then upsert into interaction_summary.
 */
export async function calculateAndSaveInteractionSummary(
    userId: string
): Promise<UserInteractionSummary> {
    // Pull the full history up to the per-user maximum.
    const allRows = await db
        .select()
        .from(interactions)
        .where(eq(interactions.userId, userId))
        .orderBy(desc(interactions.timestamp))
        .limit(INTERACTION_CONSTRAINTS.MAX_INTERACTIONS_PER_USER)

    const mapped = allRows.map(rowToInteraction)

    // --- genre preference aggregation ---
    const genreScores: Record<number, { score: number; count: number }> = {}
    for (const ix of mapped) {
        const weight = INTERACTION_WEIGHTS[ix.interactionType as InteractionType] ?? 0
        for (const genreId of ix.genreIds ?? []) {
            if (!genreScores[genreId]) genreScores[genreId] = { score: 0, count: 0 }
            genreScores[genreId].score += weight
            genreScores[genreId].count += 1
        }
    }

    const genrePreferences: GenrePreference[] = Object.entries(genreScores)
        .filter(([, d]) => d.score > 0)
        .map(([id, d]) => ({
            genreId: parseInt(id, 10),
            genreName: GENRE_NAMES[parseInt(id, 10)] ?? 'Unknown',
            score: d.score,
            count: d.count,
        }))
        .sort((a, b) => b.score - a.score)

    // --- top content IDs ---
    const contentCounts: Record<number, number> = {}
    for (const ix of mapped) {
        contentCounts[ix.contentId] = (contentCounts[ix.contentId] ?? 0) + 1
    }
    const topContentIds = Object.entries(contentCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([id]) => parseInt(id, 10))

    const summary: UserInteractionSummary = {
        userId,
        totalInteractions: mapped.length,
        genrePreferences,
        topContentIds,
        lastUpdated: now(),
    }

    await db
        .insert(interactionSummary)
        .values({
            userId,
            totalInteractions: summary.totalInteractions,
            genrePreferences: summary.genrePreferences as unknown as string,
            topContentIds: summary.topContentIds,
            lastUpdated: summary.lastUpdated,
        })
        .onConflictDoUpdate({
            target: interactionSummary.userId,
            set: {
                totalInteractions: summary.totalInteractions,
                genrePreferences: summary.genrePreferences as unknown as string,
                topContentIds: summary.topContentIds,
                lastUpdated: summary.lastUpdated,
            },
        })

    return summary
}

/**
 * Refresh the summary only when it is stale (older than SUMMARY_REFRESH_HOURS).
 * Returns the existing (or freshly computed) summary.
 */
export async function refreshInteractionSummaryIfNeeded(
    userId: string
): Promise<UserInteractionSummary | null> {
    const existing = await getInteractionSummary(userId)
    const threshold = INTERACTION_CONSTRAINTS.SUMMARY_REFRESH_HOURS * 60 * 60 * 1000

    if (existing && now() - existing.lastUpdated < threshold) {
        return existing
    }

    try {
        return await calculateAndSaveInteractionSummary(userId)
    } catch (err) {
        console.error('[interactions] failed to refresh summary:', err)
        return existing
    }
}

/* -------------------------------------------------------------------------- */
/*  90-day pruning                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Delete interaction rows older than `retentionDays` (default 90) for `userId`.
 * Returns the count of deleted rows (SQLite changes()).
 *
 * Called by the cron/update-trending route or a dedicated cleanup cron.
 */
export async function pruneOldInteractions(
    userId: string,
    retentionDays = INTERACTION_CONSTRAINTS.RETENTION_DAYS
): Promise<number> {
    const cutoff = now() - retentionDays * 24 * 60 * 60 * 1000
    const result = await db
        .delete(interactions)
        .where(and(eq(interactions.userId, userId), lt(interactions.timestamp, cutoff)))

    // drizzle-orm/libsql returns rowsAffected on the result object
    return (result as unknown as { rowsAffected: number }).rowsAffected ?? 0
}

/**
 * Prune interactions for ALL users older than `retentionDays`.
 * Intended for scheduled cron jobs (called without a specific userId).
 */
export async function pruneAllUsersOldInteractions(
    retentionDays = INTERACTION_CONSTRAINTS.RETENTION_DAYS
): Promise<number> {
    const cutoff = now() - retentionDays * 24 * 60 * 60 * 1000
    const result = await db.delete(interactions).where(lt(interactions.timestamp, cutoff))

    return (result as unknown as { rowsAffected: number }).rowsAffected ?? 0
}

/* -------------------------------------------------------------------------- */
/*  Internal helpers                                                           */
/* -------------------------------------------------------------------------- */

type InteractionRow = typeof interactions.$inferSelect

function rowToInteraction(row: InteractionRow): UserInteraction {
    return {
        id: row.id,
        userId: row.userId,
        contentId: row.contentId,
        mediaType: row.mediaType as 'movie' | 'tv',
        interactionType: row.interactionType as InteractionType,
        genreIds: (row.genreIds as number[] | null) ?? [],
        timestamp: row.timestamp,
        trailerDuration: row.trailerDuration ?? undefined,
        searchQuery: row.searchQuery ?? undefined,
        collectionId: row.collectionId ?? undefined,
        source: row.source ?? undefined,
    }
}

/** Mirrors the genre map in the original Firestore utils/firestore/interactions.ts. */
const GENRE_NAMES: Record<number, string> = {
    28: 'Action',
    12: 'Adventure',
    16: 'Animation',
    35: 'Comedy',
    80: 'Crime',
    99: 'Documentary',
    18: 'Drama',
    10751: 'Family',
    14: 'Fantasy',
    36: 'History',
    27: 'Horror',
    10402: 'Music',
    9648: 'Mystery',
    10749: 'Romance',
    878: 'Science Fiction',
    10770: 'TV Movie',
    53: 'Thriller',
    10752: 'War',
    37: 'Western',
    10759: 'Action & Adventure',
    10762: 'Kids',
    10763: 'News',
    10764: 'Reality',
    10765: 'Sci-Fi & Fantasy',
    10766: 'Soap',
    10767: 'Talk',
    10768: 'War & Politics',
}
