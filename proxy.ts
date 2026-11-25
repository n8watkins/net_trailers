import { NextRequest, NextResponse } from 'next/server'
import { applyCsrfProtection } from './lib/csrfProtection'
import { hasCronSecret } from './lib/cronAuth'
import { buildContentSecurityPolicy, createNonce, NONCE_HEADER } from './lib/csp'
import { UPLOAD_MAX_BYTES } from './lib/uploads'

/**
 * Global proxy for security and request validation
 * Next.js 16+ uses "proxy" instead of "middleware"
 */

const MAX_REQUEST_BODY_SIZE = 1024 * 1024 // 1MB limit for request bodies
const MAX_JSON_PAYLOAD_SIZE = 500 * 1024 // 500KB for JSON payloads
/** Image uploads: the route's own 5 MB file limit plus room for the multipart envelope. */
const MAX_UPLOAD_BODY_SIZE = UPLOAD_MAX_BYTES + 64 * 1024

/** The body limit for a request, and how to name it in the 413 answer. */
function bodyLimitFor(
    pathname: string,
    contentType: string | null
): { max: number; label: string } {
    if (pathname === '/api/upload' && contentType?.includes('multipart/form-data')) {
        return { max: MAX_UPLOAD_BODY_SIZE, label: '5MB' }
    }
    if (contentType?.includes('application/json')) {
        return { max: MAX_JSON_PAYLOAD_SIZE, label: '500KB' }
    }
    return { max: MAX_REQUEST_BODY_SIZE, label: '1MB' }
}

/**
 * Whether the body is longer than `max` bytes, counted as it is read, so a
 * body sent without Content-Length (chunked) is held to the same limit as one
 * that declares it. Reads a clone, and stops as soon as the limit is passed:
 * the route still gets the whole body. Under next start and on Workers
 * (OpenNext) the proxy sees its own copy of an already buffered body, so this
 * costs at most `max` bytes of reading.
 */
async function bodyExceeds(request: NextRequest, max: number): Promise<boolean> {
    const body = request.clone().body
    if (!body) return false
    const reader = body.getReader()
    let total = 0
    try {
        for (;;) {
            const { done, value } = await reader.read()
            if (done) return false
            total += value.byteLength
            if (total > max) return true
        }
    } finally {
        reader.cancel().catch(() => undefined)
    }
}

function tooLarge(
    request: NextRequest,
    size: number | null,
    limit: { max: number; label: string }
): NextResponse {
    console.warn(
        `🔒 [Security] Request body too large: ${size ?? `over ${limit.max}`} bytes (max: ${limit.max} bytes) for ${request.nextUrl.pathname}`
    )
    return NextResponse.json(
        { error: 'Request body too large', maxSize: limit.label },
        { status: 413 } // 413 Payload Too Large
    )
}

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

/**
 * RFC 8058 one-click unsubscribe: a POST to this one route with the token in
 * the query. Every other route, and this one without a token, keeps the Origin check.
 */
function isOneClickUnsubscribe(request: NextRequest): boolean {
    return (
        request.method === 'POST' &&
        request.nextUrl.pathname === '/api/email/unsubscribe' &&
        Boolean(request.nextUrl.searchParams.get('token'))
    )
}

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl
    const method = request.method

    // Apply security checks only to API routes
    if (pathname.startsWith('/api/')) {
        // Cron routes require CRON_SECRET for ALL methods (including GET)
        // Vercel cron jobs use GET, so we check auth before the safe-method guard
        // /api/internal/ (service-only, worker/adminStats.ts) uses the same secret.
        const isCronRoute =
            pathname.startsWith('/api/cron/') || pathname.startsWith('/api/internal/')

        if (isCronRoute) {
            // Cron routes MUST have valid CRON_SECRET regardless of HTTP method
            if (!hasCronSecret(request.headers)) {
                return NextResponse.json(
                    { error: 'Unauthorized - valid CRON_SECRET required' },
                    { status: 401 }
                )
            }
            // Valid CRON_SECRET - skip CSRF check and continue to handler
        } else if (isOneClickUnsubscribe(request)) {
            // Mail clients POST here without an Origin; the token in the query is the proof.
        } else if (!SAFE_METHODS.includes(method)) {
            // CSRF Protection for state-changing requests (non-cron routes only)
            const csrfResponse = applyCsrfProtection(request)
            if (csrfResponse) {
                return csrfResponse
            }
        }

        // Body size limit for POST/PUT/PATCH requests
        if (['POST', 'PUT', 'PATCH'].includes(method)) {
            const contentLength = request.headers.get('content-length')
            const contentType = request.headers.get('content-type')
            const limit = bodyLimitFor(pathname, contentType)

            // Fast path: a declared length over the limit is refused unread.
            if (contentLength) {
                const size = parseInt(contentLength, 10)
                if (size > limit.max) return tooLarge(request, size, limit)
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

            // The bytes actually sent count too, declared or not.
            if (await bodyExceeds(request, limit.max)) return tooLarge(request, null, limit)
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
