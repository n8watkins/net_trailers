/**
 * GET /api/rankings/comments
 *
 * Returns all top-level comments authored by the authenticated user.
 * Replaces the direct Firestore call to getUserComments() in app/rankings/page.tsx.
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-middleware'
import { getUserComments } from '@/db/queries/rankingComments'

export const GET = withAuth(async (request: NextRequest, userId: string) => {
    try {
        const { searchParams } = request.nextUrl
        const limit = Math.min(Number(searchParams.get('limit') || '50'), 200)

        const result = await getUserComments(userId, limit)

        return NextResponse.json({ success: true, ...result })
    } catch (error) {
        console.error('GET /api/rankings/comments error:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch user comments' },
            { status: 500 }
        )
    }
})
