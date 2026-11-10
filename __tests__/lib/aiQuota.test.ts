/**
 * @jest-environment node
 *
 * Durable AI quota against the in-memory libSQL database (jest.setup.js).
 */

process.env.AI_DAILY_LIMIT_PER_VISITOR = '3'
process.env.AI_DAILY_LIMIT_GLOBAL = '5'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const quota = require('../../lib/aiQuota') as typeof import('../../lib/aiQuota')

const day1 = new Date('2026-11-08T12:00:00Z')
const day2 = new Date('2026-11-09T00:30:00Z')

describe('AI quota', () => {
    it('lets a visitor spend up to the daily limit, then refuses', async () => {
        for (let i = 3; i >= 1; i--) {
            const result = await quota.consumeAiQuota('user:a', day1)
            expect(result.allowed).toBe(true)
            expect(result.remaining).toBe(i - 1)
        }
        const refused = await quota.consumeAiQuota('user:a', day1)
        expect(refused).toMatchObject({ allowed: false, remaining: 0, exhausted: 'visitor' })
        expect(quota.quotaExhaustedMessage(refused)).toContain("today's 3 AI searches")
        expect(await quota.getAiQuota('user:a', day1)).toMatchObject({ remaining: 0, limit: 3 })
    })

    it('stops everyone at the global cap and does not charge refused calls', async () => {
        // user:a spent 3 above; two more units reach the global cap of 5.
        expect((await quota.consumeAiQuota('user:b', day1)).allowed).toBe(true)
        expect((await quota.consumeAiQuota('user:b', day1)).allowed).toBe(true)
        const refused = await quota.consumeAiQuota('user:c', day1)
        expect(refused).toMatchObject({ allowed: false, exhausted: 'global' })
        expect(await quota.getAiQuota('user:c', day1)).toMatchObject({
            remaining: 0,
            exhausted: 'global',
        })
    })

    it('refunds a unit to the visitor and the global counter', async () => {
        await quota.refundAiQuota('user:b', day1)
        expect(await quota.getAiQuota('user:b', day1)).toMatchObject({ remaining: 1 })
        expect((await quota.consumeAiQuota('user:c', day1)).allowed).toBe(true)
    })

    it('resets at midnight UTC', async () => {
        const fresh = await quota.getAiQuota('user:a', day2)
        expect(fresh).toMatchObject({ remaining: 3, exhausted: null })
        expect(fresh.resetsAt).toBe('2026-11-10T00:00:00.000Z')
    })
})
