/**
 * @jest-environment node
 */

import {
    answerForEdge,
    BUILD_HEADER,
    cheapAnswer,
    edgeCacheKey,
    EXPECTED_BUILD_HEADER,
    forEdge,
    mayUseEdgeCache,
    serveFromEdgeCache,
    type EdgeCacheRoute,
} from '../../worker/edgeCache'

const host = 'net-trailers.n8builds.dev'
const at = (path: string, init?: RequestInit) => new Request(`https://${host}${path}`, init)
const signedIn = { headers: { cookie: 'theme=dark; __Secure-authjs.session-token=abc' } }
const childSafe = { headers: { cookie: 'nettrailer_child_safety=true' } }

describe('mayUseEdgeCache', () => {
    it('lets the catalogue and images use the cache', () => {
        expect(mayUseEdgeCache(at('/api/movies/trending?childSafetyMode=true'), host)).toBe(true)
        expect(mayUseEdgeCache(at('/api/discover?page=2'), host)).toBe(true)
        expect(mayUseEdgeCache(at('/_next/image?url=x&w=640&q=75', signedIn), host)).toBe(true)
    })

    it('never answers a catalogue request whose Child Safety Mode it cannot know from the URL', () => {
        // The server reads the mode from the session or the child-safety cookie
        // (lib/childSafetyServer.ts); the key holds only the URL. A cached
        // mode-off answer must never reach a visitor with the mode on.
        for (const who of [signedIn, childSafe]) {
            expect(mayUseEdgeCache(at('/api/tv/details/1399', who), host)).toBe(false)
            expect(mayUseEdgeCache(at('/api/movies/trending', who), host)).toBe(false)
            expect(
                mayUseEdgeCache(at('/api/movies/trending?childSafetyMode=false', who), host)
            ).toBe(false)
            // Asking for the filtered answer outright: the same for everyone.
            expect(
                mayUseEdgeCache(at('/api/movies/trending?childSafetyMode=true', who), host)
            ).toBe(true)
        }
        // No session, no cookie: the mode is off, and so is every cached answer.
        expect(mayUseEdgeCache(at('/api/movies/trending'), host)).toBe(true)
    })

    it('serves the cached home page only to visitors without a session or child safety', () => {
        expect(mayUseEdgeCache(at('/'), host)).toBe(true)
        expect(mayUseEdgeCache(at('/', signedIn), host)).toBe(false)
        expect(mayUseEdgeCache(at('/', childSafe), host)).toBe(false)
        expect(mayUseEdgeCache(at('/', { headers: { rsc: '1' } }), host)).toBe(false)
    })

    it('serves the public page shells only to signed-out visitors, never their RSC payloads', () => {
        for (const path of [
            '/smartsearch?example=mind-bending-sci-fi',
            '/search',
            '/privacy',
            '/changelog',
            '/community/rankings',
            '/community/thread/abc',
            '/genres/movie/28?name=Action',
            '/person/287',
            '/sitemap.xml',
        ]) {
            expect(mayUseEdgeCache(at(path), host)).toBe(true)
            expect(mayUseEdgeCache(at(path, signedIn), host)).toBe(false)
            expect(mayUseEdgeCache(at(path, childSafe), host)).toBe(false)
        }
        expect(mayUseEdgeCache(at('/smartsearch?_rsc=abc'), host)).toBe(false)
        expect(
            mayUseEdgeCache(at('/search', { headers: { 'next-router-prefetch': '1' } }), host)
        ).toBe(false)
    })

    it('serves the guest settings shells only to visitors without a session', () => {
        for (const path of [
            '/settings',
            '/settings/preferences',
            '/settings/notifications',
            '/settings/recommendations',
            '/settings/collections',
            '/settings/account',
        ]) {
            expect(mayUseEdgeCache(at(path), host)).toBe(true)
            expect(mayUseEdgeCache(at(path, signedIn), host)).toBe(false)
            expect(mayUseEdgeCache(at(path, childSafe), host)).toBe(false)
            expect(mayUseEdgeCache(at(path, { headers: { rsc: '1' } }), host)).toBe(false)
        }
        // Sections only for accounts: a guest is sent away from them
        for (const path of [
            '/settings/profile',
            '/settings/account-management',
            '/settings/share',
        ]) {
            expect(mayUseEdgeCache(at(path), host)).toBe(false)
        }
    })

    it('keeps personal pages away from it', () => {
        for (const path of ['/profile', '/rankings', '/admin', '/person/x', '/notifications']) {
            expect(mayUseEdgeCache(at(path), host)).toBe(false)
        }
    })

    it('keeps personal routes, writes and other hosts away from it', () => {
        expect(mayUseEdgeCache(at('/api/notifications'), host)).toBe(false)
        expect(mayUseEdgeCache(at('/api/auth/session'), host)).toBe(false)
        expect(mayUseEdgeCache(at('/api/moviesx'), host)).toBe(false)
        expect(mayUseEdgeCache(at('/collections', signedIn), host)).toBe(false)
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

const NEW = '0fec2c73-1a7c-4af0-8cb9-f9771870ab05'
const OLD = 'c72ad127-8efa-41df-a3a1-9a3430f150fc'
const page = (build: string) => `<html><script src="/_next/static/chunks/${build}.js"></script>`

/**
 * A stand-in for Workers Cache in front of CachedPages: one store keyed by the
 * cache key the caller chose, and an entrypoint of a given build behind it,
 * which (as on 2026-11-25) need not be the caller's build.
 */
function edge() {
    const store = new Map<string, Response>()
    let behind = NEW
    const renders: string[] = []
    const warnings: Parameters<EdgeCacheRoute['warn']>[0][] = []
    const cachedPages = (request: Request) =>
        answerForEdge(request, behind, async () => {
            renders.push(behind)
            return new Response(page(behind), { headers: { 'Content-Type': 'text/html' } })
        })
    const route = (gatewayBuild: string): EdgeCacheRoute => ({
        async cached(request, cacheKey) {
            const hit = store.get(cacheKey)
            if (hit) return hit.clone()
            const answer = await cachedPages(request)
            if (!answer.headers.get('Cloudflare-CDN-Cache-Control')?.includes('no-store'))
                store.set(cacheKey, answer.clone())
            return answer
        },
        async render() {
            renders.push(`${gatewayBuild} (direct)`)
            return new Response(page(gatewayBuild))
        },
        warn: (fields) => warnings.push(fields),
    })
    return {
        store,
        renders,
        warnings,
        runBehind: (build: string) => (behind = build),
        get: (path: string, build: string) => serveFromEdgeCache(at(path), build, route(build)),
    }
}

describe('one build per cached answer', () => {
    it('serves and keeps a page rendered by the same build', async () => {
        const cache = edge()
        const first = await cache.get('/', NEW)
        expect(first.headers.get(BUILD_HEADER)).toBe(NEW)
        expect(await first.text()).toBe(page(NEW))
        const second = await cache.get('/', NEW)
        expect(await second.text()).toBe(page(NEW))
        expect(cache.renders).toEqual([NEW])
        expect(cache.warnings).toEqual([])
    })

    it('never stores or serves the previous build when the call lands on it mid-deploy', async () => {
        const cache = edge()
        // The new default entrypoint's call runs on the old CachedPages.
        cache.runBehind(OLD)
        const during = await cache.get('/', NEW)
        expect(await during.text()).toBe(page(NEW))
        expect(during.headers.get(BUILD_HEADER)).toBe(NEW)
        expect(cache.store.size).toBe(0)
        expect(cache.renders).toEqual([`${NEW} (direct)`])
        expect(cache.warnings).toEqual([
            expect.objectContaining({
                event: 'edge_cache_build_mismatch',
                reason: 'other_build',
                route: '/',
                build: NEW,
                got: OLD,
            }),
        ])
        // Once the deploy has reached it, the page is rendered and kept as usual.
        cache.runBehind(NEW)
        expect(await (await cache.get('/', NEW)).text()).toBe(page(NEW))
        expect(await (await cache.get('/', NEW)).text()).toBe(page(NEW))
        expect(cache.store.size).toBe(1)
    })

    it('does not serve a stored entry from another build, even under its own key', async () => {
        const cache = edge()
        // What a CachedPages from before this check could leave: an old page,
        // unstamped or stamped with another build, under the new build's key.
        cache.store.set(edgeCacheKey(at('/security'), NEW), new Response(page(OLD)))
        cache.store.set(
            edgeCacheKey(at('/privacy'), NEW),
            new Response(page(OLD), { headers: { [BUILD_HEADER]: OLD } })
        )
        for (const path of ['/security', '/privacy']) {
            const answer = await cache.get(path, NEW)
            expect(await answer.text()).toBe(page(NEW))
            expect(answer.headers.get(BUILD_HEADER)).toBe(NEW)
        }
        expect(cache.warnings.map((w) => w.reason)).toEqual(['no_build', 'other_build'])
    })

    it('keeps each build under its own key', async () => {
        const cache = edge()
        await cache.get('/search?q=dune', NEW)
        cache.runBehind(OLD)
        await cache.get('/search?q=dune', OLD)
        expect([...cache.store.keys()].sort()).toEqual(
            [`/build/${NEW}/search?q=dune`, `/build/${OLD}/search?q=dune`].sort()
        )
    })
})

describe('answerForEdge', () => {
    const render = jest.fn(async (_request: Request) => new Response(page(NEW)))
    beforeEach(() => render.mockClear())

    it('refuses, uncached and without rendering, a request for another build', async () => {
        for (const headers of [{ [EXPECTED_BUILD_HEADER]: OLD }, {}]) {
            const refused = await answerForEdge(at('/', { headers }), NEW, render)
            expect(refused.status).toBe(503)
            expect(refused.headers.get('Cloudflare-CDN-Cache-Control')).toBe('no-store')
            expect(refused.headers.get(BUILD_HEADER)).toBe(NEW)
        }
        // Without a version of its own it cannot tell builds apart, so it never answers.
        const unknown = await answerForEdge(
            at('/', { headers: { [EXPECTED_BUILD_HEADER]: '' } }),
            '',
            render
        )
        expect(unknown.status).toBe(503)
        expect(render).not.toHaveBeenCalled()
    })

    it('renders its own build for the edge, without passing the build header on to Next', async () => {
        const answer = await answerForEdge(
            at('/', { headers: { [EXPECTED_BUILD_HEADER]: NEW } }),
            NEW,
            render
        )
        expect(answer.status).toBe(200)
        expect(answer.headers.get(BUILD_HEADER)).toBe(NEW)
        expect(answer.headers.get('Cloudflare-CDN-Cache-Control')).toBe(
            'public, max-age=3600, stale-while-revalidate=86400'
        )
        expect(render.mock.calls[0][0].headers.has(EXPECTED_BUILD_HEADER)).toBe(false)
    })
})

describe('cheapAnswer', () => {
    it('answers the uptime check and scanner probes, and nothing else', () => {
        expect(cheapAnswer(at('/healthz'))?.status).toBe(200)
        for (const path of [
            '/.env',
            '/.git/config',
            '/wp-login.php',
            '/config/app.php',
            '/REDACTED.jpg',
            '/dump/db.sql',
            '/backup.zip',
            '/_next/static/chunks/gone.js',
        ]) {
            expect(cheapAnswer(at(path))?.status).toBe(404)
        }
        for (const path of [
            '/',
            '/.well-known/security.txt',
            '/api/health/ai',
            '/search',
            '/uploads/a.png',
            '/sitemap.xml',
            '/person/287',
        ]) {
            expect(cheapAnswer(at(path))).toBeNull()
        }
    })
})
