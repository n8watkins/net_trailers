/**
 * /api/threads/replies/[replyId]/like
 *
 * POST   — like a reply (requires auth, idempotent)
 * DELETE — unlike a reply (requires auth)
 */

import { NextRequest, NextResponse } from 'next/server'

import { withAuth } from '@/lib/auth-middleware'
import { hasLikedReply, likeReply, unlikeReply } from '@/db/queries/threads'

interface RouteContext {
    params: Promise<{ replyId: string }>
}

/* -------------------------------------------------------------------------- */
/*  POST /api/threads/replies/[replyId]/like                                   */
/* -------------------------------------------------------------------------- */

export const POST = withAuth(
    async (_request: NextRequest, userId: string, context?: RouteContext) => {
        const { replyId } = await context!.params

        const alreadyLiked = await hasLikedReply(userId, replyId)
        if (!alreadyLiked) {
            await likeReply(userId, replyId)
        }

        return NextResponse.json({ success: true, liked: true })
    }
)

/* -------------------------------------------------------------------------- */
/*  DELETE /api/threads/replies/[replyId]/like                                 */
/* -------------------------------------------------------------------------- */

export const DELETE = withAuth(
    async (_request: NextRequest, userId: string, context?: RouteContext) => {
        const { replyId } = await context!.params

        await unlikeReply(userId, replyId)

        return NextResponse.json({ success: true, liked: false })
    }
)
