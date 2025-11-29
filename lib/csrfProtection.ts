/**
 * CSRF Protection Middleware
 *
 * Validates Origin and Referer headers to prevent Cross-Site Request Forgery attacks.
 * CRON_SECRET bypass is handled separately in proxy.ts for /api/cron/* routes only.
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
 * Parse and extract origin from a URL string
 * Returns normalized origin (scheme + host + port) or null if invalid
 */
function parseOrigin(urlString: string): string | null {
    try {
        const url = new URL(urlString)
        // Origin is scheme + host (includes port if non-default)
        return url.origin
    } catch {
        return null
    }
}

/**
 * Validate request origin/referer to prevent CSRF attacks
 * Returns true if request is from an allowed origin
 *
 * SECURITY: Uses exact origin matching (scheme + host + port) to prevent
 * bypass via look-alike domains like https://allowed.com.attacker.com
 */
export function validateOrigin(request: NextRequest): boolean {
    const origin = request.headers.get('origin')
    const referer = request.headers.get('referer')

    // Normalize allowed origins for comparison
    const normalizedAllowedOrigins = ALLOWED_ORIGINS.map((o) => parseOrigin(o)).filter(
        (o): o is string => o !== null
    )

    // Check Origin header (preferred)
    if (origin) {
        const parsedOrigin = parseOrigin(origin)
        if (parsedOrigin && normalizedAllowedOrigins.includes(parsedOrigin)) {
            return true
        }
    }

    // Fallback to Referer header - extract origin from full URL
    if (referer) {
        const parsedRefererOrigin = parseOrigin(referer)
        if (parsedRefererOrigin && normalizedAllowedOrigins.includes(parsedRefererOrigin)) {
            return true
        }
    }

    // If neither header is present or doesn't match, reject
    return false
}

/**
 * Apply CSRF protection to a request
 * Returns null if valid, NextResponse with 403 status if CSRF detected
 *
 * Bypasses CSRF for:
 * - Safe methods (GET, HEAD, OPTIONS)
 *
 * NOTE: CRON_SECRET bypass is handled ONLY in proxy.ts for /api/cron/* routes.
 * This function should NOT check for CRON_SECRET to limit blast radius if leaked.
 *
 * Browser requests must have valid Origin or Referer headers.
 * User authentication is handled separately by withAuth() middleware.
 */
export function applyCsrfProtection(request: NextRequest): NextResponse | null {
    // Only check state-changing methods
    const method = request.method
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
        return null // Safe methods don't need CSRF protection
    }

    // Validate origin/referer for browser-based requests
    // NOTE: CRON_SECRET bypass removed - now handled only in proxy.ts for /api/cron/*
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

/**
 * Validate CSRF for server actions using headers() from next/headers
 * Server actions don't go through proxy.ts, so they need explicit validation
 *
 * @param headersList - Headers from next/headers
 * @returns true if origin is valid, false otherwise
 */
export function validateServerActionOrigin(headersList: Headers): boolean {
    const origin = headersList.get('origin')
    const referer = headersList.get('referer')

    // Normalize allowed origins for comparison
    const normalizedAllowedOrigins = ALLOWED_ORIGINS.map((o) => parseOrigin(o)).filter(
        (o): o is string => o !== null
    )

    // Check Origin header (preferred)
    if (origin) {
        const parsedOrigin = parseOrigin(origin)
        if (parsedOrigin && normalizedAllowedOrigins.includes(parsedOrigin)) {
            return true
        }
    }

    // Fallback to Referer header - extract origin from full URL
    if (referer) {
        const parsedRefererOrigin = parseOrigin(referer)
        if (parsedRefererOrigin && normalizedAllowedOrigins.includes(parsedRefererOrigin)) {
            return true
        }
    }

    // If neither header is present or doesn't match, reject
    return false
}
