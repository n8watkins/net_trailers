/**
 * @jest-environment node
 */

import { cheapAnswer, forEdge, mayUseEdgeCache } from '../../worker/edgeCache'

const host = 'net-trailers.n8builds.dev'
const at = (path: string, init?: RequestInit) => new Request(`https://${host}${path}`, init)
const signedIn = { headers: { cookie: 'theme=dark; __Secure-authjs.session-token=abc' } }
const childSafe = { headers: { cookie: 'nettrailer_child_safety=true' } }

describe('mayUseEdgeCache', () => {
    it('lets the catalogue and images use the cache, whoever asks', () => {
        expect(mayUseEdgeCache(at('/api/movies/trending?childSafetyMode=true'), host)).toBe(true)
        expect(mayUseEdgeCache(at('/api/tv/details/1399', signedIn), host)).toBe(true)
        expect(mayUseEdgeCache(at('/api/discover?page=2'), host)).toBe(true)
        expect(mayUseEdgeCache(at('/_next/image?url=x&w=640&q=75', signedIn), host)).toBe(true)
    })

    it('serves the cached home page only to visitors without a session or child safety', () => {
        expect(mayUseEdgeCache(at('/'), host)).toBe(true)
        expect(mayUseEdgeCache(at('/', signedIn), host)).toBe(false)
        expect(mayUseEdgeCache(at('/', childSafe), host)).toBe(false)
        expect(mayUseEdgeCache(at('/', { headers: { rsc: '1' } }), host)).toBe(false)
    })

    it('keeps personal routes, writes and other hosts away from it', () => {
        expect(mayUseEdgeCache(at('/api/notifications'), host)).toBe(false)
        expect(mayUseEdgeCache(at('/api/auth/session'), host)).toBe(false)
        expect(mayUseEdgeCache(at('/api/moviesx'), host)).toBe(false)
        expect(mayUseEdgeCache(at('/collections'), host)).toBe(false)
        expect(mayUseEdgeCache(at('/api/movies/trending', { method: 'POST' }), host)).toBe(false)
        expect(
            mayUseEdgeCache(new Request('https://net-trailers.example.workers.dev/'), host)
        ).toBe(false)
    })
})

describe('forEdge', () => {
    it('keeps a catalogue answer for an hour, telling only the edge', () => {
        const json = new Response('{}', {
            headers: { 'Cache-Control': 'public, max-age=0, must-revalidate' },
        })
        const marked = forEdge(at('/api/movies/trending'), json)
        expect(marked.headers.get('Cloudflare-CDN-Cache-Control')).toBe(
            'public, max-age=3600, stale-while-revalidate=86400'
        )
        expect(marked.headers.get('Cache-Control')).toBe('public, max-age=0, must-revalidate')
    })

    it('lets browsers keep an optimized image for a day when Next.js said nothing', () => {
        const marked = forEdge(at('/_next/image?url=x&w=640&q=75'), new Response('jpeg'))
        expect(marked.headers.get('Cache-Control')).toBe('public, max-age=86400')
    })

    it('never keeps errors or responses that set a cookie', () => {
        const failed = forEdge(at('/api/movies/trending'), new Response('{}', { status: 500 }))
        expect(failed.headers.get('Cloudflare-CDN-Cache-Control')).toBe('no-store')
        const withCookie = forEdge(
            at('/'),
            new Response('<html>', { headers: { 'Set-Cookie': 'a=1' } })
        )
        expect(withCookie.headers.get('Cloudflare-CDN-Cache-Control')).toBe('no-store')
    })
})

describe('cheapAnswer', () => {
    it('answers the uptime check and scanner probes, and nothing else', () => {
        expect(cheapAnswer(at('/healthz'))?.status).toBe(200)
        for (const path of ['/.env', '/.git/config', '/wp-login.php', '/config/app.php']) {
            expect(cheapAnswer(at(path))?.status).toBe(404)
        }
        for (const path of ['/', '/.well-known/security.txt', '/api/health/ai', '/search']) {
            expect(cheapAnswer(at(path))).toBeNull()
        }
    })
})
