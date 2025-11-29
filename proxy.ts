import { NextRequest, NextResponse } from 'next/server'
import { applyCsrfProtection } from './lib/csrfProtection'
import crypto from 'crypto'

/**
 * Global proxy for security and request validation
 * Next.js 16+ uses "proxy" instead of "middleware"
 */

const MAX_REQUEST_BODY_SIZE = 1024 * 1024 // 1MB limit for request bodies
const MAX_JSON_PAYLOAD_SIZE = 500 * 1024 // 500KB for JSON payloads

/**
 * Safe HTTP methods that don't require CSRF protection.
 */
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS']

/**
 * Timing-safe comparison of cron secret
 */
function isValidCronSecret(token: string | null | undefined): boolean {
    const cronSecret = process.env.CRON_SECRET
    if (!token || !cronSecret) return false
    try {
        const encoder = new TextEncoder()
        const tokenBytes = encoder.encode(token)
        const secretBytes = encoder.encode(cronSecret)
        if (tokenBytes.length !== secretBytes.length) return false
        return crypto.timingSafeEqual(tokenBytes, secretBytes)
    } catch {
        return false
    }
}

/**
 * Check if request has valid CRON_SECRET in Authorization header
 */
function hasCronSecret(request: NextRequest): boolean {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) return false
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader
    return isValidCronSecret(token)
}

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl
    const method = request.method

    // Apply security checks only to API routes
    if (pathname.startsWith('/api/')) {
        // Cron routes require CRON_SECRET for ALL methods (including GET)
        // Vercel cron jobs use GET, so we check auth before the safe-method guard
        const isCronRoute = pathname.startsWith('/api/cron/')

        if (isCronRoute) {
            // Cron routes MUST have valid CRON_SECRET regardless of HTTP method
            if (!hasCronSecret(request)) {
                return NextResponse.json(
                    { error: 'Unauthorized - valid CRON_SECRET required' },
                    { status: 401 }
                )
            }
            // Valid CRON_SECRET - skip CSRF check and continue to handler
        } else if (!SAFE_METHODS.includes(method)) {
            // CSRF Protection for state-changing requests (non-cron routes only)
            const csrfResponse = applyCsrfProtection(request)
            if (csrfResponse) {
                return csrfResponse
            }
        }

        // Check Content-Length header for POST/PUT/PATCH requests
        if (['POST', 'PUT', 'PATCH'].includes(method)) {
            const contentLength = request.headers.get('content-length')
            const contentType = request.headers.get('content-type')

            if (contentLength) {
                const size = parseInt(contentLength, 10)

                // Enforce size limit based on content type
                const maxSize = contentType?.includes('application/json')
                    ? MAX_JSON_PAYLOAD_SIZE
                    : MAX_REQUEST_BODY_SIZE

                if (size > maxSize) {
                    console.warn(
                        `[Security] Request body too large: ${size} bytes (max: ${maxSize} bytes) for ${request.nextUrl.pathname}`
                    )
                    return NextResponse.json(
                        {
                            error: 'Request body too large',
                            maxSize: contentType?.includes('application/json') ? '500KB' : '1MB',
                        },
                        { status: 413 } // 413 Payload Too Large
                    )
                }
            }

            // Validate Content-Type for POST/PUT/PATCH
            // Most API routes should be application/json
            if (
                contentType &&
                !contentType.includes('application/json') &&
                !contentType.includes('multipart/form-data') &&
                !contentType.includes('application/x-www-form-urlencoded')
            ) {
                console.warn(
                    `[Security] Invalid Content-Type: ${contentType} for ${request.nextUrl.pathname}`
                )
                return NextResponse.json(
                    { error: 'Invalid Content-Type. Expected application/json' },
                    { status: 415 } // 415 Unsupported Media Type
                )
            }
        }
    }

    // Continue to the route handler
    return NextResponse.next()
}

// Configure which routes this proxy applies to
export const config = {
    matcher: [
        // Apply to all API routes
        '/api/:path*',
        // Exclude static files and images
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
}
