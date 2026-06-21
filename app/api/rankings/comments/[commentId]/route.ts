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
        request: NextRequest,
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

        // The ranking owner ID is passed in the body so the server can apply
        // the "ranking owner may also delete" rule without an extra DB lookup.
        let rankingOwnerId: string | undefined
        try {
            const body = await request.json()
            rankingOwnerId = (body as { rankingOwnerId?: string }).rankingOwnerId
        } catch {
            // Body is optional — if not supplied ownership check falls back to
            // comment-owner-only.
        }

        try {
            await deleteComment(userId, commentId, rankingOwnerId ?? userId)
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
