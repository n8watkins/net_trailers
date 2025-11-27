/**
 * CSRF Protection Middleware
 *
 * Validates Origin and Referer headers to prevent Cross-Site Request Forgery attacks
 * Allows bypass for authenticated server-to-server calls (cron jobs, webhooks)
 */

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

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

// Server-side secrets for bypass
const CRON_SECRET = process.env.CRON_SECRET

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
 * Timing-safe comparison of cron secret tokens.
 * Prevents timing attacks by using constant-time comparison.
 */
function isValidCronSecret(token: string | null | undefined): boolean {
    if (!token || !CRON_SECRET) return false
    try {
        const encoder = new TextEncoder()
        const tokenBytes = encoder.encode(token)
        const secretBytes = encoder.encode(CRON_SECRET)
        if (tokenBytes.length !== secretBytes.length) return false
        return crypto.timingSafeEqual(tokenBytes, secretBytes)
    } catch {
        return false
    }
}

/**
 * Check if request is an authenticated server-to-server call
 * These can bypass CSRF checks because they use secure authentication
 */
function isServerToServerCall(request: NextRequest): boolean {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) return false

    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader

    // Check for cron secret (machine-to-machine)
    if (isValidCronSecret(token)) {
        return true
    }

    // Firebase ID tokens start with "eyJ" (base64-encoded JWT header)
    // These are verified server-side by Firebase Admin SDK
    if (token.startsWith('eyJ')) {
        return true
    }

    return false
}

/**
 * Apply CSRF protection to a request
 * Returns null if valid, NextResponse with 403 status if CSRF detected
 *
 * Bypasses CSRF for:
 * - Safe methods (GET, HEAD, OPTIONS)
 * - Authenticated server-to-server calls (cron jobs with CRON_SECRET)
 * - Requests with valid Firebase ID tokens (verified by downstream handlers)
 */
export function applyCsrfProtection(request: NextRequest): NextResponse | null {
    // Only check state-changing methods
    const method = request.method
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
        return null // Safe methods don't need CSRF protection
    }

    // Allow authenticated server-to-server calls to bypass CSRF
    // These use secure tokens that cannot be forged by attackers
    if (isServerToServerCall(request)) {
        return null
    }

    // Validate origin/referer for browser-based requests
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
