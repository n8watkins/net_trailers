/**
 * The Worker's own edge cache (Workers Cache,
 * https://developers.cloudflare.com/workers/cache/).
 *
 * The default entrypoint (worker/index.ts) runs on every request and is cheap:
 * it decides here whether a request may be answered from the cache, and if so
 * passes it to the CachedPages entrypoint, which Cloudflare's cache sits in
 * front of (wrangler.jsonc "cache" and "exports"). A hit returns the stored
 * response without running Next.js, so it costs no CPU time.
 *
 * Only what is the same for everyone who may get it is cached:
 * - the TMDB catalogue routes (/api/movies, /api/tv, /api/genres,
 *   /api/discover), which depend only on their URL and refresh hourly anyway;
 * - the image optimizer's answers, which never change for a given URL;
 * - the home page, for visitors with neither a session nor the child-safety
 *   cookie. It shows the trending titles from the routes above; the cached
 *   copy keeps the CSP nonce it was rendered with, which is safe because the
 *   page reflects nothing from the request.
 * A response is kept only if it is a 200 that sets no cookie; everything else
 * is marked no-store for the edge, so the cache's default rules never keep it.
 * Each deploy starts with an empty cache (the Worker version is part of the key).
 */

const HOUR = 3600
const DAY = 86_400
const EDGE_STALE_SECONDS = DAY

interface Rule {
    /** How long the edge keeps it. */
    ttl: number
    /** Only for visitors with no session or child-safety cookie. */
    anonymousOnly?: boolean
    /** The browser's Cache-Control when Next.js sent none. */
    browser?: string
}

const CATALOGUE_ROUTE = /^\/api\/(?:movies|tv|genres|discover)(?:\/|$)/

function ruleFor(pathname: string): Rule | null {
    if (pathname === '/') return { ttl: HOUR, anonymousOnly: true }
    if (CATALOGUE_ROUTE.test(pathname)) return { ttl: HOUR }
    if (pathname === '/_next/image') return { ttl: DAY, browser: `public, max-age=${DAY}` }
    return null
}

/** Auth.js's session cookie, and the child-safety switch the home page reads. */
const PERSONAL_COOKIE =
    /(?:^|;\s*)(?:(?:__Secure-)?authjs\.session-token(?:\.\d+)?|nettrailer_child_safety)=/

/** Whether this request may be answered from the edge cache. */
export function mayUseEdgeCache(request: Request, host: string): boolean {
    if (request.method !== 'GET' && request.method !== 'HEAD') return false
    const url = new URL(request.url)
    // The cache key has no host in it, so other hosts never read or write it.
    if (url.host !== host) return false
    const rule = ruleFor(url.pathname)
    if (!rule) return false
    if (request.headers.has('authorization')) return false
    // Client-side navigations ask for the page's RSC payload, not its HTML.
    if (request.headers.has('rsc') || request.headers.has('next-router-prefetch')) return false
    if (rule.anonymousOnly && PERSONAL_COOKIE.test(request.headers.get('cookie') ?? ''))
        return false
    return true
}

/**
 * The response marked for the edge. The Cloudflare-CDN-Cache-Control header is
 * read by Cloudflare and never reaches browsers.
 */
export function forEdge(request: Request, response: Response): Response {
    const rule = ruleFor(new URL(request.url).pathname)
    const marked = new Response(response.body, response)
    const cacheable = rule !== null && response.status === 200 && !marked.headers.has('set-cookie')
    marked.headers.set(
        'Cloudflare-CDN-Cache-Control',
        cacheable
            ? `public, max-age=${rule.ttl}, stale-while-revalidate=${EDGE_STALE_SECONDS}`
            : 'no-store'
    )
    if (cacheable && rule.browser && !marked.headers.has('cache-control')) {
        marked.headers.set('Cache-Control', rule.browser)
    }
    return marked
}

/** Scanners probing for /.env, /.git/config, /wp-admin and *.php. */
const PROBE = /^\/(?:\.(?!well-known\/)|wp-|.*\.php$)/i

/** A plain answer for the uptime check and for scanners, or null for everything else. */
export function cheapAnswer(request: Request): Response | null {
    const { pathname } = new URL(request.url)
    if (pathname === '/healthz') {
        return new Response('ok', {
            headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
        })
    }
    if (PROBE.test(pathname)) {
        return new Response('Not found', {
            status: 404,
            headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
        })
    }
    return null
}
