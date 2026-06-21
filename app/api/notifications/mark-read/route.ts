/**
 * POST /api/notifications/mark-read
 *
 * Mark a single notification as read for the current user.
 * The ownership check is enforced in the query layer (WHERE userId = session userId),
 * so a user cannot mark another user's notification as read.
 *
 * Request body:
 *   { notificationId: string }
 *
 * Response:
 *   { success: true }
 */

import { NextRequest, NextResponse } from 'next/server'

import { withAuth } from '@/lib/auth-middleware'
import { markOneRead } from '@/db/queries/notifications'

export const POST = withAuth(async (request: NextRequest, userId: string) => {
    let body: unknown
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
    }

    if (!body || typeof body !== 'object' || !('notificationId' in body)) {
        return NextResponse.json(
            { success: false, error: 'Missing required field: notificationId' },
            { status: 400 }
        )
    }

    const notificationId = (body as { notificationId: unknown }).notificationId

    if (typeof notificationId !== 'string' || notificationId.trim() === '') {
        return NextResponse.json(
            { success: false, error: 'notificationId must be a non-empty string' },
            { status: 400 }
        )
    }

    await markOneRead(userId, notificationId.trim())
    return NextResponse.json({ success: true })
})
