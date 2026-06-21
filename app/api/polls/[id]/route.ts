/**
 * /api/polls/[id]
 *
 * GET    - Fetch a single poll with the viewer's vote (public read).
 * PATCH  - Update question/options/category within 5-minute edit window (owner only).
 * DELETE - Delete a poll and all its votes (owner or admin).
 *
 * PATCH body shape:
 *   { question?: string; options?: string[]; category?: ForumCategory;
 *     hidden?: boolean }
 *
 * `hidden` is handled separately from the edit-window check — visibility
 * can be toggled by the owner at any time.  If `hidden` is the only field
 * supplied, only the visibility is changed without checking the edit window.
 */

import { NextRequest, NextResponse } from 'next/server'

import { withAuth } from '@/lib/auth-middleware'
import { currentUserId } from '@/db/queries/_helpers'
import { deletePoll, getPollByIdWithVote, setPollVisibility, updatePoll } from '@/db/queries/polls'
import type { ForumCategory } from '@/types/forum'

type RouteContext = { params: Promise<{ id: string }> }

/* -------------------------------------------------------------------------- */
/*  GET — single poll (public, viewer vote included)                           */
/* -------------------------------------------------------------------------- */

export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
    const { id: pollId } = await context.params

    if (!pollId) {
        return NextResponse.json({ success: false, error: 'Missing poll id' }, { status: 400 })
    }

    try {
        const viewerId = await currentUserId()
        const poll = await getPollByIdWithVote(pollId, viewerId)

        if (!poll) {
            return NextResponse.json({ success: false, error: 'Poll not found' }, { status: 404 })
        }

        return NextResponse.json({ success: true, poll })
    } catch (error) {
        console.error('[GET /api/polls/[id]] error:', error)
        return NextResponse.json({ success: false, error: 'Failed to load poll' }, { status: 500 })
    }
}

/* -------------------------------------------------------------------------- */
/*  PATCH — update poll (auth required, owner only)                            */
/* -------------------------------------------------------------------------- */

export const PATCH = withAuth(
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

        const { question, options, category, hidden } = body as Record<string, unknown>

        // Determine whether this is a visibility-only toggle or a content edit
        const isVisibilityOnly =
            hidden !== undefined &&
            question === undefined &&
            options === undefined &&
            category === undefined

        try {
            if (isVisibilityOnly) {
                // Visibility toggle — no edit-window restriction
                const poll = await setPollVisibility(pollId, userId, Boolean(hidden))
                return NextResponse.json({ success: true, poll })
            }

            // Content edits — subject to 5-minute edit window
            const updates: Parameters<typeof updatePoll>[2] = {}

            if (hidden !== undefined) {
                // Mix: update content AND toggle visibility
                await setPollVisibility(pollId, userId, Boolean(hidden))
            }

            if (question !== undefined) {
                if (typeof question !== 'string' || !question.trim()) {
                    return NextResponse.json(
                        { success: false, error: 'question must be a non-empty string' },
                        { status: 400 }
                    )
                }
                if (question.length > 200) {
                    return NextResponse.json(
                        { success: false, error: 'question must be ≤ 200 characters' },
                        { status: 400 }
                    )
                }
                updates.question = question.trim()
            }

            if (options !== undefined) {
                if (!Array.isArray(options)) {
                    return NextResponse.json(
                        { success: false, error: 'options must be an array' },
                        { status: 400 }
                    )
                }
                const validOptions = (options as unknown[]).filter(
                    (o): o is string => typeof o === 'string' && o.trim().length > 0
                )
                if (validOptions.length < 2 || validOptions.length > 10) {
                    return NextResponse.json(
                        { success: false, error: 'options must have 2–10 non-empty entries' },
                        { status: 400 }
                    )
                }
                updates.optionTexts = validOptions
            }

            if (category !== undefined) {
                updates.category = category as ForumCategory
            }

            if (Object.keys(updates).length === 0) {
                return NextResponse.json(
                    { success: false, error: 'No fields to update' },
                    { status: 400 }
                )
            }

            const poll = await updatePoll(pollId, userId, updates)
            return NextResponse.json({ success: true, poll })
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update poll'
            const status =
                message === 'Poll not found'
                    ? 404
                    : message === 'Unauthorized'
                      ? 403
                      : message.startsWith('Edit window')
                        ? 409
                        : 500
            console.error('[PATCH /api/polls/[id]] error:', error)
            return NextResponse.json({ success: false, error: message }, { status })
        }
    }
)

/* -------------------------------------------------------------------------- */
/*  DELETE — delete poll (auth required, owner or admin)                       */
/* -------------------------------------------------------------------------- */

export const DELETE = withAuth(
    async (request: NextRequest, userId: string, context?: RouteContext) => {
        const { id: pollId } = await context!.params

        if (!pollId) {
            return NextResponse.json({ success: false, error: 'Missing poll id' }, { status: 400 })
        }

        try {
            await deletePoll(pollId, userId)
            return NextResponse.json({ success: true })
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to delete poll'
            const status =
                message === 'Poll not found' ? 404 : message === 'Unauthorized' ? 403 : 500
            console.error('[DELETE /api/polls/[id]] error:', error)
            return NextResponse.json({ success: false, error: message }, { status })
        }
    }
)
