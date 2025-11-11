/**
 * API Authentication Middleware
 *
 * Verifies Firebase ID tokens to authenticate API requests.
 * Prevents header spoofing by validating tokens server-side.
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyIdToken } from './firebase-admin'

export interface AuthenticatedRequest extends NextRequest {
    userId: string
}

/**
 * Authentication result for middleware
 */
export interface AuthResult {
    authenticated: boolean
    userId?: string
    error?: string
    response?: NextResponse
}

/**
 * Verify authentication for an API request
 *
 * Checks for a valid Firebase ID token in the Authorization header.
 * Returns authentication status and user ID if successful.
 *
 * @param request - Next.js API request
 * @returns Authentication result with user ID or error
 */
export async function verifyAuthentication(request: NextRequest): Promise<AuthResult> {
    try {
        // Check for Authorization header with Bearer token
        const authHeader = request.headers.get('authorization')

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return {
                authenticated: false,
                error: 'Authentication required. Please provide a valid authorization token.',
                response: NextResponse.json(
                    {
                        success: false,
                        error: 'Authentication required. Please sign in.',
                    },
                    { status: 401 }
                ),
            }
        }

        // Extract token
        const idToken = authHeader.substring(7) // Remove 'Bearer ' prefix

        // Verify token with Firebase Admin SDK
        const decodedToken = await verifyIdToken(idToken)

        // Token is valid - return user ID
        return {
            authenticated: true,
            userId: decodedToken.uid,
        }
    } catch (error) {
        console.error('Authentication error:', error)

        // Check for specific error types
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'

        const status = 401
        let userMessage = 'Invalid or expired authentication token.'

        if (errorMessage.includes('expired')) {
            userMessage = 'Your session has expired. Please sign in again.'
        } else if (errorMessage.includes('invalid')) {
            userMessage = 'Invalid authentication token. Please sign in again.'
        }

        return {
            authenticated: false,
            error: userMessage,
            response: NextResponse.json(
                {
                    success: false,
                    error: userMessage,
                },
                { status }
            ),
        }
    }
}

/**
 * Require authentication for an API route
 *
 * Higher-order function that wraps an API handler with authentication.
 * Use this to protect routes that require authentication.
 *
 * @param handler - API route handler function
 * @returns Wrapped handler with authentication
 */
export function withAuth<T = unknown>(
    handler: (request: NextRequest, userId: string, context?: T) => Promise<NextResponse>
) {
    return async (request: NextRequest, context?: T): Promise<NextResponse> => {
        // Verify authentication
        const authResult = await verifyAuthentication(request)

        if (!authResult.authenticated) {
            return authResult.response!
        }

        // Call the actual handler with the authenticated user ID
        return handler(request, authResult.userId!, context)
    }
}
