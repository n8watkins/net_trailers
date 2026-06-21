/**
 * POST /api/collections/duplicate
 *
 * Duplicate a shared collection into the authenticated user's account.
 *
 * Auth: Auth.js session cookie (withAuth). The session userId is always used as
 * the target — no client-supplied userId is trusted.
 *
 * Request body:
 * {
 *   name: string       – display name for the duplicated collection
 *   items: Content[]   – content items to copy
 * }
 *
 * Response:
 * { success: true, collection: UserList, message: string }
 * { success: false, error: string }            (4xx / 5xx)
 */

import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'

import { withAuth } from '@/lib/auth-middleware'
import { loadUserPreferences, saveUserPreferences } from '@/db/queries/userPreferences'
import { COLLECTION_CONSTRAINTS } from '@/types/collections'
import type { UserList } from '@/types/collections'
import type { Content } from '@/typings'
import { apiError } from '@/utils/debugLogger'

async function handleDuplicate(request: NextRequest, userId: string): Promise<NextResponse> {
    try {
        // Parse and validate the request body
        let body: unknown
        try {
            body = await request.json()
        } catch {
            return NextResponse.json(
                { success: false, error: 'Invalid JSON body' },
                { status: 400 }
            )
        }

        const { name, items } = (body ?? {}) as { name?: string; items?: unknown }

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return NextResponse.json(
                { success: false, error: 'Invalid request. Name is required.' },
                { status: 400 }
            )
        }

        if (!Array.isArray(items)) {
            return NextResponse.json(
                { success: false, error: 'Invalid request. items must be an array.' },
                { status: 400 }
            )
        }

        // Load the session user's preferences from Turso/Drizzle
        const preferences = await loadUserPreferences(userId)
        const existingLists: UserList[] = preferences.userCreatedWatchlists ?? []

        // Enforce the per-user collection limit
        if (existingLists.length >= COLLECTION_CONSTRAINTS.MAX_COLLECTIONS_PER_AUTH_USER) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Collection limit reached. Authenticated users may have at most ${COLLECTION_CONSTRAINTS.MAX_COLLECTIONS_PER_AUTH_USER} collections.`,
                },
                { status: 422 }
            )
        }

        const ts = Date.now()

        // Build the duplicated collection. It always lands at the end of the
        // existing list and is NOT displayed as a row by default.
        const newCollection: UserList = {
            id: nanoid(),
            name: name.trim(),
            items: items as Content[],
            createdAt: ts,
            updatedAt: ts,
            collectionType: 'manual',
            displayAsRow: false,
            order: existingLists.length,
            enabled: true,
        }

        // Persist the updated watchlists back through the shared preferences helper
        await saveUserPreferences(userId, {
            ...preferences,
            userCreatedWatchlists: [...existingLists, newCollection],
        })

        return NextResponse.json({
            success: true,
            collection: newCollection,
            message: 'Collection saved successfully',
        })
    } catch (error) {
        apiError('Error duplicating collection:', error)

        const errorMessage =
            error instanceof Error ? error.message : 'Failed to duplicate collection'

        return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
    }
}

export const POST = withAuth(handleDuplicate)
