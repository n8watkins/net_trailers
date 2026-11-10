/**
 * /api/threads/[id]/replies
 *
 * GET  - list all replies for a thread (public, ordered oldest-first)
 * POST - create a reply (requires auth)
 *
 * Creating a reply also atomically bumps the thread's replyCount / lastReply
 * (handled inside createReply in the query layer).
 *
 * After a reply is stored, the person it answers may get an email, built on
 * the server from the stored reply (lib/email/forumReply.ts). The reply still
 * succeeds if the email fails.
 */

import { NextRequest, NextResponse } from 'next/server'

import { getAuthorIdentity } from '@/db/queries/profiles'
import { createReply, getReplyById, getThreadById, listReplies } from '@/db/queries/threads'
import { withAuth } from '@/lib/auth-middleware'
import { notifyReply } from '@/lib/email/forumReply'
import { requestOrigin } from '@/lib/requestOrigin'
import { ownUploads } from '@/lib/uploads'

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

        const { content, parentReplyId, images } = body as Record<string, unknown>

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

        // A reply can only answer a reply in the same thread.
        if (typeof parentReplyId === 'string' && parentReplyId) {
            const parent = await getReplyById(parentReplyId)
            if (!parent || parent.threadId !== threadId) {
                return NextResponse.json(
                    { success: false, error: 'Parent reply not found in this thread' },
                    { status: 400 }
                )
            }
        }

        // Name and avatar come from the author's profile, never from the request.
        const author = await getAuthorIdentity(userId)
        const reply = await createReply({
            threadId,
            userId,
            userName: author.name,
            userAvatar: author.avatar,
            content: content.trim().slice(0, 2000),
            parentReplyId:
                typeof parentReplyId === 'string' && parentReplyId ? parentReplyId : undefined,
            images: ownUploads(images, userId),
        })

        try {
            await notifyReply(reply.id, userId, await requestOrigin())
        } catch (error) {
            console.error('[threads/replies] reply notification failed:', error)
        }

        return NextResponse.json({ success: true, reply }, { status: 201 })
    }
)
