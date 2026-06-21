/**
 * /api/rankings/[id]
 *
 * GET    — Fetch a single ranking by ID (public rankings need no auth; private
 *           rankings are only returned to their owner).
 * PATCH  — Update an existing ranking (owner only).
 * DELETE — Delete a ranking and all its associated data (owner or admin).
 */

import { NextRequest, NextResponse } from 'next/server'

import { currentUserId, isCurrentUserAdmin } from '@/db/queries/_helpers'
import { deleteRankingWithCascade, getRanking, updateRanking } from '@/db/queries/rankings'
import { withAuth } from '@/lib/auth-middleware'
import type { UpdateRankingRequest } from '@/types/rankings'

/* -------------------------------------------------------------------------- */
/*  GET /api/rankings/[id]                                                     */
/* -------------------------------------------------------------------------- */

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: rankingId } = await params

        if (!rankingId) {
            return NextResponse.json(
                { success: false, error: 'Ranking ID is required' },
                { status: 400 }
            )
        }

        const ranking = await getRanking(rankingId)

        if (!ranking) {
            return NextResponse.json(
                { success: false, error: 'Ranking not found' },
                { status: 404 }
            )
        }

        // Private rankings are only visible to their owner
        if (!ranking.isPublic) {
            const viewerId = await currentUserId()
            if (!viewerId || viewerId !== ranking.userId) {
                return NextResponse.json(
                    { success: false, error: 'This ranking is private' },
                    { status: 403 }
                )
            }
        }

        return NextResponse.json({ success: true, ranking })
    } catch (error) {
        console.error('GET /api/rankings/[id] error:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch ranking' },
            { status: 500 }
        )
    }
}

/* -------------------------------------------------------------------------- */
/*  PATCH /api/rankings/[id]                                                   */
/* -------------------------------------------------------------------------- */

export const PATCH = withAuth(
    async (request: NextRequest, userId: string, context?: { params: Promise<{ id: string }> }) => {
        const { id: rankingId } = await context!.params

        if (!rankingId) {
            return NextResponse.json(
                { success: false, error: 'Ranking ID is required' },
                { status: 400 }
            )
        }

        let body: unknown
        try {
            body = await request.json()
        } catch {
            return NextResponse.json(
                { success: false, error: 'Invalid JSON body' },
                { status: 400 }
            )
        }

        const updates = body as Omit<UpdateRankingRequest, 'id'>

        try {
            await updateRanking(userId, rankingId, { id: rankingId, ...updates })
            return NextResponse.json({ success: true })
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Failed to update ranking'
            const status = msg.includes('Unauthorized')
                ? 403
                : msg.includes('not found')
                  ? 404
                  : 500
            console.error('PATCH /api/rankings/[id] error:', error)
            return NextResponse.json({ success: false, error: msg }, { status })
        }
    }
)

/* -------------------------------------------------------------------------- */
/*  DELETE /api/rankings/[id]                                                  */
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

        // Ownership check — admins may also delete
        const ranking = await getRanking(rankingId)
        if (!ranking) {
            return NextResponse.json(
                { success: false, error: 'Ranking not found' },
                { status: 404 }
            )
        }

        const isAdmin = await isCurrentUserAdmin()
        if (ranking.userId !== userId && !isAdmin) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized: you can only delete your own rankings' },
                { status: 403 }
            )
        }

        try {
            const deleted = await deleteRankingWithCascade(rankingId)
            return NextResponse.json({
                success: true,
                message: 'Ranking deleted successfully',
                deleted,
            })
        } catch (error) {
            console.error('DELETE /api/rankings/[id] error:', error)
            return NextResponse.json(
                { success: false, error: 'Failed to delete ranking' },
                { status: 500 }
            )
        }
    }
)
