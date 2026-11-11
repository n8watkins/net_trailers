/**
 * @jest-environment node
 *
 * Limits on email sign-in links against the in-memory libSQL database.
 */

jest.mock('../../lib/email/cloudflare', () => ({
    EMAIL_FROM: 'net-trailers@n8builds.dev',
    emailBinding: () => undefined,
}))

process.env.EMAIL_SIGNIN_PER_ADDRESS_DAILY = '2'
process.env.EMAIL_SIGNIN_PER_IP_DAILY = '3'

const limits =
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('../../lib/email/signInLimits') as typeof import('../../lib/email/signInLimits')

const now = new Date('2026-11-10T10:00:00Z')
const fromIp = (ip: string) => new Headers({ 'cf-connecting-ip': ip })

describe('sign-in email limits', () => {
    it('keys on hashed address and Cloudflare IP, never the raw values', async () => {
        const rules = await limits.signInRules(' Someone@Example.com ', fromIp('203.0.113.7'))
        expect(rules).toHaveLength(2)
        expect(rules[0].key).toMatch(/^signin:addr:[0-9a-f]{32}$/)
        expect(rules[1].key).toMatch(/^signin:ip:[0-9a-f]{32}$/)
        expect(JSON.stringify(rules)).not.toMatch(/example|203\.0/i)
        // Case and spaces do not make a new address.
        const again = await limits.signInRules('someone@example.com', new Headers())
        expect(again[0].key).toBe(rules[0].key)
    })

    it('ignores X-Forwarded-For and skips the IP rule without CF-Connecting-IP', async () => {
        const spoofed = new Headers({ 'x-forwarded-for': '198.51.100.1' })
        expect(await limits.signInRules('a@example.com', spoofed)).toHaveLength(1)
    })

    it('limits links per address', async () => {
        const ip = fromIp('203.0.113.1')
        expect((await limits.reserveSignInEmail('victim@example.com', ip, now)).allowed).toBe(true)
        expect((await limits.reserveSignInEmail('victim@example.com', ip, now)).allowed).toBe(true)
        const refused = await limits.reserveSignInEmail('victim@example.com', ip, now)
        expect(refused).toMatchObject({ allowed: false, siteCap: false })
    })

    it('limits links per IP across addresses, and only for that IP', async () => {
        const ip = fromIp('203.0.113.2')
        for (const n of [1, 2, 3]) {
            const result = await limits.reserveSignInEmail(`user${n}@example.com`, ip, now)
            expect(result.allowed).toBe(true)
        }
        const refused = await limits.reserveSignInEmail('user4@example.com', ip, now)
        expect(refused.allowed).toBe(false)
        const otherIp = await limits.reserveSignInEmail(
            'user4@example.com',
            fromIp('203.0.113.3'),
            now
        )
        expect(otherIp.allowed).toBe(true)
    })
})
