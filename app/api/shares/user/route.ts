/**
 * GET /api/shares/user
 *
 * Get all shares for the authenticated user
 * Includes statistics and share list
 *
 * SECURITY: Requires valid Firebase ID token in Authorization header
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserShares, getShareStats } from '../../../../utils/firestore/shares'
import { withAuth } from '../../../../lib/auth-middleware'

async function handleGetUserShares(request: NextRequest, userId: string): Promise<NextResponse> {
    try {
        // Get user's shares
        const shares = await getUserShares(userId)

        // Get share statistics
        const stats = await getShareStats(userId)

        return NextResponse.json({
            success: true,
            shares,
            stats,
        })
    } catch (error) {
        console.error('Error fetching user shares:', error)

        return NextResponse.json(
            {
                success: false,
                error: 'Failed to load user shares',
            },
            { status: 500 }
        )
    }
}

// Export authenticated handler
export const GET = withAuth(handleGetUserShares)
