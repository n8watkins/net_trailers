/**
 * PATCH /api/shares/[shareId]/toggle
 *
 * Activate or deactivate a share link. Auth.js session required.
 * Only the owner may toggle (enforced in the query layer).
 *
 * Request body:
 * {
 *   isActive: boolean
 * }
 *
 * Response:
 * {
 *   success: boolean
 *   message?: string
 *   error?: string
 * }
 */

import { NextRequest, NextResponse } from 'next/server'

import { withAuth } from '@/lib/auth-middleware'
import { toggleShare } from '@/db/queries/shares'
import { apiError } from '@/utils/debugLogger'

interface RouteContext {
    params: Promise<{ shareId: string }>
}

async function handleToggleShare(
    request: NextRequest,
    userId: string,
    context?: RouteContext
): Promise<NextResponse> {
    try {
        if (!context) {
            return NextResponse.json(
                { success: false, error: 'Invalid request context' },
                { status: 400 }
            )
        }

        const { shareId } = await context.params

        if (!shareId) {
            return NextResponse.json(
                { success: false, error: 'Share ID is required' },
                { status: 400 }
            )
        }

        const body = await request.json()
        const { isActive } = body

        if (typeof isActive !== 'boolean') {
            return NextResponse.json(
                { success: false, error: 'isActive must be a boolean' },
                { status: 400 }
            )
        }

        // Ownership is enforced inside toggleShare (throws on mismatch).
        await toggleShare(shareId, userId, isActive)

        return NextResponse.json({
            success: true,
            message: `Share link ${isActive ? 'activated' : 'deactivated'} successfully`,
        })
    } catch (error) {
        apiError('Error toggling share status:', error)

        const errorMessage =
            error instanceof Error ? error.message : 'Failed to toggle share status'

        const status = errorMessage.includes('Only the owner') ? 403 : 500

        return NextResponse.json({ success: false, error: errorMessage }, { status })
    }
}

export const PATCH = withAuth(handleToggleShare)
