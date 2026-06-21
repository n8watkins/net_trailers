/**
 * /api/rankings/[id]/view
 *
 * POST — Increment the view counter for a ranking.
 *         No auth required. The viewer's user ID may be sent in the body so the
 *         server can skip incrementing when the viewer is the ranking owner
 *         (matching the old Firestore behaviour).
 */

import { NextRequest, NextResponse } from 'next/server'

import { currentUserId } from '@/db/queries/_helpers'
import { incrementRankingView } from '@/db/queries/rankings'

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: rankingId } = await params

        if (!rankingId) {
            return NextResponse.json(
                { success: false, error: 'Ranking ID is required' },
                { status: 400 }
            )
        }

        // Use the session user id if available (to skip owner views)
        const viewerId = await currentUserId()

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
