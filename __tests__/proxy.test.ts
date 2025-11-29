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
