/**
 * /api/threads/replies/[replyId]
 *
 * DELETE — delete a reply (reply owner, thread owner, or admin)
 *
 * Ownership rules (matching original Firestore behaviour):
 *   1. The reply's own author may delete their reply.
 *   2. The thread's author may delete ANY reply in their thread.
 *   3. Admins may delete anything.
 *
 * Deleting a reply also decrements the parent thread's replyCount (handled in
 * the query layer via a transaction).
 */

import { NextRequest, NextResponse } from 'next/server'

import { withAuth } from '@/lib/auth-middleware'
import { isCurrentUserAdmin } from '@/db/queries/_helpers'
import { deleteReply } from '@/db/queries/threads'

interface RouteContext {
    params: Promise<{ replyId: string }>
}

export const DELETE = withAuth(
    async (_request: NextRequest, userId: string, context?: RouteContext) => {
        const { replyId } = await context!.params

        const isAdmin = await isCurrentUserAdmin()
        const deleted = await deleteReply(replyId, userId, isAdmin)

        if (!deleted) {
            return NextResponse.json(
                { success: false, error: 'Reply not found or permission denied' },
                { status: 404 }
            )
        }

        return NextResponse.json({ success: true })
    }
)
