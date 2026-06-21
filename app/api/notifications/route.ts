/**
 * GET /api/notifications
 *
 * Returns the current user's notifications (paginated) and their unread count.
 *
 * Query parameters:
 *   limit  - number of rows to return (default 50, max 100)
 *   offset - row offset for pagination (default 0)
 *
 * Response:
 *   { success: true, notifications: Notification[], unreadCount: number }
 *
 * DELETE /api/notifications
 *
 * Deletes ALL notifications for the current user.
 *
 * Response:
 *   { success: true }
 */

import { NextRequest, NextResponse } from 'next/server'

import { withAuth } from '@/lib/auth-middleware'
import {
    listNotifications,
    getUnreadCount,
    deleteAllNotificationsForUser,
} from '@/db/queries/notifications'
import { NOTIFICATION_CONSTRAINTS } from '@/types/notifications'

export const GET = withAuth(async (request: NextRequest, userId: string) => {
    const { searchParams } = new URL(request.url)

    // Parse and clamp pagination parameters
    const rawLimit = parseInt(searchParams.get('limit') ?? '', 10)
    const limit = Number.isFinite(rawLimit)
        ? Math.min(Math.max(rawLimit, 1), 100)
        : NOTIFICATION_CONSTRAINTS.FETCH_LIMIT

    const rawOffset = parseInt(searchParams.get('offset') ?? '', 10)
    const offset = Number.isFinite(rawOffset) ? Math.max(rawOffset, 0) : 0

    const [notificationList, unreadCount] = await Promise.all([
        listNotifications(userId, limit, offset),
        getUnreadCount(userId),
    ])

    return NextResponse.json({
        success: true,
        notifications: notificationList,
        unreadCount,
    })
})

export const DELETE = withAuth(async (_request: NextRequest, userId: string) => {
    await deleteAllNotificationsForUser(userId)
    return NextResponse.json({ success: true })
})
