/**
 * CSRF Protection Middleware
 *
 * Validates Origin and Referer headers to prevent Cross-Site Request Forgery attacks
 */

import { NextRequest, NextResponse } from 'next/server'

// Allowed origins for CSRF protection
const ALLOWED_ORIGINS = [
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    'http://localhost:3000',
    'http://localhost:3001',
]

// Add production URLs if they exist
if (process.env.VERCEL_URL) {
    ALLOWED_ORIGINS.push(`https://${process.env.VERCEL_URL}`)
}
if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    ALLOWED_ORIGINS.push(`https://${process.env.NEXT_PUBLIC_VERCEL_URL}`)
}

/**
 * Validate request origin/referer to prevent CSRF attacks
 * Returns true if request is from an allowed origin
 */
export function validateOrigin(request: NextRequest): boolean {
    const origin = request.headers.get('origin')
    const referer = request.headers.get('referer')

    // Check Origin header (preferred)
    if (origin) {
        // Normalize origin (remove trailing slash)
        const normalizedOrigin = origin.replace(/\/$/, '')
        const allowed = ALLOWED_ORIGINS.some((allowedOrigin) => {
            const normalizedAllowed = allowedOrigin.replace(/\/$/, '')
            return (
                normalizedOrigin === normalizedAllowed ||
                normalizedOrigin.startsWith(normalizedAllowed)
            )
        })

        if (allowed) {
            return true
        }
    }

    // Fallback to Referer header
    if (referer) {
        const allowed = ALLOWED_ORIGINS.some((allowedOrigin) => {
            return referer.startsWith(allowedOrigin)
        })

        if (allowed) {
            return true
        }
    }

    // If neither header is present or doesn't match, reject
    return false
}

/**
 * Apply CSRF protection to a request
 * Returns null if valid, NextResponse with 403 status if CSRF detected
 */
export function applyCsrfProtection(request: NextRequest): NextResponse | null {
    // Only check state-changing methods
    const method = request.method
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
        return null // Safe methods don't need CSRF protection
    }

    // Validate origin/referer
    if (!validateOrigin(request)) {
        return NextResponse.json(
            {
                error: 'CSRF validation failed',
                message: 'Request origin not allowed',
            },
            { status: 403 }
        )
    }

    return null
}

/**
 * Higher-order function to wrap route handlers with CSRF protection
 */
export function withCsrfProtection(
    handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse>
) {
    return async (request: NextRequest, ...args: any[]): Promise<NextResponse> => {
        // Apply CSRF protection
        const csrfResponse = applyCsrfProtection(request)
        if (csrfResponse) {
            return csrfResponse
        }

        // Call original handler
        return handler(request, ...args)
    }
}

/**
 * Wrapper for auth middleware routes
 * For routes that use withAuth(), apply CSRF protection to the inner handler
 */
export function withCsrfForAuthRoute(
    handler: (request: NextRequest, userId: string, ...args: any[]) => Promise<NextResponse>
) {
    return async (request: NextRequest, userId: string, ...args: any[]): Promise<NextResponse> => {
        // Apply CSRF protection
        const csrfResponse = applyCsrfProtection(request)
        if (csrfResponse) {
            return csrfResponse
        }

        // Call original handler with userId
        return handler(request, userId, ...args)
    }
}
