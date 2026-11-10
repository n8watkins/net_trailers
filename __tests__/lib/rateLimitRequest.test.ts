/**
 * @jest-environment node
 *
 * Per-caller route limits: keyed on CF-Connecting-IP for guests (never
 * X-Forwarded-For), durable in the in-memory libSQL database.
 */

import { NextRequest } from 'next/server'

import { rateLimitRequest } from '@/lib/requestIdentity'

function guest(headers: Record<string, string>) {
    return new NextRequest('https://nettrailers.example/api/test', { headers })
}

describe('rateLimitRequest', () => {
    it('refuses a guest past the limit with a 429 and Retry-After', async () => {
        const ip = { 'cf-connecting-ip': '203.0.113.10' }
        expect(await rateLimitRequest(guest(ip), 'test-route', 2, 60_000)).toBeNull()
        expect(await rateLimitRequest(guest(ip), 'test-route', 2, 60_000)).toBeNull()
        const refused = await rateLimitRequest(guest(ip), 'test-route', 2, 60_000)
        expect(refused?.status).toBe(429)
        expect(Number(refused?.headers.get('Retry-After'))).toBeGreaterThan(0)
    })

    it('cannot be dodged by changing X-Forwarded-For', async () => {
        const ip = { 'cf-connecting-ip': '203.0.113.11' }
        expect(await rateLimitRequest(guest(ip), 'xff-route', 1, 60_000)).toBeNull()
        const spoofed = guest({ ...ip, 'x-forwarded-for': '198.51.100.99' })
        expect((await rateLimitRequest(spoofed, 'xff-route', 1, 60_000))?.status).toBe(429)
    })

    it('keeps callers and routes apart', async () => {
        const a = { 'cf-connecting-ip': '203.0.113.12' }
        const b = { 'cf-connecting-ip': '203.0.113.13' }
        expect(await rateLimitRequest(guest(a), 'apart', 1, 60_000)).toBeNull()
        expect(await rateLimitRequest(guest(b), 'apart', 1, 60_000)).toBeNull()
        expect(await rateLimitRequest(guest(a), 'apart-other', 1, 60_000)).toBeNull()
    })
})
