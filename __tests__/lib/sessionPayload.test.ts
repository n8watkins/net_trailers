import { sessionPayload } from '@/lib/sessionPayload'

describe('sessionPayload', () => {
    it('sends who is signed in and the expiry, never the session token or the user row', () => {
        const expires = new Date('2026-12-01T00:00:00Z')
        const row = {
            sessionToken: 'secret-token',
            userId: 'u1',
            expires,
            createdAt: 1_700_000_000_000,
        }
        const user = {
            id: 'u1',
            name: 'Ada',
            email: 'ada@example.test',
            image: null,
            emailVerified: null,
            githubLogin: 'ada',
            createdAt: 1,
            lastLoginAt: 2,
        }
        const payload = sessionPayload(row, user)
        expect(payload).toEqual({
            expires,
            user: {
                id: 'u1',
                name: 'Ada',
                email: 'ada@example.test',
                image: null,
                isAdmin: false,
                signedInAt: 1_700_000_000_000,
            },
        })
        expect(JSON.stringify(payload)).not.toContain('secret-token')
    })
})
