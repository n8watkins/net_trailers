/**
 * @jest-environment node
 */

import { adminEmails, isAdminEmail } from '../../lib/admin'

const env = (ADMIN_EMAILS?: string) => ({ ADMIN_EMAILS }) as NodeJS.ProcessEnv

describe('admin check by sign-in email', () => {
    it('reads a comma- or space-separated list, trimmed and lower-cased', () => {
        expect(
            adminEmails(env(' Owner@Example.com, second@example.com  third@example.com'))
        ).toEqual(['owner@example.com', 'second@example.com', 'third@example.com'])
        expect(adminEmails(env(undefined))).toEqual([])
        expect(adminEmails(env(' , not-an-email '))).toEqual([])
    })

    it('matches the configured email case-insensitively', () => {
        const e = env('nathancwatkins23@gmail.com')
        expect(isAdminEmail('nathancwatkins23@gmail.com', e)).toBe(true)
        expect(isAdminEmail(' NathanCWatkins23@Gmail.com ', e)).toBe(true)
    })

    it('denies everyone else, and everyone when unset', () => {
        const e = env('nathancwatkins23@gmail.com')
        expect(isAdminEmail('someone@gmail.com', e)).toBe(false)
        expect(isAdminEmail('nathancwatkins23@gmail.com.evil.example', e)).toBe(false)
        expect(isAdminEmail(null, e)).toBe(false)
        expect(isAdminEmail('', e)).toBe(false)
        expect(isAdminEmail('nathancwatkins23@gmail.com', env(undefined))).toBe(false)
    })

    it('production config names the owner and no GitHub login', () => {
        // wrangler.jsonc is JSON with comments and trailing commas
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const fs = require('node:fs') as typeof import('node:fs')
        const text = fs.readFileSync(`${__dirname}/../../wrangler.jsonc`, 'utf8')
        expect(text).toContain('"ADMIN_EMAILS": "nathancwatkins23@gmail.com"')
        expect(text).not.toContain('ADMIN_GITHUB_LOGIN')
    })
})
