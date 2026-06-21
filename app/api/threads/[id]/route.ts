/**
 * /api/threads/[id]
 *
 * GET    — fetch a single thread (public); also increments view count
 * PATCH  — update a thread (owner or admin only)
 * DELETE — delete a thread and its replies (owner or admin only)
 */

import { NextRequest, NextResponse } from 'next/server'

import { withAuth } from '@/lib/auth-middleware'
import { currentUserId, isCurrentUserAdmin } from '@/db/queries/_helpers'
import {
    deleteThread,
    getThreadById,
    hasLikedThread,
    incrementThreadViews,
    updateThread,
} from '@/db/queries/threads'
import type { ForumCategory } from '@/types/forum'

interface RouteContext {
    params: Promise<{ id: string }>
}

/* -------------------------------------------------------------------------- */
/*  GET /api/threads/[id]                                                      */
/* -------------------------------------------------------------------------- */

export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
    const { id } = await context.params

    const thread = await getThreadById(id)
    if (!thread) {
        return NextResponse.json({ success: false, error: 'Thread not found' }, { status: 404 })
    }

    // Increment view count (fire-and-forget; don't await to keep response fast)
    incrementThreadViews(id).catch(() => {})

    // Annotate like-status for the authenticated viewer
    const viewerId = await currentUserId()
    const isLikedByViewer = await hasLikedThread(viewerId, id)

    return NextResponse.json({ success: true, thread: { ...thread, isLikedByViewer } })
}

/* -------------------------------------------------------------------------- */
/*  PATCH /api/threads/[id]                                                    */
/* -------------------------------------------------------------------------- */

export const PATCH = withAuth(
    async (request: NextRequest, userId: string, context?: RouteContext) => {
        const { id } = await context!.params

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

        const { title, content, category, tags, images } = body as Record<string, unknown>

        const isAdmin = await isCurrentUserAdmin()
        const updated = await updateThread(id, userId, isAdmin, {
            ...(typeof title === 'string' ? { title: title.trim().slice(0, 200) } : {}),
            ...(typeof content === 'string' ? { content: content.trim().slice(0, 5000) } : {}),
            ...(typeof category === 'string' ? { category: category as ForumCategory } : {}),
            ...(Array.isArray(tags) ? { tags: (tags as string[]).slice(0, 5) } : {}),
            ...(Array.isArray(images) ? { images: (images as string[]).slice(0, 4) } : {}),
        })

        if (!updated) {
            return NextResponse.json(
                { success: false, error: 'Thread not found or permission denied' },
                { status: 404 }
            )
        }

        return NextResponse.json({ success: true, thread: updated })
    }
)

/* -------------------------------------------------------------------------- */
/*  DELETE /api/threads/[id]                                                   */
/* -------------------------------------------------------------------------- */

export const DELETE = withAuth(
    async (_request: NextRequest, userId: string, context?: RouteContext) => {
        const { id } = await context!.params

        const isAdmin = await isCurrentUserAdmin()
        const deleted = await deleteThread(id, userId, isAdmin)

        if (!deleted) {
            return NextResponse.json(
                { success: false, error: 'Thread not found or permission denied' },
                { status: 404 }
            )
        }

        return NextResponse.json({ success: true })
    }
)
