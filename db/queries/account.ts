/**
 * Account deletion — permanently removes a user and ALL of their data.
 *
 * Deletes are explicit (in a transaction) rather than relying on SQLite foreign
 * key cascade, which may not be enabled on libSQL connections.
 */

import { eq, inArray, or } from 'drizzle-orm'

import { db } from '@/db'
import {
    accounts,
    childSafetyPins,
    commentLikes,
    contentReports,
    interactionSummary,
    interactions,
    notifications,
    pollVotes,
    polls,
    profiles,
    rankingComments,
    rankingLikes,
    rankings,
    replyLikes,
    sessions,
    shares,
    signupLog,
    threadLikes,
    threadReplies,
    threads,
    userActivity,
    userBadges,
    userFollows,
    userPreferences,
    users,
    watchHistory,
} from '@/db/schema'

/** Merge two id lists into a deduped array. */
function unique(...lists: string[][]): string[] {
    return [...new Set(lists.flat())]
}

/**
 * Permanently delete a user and every row they own.
 *
 * libSQL doesn't reliably run FK cascade per-request, so deletes are explicit.
 * Crucially, deleting the user's own threads/polls/rankings is NOT enough — it
 * would orphan *other* users' replies/likes/votes/comments that reference those
 * parents. We therefore collect the user's parent ids first and delete every
 * dependent row by parent id (regardless of who authored it), in one
 * transaction.
 */
export async function deleteUserAccount(userId: string): Promise<void> {
    await db.transaction(async (tx) => {
        /* ---------------------------------------------------------------- */
        /*  Forum: threads (+ replies, likes, reply-likes) and polls (+votes) */
        /* ---------------------------------------------------------------- */

        // Threads the user owns, plus every reply living under them (any author),
        // plus the user's own replies on anyone else's threads.
        const ownThreadIds = (
            await tx.select({ id: threads.id }).from(threads).where(eq(threads.userId, userId))
        ).map((r) => r.id)

        const repliesOnOwnThreads = ownThreadIds.length
            ? (
                  await tx
                      .select({ id: threadReplies.id })
                      .from(threadReplies)
                      .where(inArray(threadReplies.threadId, ownThreadIds))
              ).map((r) => r.id)
            : []

        const ownReplyIds = (
            await tx
                .select({ id: threadReplies.id })
                .from(threadReplies)
                .where(eq(threadReplies.userId, userId))
        ).map((r) => r.id)

        const allReplyIds = unique(repliesOnOwnThreads, ownReplyIds)

        // reply-likes: every like on the doomed replies (any user) + this user's
        // likes on replies elsewhere.
        if (allReplyIds.length) {
            await tx.delete(replyLikes).where(inArray(replyLikes.replyId, allReplyIds))
        }
        await tx.delete(replyLikes).where(eq(replyLikes.userId, userId))

        // thread-likes: every like on the user's threads (any user) + this user's
        // likes on threads elsewhere.
        if (ownThreadIds.length) {
            await tx.delete(threadLikes).where(inArray(threadLikes.threadId, ownThreadIds))
        }
        await tx.delete(threadLikes).where(eq(threadLikes.userId, userId))

        // replies themselves, then the threads.
        if (allReplyIds.length) {
            await tx.delete(threadReplies).where(inArray(threadReplies.id, allReplyIds))
        }
        await tx.delete(threads).where(eq(threads.userId, userId))

        // Polls the user owns, plus every vote on them (any voter) + this user's
        // votes on polls elsewhere.
        const ownPollIds = (
            await tx.select({ id: polls.id }).from(polls).where(eq(polls.userId, userId))
        ).map((r) => r.id)

        if (ownPollIds.length) {
            await tx.delete(pollVotes).where(inArray(pollVotes.pollId, ownPollIds))
        }
        await tx.delete(pollVotes).where(eq(pollVotes.userId, userId))
        await tx.delete(polls).where(eq(polls.userId, userId))

        /* ---------------------------------------------------------------- */
        /*  Rankings (+ comments, ranking-likes, comment-likes)              */
        /* ---------------------------------------------------------------- */

        const ownRankingIds = (
            await tx.select({ id: rankings.id }).from(rankings).where(eq(rankings.userId, userId))
        ).map((r) => r.id)

        const commentsOnOwnRankings = ownRankingIds.length
            ? (
                  await tx
                      .select({ id: rankingComments.id })
                      .from(rankingComments)
                      .where(inArray(rankingComments.rankingId, ownRankingIds))
              ).map((r) => r.id)
            : []

        const ownCommentIds = (
            await tx
                .select({ id: rankingComments.id })
                .from(rankingComments)
                .where(eq(rankingComments.userId, userId))
        ).map((r) => r.id)

        const allCommentIds = unique(commentsOnOwnRankings, ownCommentIds)

        // comment-likes: on every doomed comment (any user) + this user's likes.
        if (allCommentIds.length) {
            await tx.delete(commentLikes).where(inArray(commentLikes.commentId, allCommentIds))
        }
        await tx.delete(commentLikes).where(eq(commentLikes.userId, userId))

        // ranking-likes: on the user's rankings (any user) + this user's likes.
        if (ownRankingIds.length) {
            await tx.delete(rankingLikes).where(inArray(rankingLikes.rankingId, ownRankingIds))
        }
        await tx.delete(rankingLikes).where(eq(rankingLikes.userId, userId))

        // comments themselves, then the rankings.
        if (allCommentIds.length) {
            await tx.delete(rankingComments).where(inArray(rankingComments.id, allCommentIds))
        }
        await tx.delete(rankings).where(eq(rankings.userId, userId))

        /* ---------------------------------------------------------------- */
        /*  Remaining user-owned data                                        */
        /* ---------------------------------------------------------------- */
        await tx.delete(notifications).where(eq(notifications.userId, userId))
        await tx.delete(watchHistory).where(eq(watchHistory.userId, userId))
        await tx.delete(interactions).where(eq(interactions.userId, userId))
        await tx.delete(interactionSummary).where(eq(interactionSummary.userId, userId))
        await tx.delete(childSafetyPins).where(eq(childSafetyPins.userId, userId))
        await tx.delete(shares).where(eq(shares.userId, userId))
        await tx.delete(userActivity).where(eq(userActivity.userId, userId))
        await tx.delete(userBadges).where(eq(userBadges.userId, userId))
        await tx
            .delete(userFollows)
            .where(or(eq(userFollows.followerId, userId), eq(userFollows.followingId, userId)))
        await tx.delete(signupLog).where(eq(signupLog.userId, userId))

        // Reports filed by the user are removed; reports they merely *reviewed*
        // are kept but lose the reviewer reference (don't delete others' reports).
        await tx.delete(contentReports).where(eq(contentReports.reportedBy, userId))
        await tx
            .update(contentReports)
            .set({ reviewedBy: null })
            .where(eq(contentReports.reviewedBy, userId))

        await tx.delete(profiles).where(eq(profiles.userId, userId))
        await tx.delete(userPreferences).where(eq(userPreferences.userId, userId))

        // Auth.js adapter rows
        await tx.delete(sessions).where(eq(sessions.userId, userId))
        await tx.delete(accounts).where(eq(accounts.userId, userId))

        // Finally the user
        await tx.delete(users).where(eq(users.id, userId))
    })
}
