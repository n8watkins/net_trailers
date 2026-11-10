/**
 * @jest-environment node
 *
 * The per-request Content Security Policy (lib/csp.ts).
 */

import { buildContentSecurityPolicy, createNonce } from '../../lib/csp'

function directive(policy: string, name: string): string[] {
    const found = policy.split('; ').find((part) => part.startsWith(`${name} `))
    return found ? found.split(' ').slice(1) : []
}

describe('buildContentSecurityPolicy', () => {
    const policy = buildContentSecurityPolicy({ nonce: 'abc123' })

    it('runs only nonced scripts and what they load, with no unsafe-inline or eval', () => {
        const scripts = directive(policy, 'script-src')
        expect(scripts).toContain("'nonce-abc123'")
        expect(scripts).toContain("'strict-dynamic'")
        expect(scripts).not.toContain("'unsafe-inline'")
        expect(scripts).not.toContain("'unsafe-eval'")
    })

    it('allows YouTube trailers, Turnstile, analytics and Sentry', () => {
        expect(directive(policy, 'frame-src')).toEqual(
            expect.arrayContaining(['https://www.youtube.com', 'https://challenges.cloudflare.com'])
        )
        expect(directive(policy, 'connect-src')).toEqual(
            expect.arrayContaining([
                'https://*.sentry.io',
                'https://*.google-analytics.com',
                'https://cloudflareinsights.com',
            ])
        )
    })

    it('locks down plugins, framing and base URLs', () => {
        expect(directive(policy, 'object-src')).toEqual(["'none'"])
        expect(directive(policy, 'frame-ancestors')).toEqual(["'none'"])
        expect(directive(policy, 'base-uri')).toEqual(["'self'"])
        expect(policy).toContain('upgrade-insecure-requests')
    })

    it('adds eval and the HMR websocket only for next dev', () => {
        const dev = buildContentSecurityPolicy({ nonce: 'n', dev: true })
        expect(directive(dev, 'script-src')).toContain("'unsafe-eval'")
        expect(directive(dev, 'connect-src')).toContain('ws:')
        expect(dev).not.toContain('upgrade-insecure-requests')
    })
})

describe('createNonce', () => {
    it('is random base64 of 16 bytes', () => {
        const a = createNonce()
        expect(a).toMatch(/^[A-Za-z0-9+/]{22}==$/)
        expect(createNonce()).not.toBe(a)
    })
})
