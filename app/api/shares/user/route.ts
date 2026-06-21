/**
 * GET /api/shares/user
 *
 * Return all shares for the authenticated user together with aggregate
 * statistics. Auth.js session required (cookie-based; no bearer token).
 *
 * Response:
 * {
 *   success: boolean
 *   shares?: ShareableLink[]
 *   stats?: ShareStats
 *   error?: string
 * }
 */

import { NextRequest, NextResponse } from 'next/server'

import { withAuth } from '@/lib/auth-middleware'
import { getUserShares, getShareStats } from '@/db/queries/shares'
import { apiError } from '@/utils/debugLogger'

async function handleGetUserShares(_request: NextRequest, userId: string): Promise<NextResponse> {
    try {
        const [sharesList, stats] = await Promise.all([
            getUserShares(userId),
            getShareStats(userId),
        ])

        return NextResponse.json({ success: true, shares: sharesList, stats })
    } catch (error) {
        apiError('Error fetching user shares:', error)

        return NextResponse.json(
            { success: false, error: 'Failed to load user shares' },
            { status: 500 }
        )
    }
}

export const GET = withAuth(handleGetUserShares)
