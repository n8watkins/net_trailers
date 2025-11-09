/**
 * PATCH /api/shares/[shareId]/toggle
 *
 * Toggle share active status (activate/deactivate)
 *
 * Request body:
 * {
 *   isActive: boolean
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { deactivateShare, reactivateShare } from '../../../../../utils/firestore/shares'

interface RouteContext {
    params: {
        shareId: string
    }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
    try {
        const { shareId } = params

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

        if (!shareId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Share ID is required',
                },
                { status: 400 }
            )
        }

        // Parse request body
        const body = await request.json()
        const { isActive } = body

        if (typeof isActive !== 'boolean') {
            return NextResponse.json(
                {
                    success: false,
                    error: 'isActive must be a boolean',
                },
                { status: 400 }
            )
        }

        // Toggle active status
        if (isActive) {
            await reactivateShare(shareId, userId)
        } else {
            await deactivateShare(shareId, userId)
        }

        return NextResponse.json({
            success: true,
            message: `Share link ${isActive ? 'activated' : 'deactivated'} successfully`,
        })
    } catch (error) {
        console.error('Error toggling share status:', error)

        const errorMessage =
            error instanceof Error ? error.message : 'Failed to toggle share status'

        // Check for permission error
        const status = errorMessage.includes('Only the owner') ? 403 : 500

        return NextResponse.json(
            {
                success: false,
                error: errorMessage,
            },
            { status }
        )
    }
}
