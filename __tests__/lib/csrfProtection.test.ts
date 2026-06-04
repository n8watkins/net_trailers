/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server'
import {
    validateOrigin,
    applyCsrfProtection,
    validateServerActionOrigin,
} from '../../lib/csrfProtection'

// Mock environment variables
const originalEnv = process.env

beforeEach(() => {
    jest.resetModules()
    process.env = {
        ...originalEnv,
        NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    }
})

afterAll(() => {
    process.env = originalEnv
})

/**
 * Helper to create a NextRequest with specified headers
 */
function createRequest(method: string, headers: Record<string, string> = {}): NextRequest {
    return new NextRequest(new URL('http://localhost:3000/api/test'), {
        method,
        headers,
    })
}

describe('csrfProtection', () => {
    describe('validateOrigin', () => {
        it('accepts request with valid Origin header', () => {
            const request = createRequest('POST', {
                Origin: 'http://localhost:3000',
            })
            expect(validateOrigin(request)).toBe(true)
        })

        it('accepts request with valid Referer header (no Origin)', () => {
            const request = createRequest('POST', {
                Referer: 'http://localhost:3000/some/page',
            })
            expect(validateOrigin(request)).toBe(true)
        })

        it('accepts localhost:3001 as allowed origin', () => {
            const request = createRequest('POST', {
                Origin: 'http://localhost:3001',
            })
            expect(validateOrigin(request)).toBe(true)
        })

        it('rejects request with spoofed origin (attacker.com)', () => {
            const request = createRequest('POST', {
                Origin: 'https://attacker.com',
            })
            expect(validateOrigin(request)).toBe(false)
        })

        it('rejects request with subdomain attack (localhost.attacker.com)', () => {
            const request = createRequest('POST', {
                Origin: 'http://localhost.attacker.com',
            })
            expect(validateOrigin(request)).toBe(false)
        })

        it('rejects request with prefix attack (localhost:3000.attacker.com)', () => {
            const request = createRequest('POST', {
                Origin: 'http://localhost:3000.attacker.com',
            })
            expect(validateOrigin(request)).toBe(false)
        })

        it('rejects request with missing Origin AND Referer', () => {
            const request = createRequest('POST', {})
            expect(validateOrigin(request)).toBe(false)
        })

        it('rejects request with null origin (form submission from file://)', () => {
            const request = createRequest('POST', {
                Origin: 'null',
            })
            expect(validateOrigin(request)).toBe(false)
        })

        it('rejects invalid Origin URL', () => {
            const request = createRequest('POST', {
                Origin: 'not-a-valid-url',
            })
            expect(validateOrigin(request)).toBe(false)
        })

        it('prefers Origin over Referer when both present', () => {
            // Valid Origin with invalid Referer should pass
            const request = createRequest('POST', {
                Origin: 'http://localhost:3000',
                Referer: 'https://attacker.com/page',
            })
            expect(validateOrigin(request)).toBe(true)
        })
    })

    describe('applyCsrfProtection', () => {
        it('skips protection for GET requests', () => {
            const request = createRequest('GET', {})
            expect(applyCsrfProtection(request)).toBeNull()
        })

        it('skips protection for HEAD requests', () => {
            const request = createRequest('HEAD', {})
            expect(applyCsrfProtection(request)).toBeNull()
        })

        it('skips protection for OPTIONS requests', () => {
            const request = createRequest('OPTIONS', {})
            expect(applyCsrfProtection(request)).toBeNull()
        })

        it('applies protection for POST requests without valid origin', async () => {
            const request = createRequest('POST', {})
            const response = applyCsrfProtection(request)
            expect(response).not.toBeNull()
            expect(response?.status).toBe(403)
            const body = await response?.json()
            expect(body.error).toBe('CSRF validation failed')
        })

        it('applies protection for PUT requests without valid origin', async () => {
            const request = createRequest('PUT', {})
            const response = applyCsrfProtection(request)
            expect(response).not.toBeNull()
            expect(response?.status).toBe(403)
        })

        it('applies protection for DELETE requests without valid origin', async () => {
            const request = createRequest('DELETE', {})
            const response = applyCsrfProtection(request)
            expect(response).not.toBeNull()
            expect(response?.status).toBe(403)
        })

        it('applies protection for PATCH requests without valid origin', async () => {
            const request = createRequest('PATCH', {})
            const response = applyCsrfProtection(request)
            expect(response).not.toBeNull()
            expect(response?.status).toBe(403)
        })

        it('allows POST with valid Origin', () => {
            const request = createRequest('POST', {
                Origin: 'http://localhost:3000',
            })
            expect(applyCsrfProtection(request)).toBeNull()
        })

        it('allows POST with valid Referer', () => {
            const request = createRequest('POST', {
                Referer: 'http://localhost:3000/page',
            })
            expect(applyCsrfProtection(request)).toBeNull()
        })
    })

    describe('validateServerActionOrigin', () => {
        it('validates origin from Headers object', () => {
            const headers = new Headers()
            headers.set('origin', 'http://localhost:3000')
            expect(validateServerActionOrigin(headers)).toBe(true)
        })

        it('falls back to referer when origin missing', () => {
            const headers = new Headers()
            headers.set('referer', 'http://localhost:3000/page')
            expect(validateServerActionOrigin(headers)).toBe(true)
        })

        it('rejects invalid origin in Headers', () => {
            const headers = new Headers()
            headers.set('origin', 'https://attacker.com')
            expect(validateServerActionOrigin(headers)).toBe(false)
        })

        it('rejects when both origin and referer missing', () => {
            const headers = new Headers()
            expect(validateServerActionOrigin(headers)).toBe(false)
        })
    })
})
