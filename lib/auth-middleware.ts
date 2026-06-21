/**
 * API Authentication Middleware
 *
 * Reads the Auth.js (NextAuth) session to authenticate API requests. The
 * session cookie is validated server-side, so callers no longer pass a bearer
 * token. `withAuth(handler)` keeps its `(request, userId) => NextResponse`
 * signature, so existing route handlers are unchanged.
 */

import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/auth'

export interface AuthenticatedRequest extends NextRequest {
    userId: string
}

export interface AuthResult {
    authenticated: boolean
    userId?: string
    isAdmin?: boolean
    error?: string
    response?: NextResponse
}

/**
 * Verify authentication for an API request via the Auth.js session.
 *
 * @returns Authentication result with user ID (and admin flag) or a 401 response.
 */
export async function verifyAuthentication(_request?: NextRequest): Promise<AuthResult> {
    const session = await auth()

    if (!session?.user?.id) {
        return {
            authenticated: false,
            error: 'Authentication required. Please sign in.',
            response: NextResponse.json(
                {
                    success: false,
                    error: 'Authentication required. Please sign in.',
                },
                { status: 401 }
            ),
        }
    }

    return {
        authenticated: true,
        userId: session.user.id,
        isAdmin: session.user.isAdmin,
    }
}

/**
 * Require authentication for an API route.
 *
 * Higher-order function that wraps a handler; calls it with the authenticated
 * user id when a valid session is present, otherwise returns 401.
 */
export function withAuth<T = unknown>(
    handler: (request: NextRequest, userId: string, context?: T) => Promise<NextResponse>
) {
    return async (request: NextRequest, context?: T): Promise<NextResponse> => {
        const authResult = await verifyAuthentication(request)

        if (!authResult.authenticated) {
            return authResult.response!
        }

        return handler(request, authResult.userId!, context)
    }
}
