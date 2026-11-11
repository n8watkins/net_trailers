/**
 * @jest-environment node
 */

import { isGitHubAuthConfigured } from '../../lib/authConfig'
import { isAdminEmail } from '../../lib/admin'
import { githubUser, isGitHubSignInAllowed, verifiedPrimaryEmail } from '../../lib/githubAuth'

const env = (o: Record<string, string>) => o as unknown as NodeJS.ProcessEnv

describe('GitHub provider presence', () => {
    it('is off when either value is missing or blank', () => {
        expect(isGitHubAuthConfigured(env({}))).toBe(false)
        expect(isGitHubAuthConfigured(env({ AUTH_GITHUB_ID: 'id' }))).toBe(false)
        expect(isGitHubAuthConfigured(env({ AUTH_GITHUB_ID: 'id', AUTH_GITHUB_SECRET: ' ' }))).toBe(
            false
        )
    })

    it('is on only when both are set', () => {
        expect(
            isGitHubAuthConfigured(env({ AUTH_GITHUB_ID: 'id', AUTH_GITHUB_SECRET: 'secret' }))
        ).toBe(true)
    })
})

describe('linking by verified email', () => {
    const emails = [
        { email: 'other@example.com', primary: false, verified: true },
        { email: 'Owner@Example.com', primary: true, verified: true },
    ]

    it('uses the primary verified address, lower-cased', () => {
        expect(verifiedPrimaryEmail(emails)).toBe('owner@example.com')
    })

    it('ignores an unverified primary and non-primary addresses', () => {
        expect(
            verifiedPrimaryEmail([{ email: 'a@b.co', primary: true, verified: false }])
        ).toBeNull()
        expect(
            verifiedPrimaryEmail([{ email: 'a@b.co', primary: false, verified: true }])
        ).toBeNull()
        expect(verifiedPrimaryEmail({ message: 'Bad credentials' })).toBeNull()
    })

    it('puts the verified email on the user, so Auth.js links to the existing account', async () => {
        const fetchImpl = jest.fn(async () => ({ ok: true, json: async () => emails }))
        const user = await githubUser(
            { id: 7, login: 'octo', name: null, email: 'spoof@example.com', avatar_url: 'a.png' },
            'token',
            fetchImpl as unknown as typeof fetch
        )
        expect(user).toEqual({ id: '7', name: 'octo', email: 'owner@example.com', image: 'a.png' })
    })

    it('has no email when GitHub gives none verified, and that sign-in is refused', async () => {
        const fetchImpl = jest.fn(async () => ({
            ok: true,
            json: async () => [{ email: 'x@y.co', primary: true, verified: false }],
        }))
        const user = await githubUser(
            { id: 8, login: 'octo' },
            'token',
            fetchImpl as unknown as typeof fetch
        )
        expect(user.email).toBeNull()
        expect(isGitHubSignInAllowed('github', user.email)).toBe(false)
        expect(isGitHubSignInAllowed('github', 'a@b.co')).toBe(true)
        expect(isGitHubSignInAllowed('email', null)).toBe(true)
    })
})

describe('no admin through GitHub', () => {
    it('a GitHub username never makes an admin, only the email in ADMIN_EMAILS', () => {
        const e = env({ ADMIN_EMAILS: 'owner@example.com' })
        expect(isAdminEmail('octo', e)).toBe(false)
        expect(isAdminEmail('octo@users.noreply.github.com', e)).toBe(false)
        expect(isAdminEmail('owner@example.com', e)).toBe(true)
    })

    it('the session carries no GitHub login and auth.ts never reads one', () => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const fs = require('node:fs') as typeof import('node:fs')
        const auth = fs.readFileSync(`${__dirname}/../../auth.ts`, 'utf8')
        expect(auth).not.toMatch(/githubLogin|ADMIN_GITHUB_LOGIN|profile\.login/)
        expect(auth).toContain('isAdminEmail(user.email)')
    })
})
