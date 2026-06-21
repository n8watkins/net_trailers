/**
 * POST /api/shares/create
 *
 * Create a shareable link for a collection. Auth.js session is used for
 * identity — no Firebase token is required.
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

import { withAuth } from '@/lib/auth-middleware'
import { applyRateLimit, strictLimiter } from '@/lib/apiRateLimiting'
import { createShare } from '@/db/queries/shares'
import { loadUserPreferences } from '@/db/queries/userPreferences'
import { apiError } from '@/utils/debugLogger'
import type { CreateShareRequest } from '@/types/sharing'
import type { UserList } from '@/types/collections'

async function handleCreateShare(request: NextRequest, userId: string): Promise<NextResponse> {
    // Apply strict rate limiting for share creation.
    const rateLimitResponse = applyRateLimit(request, strictLimiter, 'share-create')
    if (rateLimitResponse) {
        return rateLimitResponse
    }

    try {
        const body = (await request.json()) as CreateShareRequest

        if (!body.collectionId) {
            return NextResponse.json(
                { success: false, error: 'Collection ID is required' },
                { status: 400 }
            )
        }

        // Load the user's preferences so we can find the collection and build
        // the snapshot. This is the only cross-domain read — the collection
        // lives inside userPreferences.userCreatedWatchlists.
        const preferences = await loadUserPreferences(userId)
        const collections: UserList[] = preferences.userCreatedWatchlists ?? []
        const collection = collections.find((c) => c.id === body.collectionId)

        if (!collection) {
            return NextResponse.json(
                { success: false, error: 'Collection not found' },
                { status: 404 }
            )
        }

        const response = await createShare(userId, body.collectionId, collection, body)

        return NextResponse.json({ success: true, ...response })
    } catch (error) {
        apiError('Error creating share link:', error)

        const errorMessage = error instanceof Error ? error.message : 'Failed to create share link'

        return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
    }
}

export const POST = withAuth(handleCreateShare)
