/**
 * The weekly social digest (cron: Wednesdays 02:00 UTC). One email per user
 * with their unsent comment and like notifications from the past 7 days, for
 * users with email turned on. `adminOnly` limits it to the admin's account.
 */

import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { getAdminUserId } from '@/db/queries/_helpers'
import {
    listUnsentNotificationsByTypes,
    markNotificationsEmailSent,
} from '@/db/queries/notifications'
import { loadUserPreferences } from '@/db/queries/userPreferences'
import { users } from '@/db/schema'
import { EmailService } from '@/lib/email/email-service'
import { generateUnsubscribeToken } from '@/lib/email/unsubscribe-token'

export async function runSocialDigest({ adminOnly }: { adminOnly: boolean }) {
    console.log('📧 [Social Digest] Starting weekly social digest')

    const nowMs = Date.now()
    const lastWeek = nowMs - 7 * 24 * 60 * 60 * 1000

    // -----------------------------------------------------------------------
    // Query the notifications table for ranking_comment and ranking_like rows
    // from the past 7 days that have not yet had an email sent.
    // emailSent lives in the JSON `data` column; the helper issues a
    // json_extract filter for it.
    // -----------------------------------------------------------------------
    console.log('📧 [Social Digest] Querying for unsent social notifications...')
    const pendingNotifications = await listUnsentNotificationsByTypes(
        ['ranking_comment', 'ranking_like'],
        lastWeek
    )

    console.log(`📧 [Social Digest] Found ${pendingNotifications.length} pending notifications`)

    // Group notifications by userId
    const userNotifications = new Map<
        string,
        Array<{
            type: 'ranking_comment' | 'ranking_like'
            rankingId?: string
            rankingTitle?: string
            commenterName?: string
            commentText?: string
            commentId?: string
            isReply?: boolean
            parentCommentText?: string
            likerNames?: string[]
            notificationId: string
        }>
    >()

    for (const notification of pendingNotifications) {
        const userId = notification.userId
        if (!userId) continue

        if (!userNotifications.has(userId)) {
            userNotifications.set(userId, [])
        }

        // Only include the two social types - the query already filters this
        // but we narrow the type here for type-safety
        const notifType = notification.type as 'ranking_comment' | 'ranking_like'

        userNotifications.get(userId)?.push({
            type: notifType,
            rankingId: notification.rankingId,
            rankingTitle: notification.rankingTitle,
            commenterName: notification.commenterName,
            commentText: notification.commentText,
            commentId: notification.commentId,
            isReply: notification.isReply,
            parentCommentText: notification.parentCommentText,
            likerNames: notification.likerNames,
            notificationId: notification.id,
        })
    }

    console.log(`📧 [Social Digest] Processing ${userNotifications.size} users`)

    // Check if admin-only mode is enabled via query parameter.
    // Default to ALL eligible users - the scheduled weekly run must actually
    // deliver digests. `?adminOnly=true` is an opt-in test mode that targets
    // only the admin account.

    // Resolve the admin's Turso id from ADMIN_EMAILS (the old ADMIN_UID
    // env var was removed in the Firebase→Turso migration).
    const adminUserId = adminOnly ? await getAdminUserId() : null

    if (adminOnly) {
        console.log(`📧 [Social Digest] Running in ADMIN-ONLY mode`)
    } else {
        console.log(`📧 [Social Digest] Running in ALL USERS mode`)
    }

    let emailsSent = 0
    let skippedUsers = 0

    // Send digest email to each user with pending notifications
    for (const [userId, userNotifList] of userNotifications.entries()) {
        try {
            // ADMIN ONLY MODE: Skip all users except admin
            if (adminOnly && (!adminUserId || userId !== adminUserId)) {
                console.log(`📧 [Social Digest] Skipping non-admin user: ${userId}`)
                skippedUsers++
                continue
            }

            // Look up user record (email, name) from the users table
            const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1)

            if (userRows.length === 0) {
                skippedUsers++
                continue
            }

            const user = userRows[0]

            // Load notification preferences from userPreferences blob
            const prefs = await loadUserPreferences(userId)

            // Check if user has opted into social notifications AND email
            const socialEnabled = prefs?.notifications?.types?.system ?? true // social_interactions maps to system pref
            const emailEnabled = prefs?.notifications?.email ?? false

            if (!socialEnabled || !emailEnabled || !user.email) {
                skippedUsers++
                continue
            }

            // Generate unsubscribe token
            let unsubscribeToken: string | undefined
            try {
                unsubscribeToken = await generateUnsubscribeToken(userId)
            } catch (tokenError) {
                console.warn(
                    `⚠️  [Social Digest] Failed to generate unsubscribe token for ${userId}:`,
                    tokenError
                )
            }

            // Transform notifications into email format
            const interactions = userNotifList.map((n) => ({
                type: n.type === 'ranking_comment' ? ('comment' as const) : ('like' as const),
                rankingId: n.rankingId ?? '',
                rankingTitle: n.rankingTitle ?? '',
                commenterName: n.commenterName,
                commentText: n.commentText,
                commentId: n.commentId,
                isReply: n.isReply,
                parentCommentText: n.parentCommentText,
                likerNames: n.likerNames,
            }))

            // Send social digest email
            const displayName = user.name || user.email.split('@')[0]
            await EmailService.sendSocialDigest({
                to: user.email,
                userName: displayName,
                interactions,
                unsubscribeToken,
            })

            emailsSent++
            console.log(
                `📧 [Social Digest] Sent email to ${user.email} (${userNotifList.length} interactions)`
            )

            // Mark all notifications as emailSent in the JSON data column
            const sentIds = userNotifList.map((n) => n.notificationId)
            await markNotificationsEmailSent(sentIds)
        } catch (error) {
            console.error(`📧 ❌ [Social Digest] Failed to process user ${userId}:`, error)
        }
    }

    console.log(`📧 [Social Digest] Skipped ${skippedUsers} users (opted out or no email)`)
    console.log(`📧 [Social Digest] Sent ${emailsSent} social digest emails`)

    return {
        emailsSent,
        totalUsers: userNotifications.size,
        skippedUsers,
        totalNotifications: pendingNotifications.length,
    }
}
