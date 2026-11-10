/**
 * The Content Security Policy, set per request by the proxy (proxy.ts).
 *
 * Scripts run only with this request's nonce. Next reads the nonce from the
 * request's Content-Security-Policy header and puts it on every script it
 * renders (the framework, the page's chunks, its inline data), and the root
 * layout passes it to the analytics scripts. 'strict-dynamic' lets those
 * trusted scripts load the ones they need (YouTube's player API, Google
 * Analytics, Turnstile, lazily loaded chunks), so no 'unsafe-inline' and no
 * 'unsafe-eval' for scripts in production. The host list is only a fallback
 * for browsers too old for 'strict-dynamic'.
 *
 * Styles keep 'unsafe-inline': React style attributes and MUI/emotion's
 * runtime styles need it, and nothing user-written is rendered as HTML.
 */

const SCRIPT_HOSTS = [
    'https://www.googletagmanager.com',
    'https://www.google-analytics.com',
    'https://www.youtube.com',
    'https://s.ytimg.com',
    'https://static.cloudflareinsights.com',
    'https://challenges.cloudflare.com',
]

export interface CspOptions {
    nonce: string
    /** `next dev` needs eval for React's debugging and a websocket for HMR. */
    dev?: boolean
}

export function buildContentSecurityPolicy({ nonce, dev = false }: CspOptions): string {
    const directives: Record<string, string[]> = {
        'default-src': ["'self'"],
        'script-src': [
            "'self'",
            `'nonce-${nonce}'`,
            "'strict-dynamic'",
            ...SCRIPT_HOSTS,
            ...(dev ? ["'unsafe-eval'"] : []),
        ],
        'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        'img-src': ["'self'", 'data:', 'blob:', 'https:'],
        'font-src': ["'self'", 'data:', 'https://fonts.gstatic.com'],
        'connect-src': [
            "'self'",
            'https://*.google-analytics.com',
            'https://*.analytics.google.com',
            'https://*.googletagmanager.com',
            'https://*.sentry.io',
            'https://cloudflareinsights.com',
            'https://www.youtube.com',
            ...(dev ? ['ws:'] : []),
        ],
        'frame-src': [
            "'self'",
            'https://www.youtube.com',
            'https://www.youtube-nocookie.com',
            'https://challenges.cloudflare.com',
        ],
        'media-src': ["'self'", 'blob:', 'https:'],
        'worker-src': ["'self'", 'blob:'],
        'manifest-src': ["'self'"],
        'object-src': ["'none'"],
        'base-uri': ["'self'"],
        'form-action': ["'self'"],
        'frame-ancestors': ["'none'"],
    }
    const policy = Object.entries(directives).map(([name, values]) => `${name} ${values.join(' ')}`)
    if (!dev) policy.push('upgrade-insecure-requests')
    return policy.join('; ')
}

/** 16 random bytes, base64: unpredictable and unique per request. */
export function createNonce(): string {
    const bytes = new Uint8Array(16)
    crypto.getRandomValues(bytes)
    let binary = ''
    for (const byte of bytes) binary += String.fromCharCode(byte)
    return btoa(binary)
}

/** The request header the root layout reads the nonce from. */
export const NONCE_HEADER = 'x-nonce'
