/**
 * Ranking comments Drizzle query module.
 *
 * Replaces utils/firestore/rankingComments.ts. Firestore primitives mapped:
 *   - increment()      → sql`${col} + 1` / sql`MAX(0, ${col} - 1)`
 *   - arrayUnion()     → JSON column read-modify-write in a transaction
 *   - runTransaction() → db.transaction()
 *
 * The Firestore module embedded replies as a `replies?: RankingComment[]` array
 * inside the parent comment document. This module preserves that exact shape —
 * replies are stored in the same `ranking_comments` row's JSON `text` column
 * via the `parentCommentId` FK pattern, and the parent row also carries an
 * embedded `replies` array (stored in the `text` column's JSON — see note
 * below).
 *
 * NOTE ON REPLIES EMBEDDING
 * The schema stores each reply as its own `ranking_comments` row (parentCommentId
 * non-null), but the parent row does NOT have a dedicated JSON column for
 * embedded replies — that was a Firestore-only trick. In SQLite we reconstruct
 * the `replies` array at query time by joining child rows.
 *
 * getRankingComments() therefore returns top-level comments only and attaches
 * their direct child rows as the `replies` field, matching the
 * `RankingComment.replies?: RankingComment[]` type that the UI expects.
 */

import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm'

import { db } from '@/db'
import { commentLikes, rankingComments, rankings } from '@/db/schema'
import {
    RANKING_CONSTRAINTS,
    type CreateCommentRequest,
    type RankingComment,
} from '@/types/rankings'

/* -------------------------------------------------------------------------- */
/*  Internal helpers                                                           */
/* -------------------------------------------------------------------------- */

/** Map a raw DB row to the RankingComment domain type (without replies). */
function rowToComment(row: typeof rankingComments.$inferSelect): RankingComment {
    return {
        id: row.id,
        rankingId: row.rankingId,
        userId: row.userId,
        userName: row.userName ?? '',
        userAvatar: row.userAvatar ?? null,
        type: (row.type as 'ranking' | 'position') ?? 'ranking',
        positionNumber: row.positionNumber ?? null,
        text: row.text,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt ?? undefined,
        likes: row.likes,
        parentCommentId: row.parentCommentId ?? null,
    }
}

/* -------------------------------------------------------------------------- */
/*  Comments CRUD                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Create a new comment or reply.
 *
 * When parentCommentId is supplied this is a reply. The function enforces:
 *  - Max one level of nesting (replies cannot have replies)
 *  - Max RANKING_CONSTRAINTS.MAX_REPLIES_PER_COMMENT replies per parent
 *  - Ranking comment counter is incremented atomically
 *
 * Returns the newly created RankingComment (without replies field since it is
 * a new comment).
 */
export async function createComment(
    userId: string,
    username: string,
    userAvatar: string | undefined,
    request: CreateCommentRequest
): Promise<RankingComment> {
    const ts = Date.now()

    const inserted = await db.transaction(async (tx) => {
        // ---- Validate parent comment (replies only) ----
        if (request.parentCommentId) {
            const parent = await tx
                .select({
                    id: rankingComments.id,
                    parentCommentId: rankingComments.parentCommentId,
                })
                .from(rankingComments)
                .where(eq(rankingComments.id, request.parentCommentId))
                .limit(1)

            if (parent.length === 0) {
                throw new Error(`Parent comment not found: ${request.parentCommentId}`)
            }
            if (parent[0].parentCommentId) {
                throw new Error('Cannot reply to a reply. Only one level of replies is supported.')
            }

            // Check reply limit
            const replyCountRows = await tx
                .select({ count: sql<number>`count(*)` })
                .from(rankingComments)
                .where(eq(rankingComments.parentCommentId, request.parentCommentId))

            const replyCount = replyCountRows[0]?.count ?? 0
            if (replyCount >= RANKING_CONSTRAINTS.MAX_REPLIES_PER_COMMENT) {
                throw new Error(
                    `Comment has reached the maximum of ${RANKING_CONSTRAINTS.MAX_REPLIES_PER_COMMENT} replies.`
                )
            }
        }

        // ---- Insert comment row ----
        const rows = await tx
            .insert(rankingComments)
            .values({
                rankingId: request.rankingId,
                userId,
                userName: username,
                userAvatar: userAvatar ?? null,
                type: request.type,
                positionNumber: request.positionNumber ?? null,
                text: request.text,
                parentCommentId: request.parentCommentId ?? null,
                likes: 0,
                createdAt: ts,
            })
            .returning()

        // ---- Increment ranking comment count ----
        await tx
            .update(rankings)
            .set({ comments: sql`${rankings.comments} + 1` })
            .where(eq(rankings.id, request.rankingId))

        return rows[0]
    })

    return rowToComment(inserted)
}

