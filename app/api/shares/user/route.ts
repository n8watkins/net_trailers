/**
 * GET /api/shares/user
 *
 * Get all shares for the authenticated user
 * Includes statistics and share list
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserShares, getShareStats } from '../../../../utils/firestore/shares'

export async function GET(request: NextRequest) {
    try {
        // Get user ID from headers
        const userId = request.headers.get('x-user-id')

        if (!userId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Authentication required',
                },
                { status: 401 }
            )
        }

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
