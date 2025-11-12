import { NextRequest, NextResponse } from 'next/server'

/**
 * Global proxy for security and request validation
 * Next.js 16+ uses "proxy" instead of "middleware"
 */

const MAX_REQUEST_BODY_SIZE = 1024 * 1024 // 1MB limit for request bodies
const MAX_JSON_PAYLOAD_SIZE = 500 * 1024 // 500KB for JSON payloads

export async function proxy(request: NextRequest) {
    // Apply security checks only to API routes
    if (request.nextUrl.pathname.startsWith('/api/')) {
        // Check Content-Length header for POST/PUT/PATCH requests
        if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
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
