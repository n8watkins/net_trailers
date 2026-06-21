/**
 * Account deletion — permanently removes a user and ALL of their data.
 *
 * Deletes are explicit (in a transaction) rather than relying on SQLite foreign
 * key cascade, which may not be enabled on libSQL connections.
 */

import { eq, or } from 'drizzle-orm'

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

/** Permanently delete a user and every row they own. */
export async function deleteUserAccount(userId: string): Promise<void> {
    await db.transaction(async (tx) => {
        // Forum
        await tx.delete(pollVotes).where(eq(pollVotes.userId, userId))
        await tx.delete(polls).where(eq(polls.userId, userId))
        await tx.delete(replyLikes).where(eq(replyLikes.userId, userId))
        await tx.delete(threadLikes).where(eq(threadLikes.userId, userId))
        await tx.delete(threadReplies).where(eq(threadReplies.userId, userId))
        await tx.delete(threads).where(eq(threads.userId, userId))

        // Rankings
        await tx.delete(commentLikes).where(eq(commentLikes.userId, userId))
        await tx.delete(rankingLikes).where(eq(rankingLikes.userId, userId))
        await tx.delete(rankingComments).where(eq(rankingComments.userId, userId))
        await tx.delete(rankings).where(eq(rankings.userId, userId))

        // User data
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
        await tx.delete(contentReports).where(eq(contentReports.reportedBy, userId))
        await tx.delete(profiles).where(eq(profiles.userId, userId))
        await tx.delete(userPreferences).where(eq(userPreferences.userId, userId))

        // Auth.js adapter rows
        await tx.delete(sessions).where(eq(sessions.userId, userId))
        await tx.delete(accounts).where(eq(accounts.userId, userId))

        // Finally the user
        await tx.delete(users).where(eq(users.id, userId))
    })
}
