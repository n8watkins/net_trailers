/**
 * POST /api/shares/create
 *
 * Create a shareable link for a collection
 *
 * Request body:
 * {
 *   collectionId: string
 *   expiresIn?: 'never' | '7days' | '30days' | '90days'
 *   settings?: Partial<ShareSettings>
 *   allowDuplicates?: boolean
 * }
 *
 * Response:
 * {
 *   success: boolean
 *   shareId?: string
 *   shareUrl?: string
 *   share?: ShareableLink
 *   error?: string
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createShareLink } from '../../../../utils/firestore/shares'
import { CreateShareRequest, CreateShareResponse } from '../../../../types/sharing'

export async function POST(request: NextRequest) {
    try {
        // Get user ID from headers (set by middleware or auth)
        const userId = request.headers.get('x-user-id')

        if (!userId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Authentication required. Please sign in to share collections.',
                },
                { status: 401 }
            )
        }

        // Parse request body
        const body = (await request.json()) as CreateShareRequest

        // Validate request
        if (!body.collectionId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Collection ID is required',
                },
                { status: 400 }
            )
        }

        // Create share link
        const response: CreateShareResponse = await createShareLink(userId, body.collectionId, body)

        return NextResponse.json({
            success: true,
            ...response,
        })
    } catch (error) {
        console.error('Error creating share link:', error)

        const errorMessage = error instanceof Error ? error.message : 'Failed to create share link'

        return NextResponse.json(
            {
                success: false,
                error: errorMessage,
            },
            { status: 500 }
        )
    }
}
