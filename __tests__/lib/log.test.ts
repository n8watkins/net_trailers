/**
 * @jest-environment node
 */

import { authLogger, errorSummary, pathOf, safeMessage } from '@/lib/log'

afterEach(() => jest.restoreAllMocks())

class CallbackRouteError extends Error {
    type = 'CallbackRouteError'
}

describe('structured logs', () => {
    it('logs an Auth.js error as one JSON line with its type and a masked message only', () => {
        const error = jest.spyOn(console, 'error').mockImplementation(() => undefined)
        const inner = new Error(
            'Failed query: insert into users values ($1) params: someone@example.com,gho_abcdefghijklmnopqrstuvwxyz012345'
        )
        const authError = new CallbackRouteError(
            `${inner.message}. Read more at https://errors.authjs.dev#callbackrouteerror`,
            {
                cause: {
                    err: inner,
                    providerId: 'github',
                    error: 'access_denied',
                    code: 'secretcode',
                    state: 'secretstate',
                    cookie: 'secretcookie',
                },
            }
        )

        authLogger.error(authError)

        const line = String(error.mock.calls[0]?.[0])
        expect(JSON.parse(line)).toEqual({
            event: 'auth_error',
            reason: 'CallbackRouteError',
            route: '/api/auth',
            message: 'Failed query: insert into users values ($1) params: [redacted]',
            provider: 'github',
            providerError: 'access_denied',
            cause: 'Error',
        })
        for (const secret of [
            'someone@example.com',
            'gho_',
            'secretcode',
            'secretstate',
            'secretcookie',
        ]) {
            expect(line).not.toContain(secret)
        }
    })

    it('keeps debug silent and logs warnings as a code', () => {
        const log = jest.spyOn(console, 'log').mockImplementation(() => undefined)
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined)
        authLogger.debug()
        authLogger.warn('debug-enabled')
        expect(log).not.toHaveBeenCalled()
        expect(JSON.parse(String(warn.mock.calls[0]?.[0]))).toEqual({
            event: 'auth_warning',
            reason: 'debug-enabled',
            route: '/api/auth',
        })
    })

    it('masks emails and long tokens and drops query strings', () => {
        expect(safeMessage('no user a.b@c.io with token abcdefghijklmnopqrstuvwxyz')).toBe(
            'no user [email] with token [redacted]'
        )
        expect(errorSummary(new TypeError('bad'))).toBe('TypeError: bad')
        expect(pathOf('https://x.test/api/auth/callback/github?code=c&state=s')).toBe(
            '/api/auth/callback/github'
        )
    })
})
