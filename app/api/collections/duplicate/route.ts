/**
 * POST /api/collections/duplicate
 *
 * Duplicate a shared collection to the user's account
 *
 * Request body:
 * {
 *   name: string
 *   items: Content[]
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '../../../../firebase'
import { UserList } from '../../../../types/userLists'
import { Content } from '../../../../typings'
import { nanoid } from 'nanoid'

export async function POST(request: NextRequest) {
    try {
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

        // Get user document
        const userRef = doc(db, `users/${userId}`)
        const userSnap = await getDoc(userRef)

        if (!userSnap.exists()) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'User not found',
                },
                { status: 404 }
            )
        }

        const userData = userSnap.data()
        const existingLists: UserList[] = userData.userCreatedWatchlists || []

        // Create new collection
        const newCollection: UserList = {
            id: nanoid(),
            name,
            items,
            isPublic: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            collectionType: 'manual',
        }

        // Add to user's collections
        const updatedLists = [...existingLists, newCollection]

        // Update Firestore
        await updateDoc(userRef, {
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
