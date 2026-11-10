/**
 * /api/threads
 *
 * GET  - list threads (public, optional ?category= and ?sortBy= and ?limit= / ?offset=)
 * POST - create a thread (requires auth)
 *
 * The current user's like-status for each thread is injected when a session is present.
 */

import { NextRequest, NextResponse } from 'next/server'

import { getAuthorIdentity } from '@/db/queries/profiles'
import { ownUploads } from '@/lib/uploads'
import { FORUM_CATEGORIES } from '@/utils/forumCategories'

import { withAuth } from '@/lib/auth-middleware'
import { currentUserId } from '@/db/queries/_helpers'
import { createThread, getLikedThreadIds, listThreads } from '@/db/queries/threads'
import type { ForumCategory, ForumSortBy } from '@/types/forum'

/* -------------------------------------------------------------------------- */
/*  GET /api/threads                                                            */
/* -------------------------------------------------------------------------- */

export async function GET(request: NextRequest): Promise<NextResponse> {
    const { searchParams } = request.nextUrl
    const category = (searchParams.get('category') ?? undefined) as ForumCategory | undefined
    const sortBy = (searchParams.get('sortBy') ?? 'recent') as ForumSortBy
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100)
    const offset = Math.max(parseInt(searchParams.get('offset') ?? '0', 10), 0)

    const threadList = await listThreads({ category, sortBy, limit, offset })

    // Optionally annotate like-status for the authenticated viewer
    const viewerId = await currentUserId()
    const likedIds = await getLikedThreadIds(
        viewerId,
        threadList.map((t) => t.id)
    )

    const enriched = threadList.map((t) => ({
        ...t,
        isLikedByViewer: likedIds.has(t.id),
    }))

    return NextResponse.json({
        success: true,
        threads: enriched,
        hasMore: threadList.length === limit,
    })
}

/* -------------------------------------------------------------------------- */
/*  POST /api/threads                                                           */
/* -------------------------------------------------------------------------- */

export const POST = withAuth(async (request: NextRequest, userId: string) => {
    let body: unknown
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
    }

    if (!body || typeof body !== 'object') {
        return NextResponse.json({ success: false, error: 'Missing request body' }, { status: 400 })
    }

    const { title, content, category, tags, images } = body as Record<string, unknown>

    if (typeof title !== 'string' || !title.trim()) {
        return NextResponse.json({ success: false, error: 'title is required' }, { status: 400 })
    }
    if (typeof content !== 'string' || !content.trim()) {
        return NextResponse.json({ success: false, error: 'content is required' }, { status: 400 })
    }
    if (typeof category !== 'string' || !FORUM_CATEGORIES.some((c) => c.id === category)) {
        return NextResponse.json({ success: false, error: 'category is invalid' }, { status: 400 })
    }

    // Name and avatar come from the author's profile, never from the request.
    const author = await getAuthorIdentity(userId)

    const thread = await createThread({
        title: title.trim().slice(0, 200),
        content: content.trim().slice(0, 5000),
        category: category as ForumCategory,
        userId,
        userName: author.name,
        userAvatar: author.avatar,
        tags: Array.isArray(tags)
            ? tags.filter((t): t is string => typeof t === 'string').slice(0, 5)
            : [],
        images: ownUploads(images, userId),
    })

    return NextResponse.json({ success: true, thread }, { status: 201 })
})
