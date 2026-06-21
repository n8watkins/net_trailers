/**
 * /api/rankings/[id]/delete
 *
 * DEPRECATED — This route previously used Firebase Admin SDK to delete rankings.
 * It is superseded by DELETE /api/rankings/[id] which uses the Turso/Drizzle
 * backend and Auth.js session authentication.
 *
 * This stub delegates to the new handler so that any cached links or older
 * client code that still calls this endpoint continues to work.
 */

import { NextRequest, NextResponse } from 'next/server'

import { isCurrentUserAdmin } from '@/db/queries/_helpers'
import { deleteRankingWithCascade, getRanking } from '@/db/queries/rankings'
import { withAuth } from '@/lib/auth-middleware'

export const DELETE = withAuth(
    async (
        _request: NextRequest,
        userId: string,
        context?: { params: Promise<{ id: string }> }
    ) => {
        const { id: rankingId } = await context!.params

        if (!rankingId) {
            return NextResponse.json(
                { success: false, error: 'Ranking ID is required' },
                { status: 400 }
            )
        }

        const ranking = await getRanking(rankingId)
        if (!ranking) {
            return NextResponse.json({ error: 'Ranking not found' }, { status: 404 })
        }

        const isAdmin = await isCurrentUserAdmin()
        if (ranking.userId !== userId && !isAdmin) {
            return NextResponse.json(
                { error: 'Unauthorized: You can only delete your own rankings' },
                { status: 403 }
            )
        }

        try {
            const deleted = await deleteRankingWithCascade(rankingId)
            return NextResponse.json({
                success: true,
                message: 'Ranking deleted successfully',
                deleted: {
                    rankingLikes: deleted.rankingLikesDeleted,
                    commentLikes: deleted.commentLikesDeleted,
                    comments: deleted.commentsDeleted,
                    ranking: 1,
                },
            })
        } catch (error) {
            console.error('DELETE /api/rankings/[id]/delete error:', error)
            return NextResponse.json(
                { error: error instanceof Error ? error.message : 'Failed to delete ranking' },
                { status: 500 }
            )
        }
    }
)
