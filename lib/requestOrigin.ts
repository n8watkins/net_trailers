import { headers } from 'next/headers'

/**
 * The origin (scheme and host) the current request came in on, for links and
 * the server's calls to its own API. It follows whichever address serves the
 * app (the workers.dev address, a custom domain, localhost), so no platform
 * variable (VERCEL_URL and friends) is needed.
 *
 * Only the Host header counts, never X-Forwarded-Host, which a visitor can
 * set: the platform routes by Host, so it is always one of the app's own.
 */
export async function requestOrigin(): Promise<string> {
    let host: string | null = null
    try {
        host = (await headers()).get('host')
    } catch {
        // Outside a request (build time, scripts).
    }
    if (!host) return fallbackOrigin()
    const local = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host)
    return `${local ? 'http' : 'https'}://${host}`
}

function fallbackOrigin(): string {
    const configured = process.env.NEXT_PUBLIC_APP_URL
    if (configured) return configured.replace(/\/$/, '')
    return `http://localhost:${process.env.PORT || '3000'}`
}
