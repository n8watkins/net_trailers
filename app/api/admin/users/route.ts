/**
 * Admin Users List API Route
 *
 * Get list of all users with signup dates and activity info
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth } from '@/lib/firebase-admin'

// Admin authorization
const ADMIN_TOKEN = process.env.NEXT_PUBLIC_ADMIN_TOKEN || 'your-secret-admin-token'

export async function GET(request: NextRequest) {
    try {
        // Verify admin authorization
        const authHeader = request.headers.get('authorization')
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const token = authHeader.substring(7)
        if (token !== ADMIN_TOKEN) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const auth = getAdminAuth()

        // Get pagination params
        const url = new URL(request.url)
        const pageSize = parseInt(url.searchParams.get('pageSize') || '100')
        const pageToken = url.searchParams.get('pageToken') || undefined

        // List users
        const listUsersResult = await auth.listUsers(pageSize, pageToken)

        // Transform user data
        const users = listUsersResult.users.map((user) => ({
            uid: user.uid,
            email: user.email || 'No email',
            displayName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
            photoURL: user.photoURL,
            emailVerified: user.emailVerified,
            disabled: user.disabled,
            createdAt: user.metadata.creationTime,
            lastSignInAt: user.metadata.lastSignInTime,
            providerData: user.providerData.map((p) => ({
                providerId: p.providerId,
                uid: p.uid,
            })),
        }))

        // Sort by creation date (newest first)
        users.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

        return NextResponse.json({
            users,
            nextPageToken: listUsersResult.pageToken,
            totalCount: users.length,
        })
    } catch (error) {
        console.error('Error fetching users:', error)
        return NextResponse.json(
            {
                error: 'Failed to fetch users',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}
