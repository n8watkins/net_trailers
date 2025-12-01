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

        console.log('👑 Admin check - Auth result:', {
            authenticated: authResult.authenticated,
            userId: authResult.userId,
        })

        if (!authResult.authenticated || !authResult.userId) {
            console.log('👑 Admin check - Not authenticated')
            return NextResponse.json({ isAdmin: false }, { status: 403 })
        }

        // Check if user is admin (server-side only)
        const userIsAdmin = isAdmin(authResult.userId)

        console.log('👑 Admin check - Is admin?', {
            userId: authResult.userId,
            isAdmin: userIsAdmin,
            adminUID: process.env.ADMIN_UID,
        })

        if (!userIsAdmin) {
            console.log('👑 Admin check - User is not admin')
            return NextResponse.json({ isAdmin: false }, { status: 403 })
        }

        console.log('👑 Admin check - Access granted')
        return NextResponse.json({ isAdmin: true }, { status: 200 })
    } catch (error) {
        console.error('👑 ❌ Admin check error:', error)
        return NextResponse.json({ isAdmin: false }, { status: 500 })
    }
}