/**
 * Fetch top-level comments for a ranking with their replies attached.
 *
 * Mirrors getRankingComments() — fetches `limit` top-level comments ordered
 * newest-first, then fetches all replies for those comments in a second query
 * and attaches them (oldest-first to match chronological reply order).
 *
 * Returns { data, hasMore } for offset-based pagination.
 */
export async function getRankingComments(
    rankingId: string,
    limitCount: number = 50,
    offset: number = 0
): Promise<{ data: RankingComment[]; hasMore: boolean }> {
    // Fetch top-level comments (parentCommentId IS NULL)
    const topLevelRows = await db
        .select()
        .from(rankingComments)
        .where(
            and(eq(rankingComments.rankingId, rankingId), isNull(rankingComments.parentCommentId))
        )
        .orderBy(desc(rankingComments.createdAt))
        .limit(limitCount + 1)
        .offset(offset)

    const hasMore = topLevelRows.length > limitCount
    const pageRows = topLevelRows.slice(0, limitCount)

    if (pageRows.length === 0) {
        return { data: [], hasMore }
    }

    // Fetch all replies for these comments in a single query
    const parentIds = pageRows.map((r) => r.id)
    const replyRows = await db
        .select()
        .from(rankingComments)
        .where(inArray(rankingComments.parentCommentId, parentIds))
        .orderBy(asc(rankingComments.createdAt))

    // Group replies by parentCommentId
    const repliesByParent = new Map<string, RankingComment[]>()
    for (const reply of replyRows) {
        const parentId = reply.parentCommentId!
        if (!repliesByParent.has(parentId)) {
            repliesByParent.set(parentId, [])
        }
        repliesByParent.get(parentId)!.push(rowToComment(reply))
    }

    // Assemble result
    const data: RankingComment[] = pageRows.map((row) => {
        const comment = rowToComment(row)
        const replies = repliesByParent.get(row.id)
        if (replies && replies.length > 0) {
            comment.replies = replies
        }
        return comment
    })

    return { data, hasMore }
}

/**
 * Fetch comments for a specific ranked position in a ranking.
 * Mirrors getPositionComments().
 */
export async function getPositionComments(
    rankingId: string,
    position: number,
    limitCount: number = 50,
    offset: number = 0
): Promise<{ data: RankingComment[]; hasMore: boolean }> {
    const rows = await db
        .select()
        .from(rankingComments)
        .where(
            and(
                eq(rankingComments.rankingId, rankingId),
                eq(rankingComments.type, 'position'),
                sql`${rankingComments.positionNumber} = ${position}`,
                isNull(rankingComments.parentCommentId)
            )
        )
        .orderBy(desc(rankingComments.createdAt))
        .limit(limitCount + 1)
        .offset(offset)

    const hasMore = rows.length > limitCount
    return { data: rows.slice(0, limitCount).map(rowToComment), hasMore }
}

/**
 * Delete a comment.
 *
 * Permitted when:
 *  - The caller is the comment author, OR
 *  - The caller is the ranking owner (rankingOwnerId)
 *
 * When deleting a top-level comment all its reply rows are also deleted.
 * The ranking's `comments` counter is decremented by the total rows removed.
 */
