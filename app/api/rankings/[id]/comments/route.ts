/**
 * /api/rankings/[id]/comments
 *
 * GET  — List comments for a ranking (no auth; replies are embedded in the response).
 * POST — Create a new comment or reply (authenticated users only).
 */

import { NextRequest, NextResponse } from 'next/server'

import { withAuth } from '@/lib/auth-middleware'
import { createComment, getRankingComments } from '@/db/queries/rankingComments'
import type { CreateCommentRequest } from '@/types/rankings'

/* -------------------------------------------------------------------------- */
/*  GET /api/rankings/[id]/comments                                            */
/* -------------------------------------------------------------------------- */

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: rankingId } = await params
        const { searchParams } = request.nextUrl
        const limit = Math.min(Number(searchParams.get('limit') || '50'), 100)
        const offset = Number(searchParams.get('offset') || '0')

        if (!rankingId) {
            return NextResponse.json(
                { success: false, error: 'Ranking ID is required' },
                { status: 400 }
            )
        }

        const result = await getRankingComments(rankingId, limit, offset)
        return NextResponse.json({ success: true, ...result })
    } catch (error) {
        console.error('GET /api/rankings/[id]/comments error:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch comments' },
            { status: 500 }
        )
    }
}

/* -------------------------------------------------------------------------- */
/*  POST /api/rankings/[id]/comments                                           */
/* -------------------------------------------------------------------------- */

export const POST = withAuth(
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

        const { userName, userAvatar, type, positionNumber, text, parentCommentId } = body as {
            userName?: string
            userAvatar?: string
            type?: 'ranking' | 'position'
            positionNumber?: number
            text?: string
            parentCommentId?: string
        }

        if (!userName || typeof userName !== 'string') {
            return NextResponse.json(
                { success: false, error: 'userName is required' },
                { status: 400 }
            )
        }

        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            return NextResponse.json(
                { success: false, error: 'Comment text is required' },
                { status: 400 }
            )
        }

        if (text.trim().length > 500) {
            return NextResponse.json(
                { success: false, error: 'Comment exceeds maximum length of 500 characters' },
                { status: 400 }
            )
        }

        const createRequest: CreateCommentRequest = {
            rankingId,
            type: type ?? 'ranking',
            positionNumber,
            text: text.trim(),
            parentCommentId,
        }

        try {
            const comment = await createComment(userId, userName, userAvatar, createRequest)
            return NextResponse.json({ success: true, comment }, { status: 201 })
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Failed to create comment'
            const status = msg.includes('not found') ? 404 : msg.includes('maximum') ? 422 : 500
            console.error('POST /api/rankings/[id]/comments error:', error)
            return NextResponse.json({ success: false, error: msg }, { status })
        }
    }
)
