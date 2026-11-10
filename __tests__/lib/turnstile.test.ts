/**
 * @jest-environment node
 *
 * The server-side Turnstile check on requests for an email sign-in link.
 */

import {
    checkSignInTurnstile,
    turnstileRequired,
    verifyTurnstile,
    TURNSTILE_FIELD,
} from '../../lib/turnstile'

const secretEnv = { TURNSTILE_SECRET_KEY: 'secret' } as unknown as NodeJS.ProcessEnv

function siteverifyAnswers(success: boolean) {
    return jest
        .spyOn(global, 'fetch')
        .mockResolvedValue(Response.json({ success, 'error-codes': [] }))
}

function signInRequest(fields: Record<string, string>, headers: Record<string, string> = {}) {
    return new Request('https://nettrailers.n8builds.dev/api/auth/signin/email', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded', ...headers },
        body: new URLSearchParams(fields),
    })
}

afterEach(() => {
    jest.restoreAllMocks()
    delete process.env.TURNSTILE_SECRET_KEY
    delete process.env.APP_ENV
})

describe('turnstileRequired', () => {
    it('is on with a secret, and always on the production Worker', () => {
        expect(turnstileRequired(secretEnv)).toBe(true)
        expect(turnstileRequired({ APP_ENV: 'production' } as unknown as NodeJS.ProcessEnv)).toBe(
            true
        )
        expect(turnstileRequired({} as NodeJS.ProcessEnv)).toBe(false)
    })
})

describe('verifyTurnstile', () => {
    it('sends the token, secret and IP to siteverify and accepts success', async () => {
        const fetchSpy = siteverifyAnswers(true)
        expect(await verifyTurnstile('token', '203.0.113.7', secretEnv)).toBe(true)
        const [url, init] = fetchSpy.mock.calls[0]
        expect(String(url)).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify')
        const body = init?.body as FormData
        expect(body.get('secret')).toBe('secret')
        expect(body.get('response')).toBe('token')
        expect(body.get('remoteip')).toBe('203.0.113.7')
    })

    it('fails closed', async () => {
        siteverifyAnswers(false)
        expect(await verifyTurnstile('token', null, secretEnv)).toBe(false)
        jest.spyOn(global, 'fetch').mockRejectedValue(new Error('network'))
        expect(await verifyTurnstile('token', null, secretEnv)).toBe(false)
        // No token or no secret: siteverify is not even asked
        const fetchSpy = siteverifyAnswers(true)
        fetchSpy.mockClear()
        expect(await verifyTurnstile('', null, secretEnv)).toBe(false)
        expect(await verifyTurnstile('token', null, {} as NodeJS.ProcessEnv)).toBe(false)
        expect(fetchSpy).not.toHaveBeenCalled()
    })
})

describe('checkSignInTurnstile', () => {
    it('lets a request with a valid token through to Auth.js', async () => {
        process.env.TURNSTILE_SECRET_KEY = 'secret'
        siteverifyAnswers(true)
        const request = signInRequest({ email: 'a@example.com', [TURNSTILE_FIELD]: 'ok' })
        expect(await checkSignInTurnstile(request)).toBeNull()
        // The body is still there for Auth.js
        expect((await request.formData()).get('email')).toBe('a@example.com')
    })

    it('refuses a missing or bad token the way Auth.js refuses a sign-in', async () => {
        process.env.TURNSTILE_SECRET_KEY = 'secret'
        siteverifyAnswers(false)
        const json = await checkSignInTurnstile(
            signInRequest(
                { email: 'a@example.com', [TURNSTILE_FIELD]: 'bad' },
                {
                    'x-auth-return-redirect': '1',
                }
            )
        )
        expect(await json!.json()).toEqual({
            url: 'https://nettrailers.n8builds.dev/?error=Turnstile',
        })
        const redirect = await checkSignInTurnstile(signInRequest({ email: 'a@example.com' }))
        expect(redirect!.status).toBe(302)
        expect(redirect!.headers.get('location')).toContain('error=Turnstile')
    })

    it('refuses everything on production without a secret', async () => {
        process.env.APP_ENV = 'production'
        const fetchSpy = siteverifyAnswers(true)
        const refused = await checkSignInTurnstile(
            signInRequest({ [TURNSTILE_FIELD]: 'token' }, { 'x-auth-return-redirect': '1' })
        )
        expect(refused).not.toBeNull()
        expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('leaves other Auth.js requests and local runs alone', async () => {
        const fetchSpy = siteverifyAnswers(false)
        expect(await checkSignInTurnstile(signInRequest({}))).toBeNull()
        process.env.TURNSTILE_SECRET_KEY = 'secret'
        const github = new Request('https://x.test/api/auth/signin/github', { method: 'POST' })
        expect(await checkSignInTurnstile(github)).toBeNull()
        const get = new Request('https://x.test/api/auth/signin/email')
        expect(await checkSignInTurnstile(get)).toBeNull()
        expect(fetchSpy).not.toHaveBeenCalled()
    })
})
