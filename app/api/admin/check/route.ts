import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthentication } from '@/lib/auth-middleware'
import { isAdmin } from '@/utils/adminAuth'

/**
 * Check if the current user is an admin
 * Returns 200 with {isAdmin: true} if user is admin
 * Returns 403 if user is not admin
 */
export async function GET(request: NextRequest) {
    try {
        // Verify user authentication
        const authResult = await verifyAuthentication(request)

        if (!authResult.authenticated || !authResult.userId) {
            return NextResponse.json({ isAdmin: false }, { status: 403 })
        }

        // Check if user is admin (server-side only)
        const userIsAdmin = isAdmin(authResult.userId)

        if (!userIsAdmin) {
            return NextResponse.json({ isAdmin: false }, { status: 403 })
        }

        return NextResponse.json({ isAdmin: true }, { status: 200 })
    } catch (error) {
        console.error('Admin check error:', error)
        return NextResponse.json({ isAdmin: false }, { status: 500 })
    }
}
