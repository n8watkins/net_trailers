/**
 * /api/threads/[id]/like
 *
 * POST   — like a thread (requires auth, idempotent)
 * DELETE — unlike a thread (requires auth)
 *
 * The like counter on the threads table is maintained atomically in the
 * query layer alongside the thread_likes junction row.
 */

import { NextRequest, NextResponse } from 'next/server'

import { withAuth } from '@/lib/auth-middleware'
import { hasLikedThread, likeThread, unlikeThread } from '@/db/queries/threads'

interface RouteContext {
    params: Promise<{ id: string }>
}

/* -------------------------------------------------------------------------- */
/*  POST /api/threads/[id]/like                                                */
/* -------------------------------------------------------------------------- */

export const POST = withAuth(
    async (_request: NextRequest, userId: string, context?: RouteContext) => {
        const { id: threadId } = await context!.params

        // Idempotency guard: if already liked, return current state without
        // double-incrementing the counter.
        const alreadyLiked = await hasLikedThread(userId, threadId)
        if (!alreadyLiked) {
            await likeThread(userId, threadId)
        }

        return NextResponse.json({ success: true, liked: true })
    }
)

/* -------------------------------------------------------------------------- */
/*  DELETE /api/threads/[id]/like                                              */
/* -------------------------------------------------------------------------- */

export const DELETE = withAuth(
    async (_request: NextRequest, userId: string, context?: RouteContext) => {
        const { id: threadId } = await context!.params

        await unlikeThread(userId, threadId)

        return NextResponse.json({ success: true, liked: false })
    }
)
