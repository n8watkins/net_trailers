/**
 * /api/polls/[id]/vote
 *
 * POST - Cast or change the authenticated user's vote on a poll.
 *
 * Body: { optionIds: string[] }
 *
 * One-vote-per-user is enforced server-side in castVote() which runs inside a
 * db.transaction(); the client-supplied userId is NEVER trusted — the id comes
 * from the Auth.js session via withAuth.
 *
 * Returns the updated poll row (options + totalVotes recomputed).
 */

import { NextRequest, NextResponse } from 'next/server'

import { withAuth } from '@/lib/auth-middleware'
import { castVote } from '@/db/queries/polls'

type RouteContext = { params: Promise<{ id: string }> }

export const POST = withAuth(
    async (request: NextRequest, userId: string, context?: RouteContext) => {
        const { id: pollId } = await context!.params

        if (!pollId) {
            return NextResponse.json({ success: false, error: 'Missing poll id' }, { status: 400 })
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

        if (!body || typeof body !== 'object') {
            return NextResponse.json(
                { success: false, error: 'Missing request body' },
                { status: 400 }
            )
        }

        const { optionIds } = body as Record<string, unknown>

        if (!Array.isArray(optionIds) || optionIds.length === 0) {
            return NextResponse.json(
                { success: false, error: 'optionIds must be a non-empty array' },
                { status: 400 }
            )
        }

        const validOptionIds = (optionIds as unknown[]).filter(
            (id): id is string => typeof id === 'string' && id.length > 0
        )
        if (validOptionIds.length === 0) {
            return NextResponse.json(
                { success: false, error: 'optionIds must contain valid string ids' },
                { status: 400 }
            )
        }

        try {
            const poll = await castVote(pollId, userId, validOptionIds)
            return NextResponse.json({ success: true, poll })
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to vote'
            const status = message === 'Poll not found' ? 404 : 500
            console.error('[POST /api/polls/[id]/vote] error:', error)
            return NextResponse.json({ success: false, error: message }, { status })
        }
    }
)
