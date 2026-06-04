/**
 * Admin API: Get Current User ID
 *
 * Returns the current authenticated user's ID for debugging.
 * GET /api/admin/get-current-user
 */

import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { verifyIdToken } from '../../../../lib/firebase-admin'

export async function GET(request: NextRequest) {
    // Only allow in development
    if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json({ error: 'Only available in development' }, { status: 403 })
    }

    try {
        const headersList = await headers()
        const authHeader = headersList.get('authorization')

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { error: 'No auth token provided. Please sign in first.' },
                { status: 401 }
            )
        }

        const idToken = authHeader.substring(7)
        const decodedToken = await verifyIdToken(idToken)

        return NextResponse.json({
            userId: decodedToken.uid,
            email: decodedToken.email,
        })
    } catch (error) {
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Failed to get user',
            },
            { status: 500 }
        )
    }
}
