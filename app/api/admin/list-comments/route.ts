/**
 * Admin API: List All Comments
 *
 * Returns all comments with their text.
 * GET /api/admin/list-comments
 */

import { NextResponse } from 'next/server'
import { getAdminDb } from '../../../../lib/firebase-admin'

export async function GET() {
    // Only allow in development
    if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json({ error: 'Only available in development' }, { status: 403 })
    }

    try {
        const adminDb = getAdminDb()

        const commentsSnapshot = await adminDb.collection('ranking_comments').get()

        const comments = commentsSnapshot.docs.map((doc) => {
            const data = doc.data()
            return {
                id: doc.id,
                text: data.text,
                userName: data.userName,
                userId: data.userId,
                rankingId: data.rankingId,
                createdAt: data.createdAt,
            }
        })

        return NextResponse.json({
            success: true,
            count: comments.length,
            comments,
        })
    } catch (error) {
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Failed to list comments',
            },
            { status: 500 }
        )
    }
}
