/**
 * DELETE /api/notifications/[id]
 *
 * Delete a single notification owned by the current user.
 * Ownership is enforced in the query layer (WHERE id = ? AND userId = session userId).
 *
 * Response:
 *   { success: true }
 */

import { NextRequest, NextResponse } from 'next/server'

import { withAuth } from '@/lib/auth-middleware'
import { deleteOneNotification } from '@/db/queries/notifications'

export const DELETE = withAuth(
    async (
        _request: NextRequest,
        userId: string,
        context?: { params: Promise<{ id: string }> }
    ) => {
        const { id: notificationId } = await context!.params

        if (!notificationId || !notificationId.trim()) {
            return NextResponse.json(
                { success: false, error: 'Missing notification id' },
                { status: 400 }
            )
        }

        await deleteOneNotification(userId, notificationId.trim())
        return NextResponse.json({ success: true })
    }
)
