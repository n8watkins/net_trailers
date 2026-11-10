/**
 * Test-only TMDB fixtures (APP_ENV=test). Wraps the server's fetch so requests
 * to api.themoviedb.org are answered from e2e/fixtures/tmdb (gzipped JSON), keyed by the URL
 * without the api_key. CI therefore needs no TMDB key and gets the same data
 * on every run.
 *
 * Record or refresh the fixtures with a real key:
 *   E2E_TMDB_RECORD=1 TMDB_API_KEY=... npm run test:e2e
 */

import { assertTestMode } from '@/lib/testMode'

const TMDB_HOST = 'api.themoviedb.org'

export function fixtureKey(rawUrl: string): string {
    const url = new URL(rawUrl)
    url.searchParams.delete('api_key')
    url.searchParams.sort()
    return `${url.pathname}?${url.searchParams.toString()}`
}

async function fixturePath(key: string): Promise<string> {
    const { createHash } = await import('node:crypto')
    const { join } = await import('node:path')
    const name = createHash('sha1').update(key).digest('hex').slice(0, 20)
    return join(process.cwd(), 'e2e', 'fixtures', 'tmdb', `${name}.json.gz`)
}

export function installTmdbFixtures(): void {
    assertTestMode('TMDB fixtures')
    const record = process.env.E2E_TMDB_RECORD === '1'
    const realFetch = globalThis.fetch.bind(globalThis)

    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const rawUrl =
            typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
        if (!rawUrl.includes(TMDB_HOST)) return realFetch(input, init)

        const key = fixtureKey(rawUrl)
        const file = await fixturePath(key)
        const { readFile, writeFile, mkdir } = await import('node:fs/promises')
        const { dirname } = await import('node:path')
        const { gzipSync, gunzipSync } = await import('node:zlib')

        if (record) {
            const response = await realFetch(input, init)
            const body = await response.text()
            if (response.ok) {
                await mkdir(dirname(file), { recursive: true })
                await writeFile(
                    file,
                    new Uint8Array(
                        gzipSync(JSON.stringify({ key, status: response.status, body }) + '\n')
                    )
                )
            }
            return new Response(body, { status: response.status, headers: response.headers })
        }

        try {
            const saved = JSON.parse(
                gunzipSync(new Uint8Array(await readFile(file))).toString('utf8')
            ) as {
                status: number
                body: string
            }
            return new Response(saved.body, {
                status: saved.status,
                headers: { 'content-type': 'application/json' },
            })
        } catch {
            return new Response(JSON.stringify({ status_message: `No e2e fixture for ${key}` }), {
                status: 404,
                headers: { 'content-type': 'application/json' },
            })
        }
    }
}
