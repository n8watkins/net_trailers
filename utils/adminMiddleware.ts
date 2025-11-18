/**
 * Admin Middleware Utilities
 *
 * Server-side middleware for validating admin access via Firebase Auth
 * This eliminates the need to expose ADMIN_TOKEN to the client
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth } from '@/lib/firebase-admin'
import { isAdmin } from './adminAuth'

export interface AdminAuthResult {
    authorized: boolean
    userId?: string
    error?: string
}

/**
 * Validate that the request comes from an authenticated admin user
 * Uses Firebase ID token validation instead of exposed ADMIN_TOKEN
 *
 * @param request - Next.js request object
 * @returns Admin auth result with userId if authorized
 */
export async function validateAdminRequest(request: NextRequest): Promise<AdminAuthResult> {
    try {
        // Get Firebase ID token from Authorization header
        const authHeader = request.headers.get('authorization')
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return {
                authorized: false,
                error: 'No authorization token provided',
            }
        }

        const idToken = authHeader.substring(7)

        // Verify Firebase ID token
        const auth = getAdminAuth()
        let decodedToken
        try {
            decodedToken = await auth.verifyIdToken(idToken)
        } catch (error) {
            return {
                authorized: false,
                error: 'Invalid or expired token',
            }
        }

        const userId = decodedToken.uid

        // Check if user is admin
        if (!isAdmin(userId)) {
            return {
                authorized: false,
                error: 'User is not an administrator',
            }
        }

        // User is authenticated and is admin
        return {
            authorized: true,
            userId,
        }
    } catch (error) {
        console.error('Error validating admin request:', error)
        return {
            authorized: false,
            error: 'Internal server error during validation',
        }
    }
}

/**
 * Create an unauthorized response
 */
export function createUnauthorizedResponse(message?: string): NextResponse {
    return NextResponse.json(
        { error: message || 'Unauthorized - Admin access required' },
        { status: 401 }
    )
}

/**
 * Create a forbidden response
 */
export function createForbiddenResponse(message?: string): NextResponse {
    return NextResponse.json(
        { error: message || 'Forbidden - Insufficient permissions' },
        { status: 403 }
    )
}
