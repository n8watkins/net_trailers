/**
 * POST /api/collections/duplicate
 *
 * Duplicate a shared collection to the user's account
 *
 * SECURITY: Requires valid Firebase ID token in Authorization header
 *
 * Request body:
 * {
 *   name: string
 *   items: Content[]
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { UserList } from '../../../../types/userLists'
import { Content } from '../../../../typings'
import { nanoid } from 'nanoid'
import { withAuth } from '../../../../lib/auth-middleware'
import { getAdminDb } from '../../../../lib/firebase-admin'

async function handleDuplicate(request: NextRequest, userId: string): Promise<NextResponse> {
    try {
        // Parse request body
        const body = await request.json()
        const { name, items } = body as { name: string; items: Content[] }

        if (!name || !items || !Array.isArray(items)) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid request. Name and items are required.',
                },
                { status: 400 }
            )
        }

        // Use Admin SDK to interact with Firestore
        const db = getAdminDb()
        const userRef = db.collection('users').doc(userId)
        const userSnap = await userRef.get()

        if (!userSnap.exists) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'User not found',
                },
                { status: 404 }
            )
        }

        const userData = userSnap.data()
        const existingLists: UserList[] = userData?.userCreatedWatchlists || []

        // Create new collection
        const newCollection: UserList = {
            id: nanoid(),
            name,
            items,
            isPublic: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            collectionType: 'manual',
            displayAsRow: false, // Don't display duplicated collections as rows by default
            order: existingLists.length, // Place at end
            enabled: true,
        }

        // Add to user's collections
        const updatedLists = [...existingLists, newCollection]

        // Update Firestore
        await userRef.update({
            userCreatedWatchlists: updatedLists,
        })

        return NextResponse.json({
            success: true,
            collection: newCollection,
            message: 'Collection saved successfully',
        })
    } catch (error) {
        console.error('Error duplicating collection:', error)

        const errorMessage =
            error instanceof Error ? error.message : 'Failed to duplicate collection'

        return NextResponse.json(
            {
                success: false,
                error: errorMessage,
            },
            { status: 500 }
        )
    }
}

// Export authenticated handler
export const POST = withAuth(handleDuplicate)
