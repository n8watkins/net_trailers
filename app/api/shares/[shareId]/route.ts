/**
 * GET /api/shares/[shareId]
 *
 * Get shared collection data (public endpoint)
 * Validates share, increments view count, returns collection data
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

interface RouteContext {
    params: Promise<{
        shareId: string
    }>
}

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

        // Increment view count asynchronously (don't wait)
        incrementViewCount(db, shareId).catch((err) =>
            console.error('Failed to increment view count:', err)
        )

        return NextResponse.json({
            success: true,
            data,
        })
    } catch (error) {
        console.error('Error fetching shared collection:', error)

        return NextResponse.json(
            {
                success: false,
                error: 'Failed to load shared collection',
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
        console.error('Error deleting share:', error)

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