export async function deleteComment(userId: string, commentId: string): Promise<void> {
    await db.transaction(async (tx) => {
        // Fetch comment to verify existence + ownership
        const commentRows = await tx
            .select()
            .from(rankingComments)
            .where(eq(rankingComments.id, commentId))
            .limit(1)

        if (commentRows.length === 0) {
            throw new Error(`Comment not found: ${commentId}`)
        }

        const comment = commentRows[0]

        // The ranking owner may also delete comments — look up the REAL owner
        // server-side (never trust a client-supplied id).
        const rankingRows = await tx
            .select({ userId: rankings.userId })
            .from(rankings)
            .where(eq(rankings.id, comment.rankingId))
            .limit(1)
        const rankingOwnerId = rankingRows[0]?.userId

        if (comment.userId !== userId && rankingOwnerId !== userId) {
            throw new Error('Unauthorized: you cannot delete this comment')
        }

        let deletedCount = 1 // The comment itself

        // If it's a top-level comment, delete all replies first
        if (!comment.parentCommentId) {
            const replies = await tx
                .delete(rankingComments)
                .where(eq(rankingComments.parentCommentId, commentId))
                .returning({ id: rankingComments.id })
            deletedCount += replies.length

            // Also delete comment likes for the replies
            if (replies.length > 0) {
                const replyIds = replies.map((r) => r.id)
                await tx.delete(commentLikes).where(inArray(commentLikes.commentId, replyIds))
            }
        }

        // Delete comment likes for the comment itself
        await tx.delete(commentLikes).where(eq(commentLikes.commentId, commentId))

        // Delete the comment
        await tx.delete(rankingComments).where(eq(rankingComments.id, commentId))

        // Decrement ranking comment count (floor 0)
        await tx
            .update(rankings)
            .set({
                comments: sql`MAX(0, ${rankings.comments} - ${deletedCount})`,
            })
            .where(eq(rankings.id, comment.rankingId))
    })
}

/* -------------------------------------------------------------------------- */
/*  Comment likes                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Like a comment.
 * Returns true if the like was newly added, false if already liked.
 */
export async function likeComment(userId: string, commentId: string): Promise<boolean> {
    return await db.transaction(async (tx) => {
        // Insert-or-noop on the unique (commentId, userId) index — race-safe;
        // the counter is bumped only when a new like row was inserted.
        const inserted = await tx
            .insert(commentLikes)
            .values({ commentId, userId, createdAt: Date.now() })
            .onConflictDoNothing()
            .returning({ id: commentLikes.id })

        if (inserted.length === 0) {
            return false // Already liked
        }

        await tx
            .update(rankingComments)
            .set({ likes: sql`${rankingComments.likes} + 1` })
            .where(eq(rankingComments.id, commentId))

        return true
    })
}

/**
 * Unlike a comment.
 * Returns true when the unlike was applied, false if no like existed.
 */
export async function unlikeComment(userId: string, commentId: string): Promise<boolean> {
    return await db.transaction(async (tx) => {
        const existing = await tx
            .select({ id: commentLikes.id })
            .from(commentLikes)
            .where(and(eq(commentLikes.userId, userId), eq(commentLikes.commentId, commentId)))
            .limit(1)

        if (existing.length === 0) {
            return false // Not liked
        }

        await tx
            .delete(commentLikes)
            .where(and(eq(commentLikes.userId, userId), eq(commentLikes.commentId, commentId)))

        await tx
            .update(rankingComments)
            .set({ likes: sql`MAX(0, ${rankingComments.likes} - 1)` })
            .where(eq(rankingComments.id, commentId))

        return true
    })
}

/** Check whether a user has liked a specific comment. */
export async function hasUserLikedComment(userId: string, commentId: string): Promise<boolean> {
    const rows = await db
        .select({ id: commentLikes.id })
        .from(commentLikes)
        .where(and(eq(commentLikes.userId, userId), eq(commentLikes.commentId, commentId)))
        .limit(1)

    return rows.length > 0
}

/* -------------------------------------------------------------------------- */
/*  Username denormalisation                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Get all top-level comments authored by a specific user (no replies embedded).
 * Replaces getUserComments() from utils/firestore/rankingComments.
 */
export async function getUserComments(
    userId: string,
    limit = 50
): Promise<{ data: RankingComment[]; hasMore: boolean }> {
    const rows = await db
        .select()
        .from(rankingComments)
        .where(and(eq(rankingComments.userId, userId), isNull(rankingComments.parentCommentId)))
        .orderBy(desc(rankingComments.createdAt))
        .limit(limit + 1)

    const hasMore = rows.length > limit
    const data = rows.slice(0, limit).map(rowToComment)

    return { data, hasMore }
}

/**
 * Update the denormalised userName across all comments authored by a user.
 * Mirrors updateRankingCommentsUsername() in the old Firestore module.
 */
export async function updateRankingCommentsUsername(
    userId: string,
    newDisplayName: string
): Promise<void> {
    await db
        .update(rankingComments)
        .set({ userName: newDisplayName })
        .where(eq(rankingComments.userId, userId))
}
