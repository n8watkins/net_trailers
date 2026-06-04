/**
 * GET /api/shares/[shareId]
 *
 * Get shared collection data (public endpoint, read-only)
 * Validates share and returns collection data
 * NOTE: View count is NOT incremented here - use POST to track views (CSRF-safe)
 *
 * POST /api/shares/[shareId]
 *
 * Track view for a shared collection (CSRF protected by proxy.ts)
 * Increments view count - separate from GET to prevent CSRF via img/prefetch
 *
 * DELETE /api/shares/[shareId]
 *
 * Delete a share link (requires ownership)
 * SECURITY: DELETE requires valid Firebase ID token in Authorization header
 */

import { NextRequest, NextResponse } from 'next/server'
import {
    getSharedCollectionData,
    incrementViewCount,
    deleteShare,
} from '../../../../utils/firestore/shares'
import { withAuth } from '../../../../lib/auth-middleware'
import { getAdminDb } from '../../../../lib/firebase-admin'
import { apiError } from '@/utils/debugLogger'

interface RouteContext {
    params: Promise<{
        shareId: string
    }>
}

/**
 * GET: Read-only fetch of shared collection data
 * Does NOT increment view count (that requires POST to prevent CSRF)
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
    try {
        const { shareId } = await params

        if (!shareId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Share ID is required',
                },
                { status: 400 }
            )
        }

        // Get admin Firestore instance
        const db = getAdminDb()

        // Get shared collection data (includes validation)
        const data = await getSharedCollectionData(db, shareId)

        if (!data) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Share link not found, expired, or inactive',
                },
                { status: 404 }
            )
        }

        // NOTE: View count is NOT incremented here
        // Client must call POST to track views (CSRF-protected)

        return NextResponse.json({
            success: true,
            data,
        })
    } catch (error) {
        apiError('Error fetching shared collection:', error)

        return NextResponse.json(
            {
                success: false,
                error: 'Failed to load shared collection',
            },
            { status: 500 }
        )
    }
}

/**
 * POST: Track view for shared collection
 * CSRF protected by proxy.ts (requires valid Origin/Referer)
 * Separated from GET to prevent view inflation via img tags, prefetch, etc.
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
    try {
        const { shareId } = await params

        if (!shareId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Share ID is required',
                },
                { status: 400 }
            )
        }

        const db = getAdminDb()

        // Verify share exists before incrementing
        const data = await getSharedCollectionData(db, shareId)
        if (!data) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Share link not found, expired, or inactive',
                },
                { status: 404 }
            )
        }

        // Increment view count
        await incrementViewCount(db, shareId)

        return NextResponse.json({
            success: true,
            message: 'View tracked',
        })
    } catch (error) {
        apiError('Error tracking share view:', error)

        return NextResponse.json(
            {
                success: false,
                error: 'Failed to track view',
            },
            { status: 500 }
        )
    }
}

async function handleDeleteShare(
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

        // Get admin Firestore instance
        const db = getAdminDb()

        // Delete share (validates ownership)
        await deleteShare(db, shareId, userId)

        return NextResponse.json({
            success: true,
            message: 'Share link deleted successfully',
        })
    } catch (error) {
        apiError('Error deleting share:', error)

        const errorMessage = error instanceof Error ? error.message : 'Failed to delete share link'

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

// Export authenticated handler for DELETE
export const DELETE = withAuth(handleDeleteShare)
