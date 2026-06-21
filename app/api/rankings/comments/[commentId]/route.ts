/**
 * /api/rankings/comments/[commentId]
 *
 * DELETE — Delete a comment (comment owner or ranking owner only).
 */

import { NextRequest, NextResponse } from 'next/server'

import { withAuth } from '@/lib/auth-middleware'
import { deleteComment } from '@/db/queries/rankingComments'

export const DELETE = withAuth(
    async (
        _request: NextRequest,
        userId: string,
        context?: { params: Promise<{ commentId: string }> }
    ) => {
        const { commentId } = await context!.params

        if (!commentId) {
            return NextResponse.json(
                { success: false, error: 'Comment ID is required' },
                { status: 400 }
            )
        }

        try {
            // Authorization (comment author OR ranking owner) is verified
            // server-side inside deleteComment — no client-supplied owner id.
            await deleteComment(userId, commentId)
            return NextResponse.json({ success: true })
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Failed to delete comment'
            const status = msg.includes('Unauthorized')
                ? 403
                : msg.includes('not found')
                  ? 404
                  : 500
            console.error('DELETE /api/rankings/comments/[commentId] error:', error)
            return NextResponse.json({ success: false, error: msg }, { status })
        }
    }
)
