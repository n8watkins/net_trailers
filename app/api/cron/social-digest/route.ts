import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getAdminDb } from '@/lib/firebase-admin'
import { validateAdminRequest } from '@/utils/adminMiddleware'
import { EmailService } from '@/lib/email/email-service'
import { generateUnsubscribeToken } from '../../email/unsubscribe/route'

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

        const db = getAdminDb()
        const now = Date.now()
        const lastWeek = now - 7 * 24 * 60 * 60 * 1000

        // Get all pending notifications from the past 7 days
        // Split into two queries to avoid needing a complex index with 'IN' operator
        console.log('📧 [Social Digest] Querying for comment notifications...')
        const commentNotificationsSnapshot = await db
            .collectionGroup('notifications')
            .where('type', '==', 'ranking_comment')
            .where('createdAt', '>=', lastWeek)
            .where('emailSent', '==', false)
            .get()

        console.log('📧 [Social Digest] Querying for like notifications...')
        const likeNotificationsSnapshot = await db
            .collectionGroup('notifications')
            .where('type', '==', 'ranking_like')
            .where('createdAt', '>=', lastWeek)
            .where('emailSent', '==', false)
            .get()

        // Combine results
        const allDocs = [...commentNotificationsSnapshot.docs, ...likeNotificationsSnapshot.docs]
        const notificationsSnapshot = { size: allDocs.length, docs: allDocs }

        console.log(
            `📧 [Social Digest] Found ${notificationsSnapshot.size} pending notifications (${commentNotificationsSnapshot.size} comments + ${likeNotificationsSnapshot.size} likes)`
        )

        // Group notifications by userId
        const userNotifications = new Map<
            string,
            Array<{
                type: 'ranking_comment' | 'ranking_like'
                rankingId: string
                rankingTitle: string
                commenterName?: string
                commentText?: string
                commentId?: string
                isReply?: boolean
                parentCommentText?: string
                likerNames?: string[]
                notificationId: string
                notificationRef: any
            }>
        >()

        for (const doc of notificationsSnapshot.docs) {
            const data = doc.data()
            const userId = doc.ref.parent.parent?.id
            if (!userId) continue

            if (!userNotifications.has(userId)) {
                userNotifications.set(userId, [])
            }

            userNotifications.get(userId)?.push({
                type: data.type,
                rankingId: data.rankingId,
                rankingTitle: data.rankingTitle,
                commenterName: data.commenterName,
                commentText: data.commentText,
                commentId: data.commentId,
                isReply: data.isReply,
                parentCommentText: data.parentCommentText,
                likerNames: data.likerNames,
                notificationId: doc.id,
                notificationRef: doc.ref,
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
        for (const [userId, notifications] of userNotifications.entries()) {
            try {
                // ADMIN ONLY MODE: Skip all users except admin
                if (adminOnly && (!ADMIN_UID || userId !== ADMIN_UID)) {
                    console.log(`📧 [Social Digest] Skipping non-admin user: ${userId}`)
                    skippedUsers++
                    continue
                }

                // Get user data
                const userDoc = await db.collection('users').doc(userId).get()
                if (!userDoc.exists) {
                    skippedUsers++
                    continue
                }

                const userData = userDoc.data()

                // Check if user has opted into social notifications AND email
                const socialEnabled = userData?.notifications?.types?.social_interactions ?? true
                const emailEnabled = userData?.notifications?.email ?? false

                if (!socialEnabled || !emailEnabled || !userData?.email) {
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
                const interactions = notifications.map((n) => ({
                    type: n.type === 'ranking_comment' ? ('comment' as const) : ('like' as const),
                    rankingId: n.rankingId,
                    rankingTitle: n.rankingTitle,
                    commenterName: n.commenterName,
                    commentText: n.commentText,
                    commentId: n.commentId,
                    isReply: n.isReply,
                    parentCommentText: n.parentCommentText,
                    likerNames: n.likerNames,
                }))

                // Send social digest email
                await EmailService.sendSocialDigest({
                    to: userData.email,
                    userName: userData.displayName || userData.email.split('@')[0],
                    interactions,
                    unsubscribeToken,
                })

                emailsSent++
                console.log(
                    `📧 [Social Digest] Sent email to ${userData.email} (${notifications.length} interactions)`
                )

                // Mark all notifications as emailSent
                const batch = db.batch()
                for (const notification of notifications) {
                    batch.update(notification.notificationRef, { emailSent: true })
                }
                await batch.commit()
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
            totalNotifications: notificationsSnapshot.size,
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
