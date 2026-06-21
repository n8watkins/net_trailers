/**
 * /api/polls
 *
 * GET  - List polls (public; viewer's vote included when session exists).
 * POST - Create a poll (requires auth).
 *
 * Query params for GET:
 *   category  ForumCategory value to filter by (optional)
 *   sort      'recent' | 'most-voted'  (default: 'recent')
 *   limit     number (default 20, max 50)
 *   offset    number (default 0)
 */

import { NextRequest, NextResponse } from 'next/server'

import { withAuth } from '@/lib/auth-middleware'
import { currentUserId } from '@/db/queries/_helpers'
import { createPoll, listPolls, type PollListSort } from '@/db/queries/polls'
import type { ForumCategory } from '@/types/forum'

/* -------------------------------------------------------------------------- */
/*  GET — list polls (public read, optional viewer vote)                       */
/* -------------------------------------------------------------------------- */

export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        const { searchParams } = new URL(request.url)

        const category = searchParams.get('category') as ForumCategory | null
        const sort = (searchParams.get('sort') ?? 'recent') as PollListSort
        const rawLimit = parseInt(searchParams.get('limit') ?? '20', 10)
        const limit = Math.min(isNaN(rawLimit) ? 20 : rawLimit, 50)
        const rawOffset = parseInt(searchParams.get('offset') ?? '0', 10)
        const offset = isNaN(rawOffset) ? 0 : rawOffset

        // Identify the viewer without requiring authentication
        const viewerId = await currentUserId()

        const polls = await listPolls({
            category: category ?? undefined,
            sort,
            limit,
            offset,
            viewerId,
        })

        return NextResponse.json({ success: true, polls })
    } catch (error) {
        console.error('[GET /api/polls] error:', error)
        return NextResponse.json({ success: false, error: 'Failed to load polls' }, { status: 500 })
    }
}

/* -------------------------------------------------------------------------- */
/*  POST — create poll (auth required)                                         */
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

    const {
        question,
        options: optionTexts,
        category,
        userName,
        userAvatar,
        description,
        tags,
    } = body as Record<string, unknown>

    // Validate required fields
    if (!question || typeof question !== 'string' || !question.trim()) {
        return NextResponse.json({ success: false, error: 'question is required' }, { status: 400 })
    }
    if (question.length > 200) {
        return NextResponse.json(
            { success: false, error: 'question must be ≤ 200 characters' },
            { status: 400 }
        )
    }

    if (!Array.isArray(optionTexts) || optionTexts.length < 2 || optionTexts.length > 10) {
        return NextResponse.json(
            { success: false, error: 'options must be an array of 2–10 strings' },
            { status: 400 }
        )
    }
    const validOptions = (optionTexts as unknown[]).filter(
        (o): o is string => typeof o === 'string' && o.trim().length > 0
    )
    if (validOptions.length < 2) {
        return NextResponse.json(
            { success: false, error: 'At least 2 non-empty options are required' },
            { status: 400 }
        )
    }

    const VALID_CATEGORIES: ForumCategory[] = [
        'general',
        'movies',
        'tv-shows',
        'recommendations',
        'rankings',
        'announcements',
    ]
    if (!category || !VALID_CATEGORIES.includes(category as ForumCategory)) {
        return NextResponse.json(
            { success: false, error: `category must be one of: ${VALID_CATEGORIES.join(', ')}` },
            { status: 400 }
        )
    }

    try {
        const pollId = await createPoll({
            userId,
            userName: typeof userName === 'string' ? userName : 'Anonymous',
            userAvatar: typeof userAvatar === 'string' ? userAvatar : null,
            question: question.trim(),
            optionTexts: validOptions,
            category: category as ForumCategory,
            description: typeof description === 'string' ? description : undefined,
            tags: Array.isArray(tags)
                ? (tags as unknown[]).filter((t): t is string => typeof t === 'string')
                : undefined,
        })

        return NextResponse.json({ success: true, pollId }, { status: 201 })
    } catch (error) {
        console.error('[POST /api/polls] error:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to create poll' },
            { status: 500 }
        )
    }
})
