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
 *   deploy starts a fresh cache (the Worker version is part of the key), which
 *   is what changes a shell. The cached copy keeps the CSP nonce it was
 *   rendered with, which is safe because the pages reflect nothing from the
 *   request.
 * A response is kept only if it is a 200 that sets no cookie; everything else
 * is marked no-store for the edge, so the cache's default rules never keep it.
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
 * only with a deploy, which starts a fresh cache.
 */
const PUBLIC_PAGES = new Set([
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
])

/** Public detail pages, also client-rendered shells. */
const PUBLIC_PAGE_PATTERNS = [
    /^\/genres\/(?:movie|tv|both)\/[^/]+$/,
    /^\/person\/\d+$/,
    /^\/community\/(?:thread|polls)\/[^/]+$/,
]

function ruleFor(pathname: string): Rule | null {
    if (pathname === '/') return { ttl: HOUR, anonymousOnly: true }
    if (PUBLIC_PAGES.has(pathname) || PUBLIC_PAGE_PATTERNS.some((p) => p.test(pathname)))
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
