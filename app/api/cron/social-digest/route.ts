import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { validateAdminRequest } from '@/utils/adminMiddleware'
import { EmailService } from '@/lib/email/email-service'
import { generateUnsubscribeToken } from '@/lib/email/unsubscribe-token'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import {
    listUnsentNotificationsByTypes,
    markNotificationsEmailSent,
} from '@/db/queries/notifications'
import { loadUserPreferences } from '@/db/queries/userPreferences'

const CRON_SECRET = process.env.CRON_SECRET

/**
 * Timing-safe comparison of cron secret tokens.
 * Prevents timing attacks by using constant-time comparison.
 */
function isValidCronSecret(token: string | null | undefined): boolean {
    if (!token || !CRON_SECRET) return false
    try {
        const encoder = new TextEncoder()
        const tokenBytes = encoder.encode(token)
        const secretBytes = encoder.encode(CRON_SECRET)
        if (tokenBytes.length !== secretBytes.length) return false
        return crypto.timingSafeEqual(tokenBytes, secretBytes)
    } catch {
        return false
    }
}

/**
 * Weekly Social Digest Cron Job
 *
 * Runs weekly (Wednesdays at 2 AM) to batch all ranking comments and likes from the past 7 days
 * and send a single digest email per user with all their social interactions.
 *
 * Migration note: the original route used a Firestore collectionGroup('notifications') query
 * with an 'emailSent == false' filter. That field lives in the JSON `data` column in Turso,
 * so we use the listUnsentNotificationsByTypes helper (db/queries/notifications.ts) which
 * issues a json_extract-based WHERE clause against the notifications table.
 */
export async function GET(req: NextRequest) {
    try {
        // Auth check - allow cron or admin
        const authHeader = req.headers.get('authorization')
        const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : authHeader

        const isCron = isValidCronSecret(token)

        let isAdmin = false
        if (!isCron) {
            const authResult = await validateAdminRequest(req)
            isAdmin = authResult.authorized
        }

        if (!isCron && !isAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

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

            // Only include the two social types — the query already filters this
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

        // Check if admin-only mode is enabled via query parameter
        const { searchParams } = new URL(req.url)
        const adminOnlyParam = searchParams.get('adminOnly')
        const adminOnly = adminOnlyParam === 'true' || adminOnlyParam === null // Default to admin-only for safety

        // Get admin UID from environment variable
        const ADMIN_UID = process.env.ADMIN_UID

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
                if (adminOnly && (!ADMIN_UID || userId !== ADMIN_UID)) {
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

        return NextResponse.json({
            success: true,
            emailsSent,
            totalUsers: userNotifications.size,
            skippedUsers,
            totalNotifications: pendingNotifications.length,
        })
    } catch (error) {
        console.error('📧 ❌ Social digest error:', error)
        return NextResponse.json(
            {
                error: 'Failed to send social digest',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}
