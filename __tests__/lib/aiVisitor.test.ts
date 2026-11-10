/**
 * @jest-environment node
 */

jest.mock('@/auth', () => ({ auth: jest.fn().mockResolvedValue(null) }))

import { guestKeyFromHeaders } from '../../lib/aiVisitor'

describe('guest AI key', () => {
    it('uses only CF-Connecting-IP and hashes it', async () => {
        const key = await guestKeyFromHeaders(new Headers({ 'cf-connecting-ip': '203.0.113.7' }))
        expect(key).toMatch(/^ip:[0-9a-f]{32}$/)
        expect(key).not.toContain('203.0.113.7')
        expect(await guestKeyFromHeaders(new Headers({ 'cf-connecting-ip': '203.0.113.7' }))).toBe(
            key
        )
    })

    it('ignores forgeable forwarding headers', async () => {
        const key = await guestKeyFromHeaders(
            new Headers({ 'x-forwarded-for': '198.51.100.1', 'x-real-ip': '198.51.100.2' })
        )
        expect(key).toBe('ip:unknown')
    })
})
