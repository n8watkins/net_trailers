/**
 * A short per-user cache for the notification poll, answered before Next.
 *
 * Every signed-in tab asks GET /api/notifications?limit=50&offset=0 when it
 * opens and then every few minutes (utils/firestore/notifications.ts). Each
 * answer starts Next.js, Auth.js and two database reads, about 250 ms of CPU
 * on a cold isolate. A page load, a second tab or a reload within a minute
 * gets the same list from the Cache API instead, for no CPU.
 *
 * - The key is a SHA-256 of the session token, under a path the Worker never
 *   serves, so only the holder of that session can read the entry, and it
 *   never reaches anyone else.
 * - Only the exact poll is cached (other pages and limits go to Next), and
 *   only a 200 that sets no cookie. The browser is told not to store it.
 * - Any other request to /api/notifications... from that session (mark read,
 *   delete, create) deletes the entry before and after it runs, so the
 *   user's own changes show at once. A notification someone else causes
 *   shows within the minute.
 * The Cache API is per data center, which is where a user's requests land.
 */

import { NOTIFICATION_CONSTRAINTS } from '../types/notifications'

const POLL_PATH = '/api/notifications'
const POLL_QUERY = `limit=${NOTIFICATION_CONSTRAINTS.FETCH_LIMIT}&offset=0`
const TTL_SECONDS = 60

/** Auth.js database-session cookie (auth.ts uses the default names). */
const SESSION_COOKIE = /(?:^|;\s*)(?:__Secure-)?authjs\.session-token=([^;]+)/

/** Where the entry for one session lives: never a path the site answers. */
async function cacheKey(origin: string, token: string): Promise<Request> {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
    const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
    return new Request(`${origin}/__cache/notifications/${hex}`)
}

function sessionToken(request: Request): string | null {
    return SESSION_COOKIE.exec(request.headers.get('cookie') ?? '')?.[1] ?? null
}

function isNotificationsPath(pathname: string): boolean {
    return pathname === POLL_PATH || pathname.startsWith(`${POLL_PATH}/`)
}

/** The poll the client makes, and only that. */
export function isPoll(request: Request): boolean {
    if (request.method !== 'GET') return false
    const url = new URL(request.url)
    return url.pathname === POLL_PATH && url.search === `?${POLL_QUERY}`
}

type Handler = (request: Request) => Promise<Response>

/**
 * Answers /api/notifications requests through the per-session cache, or
 * returns null for every other request (and for requests without a session).
 */
export async function withNotificationsCache(
    request: Request,
    next: Handler,
    cache: Cache,
    waitUntil: (promise: Promise<unknown>) => void
): Promise<Response | null> {
    const url = new URL(request.url)
    if (!isNotificationsPath(url.pathname)) return null
    const token = sessionToken(request)
    if (!token) return null
    const key = await cacheKey(url.origin, token)

    if (!isPoll(request)) {
        if (request.method === 'GET' || request.method === 'HEAD') return null
        // A change: drop the cached list before and after it runs.
        await cache.delete(key)
        const response = await next(request)
        waitUntil(cache.delete(key))
        return response
    }

    const hit = await cache.match(key)
    if (hit) {
        const answer = new Response(hit.body, hit)
        answer.headers.set('Cache-Control', 'private, no-store')
        answer.headers.delete('Age')
        return answer
    }
    const response = await next(request)
    if (response.status !== 200 || response.headers.has('set-cookie')) return response
    const stored = new Response(response.clone().body, response)
    stored.headers.set('Cache-Control', `max-age=${TTL_SECONDS}`)
    stored.headers.delete('Vary')
    waitUntil(cache.put(key, stored))
    const answer = new Response(response.body, response)
    answer.headers.set('Cache-Control', 'private, no-store')
    return answer
}
