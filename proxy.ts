import { NextRequest, NextResponse } from 'next/server'
import { applyCsrfProtection } from './lib/csrfProtection'
import { hasCronSecret } from './lib/cronAuth'
import { buildContentSecurityPolicy, createNonce, NONCE_HEADER } from './lib/csp'

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
 * A fresh nonce and Content-Security-Policy for every request (lib/csp.ts).
 * Next reads the nonce from the request's CSP header and puts it on the
 * scripts it renders; the response carries the same policy.
 */
function withContentSecurityPolicy(request: NextRequest): NextResponse {
    const nonce = createNonce()
    const policy = buildContentSecurityPolicy({
        nonce,
        dev: process.env.NODE_ENV === 'development',
    })
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set(NONCE_HEADER, nonce)
    requestHeaders.set('Content-Security-Policy', policy)
    const response = NextResponse.next({ request: { headers: requestHeaders } })
    response.headers.set('Content-Security-Policy', policy)
    return response
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
            if (!hasCronSecret(request.headers)) {
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
                        `🔒 [Security] Request body too large: ${size} bytes (max: ${maxSize} bytes) for ${request.nextUrl.pathname}`
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
                    `🔒 [Security] Invalid Content-Type: ${contentType} for ${request.nextUrl.pathname}`
                )
                return NextResponse.json(
                    { error: 'Invalid Content-Type. Expected application/json' },
                    { status: 415 } // 415 Unsupported Media Type
                )
            }
        }
    }

    // Continue to the page or route handler
    return withContentSecurityPolicy(request)
}

// Configure which routes this proxy applies to
export const config = {
    matcher: [
        // Apply to all API routes
        '/api/:path*',
        // Every page (for its CSP nonce), but not static files and images
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
}
