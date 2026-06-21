/**
 * /api/rankings/comments/[commentId]/like
 *
 * POST   — Like a comment (authenticated users only).
 * DELETE — Unlike a comment (authenticated users only).
 */

import { NextRequest, NextResponse } from 'next/server'

import { withAuth } from '@/lib/auth-middleware'
import { likeComment, unlikeComment } from '@/db/queries/rankingComments'

export const POST = withAuth(
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
            const added = await likeComment(userId, commentId)
            return NextResponse.json({ success: true, added })
        } catch (error) {
            console.error('POST /api/rankings/comments/[commentId]/like error:', error)
            return NextResponse.json(
                { success: false, error: 'Failed to like comment' },
                { status: 500 }
            )
        }
    }
)

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
            const removed = await unlikeComment(userId, commentId)
            return NextResponse.json({ success: true, removed })
        } catch (error) {
            console.error('DELETE /api/rankings/comments/[commentId]/like error:', error)
            return NextResponse.json(
                { success: false, error: 'Failed to unlike comment' },
                { status: 500 }
            )
        }
    }
)
