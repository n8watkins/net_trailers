/**
 * /api/polls/user/[userId]
 *
 * GET - Fetch all polls created by a specific user (public profile pages).
 *       Hidden polls are included so the owning user's own profile shows them;
 *       for other viewers only non-hidden polls are meaningful but we return
 *       all and let the UI decide.
 *
 * Query params:
 *   voted=true   - Instead of created polls, return polls the user has VOTED on.
 *                  This path requires the requester to be the same user (auth).
 */

import { NextRequest, NextResponse } from 'next/server'

import { currentUserId } from '@/db/queries/_helpers'
import { listPollsByUser, listPollsVotedByUser } from '@/db/queries/polls'

type RouteContext = { params: Promise<{ userId: string }> }

export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
    const { userId: targetUserId } = await context.params

    if (!targetUserId) {
        return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const wantVoted = searchParams.get('voted') === 'true'

    try {
        const viewerId = await currentUserId()

        if (wantVoted) {
            // Only the user themselves may fetch their voted polls
            if (!viewerId || viewerId !== targetUserId) {
                return NextResponse.json(
                    { success: false, error: 'Authentication required to view voted polls' },
                    { status: 401 }
                )
            }
            const polls = await listPollsVotedByUser(targetUserId)
            return NextResponse.json({ success: true, polls })
        }

        // Created polls — public read
        const polls = await listPollsByUser(targetUserId, viewerId)
        return NextResponse.json({ success: true, polls })
    } catch (error) {
        console.error('[GET /api/polls/user/[userId]] error:', error)
        return NextResponse.json({ success: false, error: 'Failed to load polls' }, { status: 500 })
    }
}
