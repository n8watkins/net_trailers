/**
 * @jest-environment node
 */

import { isPoll, withNotificationsCache } from '../../worker/notificationsCache'

const origin = 'https://net-trailers.n8builds.dev'
const POLL = '/api/notifications?limit=50&offset=0'
const session = (token: string) => ({ cookie: `theme=dark; __Secure-authjs.session-token=${token}` })

/** A Cache API stand-in: one entry per key URL. */
function fakeCache() {
    const entries = new Map<string, Response>()
    return {
        entries,
        cache: {
            async match(key: Request) {
                return entries.get(key.url)?.clone()
            },
            async put(key: Request, response: Response) {
                entries.set(key.url, response)
            },
            async delete(key: Request) {
                return entries.delete(key.url)
            },
        } as unknown as Cache,
    }
}

function setup(
    answer: (n: number) => Response = (n) => Response.json({ notifications: [], n })
) {
    const store = fakeCache()
    let count = 0
    const pending: Promise<unknown>[] = []
    const next = jest.fn(async () => {
        count++
        return answer(count)
    })
    const run = async (path: string, init: RequestInit = {}) => {
        const response = await withNotificationsCache(
            new Request(`${origin}${path}`, init),
            next,
            store.cache,
            (p) => pending.push(p)
        )
        await Promise.all(pending)
        return response
    }
    return { run, next, store }
}

describe('withNotificationsCache', () => {
    it('answers a repeated poll from the cache, per session, never for the browser', async () => {
        const { run, next, store } = setup()
        const first = await run(POLL, { headers: session('a') })
        expect(first?.headers.get('cache-control')).toBe('private, no-store')
        expect(await first?.json()).toEqual({ notifications: [], n: 1 })
        const again = await run(POLL, { headers: session('a') })
        expect(await again?.json()).toEqual({ notifications: [], n: 1 })
        expect(again?.headers.get('cache-control')).toBe('private, no-store')
        expect(next).toHaveBeenCalledTimes(1)
        // The key is a hash under a path the site never serves, not the token
        const [key] = [...store.entries.keys()]
        expect(key).toMatch(/^https:\/\/net-trailers\.n8builds\.dev\/__cache\/notifications\/[0-9a-f]{64}$/)

        // Another session gets its own answer
        expect(await (await run(POLL, { headers: session('b') }))?.json()).toEqual({
            notifications: [],
            n: 2,
        })
    })

    it("drops the cached list when the session changes its notifications", async () => {
        const { run, next } = setup()
        await run(POLL, { headers: session('a') })
        await run('/api/notifications/mark-read', { method: 'POST', headers: session('a') })
        await run(POLL, { headers: session('a') })
        expect(next).toHaveBeenCalledTimes(3)
    })

    it('leaves everything else to the app', async () => {
        const { run, next } = setup()
        expect(await run(POLL)).toBeNull()
        expect(await run('/api/notifications?limit=10&offset=0', { headers: session('a') })).toBeNull()
        expect(await run('/api/notificationsx', { headers: session('a') })).toBeNull()
        expect(await run('/api/auth/session', { headers: session('a') })).toBeNull()
        expect(next).not.toHaveBeenCalled()
    })

    it('never keeps an error or an answer that sets a cookie', async () => {
        const unauthorized = setup(() => Response.json({ error: 'x' }, { status: 401 }))
        await unauthorized.run(POLL, { headers: session('a') })
        expect(unauthorized.store.entries.size).toBe(0)
        const cookie = setup(
            () => new Response('{}', { headers: { 'set-cookie': 'authjs.session-token=; Max-Age=0' } })
        )
        await cookie.run(POLL, { headers: session('a') })
        expect(cookie.store.entries.size).toBe(0)
    })

    it('recognises only the exact poll', () => {
        expect(isPoll(new Request(`${origin}${POLL}`))).toBe(true)
        expect(isPoll(new Request(`${origin}${POLL}`, { method: 'POST' }))).toBe(false)
        expect(isPoll(new Request(`${origin}/api/notifications?offset=0&limit=50`))).toBe(false)
    })
})
