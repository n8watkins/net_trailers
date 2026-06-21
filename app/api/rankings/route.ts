/**
 * /api/rankings
 *
 * GET  — List public rankings (no auth) or the current user's own rankings when
 *         ?scope=mine is passed.  Public listings are sorted by the `sort` query
 *         param (recent | popular | most-liked | most-viewed).
 * POST — Create a new ranking (authenticated users only).
 */

import { NextRequest, NextResponse } from 'next/server'

import { withAuth } from '@/lib/auth-middleware'
import { currentUserId } from '@/db/queries/_helpers'
import {
    createRanking,
    getPublicRankings,
    getUserRankings,
    getUserLikedRankings,
} from '@/db/queries/rankings'
import type { CreateRankingRequest } from '@/types/rankings'

/* -------------------------------------------------------------------------- */
/*  GET /api/rankings                                                          */
/* -------------------------------------------------------------------------- */

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = request.nextUrl
        const scope = searchParams.get('scope') // 'mine' | null
        const sort =
            (searchParams.get('sort') as 'recent' | 'popular' | 'most-liked' | 'most-viewed') ||
            'recent'
        const limit = Math.min(Number(searchParams.get('limit') || '50'), 100)
        const offset = Number(searchParams.get('offset') || '0')

        if (scope === 'mine') {
            // Authenticated — return the caller's own rankings
            const userId = await currentUserId()
            if (!userId) {
                return NextResponse.json(
                    { success: false, error: 'Authentication required' },
                    { status: 401 }
                )
            }
            const data = await getUserRankings(userId)
            return NextResponse.json({ success: true, data })
        }

        if (scope === 'liked') {
            // Authenticated — return rankings liked by the caller
            const userId = await currentUserId()
            if (!userId) {
                return NextResponse.json(
                    { success: false, error: 'Authentication required' },
                    { status: 401 }
                )
            }
            const result = await getUserLikedRankings(userId, limit, offset)
            return NextResponse.json({ success: true, ...result })
        }

        // Public feed — no auth required
        const result = await getPublicRankings(sort, limit, offset)
        return NextResponse.json({ success: true, ...result })
    } catch (error) {
        console.error('GET /api/rankings error:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch rankings' },
            { status: 500 }
        )
    }
}

/* -------------------------------------------------------------------------- */
/*  POST /api/rankings                                                         */
/* -------------------------------------------------------------------------- */

export const POST = withAuth(async (request: NextRequest, userId: string) => {
    let body: unknown
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
    }

    const { displayName, username, userAvatar, title, description, isPublic, itemCount } = body as {
        displayName?: string
        username?: string
        userAvatar?: string
        title?: string
        description?: string
        isPublic?: boolean
        itemCount?: number
    }

    if (!displayName || typeof displayName !== 'string') {
        return NextResponse.json(
            { success: false, error: 'displayName is required' },
            { status: 400 }
        )
    }

    if (!title || typeof title !== 'string' || title.trim().length < 5) {
        return NextResponse.json(
            { success: false, error: 'title must be at least 5 characters' },
            { status: 400 }
        )
    }

    if (!itemCount || typeof itemCount !== 'number' || itemCount < 3) {
        return NextResponse.json(
            { success: false, error: 'itemCount must be at least 3' },
            { status: 400 }
        )
    }

    const createRequest: CreateRankingRequest = {
        title: title.trim(),
        description: description?.trim(),
        isPublic: isPublic ?? true,
        itemCount,
    }

    try {
        const ranking = await createRanking(
            userId,
            displayName,
            username,
            userAvatar,
            createRequest
        )
        return NextResponse.json({ success: true, ranking }, { status: 201 })
    } catch (error) {
        console.error('POST /api/rankings error:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to create ranking' },
            { status: 500 }
        )
    }
})
