/**
 * /api/rankings/[id]/view
 *
 * POST - Increment the view counter for a ranking.
 *         No auth required. The owner's own views are not counted (the
 *         session says who the viewer is).
 *         Counted at most once an hour per viewer (signed-in user, or guest
 *         IP from CF-Connecting-IP), so the count cannot be inflated by a
 *         script.
 */

import { NextRequest, NextResponse } from 'next/server'

import { incrementRankingView } from '@/db/queries/rankings'
import { consumeLimits } from '@/lib/durableLimit'
import { getRequestIdentity } from '@/lib/requestIdentity'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: rankingId } = await params

        if (!rankingId || rankingId.length > 64) {
            return NextResponse.json(
                { success: false, error: 'Ranking ID is required' },
                { status: 400 }
            )
        }

        // The session user (to skip owner views), or the guest's IP key.
        const { userId: viewerId, rateLimitKey } = await getRequestIdentity(request)
        const once = await consumeLimits([
            {
                key: `view:${rankingId}:${rateLimitKey}`,
                limit: 1,
                window: { ms: 60 * 60 * 1000 },
            },
        ])
        if (!once.allowed) return NextResponse.json({ success: true, counted: false })

        await incrementRankingView(rankingId, viewerId)
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('POST /api/rankings/[id]/view error:', error)
        // View tracking failure must not break the user experience
        return NextResponse.json(
            { success: false, error: 'Failed to record view' },
            { status: 500 }
        )
    }
}
