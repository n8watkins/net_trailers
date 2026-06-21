/**
 * Admin Middleware Utilities
 *
 * Server-side validation of admin access via the Auth.js session. The session
 * carries `isAdmin` (derived from ADMIN_GITHUB_LOGIN), so no token handling or
 * UID list is needed here.
 */

import { NextRequest, NextResponse } from 'next/server'

import { verifyAuthentication } from '@/lib/auth-middleware'

export interface AdminAuthResult {
    authorized: boolean
    userId?: string
    error?: string
}

/**
 * Validate that the request comes from an authenticated admin user.
 *
 * @returns Admin auth result with userId if authorized
 */
export async function validateAdminRequest(_request?: NextRequest): Promise<AdminAuthResult> {
    const result = await verifyAuthentication()

    if (!result.authenticated || !result.userId) {
        return { authorized: false, error: 'Authentication required' }
    }

    if (!result.isAdmin) {
        return { authorized: false, error: 'User is not an administrator' }
    }

    return { authorized: true, userId: result.userId }
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
