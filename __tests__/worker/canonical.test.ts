/**
 * @jest-environment node
 */

import { canonicalRedirect } from '../../worker/canonical'

const PUBLIC_URL = 'https://net-trailers.n8builds.dev'

describe('canonicalRedirect', () => {
    it('moves the old address to the new one with a 301, keeping path and query', () => {
        expect(
            canonicalRedirect('https://nettrailers.n8builds.dev/search?q=alien&page=2', PUBLIC_URL)
        ).toEqual({
            location: 'https://net-trailers.n8builds.dev/search?q=alien&page=2',
            status: 301,
        })
        expect(canonicalRedirect('https://nettrailers.n8builds.dev/', PUBLIC_URL)).toEqual({
            location: 'https://net-trailers.n8builds.dev/',
            status: 301,
        })
    })

    it('sends the workers.dev address to the site with a 308, keeping path and query', () => {
        expect(
            canonicalRedirect(
                'https://net-trailers.nathancwatkins23.workers.dev/search?q=alien',
                PUBLIC_URL
            )
        ).toEqual({ location: 'https://net-trailers.n8builds.dev/search?q=alien', status: 308 })
    })

    it('cannot be turned into a redirect to another host', () => {
        expect(
            canonicalRedirect('https://nettrailers.n8builds.dev//evil.example/x', PUBLIC_URL)
                ?.location
        ).toBe('https://net-trailers.n8builds.dev//evil.example/x')
        expect(
            canonicalRedirect(
                'https://net-trailers.nathancwatkins23.workers.dev//evil.example/x',
                PUBLIC_URL
            )?.location
        ).toBe('https://net-trailers.n8builds.dev//evil.example/x')
    })

    it('leaves the site itself, other hosts, local hosts and unset config alone', () => {
        expect(canonicalRedirect('https://net-trailers.n8builds.dev/x?y=1', PUBLIC_URL)).toBeNull()
        expect(canonicalRedirect('https://example.com/', PUBLIC_URL)).toBeNull()
        expect(canonicalRedirect('http://localhost:8787/', PUBLIC_URL)).toBeNull()
        expect(canonicalRedirect('https://nettrailers.n8builds.dev/', undefined)).toBeNull()
    })
})
