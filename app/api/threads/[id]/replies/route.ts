/**
 * /api/threads/[id]/replies
 *
 * GET  — list all replies for a thread (public, ordered oldest-first)
 * POST — create a reply (requires auth)
 *
 * Creating a reply also atomically bumps the thread's replyCount / lastReply
 * (handled inside createReply in the query layer).
 *
 * Side effect: a fire-and-forget POST to /api/forum/send-reply-notification is
 * made on successful creation so the notifications agent's route is left
 * untouched. The reply still succeeds even if the notification fails.
 */

import { NextRequest, NextResponse } from 'next/server'

import { withAuth } from '@/lib/auth-middleware'
import { createReply, getReplyById, getThreadById, listReplies } from '@/db/queries/threads'

interface RouteContext {
    params: Promise<{ id: string }>
}

/* -------------------------------------------------------------------------- */
/*  GET /api/threads/[id]/replies                                              */
/* -------------------------------------------------------------------------- */

export async function GET(_request: NextRequest, context: RouteContext): Promise<NextResponse> {
    const { id: threadId } = await context.params

    const replies = await listReplies(threadId)
    return NextResponse.json({ success: true, replies })
}

/* -------------------------------------------------------------------------- */
/*  POST /api/threads/[id]/replies                                             */
/* -------------------------------------------------------------------------- */

export const POST = withAuth(
    async (request: NextRequest, userId: string, context?: RouteContext) => {
        const { id: threadId } = await context!.params

        let body: unknown
        try {
            body = await request.json()
        } catch {
            return NextResponse.json(
                { success: false, error: 'Invalid JSON body' },
                { status: 400 }
            )
        }

        if (!body || typeof body !== 'object') {
            return NextResponse.json(
                { success: false, error: 'Missing request body' },
                { status: 400 }
            )
        }

        const { content, userName, userAvatar, parentReplyId, images } = body as Record<
            string,
            unknown
        >

        if (typeof content !== 'string' || !content.trim()) {
            return NextResponse.json(
                { success: false, error: 'content is required' },
                { status: 400 }
            )
        }

        // Verify thread exists before creating the reply
        const thread = await getThreadById(threadId)
        if (!thread) {
            return NextResponse.json({ success: false, error: 'Thread not found' }, { status: 404 })
        }

        const reply = await createReply({
            threadId,
            userId,
            userName: typeof userName === 'string' ? userName : null,
            userAvatar: typeof userAvatar === 'string' ? userAvatar : null,
            content: content.trim().slice(0, 2000),
            parentReplyId: typeof parentReplyId === 'string' ? parentReplyId : undefined,
            images: Array.isArray(images) ? (images as string[]).slice(0, 4) : [],
        })

        // Determine notification recipient (reply-to-reply vs reply-to-thread)
        let recipientUserId: string = thread.userId
        let isReplyToReply = false

        if (typeof parentReplyId === 'string' && parentReplyId) {
            const parentReply = await getReplyById(parentReplyId)
            if (parentReply) {
                recipientUserId = parentReply.userId
                isReplyToReply = true
            }
        }

        // Fire-and-forget email notification (owned by notifications agent — leave route as-is)
        if (recipientUserId !== userId) {
            fetch('/api/forum/send-reply-notification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipientUserId,
                    replierUserId: userId,
                    replierName: typeof userName === 'string' ? userName : 'Anonymous',
                    threadTitle: thread.title,
                    threadId,
                    replyContent: content.trim().slice(0, 200),
                    isReplyToReply,
                }),
            }).catch((err: unknown) => {
                console.error('[threads/replies] notification error:', err)
            })
        }

        return NextResponse.json({ success: true, reply }, { status: 201 })
    }
)
