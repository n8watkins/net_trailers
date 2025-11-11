/**
 * PATCH /api/shares/[shareId]/toggle
 *
 * Toggle share active status (activate/deactivate)
 *
 * SECURITY: Requires valid Firebase ID token in Authorization header
 *
 * Request body:
 * {
 *   isActive: boolean
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { deactivateShare, reactivateShare } from '../../../../../utils/firestore/shares'
import { withAuth } from '../../../../../lib/auth-middleware'

interface RouteContext {
    params: Promise<{
        shareId: string
    }>
}

async function handleToggleShare(
    request: NextRequest,
    userId: string,
    context?: RouteContext
): Promise<NextResponse> {
    try {
        if (!context) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid request context',
                },
                { status: 400 }
            )
        }

        const { shareId } = await context.params

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

// Export authenticated handler
export const PATCH = withAuth(handleToggleShare)
