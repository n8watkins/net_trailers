/**
 * @jest-environment node
 */

import { NextRequest, NextResponse } from 'next/server'

// Mock crypto module for timing-safe comparison
jest.mock('crypto', () => ({
    timingSafeEqual: jest.fn((a: Uint8Array, b: Uint8Array) => {
        if (a.length !== b.length) return false
        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) return false
        }
        return true
    }),
}))

// Store original env
const originalEnv = process.env

beforeEach(() => {
    jest.resetModules()
    process.env = {
        ...originalEnv,
        CRON_SECRET: 'test-cron-secret-12345',
        NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    }
})

afterAll(() => {
    process.env = originalEnv
})

/**
 * Helper to create NextRequest for proxy tests
 */
function createProxyRequest(
    pathname: string,
    method: string,
    options: {
        headers?: Record<string, string>
        contentLength?: number
        contentType?: string
    } = {}
): NextRequest {
    const headers: Record<string, string> = { ...options.headers }

    if (options.contentLength !== undefined) {
        headers['content-length'] = options.contentLength.toString()
    }

    if (options.contentType !== undefined) {
        headers['content-type'] = options.contentType
    }

    return new NextRequest(new URL(`http://localhost:3000${pathname}`), {
        method,
        headers,
    })
}

describe('proxy', () => {
    // Import proxy fresh for each describe block to get clean module state
    let proxy: (request: NextRequest) => Promise<NextResponse>

    beforeEach(async () => {
        // Re-import to get fresh module with current env
        const proxyModule = await import('../proxy')
        proxy = proxyModule.proxy
    })

    describe('CSRF enforcement', () => {
        it('allows GET without origin', async () => {
            const request = createProxyRequest('/api/test', 'GET')
            const response = await proxy(request)
            // NextResponse.next() returns a response that passes through
            expect(response.headers.get('x-middleware-next')).toBe('1')
        })

        it('allows HEAD without origin', async () => {
            const request = createProxyRequest('/api/test', 'HEAD')
            const response = await proxy(request)
            expect(response.headers.get('x-middleware-next')).toBe('1')
        })

        it('allows OPTIONS without origin', async () => {
            const request = createProxyRequest('/api/test', 'OPTIONS')
            const response = await proxy(request)
            expect(response.headers.get('x-middleware-next')).toBe('1')
        })

        it('blocks POST without origin', async () => {
            const request = createProxyRequest('/api/test', 'POST')
            const response = await proxy(request)
            expect(response.status).toBe(403)
            const body = await response.json()
            expect(body.error).toBe('CSRF validation failed')
        })

        it('blocks PUT without origin', async () => {
            const request = createProxyRequest('/api/test', 'PUT')
            const response = await proxy(request)
            expect(response.status).toBe(403)
        })

        it('blocks DELETE without origin', async () => {
            const request = createProxyRequest('/api/test', 'DELETE')
            const response = await proxy(request)
            expect(response.status).toBe(403)
        })

        it('blocks PATCH without origin', async () => {
            const request = createProxyRequest('/api/test', 'PATCH')
            const response = await proxy(request)
            expect(response.status).toBe(403)
        })

        it('allows POST with valid origin', async () => {
            const request = createProxyRequest('/api/test', 'POST', {
                headers: { Origin: 'http://localhost:3000' },
            })
            const response = await proxy(request)
            expect(response.headers.get('x-middleware-next')).toBe('1')
        })

        it('allows POST with valid referer', async () => {
            const request = createProxyRequest('/api/test', 'POST', {
                headers: { Referer: 'http://localhost:3000/page' },
            })
            const response = await proxy(request)
            expect(response.headers.get('x-middleware-next')).toBe('1')
        })
    })

    describe('Cron route protection', () => {
        it('blocks GET to /api/cron/* without CRON_SECRET', async () => {
            const request = createProxyRequest('/api/cron/update-trending', 'GET')
            const response = await proxy(request)
            expect(response.status).toBe(401)
            const body = await response.json()
            expect(body.error).toContain('CRON_SECRET')
        })

        it('allows GET to /api/cron/* with valid CRON_SECRET', async () => {
            const request = createProxyRequest('/api/cron/update-trending', 'GET', {
                headers: { Authorization: 'Bearer test-cron-secret-12345' },
            })
            const response = await proxy(request)
            expect(response.headers.get('x-middleware-next')).toBe('1')
        })

        it('guards the service-only /api/internal/* routes with the same secret', async () => {
            const anon = await proxy(createProxyRequest('/api/internal/admin-stats', 'GET'))
            expect(anon.status).toBe(401)
            const service = await proxy(
                createProxyRequest('/api/internal/admin-stats', 'GET', {
                    headers: { Authorization: 'Bearer test-cron-secret-12345' },
                })
            )
            expect(service.headers.get('x-middleware-next')).toBe('1')
        })

        it('allows GET to /api/cron/* with CRON_SECRET without Bearer prefix', async () => {
            const request = createProxyRequest('/api/cron/update-trending', 'GET', {
                headers: { Authorization: 'test-cron-secret-12345' },
            })
            const response = await proxy(request)
            expect(response.headers.get('x-middleware-next')).toBe('1')
        })

        it('rejects invalid CRON_SECRET', async () => {
            const request = createProxyRequest('/api/cron/update-trending', 'GET', {
                headers: { Authorization: 'Bearer wrong-secret' },
            })
            const response = await proxy(request)
            expect(response.status).toBe(401)
        })

        it('rejects empty Authorization header', async () => {
            const request = createProxyRequest('/api/cron/update-trending', 'GET', {
                headers: { Authorization: '' },
            })
            const response = await proxy(request)
            expect(response.status).toBe(401)
        })

        it('rejects Bearer-only Authorization header', async () => {
            const request = createProxyRequest('/api/cron/update-trending', 'GET', {
                headers: { Authorization: 'Bearer ' },
            })
            const response = await proxy(request)
            expect(response.status).toBe(401)
        })

        it('POST to cron route also requires CRON_SECRET', async () => {
            // Even POST to cron routes needs CRON_SECRET, not just Origin
            const request = createProxyRequest('/api/cron/test', 'POST', {
                headers: { Origin: 'http://localhost:3000' },
            })
            const response = await proxy(request)
            // Should fail because cron routes require CRON_SECRET regardless of CSRF
            expect(response.status).toBe(401)
        })
    })

    describe('one-click unsubscribe', () => {
        const oneClick = {
            contentType: 'application/x-www-form-urlencoded',
            headers: {} as Record<string, string>,
        }

        it('accepts the mail client POST without an Origin when the token is in the query', async () => {
            const request = createProxyRequest('/api/email/unsubscribe?token=abc', 'POST', oneClick)
            const response = await proxy(request)
            expect(response.status).toBe(200)
        })

        it('still checks the Origin on that route without a token', async () => {
            const request = createProxyRequest('/api/email/unsubscribe', 'POST', oneClick)
            expect((await proxy(request)).status).toBe(403)
        })

        it('still blocks every other route without an Origin, even with a token', async () => {
            for (const path of ['/api/test?token=abc', '/api/email/send-pilot?token=abc']) {
                const request = createProxyRequest(path, 'POST', oneClick)
                expect((await proxy(request)).status).toBe(403)
            }
        })

        it('does not exempt other methods on the route', async () => {
            const request = createProxyRequest('/api/email/unsubscribe?token=abc', 'DELETE')
            expect((await proxy(request)).status).toBe(403)
        })
    })

    describe('Request size limits', () => {
        it('rejects JSON payloads over 500KB', async () => {
            const request = createProxyRequest('/api/test', 'POST', {
                headers: { Origin: 'http://localhost:3000' },
                contentType: 'application/json',
                contentLength: 600 * 1024, // 600KB
            })
            const response = await proxy(request)
            expect(response.status).toBe(413)
            const body = await response.json()
            expect(body.error).toBe('Request body too large')
            expect(body.maxSize).toBe('500KB')
        })

        it('allows JSON payloads under 500KB', async () => {
            const request = createProxyRequest('/api/test', 'POST', {
                headers: { Origin: 'http://localhost:3000' },
                contentType: 'application/json',
                contentLength: 400 * 1024, // 400KB
            })
            const response = await proxy(request)
            expect(response.headers.get('x-middleware-next')).toBe('1')
        })

        it('rejects non-JSON payloads over 1MB', async () => {
            const request = createProxyRequest('/api/test', 'POST', {
                headers: { Origin: 'http://localhost:3000' },
                contentType: 'multipart/form-data',
                contentLength: 1.5 * 1024 * 1024, // 1.5MB
            })
            const response = await proxy(request)
            expect(response.status).toBe(413)
            expect((await response.json()).maxSize).toBe('1MB')
        })

        it('allows non-JSON payloads under 1MB', async () => {
            const request = createProxyRequest('/api/test', 'POST', {
                headers: { Origin: 'http://localhost:3000' },
                contentType: 'multipart/form-data',
                contentLength: 800 * 1024, // 800KB
            })
            const response = await proxy(request)
            expect(response.headers.get('x-middleware-next')).toBe('1')
        })

        /** A request whose body arrives in chunks with no Content-Length, as a chunked upload does. */
        function streamedRequest(
            pathname: string,
            bytes: number,
            contentType: string,
            chunk = 64 * 1024
        ): NextRequest {
            let sent = 0
            const body = new ReadableStream<Uint8Array>({
                pull(controller) {
                    if (sent >= bytes) return controller.close()
                    const size = Math.min(chunk, bytes - sent)
                    sent += size
                    controller.enqueue(new Uint8Array(size).fill(97))
                },
            })
            const request = new NextRequest(new URL(`http://localhost:3000${pathname}`), {
                method: 'PUT',
                headers: { Origin: 'http://localhost:3000', 'content-type': contentType },
                body,
                duplex: 'half',
            } as RequestInit & { duplex: 'half' })
            expect(request.headers.get('content-length')).toBeNull()
            return request
        }

        it('counts the bytes of a JSON body sent without Content-Length', async () => {
            const response = await proxy(
                streamedRequest('/api/test', 600 * 1024, 'application/json')
            )
            expect(response.status).toBe(413)
            expect((await response.json()).maxSize).toBe('500KB')
        })

        it('counts the bytes of any other body sent without Content-Length', async () => {
            const response = await proxy(
                streamedRequest('/api/test', 1.5 * 1024 * 1024, 'application/x-www-form-urlencoded')
            )
            expect(response.status).toBe(413)
            expect((await response.json()).maxSize).toBe('1MB')
        })

        it('lets a streamed body under the limit through, still readable by the route', async () => {
            const request = streamedRequest('/api/test', 400 * 1024, 'application/json')
            const response = await proxy(request)
            expect(response.headers.get('x-middleware-next')).toBe('1')
            expect((await request.arrayBuffer()).byteLength).toBe(400 * 1024)
        })

        it('holds a body that declares a small length to the bytes actually sent', async () => {
            const request = streamedRequest('/api/test', 600 * 1024, 'application/json')
            request.headers.set('content-length', '100')
            const response = await proxy(request)
            expect(response.status).toBe(413)
        })

        it('gives image uploads the room of their own 5MB limit', async () => {
            const ok = await proxy(
                streamedRequest('/api/upload', 3 * 1024 * 1024, 'multipart/form-data; boundary=x')
            )
            expect(ok.headers.get('x-middleware-next')).toBe('1')
            const big = await proxy(
                streamedRequest('/api/upload', 6 * 1024 * 1024, 'multipart/form-data; boundary=x')
            )
            expect(big.status).toBe(413)
            expect((await big.json()).maxSize).toBe('5MB')
        })
    })

    describe('Content-Type validation', () => {
        it('allows application/json', async () => {
            const request = createProxyRequest('/api/test', 'POST', {
                headers: { Origin: 'http://localhost:3000' },
                contentType: 'application/json',
            })
            const response = await proxy(request)
            expect(response.headers.get('x-middleware-next')).toBe('1')
        })

        it('allows application/json with charset', async () => {
            const request = createProxyRequest('/api/test', 'POST', {
                headers: { Origin: 'http://localhost:3000' },
                contentType: 'application/json; charset=utf-8',
            })
            const response = await proxy(request)
            expect(response.headers.get('x-middleware-next')).toBe('1')
        })

        it('allows multipart/form-data', async () => {
            const request = createProxyRequest('/api/test', 'POST', {
                headers: { Origin: 'http://localhost:3000' },
                contentType: 'multipart/form-data; boundary=----WebKitFormBoundary',
            })
            const response = await proxy(request)
            expect(response.headers.get('x-middleware-next')).toBe('1')
        })

        it('allows application/x-www-form-urlencoded', async () => {
            const request = createProxyRequest('/api/test', 'POST', {
                headers: { Origin: 'http://localhost:3000' },
                contentType: 'application/x-www-form-urlencoded',
            })
            const response = await proxy(request)
            expect(response.headers.get('x-middleware-next')).toBe('1')
        })

        it('rejects invalid content types', async () => {
            const request = createProxyRequest('/api/test', 'POST', {
                headers: { Origin: 'http://localhost:3000' },
                contentType: 'text/plain',
            })
            const response = await proxy(request)
            expect(response.status).toBe(415)
            const body = await response.json()
            expect(body.error).toContain('Content-Type')
        })

        it('rejects application/xml', async () => {
            const request = createProxyRequest('/api/test', 'POST', {
                headers: { Origin: 'http://localhost:3000' },
                contentType: 'application/xml',
            })
            const response = await proxy(request)
            expect(response.status).toBe(415)
        })

        it('allows POST without Content-Type header', async () => {
            // Some requests might not have Content-Type (empty body)
            const request = createProxyRequest('/api/test', 'POST', {
                headers: { Origin: 'http://localhost:3000' },
            })
            const response = await proxy(request)
            expect(response.headers.get('x-middleware-next')).toBe('1')
        })
    })

    describe('Non-API routes', () => {
        it('passes through non-API routes without checks', async () => {
            const request = createProxyRequest('/some-page', 'GET')
            const response = await proxy(request)
            expect(response.headers.get('x-middleware-next')).toBe('1')
        })

        it('passes through non-API POST requests', async () => {
            // Non-API routes don't get CSRF protection from proxy
            const request = createProxyRequest('/some-form', 'POST')
            const response = await proxy(request)
            expect(response.headers.get('x-middleware-next')).toBe('1')
        })
    })
})
