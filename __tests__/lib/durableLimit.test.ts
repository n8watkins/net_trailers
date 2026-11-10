/**
 * @jest-environment node
 *
 * Durable rate limits against the in-memory libSQL database (jest.setup.js).
 */

import {
    consumeLimits,
    countEvent,
    hashKey,
    readCount,
    resetLimit,
    windowInfo,
} from '../../lib/durableLimit'

const noon = new Date('2026-11-10T12:00:00Z')

describe('durable limits', () => {
    it('names windows by UTC day, month or fixed span', () => {
        expect(windowInfo('day', noon)).toEqual({
            id: 'd:2026-11-10',
            endsAt: Date.parse('2026-11-11T00:00:00Z'),
        })
        expect(windowInfo('month', noon)).toEqual({
            id: 'm:2026-11',
            endsAt: Date.parse('2026-12-01T00:00:00Z'),
        })
        const minute = windowInfo({ ms: 60_000 }, noon)
        expect(minute.id).toBe(`w60000:${Math.floor(noon.getTime() / 60_000)}`)
        expect(minute.endsAt).toBe(noon.getTime() + 60_000)
    })

    it('allows up to the limit, then refuses with a retry time', async () => {
        const rule = { key: 'test:a', limit: 2, window: 'day' as const }
        expect(await consumeLimits([rule], noon)).toEqual({ allowed: true })
        expect(await consumeLimits([rule], noon)).toEqual({ allowed: true })
        const refused = await consumeLimits([rule], noon)
        expect(refused).toMatchObject({ allowed: false, rule, retryAfterSeconds: 12 * 3600 })
        expect(await readCount('test:a', 'day', noon)).toBe(2)
    })

    it('spends nothing when any rule refuses', async () => {
        const wide = { key: 'test:site', limit: 10, window: 'day' as const }
        const narrow = { key: 'test:narrow', limit: 1, window: 'day' as const }
        expect((await consumeLimits([narrow, wide], noon)).allowed).toBe(true)
        expect((await consumeLimits([wide, narrow], noon)).allowed).toBe(false)
        // The refused call gave back the unit it took from `wide`.
        expect(await readCount('test:site', 'day', noon)).toBe(1)
        expect(await readCount('test:narrow', 'day', noon)).toBe(1)
    })

    it('starts a new window and can be reset', async () => {
        const rule = { key: 'test:pin', limit: 1, window: { ms: 15 * 60_000 } }
        expect((await consumeLimits([rule], noon)).allowed).toBe(true)
        expect((await consumeLimits([rule], noon)).allowed).toBe(false)
        const later = new Date(noon.getTime() + 15 * 60_000)
        expect((await consumeLimits([rule], later)).allowed).toBe(true)
        await resetLimit('test:pin', rule.window, later)
        expect((await consumeLimits([rule], later)).allowed).toBe(true)
    })

    it('counts plain events', async () => {
        await countEvent('test:event', 'month', noon)
        await countEvent('test:event', 'month', noon)
        expect(await readCount('test:event', 'month', noon)).toBe(2)
    })

    it('hashes personal data into keys', async () => {
        const hashed = await hashKey('someone@example.com')
        expect(hashed).toMatch(/^[0-9a-f]{32}$/)
        expect(hashed).not.toContain('example')
        expect(await hashKey('someone@example.com')).toBe(hashed)
    })
})
