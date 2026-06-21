/**
 * POST /api/notifications/create
 *
 * Client-triggered notification creation. In practice, notifications are
 * typically created by server-side code (cron jobs, ranking comment handlers)
 * directly via db/queries/notifications.ts. This endpoint exists to support
 * the legacy store action `notificationStore.createNotification()` which
 * lets a user create a notification for themselves (e.g. for testing / demo).
 *
 * The userId is ALWAYS taken from the Auth.js session — the body's `userId`
 * field is ignored. A user can only create notifications for themselves.
 *
 * Request body: CreateNotificationRequest fields (type, title, message, etc.)
 *
 * Response:
 *   { success: true, notification: Notification }
 */

import { NextRequest, NextResponse } from 'next/server'

import { withAuth } from '@/lib/auth-middleware'
import { createNotification } from '@/db/queries/notifications'
import type { CreateNotificationRequest } from '@/types/notifications'

const VALID_TYPES = new Set([
    'collection_update',
    'new_release',
    'trending_update',
    'system',
    'ranking_comment',
    'ranking_like',
])

export const POST = withAuth(async (request: NextRequest, userId: string) => {
    let body: unknown
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
    }

    if (!body || typeof body !== 'object') {
        return NextResponse.json(
            { success: false, error: 'Request body must be an object' },
            { status: 400 }
        )
    }

    const b = body as Record<string, unknown>

    if (typeof b.type !== 'string' || !VALID_TYPES.has(b.type)) {
        return NextResponse.json(
            { success: false, error: `Invalid or missing field: type` },
            { status: 400 }
        )
    }

    if (typeof b.title !== 'string' || b.title.trim() === '') {
        return NextResponse.json(
            { success: false, error: 'Missing required field: title' },
            { status: 400 }
        )
    }

    if (typeof b.message !== 'string' || b.message.trim() === '') {
        return NextResponse.json(
            { success: false, error: 'Missing required field: message' },
            { status: 400 }
        )
    }

    const notificationRequest: CreateNotificationRequest = {
        type: b.type as CreateNotificationRequest['type'],
        title: b.title.trim(),
        message: b.message.trim(),
        ...(typeof b.contentId === 'number' && { contentId: b.contentId }),
        ...(b.mediaType === 'movie' || b.mediaType === 'tv' ? { mediaType: b.mediaType } : {}),
        ...(typeof b.collectionId === 'string' && { collectionId: b.collectionId }),
        ...(typeof b.shareId === 'string' && { shareId: b.shareId }),
        ...(typeof b.actionUrl === 'string' && { actionUrl: b.actionUrl }),
        ...(typeof b.imageUrl === 'string' && { imageUrl: b.imageUrl }),
        ...(typeof b.expiresIn === 'number' && { expiresIn: b.expiresIn }),
    }

    // userId from session — never from body
    const notification = await createNotification(userId, notificationRequest)

    return NextResponse.json({ success: true, notification }, { status: 201 })
})
