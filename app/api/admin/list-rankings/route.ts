/**
 * Admin API: List All Rankings
 *
 * Returns all rankings for debugging.
 * GET /api/admin/list-rankings
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

        const rankingsSnapshot = await adminDb.collection('rankings').get()

        const rankings = rankingsSnapshot.docs.map((doc) => {
            const data = doc.data()
            return {
                id: doc.id,
                title: data.title,
                userId: data.userId,
                userName: data.userName,
                comments: data.comments || 0,
                likes: data.likes || 0,
                createdAt: data.createdAt,
            }
        })

        return NextResponse.json({
            success: true,
            count: rankings.length,
            rankings,
        })
    } catch (error) {
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Failed to list rankings',
            },
            { status: 500 }
        )
    }
}
