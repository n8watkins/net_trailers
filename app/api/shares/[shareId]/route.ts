/**
 * GET /api/shares/[shareId]
 *
 * Get shared collection data (public endpoint)
 * Validates share, increments view count, returns collection data
 *
 * DELETE /api/shares/[shareId]
 *
 * Delete a share link (requires ownership)
 */

import { NextRequest, NextResponse } from 'next/server'
import {
    getSharedCollectionData,
    incrementViewCount,
    deleteShare,
} from '../../../../utils/firestore/shares'

interface RouteContext {
    params: {
        shareId: string
    }
}

export async function GET(request: NextRequest, { params }: RouteContext) {
    try {
        const { shareId } = params

        if (!shareId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Share ID is required',
                },
                { status: 400 }
            )
        }

        // Get shared collection data (includes validation)
        const data = await getSharedCollectionData(shareId)

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
        incrementViewCount(shareId).catch((err) =>
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

export async function DELETE(request: NextRequest, { params }: RouteContext) {
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

        // Delete share (validates ownership)
        await deleteShare(shareId, userId)

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
