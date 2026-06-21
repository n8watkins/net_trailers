/**
 * Admin API: List All Rankings (dev-only debugging helper)
 *
 * Returns all rankings from the Drizzle `rankings` table.
 * GET /api/admin/list-rankings
 */

import { desc } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { db } from '@/db'
import { rankings } from '@/db/schema'

export async function GET() {
    // Only allow in development
    if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json({ error: 'Only available in development' }, { status: 403 })
    }

    try {
        const rows = await db
            .select({
                id: rankings.id,
                title: rankings.title,
                userId: rankings.userId,
                userName: rankings.userName,
                comments: rankings.comments,
                likes: rankings.likes,
                createdAt: rankings.createdAt,
            })
            .from(rankings)
            .orderBy(desc(rankings.createdAt))

        return NextResponse.json({
            success: true,
            count: rows.length,
            rankings: rows,
        })
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to list rankings' },
            { status: 500 }
        )
    }
}
