/**
 * @jest-environment node
 */

import { canonicalRedirect } from '../../worker/canonical'

const PUBLIC_URL = 'https://nettrailers.n8builds.dev'

describe('canonicalRedirect', () => {
    it('sends the workers.dev address to the site, keeping path and query', () => {
        expect(
            canonicalRedirect(
                'https://net-trailers.nathancwatkins23.workers.dev/search?q=alien',
                PUBLIC_URL
            )
        ).toBe('https://nettrailers.n8builds.dev/search?q=alien')
    })

    it('cannot be turned into a redirect to another host', () => {
        expect(
            canonicalRedirect(
                'https://net-trailers.nathancwatkins23.workers.dev//evil.example/x',
                PUBLIC_URL
            )
        ).toBe('https://nettrailers.n8builds.dev//evil.example/x')
    })

    it('leaves the site itself, local hosts and unset config alone', () => {
        expect(canonicalRedirect('https://nettrailers.n8builds.dev/', PUBLIC_URL)).toBeNull()
        expect(canonicalRedirect('http://localhost:8787/', PUBLIC_URL)).toBeNull()
        expect(
            canonicalRedirect('https://net-trailers.nathancwatkins23.workers.dev/', undefined)
        ).toBeNull()
    })
})
