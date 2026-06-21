/**
 * Server-Side User Data Clearing API
 *
 * Clears ALL user data owned by the authenticated user.
 * Auth is derived from the Auth.js session via withAuth — no Bearer tokens.
 *
 * Clears (in dependency order):
 *  1. userPreferences (reset to defaults)
 *  2. notifications
 *  3. rankings and their associated likes / comments / comment-likes
 *  4. threads, replies, thread-likes, reply-likes
 *  5. polls and poll-votes
 *
 * POST /api/user/clear-data
 */

import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'

import { withAuth } from '@/lib/auth-middleware'
import { db } from '@/db'
import {
    commentLikes,
    pollVotes,
    polls,
    rankingComments,
    rankingLikes,
    rankings,
    replyLikes,
    threadLikes,
    threadReplies,
    threads,
} from '@/db/schema'
import { clearUserPreferences } from '@/db/queries/userPreferences'
import { deleteAllNotificationsForUser } from '@/db/queries/notifications'

async function handleClearData(_request: NextRequest, userId: string): Promise<NextResponse> {
    console.log(`\n[ClearData] Starting full data clear for user: ${userId}\n`)

    try {
        // -----------------------------------------------------------------------
        // 1. Reset user preferences to defaults
        // -----------------------------------------------------------------------
        await clearUserPreferences(userId)
        console.log('[ClearData] userPreferences reset to defaults')

        // -----------------------------------------------------------------------
        // 2. Delete all notifications
        // -----------------------------------------------------------------------
        await deleteAllNotificationsForUser(userId)
        console.log('[ClearData] notifications cleared')

        // -----------------------------------------------------------------------
        // 3. Rankings — delete comment-likes, comments, ranking-likes, then rankings
        //    All in a single transaction to stay consistent.
        // -----------------------------------------------------------------------
        const rankingsDeleted = await db.transaction(async (tx) => {
            // Collect ranking IDs owned by this user
            const userRankings = await tx
                .select({ id: rankings.id })
                .from(rankings)
                .where(eq(rankings.userId, userId))

            const rankingIds = userRankings.map((r) => r.id)

            if (rankingIds.length > 0) {
                // Collect comment IDs so we can delete comment-likes
                const comments = await tx
                    .select({ id: rankingComments.id })
                    .from(rankingComments)
                    .where(eq(rankingComments.rankingId, rankingIds[0]))

                // For multi-row deletes we iterate; SQLite has no native IN-expression
                // limit issue at these expected scales (tens of rankings per user)
                for (const rankingId of rankingIds) {
                    // 3a. Comment likes for comments in this ranking
                    const commentRows = await tx
                        .select({ id: rankingComments.id })
                        .from(rankingComments)
                        .where(eq(rankingComments.rankingId, rankingId))

                    for (const c of commentRows) {
                        await tx.delete(commentLikes).where(eq(commentLikes.commentId, c.id))
                    }

                    // 3b. Comments
                    await tx.delete(rankingComments).where(eq(rankingComments.rankingId, rankingId))

                    // 3c. Ranking likes
                    await tx.delete(rankingLikes).where(eq(rankingLikes.rankingId, rankingId))

                    // 3d. The ranking itself
                    await tx.delete(rankings).where(eq(rankings.id, rankingId))
                }

                void comments // referenced only for type inference above
            }

            return rankingIds.length
        })

        console.log(`[ClearData] rankings cleared: ${rankingsDeleted}`)

        // -----------------------------------------------------------------------
        // 4. Threads — delete reply-likes, replies, thread-likes, then threads
        // -----------------------------------------------------------------------
        const threadsDeleted = await db.transaction(async (tx) => {
            const userThreads = await tx
                .select({ id: threads.id })
                .from(threads)
                .where(eq(threads.userId, userId))

            const threadIds = userThreads.map((t) => t.id)

            for (const threadId of threadIds) {
                // 4a. Reply likes for all replies in this thread
                const replyRows = await tx
                    .select({ id: threadReplies.id })
                    .from(threadReplies)
                    .where(eq(threadReplies.threadId, threadId))

                for (const r of replyRows) {
                    await tx.delete(replyLikes).where(eq(replyLikes.replyId, r.id))
                }

                // 4b. Replies
                await tx.delete(threadReplies).where(eq(threadReplies.threadId, threadId))

                // 4c. Thread likes
                await tx.delete(threadLikes).where(eq(threadLikes.threadId, threadId))

                // 4d. Thread itself
                await tx.delete(threads).where(eq(threads.id, threadId))
            }

            return threadIds.length
        })

        console.log(`[ClearData] threads cleared: ${threadsDeleted}`)

        // -----------------------------------------------------------------------
        // 5. Polls — delete votes then polls
        // -----------------------------------------------------------------------
        const pollsDeleted = await db.transaction(async (tx) => {
            const userPolls = await tx
                .select({ id: polls.id })
                .from(polls)
                .where(eq(polls.userId, userId))

            const pollIds = userPolls.map((p) => p.id)

            for (const pollId of pollIds) {
                await tx.delete(pollVotes).where(eq(pollVotes.pollId, pollId))
                await tx.delete(polls).where(eq(polls.id, pollId))
            }

            return pollIds.length
        })

        console.log(`[ClearData] polls cleared: ${pollsDeleted}`)

        const result = {
            success: true,
            message: 'All user data cleared successfully',
            deleted: {
                preferencesReset: true,
                rankings: rankingsDeleted,
                threads: threadsDeleted,
                polls: pollsDeleted,
                notificationsCleared: true,
            },
        }

        console.log('[ClearData] Complete:', JSON.stringify(result))
        return NextResponse.json(result)
    } catch (error) {
        console.error('[ClearData] Error:', error)
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Failed to clear user data',
            },
            { status: 500 }
        )
    }
}

export const POST = withAuth(handleClearData)
