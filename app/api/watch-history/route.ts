/**
 * /api/watch-history
 *
 * GET    — Authenticated: own history.
 *          Unauthenticated with ?userId=: public history (only when the owner
 *          has enabled showWatchHistory in their profile visibility settings).
 * POST   — Add / upsert a watch history entry (authenticated only).
 * DELETE — Clear all watch history for the current user (authenticated only).
 *
 * The authenticated user's ID always comes from the Auth.js session.
 * A client must never be able to write another user's history.
 */

import { NextRequest, NextResponse } from 'next/server'

import { withAuth } from '@/lib/auth-middleware'
import { addWatchEntry, listWatchHistory, clearWatchHistory } from '@/db/queries/watchHistory'
import { db } from '@/db'
import { profiles } from '@/db/schema'
import { eq } from 'drizzle-orm'
import type { Content } from '@/typings'

/* -------------------------------------------------------------------------- */
/*  GET /api/watch-history                                                     */
/* -------------------------------------------------------------------------- */

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const publicUserId = searchParams.get('userId')

    // --- Public read: ?userId=<ownerId> ---
    if (publicUserId) {
        return handlePublicRead(publicUserId, request)
    }

    // --- Authenticated read: own history ---
    return withAuth(async (_req: NextRequest, userId: string) => {
        const limitParam = searchParams.get('limit')
        const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 500, 1), 500) : 500

        try {
            const history = await listWatchHistory(userId, limit)
            return NextResponse.json({ success: true, history })
        } catch (err) {
            console.error('[GET /api/watch-history] error:', err)
            return NextResponse.json(
                { success: false, error: 'Failed to load watch history' },
                { status: 500 }
            )
        }
    })(request)
}

async function handlePublicRead(ownerId: string, request: NextRequest) {
    const { searchParams } = new URL(request.url)

    // Check visibility setting on the owner's profile row.
    const profileRows = await db
        .select({ visibility: profiles.visibility, isPublic: profiles.isPublic })
        .from(profiles)
        .where(eq(profiles.userId, ownerId))
        .limit(1)

    const profileRow = profileRows[0]

    // Profile must exist and be public with showWatchHistory enabled.
    const visibility = profileRow?.visibility
    const isPublicEnabled = profileRow?.isPublic && visibility?.enablePublicProfile !== false

    if (!isPublicEnabled || visibility?.showWatchHistory === false) {
        return NextResponse.json({ success: true, history: [] })
    }

    const limitParam = searchParams.get('limit')
    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 100, 1), 500) : 100

    try {
        const history = await listWatchHistory(ownerId, limit)
        return NextResponse.json({ success: true, history })
    } catch (err) {
        console.error('[GET /api/watch-history public] error:', err)
        return NextResponse.json(
            { success: false, error: 'Failed to load watch history' },
            { status: 500 }
        )
    }
}

/* -------------------------------------------------------------------------- */
/*  POST /api/watch-history                                                    */
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

    const { contentId, mediaType, content } = body as Record<string, unknown>

    if (typeof contentId !== 'number' || !Number.isInteger(contentId) || contentId <= 0) {
        return NextResponse.json(
            { success: false, error: 'contentId must be a positive integer' },
            { status: 400 }
        )
    }
    if (mediaType !== 'movie' && mediaType !== 'tv') {
        return NextResponse.json(
            { success: false, error: 'mediaType must be "movie" or "tv"' },
            { status: 400 }
        )
    }
    if (!content || typeof content !== 'object') {
        return NextResponse.json(
            { success: false, error: 'content snapshot is required' },
            { status: 400 }
        )
    }

    try {
        const entry = await addWatchEntry(
            userId,
            contentId as number,
            mediaType as 'movie' | 'tv',
            content as Content
        )
        return NextResponse.json({ success: true, entry }, { status: 201 })
    } catch (err) {
        console.error('[POST /api/watch-history] error:', err)
        return NextResponse.json(
            { success: false, error: 'Failed to save watch history entry' },
            { status: 500 }
        )
    }
})

/* -------------------------------------------------------------------------- */
/*  DELETE /api/watch-history                                                  */
/* -------------------------------------------------------------------------- */

export const DELETE = withAuth(async (_request: NextRequest, userId: string) => {
    try {
        await clearWatchHistory(userId)
        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[DELETE /api/watch-history] error:', err)
        return NextResponse.json(
            { success: false, error: 'Failed to clear watch history' },
            { status: 500 }
        )
    }
})
