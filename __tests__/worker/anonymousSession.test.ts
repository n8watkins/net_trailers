/**
 * @jest-environment node
 */

import { anonymousSession } from '../../worker/anonymousSession'

const BASE = 'https://net-trailers.n8builds.dev'
const session = (headers: Record<string, string> = {}, method = 'GET', path = '/api/auth/session') =>
    new Request(`${BASE}${path}`, { method, headers })

describe('anonymousSession', () => {
    it("answers Auth.js's uncached null when there is no session cookie", async () => {
        const response = anonymousSession(
            session({ Cookie: 'theme=dark; __Host-authjs.csrf-token=abc; nettrailer_child_safety=true' })
        )
        expect(response?.status).toBe(200)
        expect(await response?.json()).toBeNull()
        expect(response?.headers.get('Content-Type')).toBe('application/json')
        expect(response?.headers.get('Cache-Control')).toBe('private, no-cache, no-store')
        expect(response?.headers.get('Set-Cookie')).toBeNull()
        expect(anonymousSession(session())).not.toBeNull()
    })

    it('sends any session cookie, plain, secure or chunked, to Auth.js', () => {
        for (const cookie of [
            'authjs.session-token=x',
            '__Secure-authjs.session-token=x',
            'a=1; __Secure-authjs.session-token.0=x; __Secure-authjs.session-token.1=y',
            'theme=dark;authjs.session-token.0=x',
        ]) {
            expect(anonymousSession(session({ Cookie: cookie }))).toBeNull()
        }
    })

    it('leaves other methods and other auth paths to the app', () => {
        expect(anonymousSession(session({}, 'POST'))).toBeNull()
        expect(anonymousSession(session({}, 'HEAD'))).toBeNull()
        expect(anonymousSession(session({}, 'GET', '/api/auth/csrf'))).toBeNull()
        expect(anonymousSession(session({}, 'GET', '/api/auth/session/x'))).toBeNull()
    })
})
