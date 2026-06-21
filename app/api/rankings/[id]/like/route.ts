/**
 * /api/rankings/[id]/like
 *
 * POST   — Like a ranking (authenticated users only).
 * DELETE — Unlike a ranking (authenticated users only).
 */

import { NextRequest, NextResponse } from 'next/server'

import { withAuth } from '@/lib/auth-middleware'
import { hasUserLikedRanking, likeRanking, unlikeRanking } from '@/db/queries/rankings'

/* -------------------------------------------------------------------------- */
/*  POST /api/rankings/[id]/like                                               */
/* -------------------------------------------------------------------------- */

export const POST = withAuth(
    async (
        _request: NextRequest,
        userId: string,
        context?: { params: Promise<{ id: string }> }
    ) => {
        const { id: rankingId } = await context!.params

        if (!rankingId) {
            return NextResponse.json(
                { success: false, error: 'Ranking ID is required' },
                { status: 400 }
            )
        }

        try {
            const added = await likeRanking(userId, rankingId)
            return NextResponse.json({ success: true, added })
        } catch (error) {
            console.error('POST /api/rankings/[id]/like error:', error)
            return NextResponse.json(
                { success: false, error: 'Failed to like ranking' },
                { status: 500 }
            )
        }
    }
)

/* -------------------------------------------------------------------------- */
/*  DELETE /api/rankings/[id]/like                                             */
/* -------------------------------------------------------------------------- */

export const DELETE = withAuth(
    async (
        _request: NextRequest,
        userId: string,
        context?: { params: Promise<{ id: string }> }
    ) => {
        const { id: rankingId } = await context!.params

        if (!rankingId) {
            return NextResponse.json(
                { success: false, error: 'Ranking ID is required' },
                { status: 400 }
            )
        }

        try {
            const removed = await unlikeRanking(userId, rankingId)
            return NextResponse.json({ success: true, removed })
        } catch (error) {
            console.error('DELETE /api/rankings/[id]/like error:', error)
            return NextResponse.json(
                { success: false, error: 'Failed to unlike ranking' },
                { status: 500 }
            )
        }
    }
)

/* -------------------------------------------------------------------------- */
/*  GET /api/rankings/[id]/like                                                */
/* -------------------------------------------------------------------------- */

/**
 * Check whether the current user has liked the ranking.
 * Returns { liked: boolean } — unauthenticated callers always get liked: false.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: rankingId } = await params

        // Import currentUserId inline to avoid top-level import issues with
        // routes that export both plain handlers and withAuth wrappers.
        const { currentUserId } = await import('@/db/queries/_helpers')
        const userId = await currentUserId()

        if (!userId || !rankingId) {
            return NextResponse.json({ success: true, liked: false })
        }

        const liked = await hasUserLikedRanking(userId, rankingId)
        return NextResponse.json({ success: true, liked })
    } catch (error) {
        console.error('GET /api/rankings/[id]/like error:', error)
        return NextResponse.json({ success: true, liked: false })
    }
}
