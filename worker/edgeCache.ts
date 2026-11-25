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
 * - the image optimizer's answers (uploads and avatars; TMDB images load from
 *   TMDB), which never change for a given URL;
 * - the public pages, for visitors with neither a session nor the
 *   child-safety cookie. The home page shows the trending titles from the
 *   routes above, for an hour. The others are client-rendered shells (their
 *   data comes from the API in the browser), the same for every signed-out
 *   visitor until the next deploy, so they are kept a day. None of them holds
 *   anything people write, so nothing needs purging when content changes; a
 *   deploy starts a fresh cache, which is what changes a shell (see "One build
 *   per cached answer" below). The cached copy keeps the CSP nonce it was
 *   rendered with, which is safe because the pages reflect nothing from the
 *   request.
 * A response is kept only if it is a 200 that sets no cookie; everything else
 * is marked no-store for the edge, so the cache's default rules never keep it.
 *
 * One build per cached answer. The pages name their build's /_next/static
 * files, which the next deploy removes, so a page from another build renders
 * without its CSS and JS. Cloudflare keys this cache by Worker version, but
 * that alone did not keep builds apart: on 2026-11-25, right after a deploy,
 * the new version's default entrypoint called CachedPages and the call ran on
 * the previous version (Workers Logs: the default entrypoint on 0fec2c73,
 * CachedPages on c72ad127, for / and /security), and that old page was stored
 * where the new version read it until the next deploy. A deploy takes "up to
 * a few seconds" to reach every location, and Cloudflare does not document
 * which version a ctx.exports call lands on meanwhile. So the build is
 * checked here, whatever the platform does:
 * - the default entrypoint names its own version in the cache key and in a
 *   request header (serveFromEdgeCache);
 * - CachedPages answers only a request for its own version and stamps the
 *   answer with it (answerForEdge), so an entry under a version's key was
 *   always rendered by that version;
 * - the default entrypoint serves a cached answer only when the stamp is its
 *   own version; otherwise it renders the page itself, uncached.
 * stale-while-revalidate stays within one key, so within one build.
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

/**
 * Public pages that render the same shell for every signed-out visitor (they
 * load their data in the browser), and the sitemap. Kept a day: they change
 * only with a deploy, which starts a fresh cache. The post-deploy check
 * (scripts/check-deploy.ts) requests each of them.
 */
export const PUBLIC_PAGES: readonly string[] = [
    '/smartsearch',
    '/search',
    '/collections',
    '/recommendations',
    '/community/rankings',
    '/community/forums',
    '/community/threads',
    '/community/polls',
    '/privacy',
    '/terms',
    '/security',
    '/changelog',
    '/sitemap.xml',
    // The settings sections a guest can use. Without a session cookie the
    // server renders the same guest frame for everyone (app/settings/layout.tsx
    // reads the session and finds none); the guest's own settings live in the
    // browser. A request with a session cookie never reaches this cache.
    '/settings',
    '/settings/preferences',
    '/settings/notifications',
    '/settings/recommendations',
    '/settings/collections',
    '/settings/account',
]
const PUBLIC_PAGE_SET = new Set(PUBLIC_PAGES)

/** Public detail pages, also client-rendered shells. */
const PUBLIC_PAGE_PATTERNS = [
    /^\/genres\/(?:movie|tv|both)\/[^/]+$/,
    /^\/person\/\d+$/,
    /^\/community\/(?:thread|polls)\/[^/]+$/,
]

function ruleFor(pathname: string): Rule | null {
    if (pathname === '/') return { ttl: HOUR, anonymousOnly: true }
    if (PUBLIC_PAGE_SET.has(pathname) || PUBLIC_PAGE_PATTERNS.some((p) => p.test(pathname)))
        return { ttl: DAY, anonymousOnly: true }
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
    if (
        request.headers.has('rsc') ||
        request.headers.has('next-router-prefetch') ||
        url.searchParams.has('_rsc')
    )
        return false
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

/**
 * The Worker version that rendered a page answered through the edge cache
 * (CF_VERSION_METADATA.id). Kept with the cached copy, so it also says which
 * build a cache hit came from; the post-deploy check reads it.
 */
export const BUILD_HEADER = 'X-NetTrailers-Build'

/** The version the default entrypoint runs, sent to CachedPages with each request. */
export const EXPECTED_BUILD_HEADER = 'X-NetTrailers-Expected-Build'

/** The cache key for a request on one build: its path and query, under that build. */
export function edgeCacheKey(request: Request, build: string): string {
    const url = new URL(request.url)
    return `/build/${build}${url.pathname}${url.search}`
}

export interface EdgeCacheRoute {
    /** CachedPages through the cache (ctx.exports), under the given key. */
    cached(request: Request, cacheKey: string): Promise<Response>
    /** The app itself, past the cache. */
    render(request: Request): Promise<Response>
    /** Reports an answer from another build (lib/log.ts logWarn). */
    warn(fields: {
        event: string
        reason: string
        route: string
        build: string
        got: string
        cacheStatus: string
    }): void
}

/**
 * The default entrypoint's side: a cacheable request goes to CachedPages under
 * this build's key, and comes back only if this build rendered it. An answer
 * from another build is dropped and the page rendered here instead, uncached:
 * it names /_next/static files this build does not have.
 */
export async function serveFromEdgeCache(
    request: Request,
    build: string,
    route: EdgeCacheRoute
): Promise<Response> {
    const forCache = new Request(request)
    forCache.headers.set(EXPECTED_BUILD_HEADER, build)
    const answer = await route.cached(forCache, edgeCacheKey(request, build))
    const got = answer.headers.get(BUILD_HEADER)
    if (got === build) return answer

    // Not awaited: cancelling one branch of a tee'd body waits for the other.
    answer.body?.cancel().catch(() => {})
    route.warn({
        event: 'edge_cache_build_mismatch',
        reason: got ? 'other_build' : 'no_build',
        route: new URL(request.url).pathname,
        build,
        got: got ?? 'none',
        cacheStatus: answer.headers.get('cf-cache-status') ?? 'unknown',
    })
    const own = await route.render(request)
    const stamped = new Response(own.body, own)
    stamped.headers.set(BUILD_HEADER, build)
    return stamped
}

/**
 * CachedPages' side: render and mark the answer for the edge, stamped with
 * this build, but only for a request that asked for this build. A request
 * from another build's default entrypoint (a deploy still reaching this
 * location) gets a refusal the cache never keeps, so nothing this build
 * renders is ever stored under another build's key.
 */
export async function answerForEdge(
    request: Request,
    build: string,
    render: (request: Request) => Promise<Response>
): Promise<Response> {
    if (!build || request.headers.get(EXPECTED_BUILD_HEADER) !== build) {
        return new Response('Another build asked for this page', {
            status: 503,
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'no-store',
                'Cloudflare-CDN-Cache-Control': 'no-store',
                [BUILD_HEADER]: build || 'unknown',
            },
        })
    }
    const forApp = new Request(request)
    forApp.headers.delete(EXPECTED_BUILD_HEADER)
    const marked = forEdge(request, await render(forApp))
    marked.headers.set(BUILD_HEADER, build)
    return marked
}

/** Scanners probing for /.env, /.git/config, /wp-admin and *.php. */
const PROBE = /^\/(?:\.(?!well-known\/)|wp-|.*\.php$)/i

/**
 * A file name that only a missing file reaches the Worker with: the static
 * files (public/, /_next/static) are served before it runs, and uploads have
 * their own route. Without this, each one rendered the app's 404 page (about
 * 350 ms of CPU): old image links, scanners asking for backups and dumps.
 */
const MISSING_FILE =
    /^\/(?!uploads\/).*\.(?:jpe?g|png|gif|webp|avif|svg|ico|bmp|sql|zip|gz|tgz|tar|rar|7z|bak|old|swp|log|ini|ya?ml|env|aspx?|jsp|cgi)$/i

/** A plain answer for the uptime check and for scanners, or null for everything else. */
export function cheapAnswer(request: Request): Response | null {
    const { pathname } = new URL(request.url)
    if (pathname === '/healthz') {
        return new Response('ok', {
            headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
        })
    }
    if (
        PROBE.test(pathname) ||
        MISSING_FILE.test(pathname) ||
        pathname.startsWith('/_next/static/')
    ) {
        return new Response('Not found', {
            status: 404,
            headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
        })
    }
    return null
}
