/**
 * GET /api/shares/[shareId]
 *
 * Public read of shared collection data. Validates isActive + expiry
 * server-side. Does NOT increment view count (use POST for that).
 *
 * POST /api/shares/[shareId]
 *
 * Track a view for a shared collection. CSRF-protected by proxy.ts (only
 * POST from the same origin is allowed). Separated from GET to prevent
 * view inflation via img tags, prefetch, etc.
 *
 * DELETE /api/shares/[shareId]
 *
 * Permanently delete a share link. Requires Auth.js session; only the
 * owner may delete.
 */

import { NextRequest, NextResponse } from 'next/server'

import { withAuth } from '@/lib/auth-middleware'
import { deleteShare, getSharedCollectionData, incrementViewCount } from '@/db/queries/shares'
import { apiError } from '@/utils/debugLogger'

interface RouteContext {
    params: Promise<{ shareId: string }>
}

/**
 * GET: Read-only fetch of shared collection data.
 * No auth required. View count is NOT incremented here.
 */
export async function GET(_request: NextRequest, { params }: RouteContext) {
    try {
        const { shareId } = await params

        if (!shareId) {
            return NextResponse.json(
                { success: false, error: 'Share ID is required' },
                { status: 400 }
            )
        }

        const data = await getSharedCollectionData(shareId)

        if (!data) {
            return NextResponse.json(
                { success: false, error: 'Share link not found, expired, or inactive' },
                { status: 404 }
            )
        }

        return NextResponse.json({ success: true, data })
    } catch (error) {
        apiError('Error fetching shared collection:', error)

        return NextResponse.json(
            { success: false, error: 'Failed to load shared collection' },
            { status: 500 }
        )
    }
}

/**
 * POST: Track a view (CSRF-protected by proxy.ts).
 * No auth required. Only increments if the share is still valid.
 */
export async function POST(_request: NextRequest, { params }: RouteContext) {
    try {
        const { shareId } = await params

        if (!shareId) {
            return NextResponse.json(
                { success: false, error: 'Share ID is required' },
                { status: 400 }
            )
        }

        // Verify the share is still valid before incrementing.
        const data = await getSharedCollectionData(shareId)
        if (!data) {
            return NextResponse.json(
                { success: false, error: 'Share link not found, expired, or inactive' },
                { status: 404 }
            )
        }

        await incrementViewCount(shareId)

        return NextResponse.json({ success: true, message: 'View tracked' })
    } catch (error) {
        apiError('Error tracking share view:', error)

        return NextResponse.json({ success: false, error: 'Failed to track view' }, { status: 500 })
    }
}

/**
 * DELETE: Remove share permanently. Auth required; ownership enforced in
 * the query layer (deleteShare throws if userId doesn't match).
 */
async function handleDeleteShare(
    _request: NextRequest,
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

        await deleteShare(shareId, userId)

        return NextResponse.json({ success: true, message: 'Share link deleted successfully' })
    } catch (error) {
        apiError('Error deleting share:', error)

        const errorMessage = error instanceof Error ? error.message : 'Failed to delete share link'
        const status = errorMessage.includes('Only the owner') ? 403 : 500

        return NextResponse.json({ success: false, error: errorMessage }, { status })
    }
}

export const DELETE = withAuth(handleDeleteShare)
