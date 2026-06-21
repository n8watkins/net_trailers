/**
 * POST /api/notifications/mark-all-read
 *
 * Mark all of the current user's notifications as read in a single UPDATE.
 *
 * Response:
 *   { success: true }
 */

import { NextRequest, NextResponse } from 'next/server'

import { withAuth } from '@/lib/auth-middleware'
import { markAllRead } from '@/db/queries/notifications'

export const POST = withAuth(async (_request: NextRequest, userId: string) => {
    await markAllRead(userId)
    return NextResponse.json({ success: true })
})
