/**
 * Cloudflare Turnstile on the email sign-in form, checked on the server.
 *
 * The sign-in form runs the widget in the background as it opens
 * (components/modals/AuthModal.tsx) and sends its one-time token with the
 * request for a link, as the form field `cf-turnstile-response`. The Auth.js
 * route (app/api/auth/[...nextauth]/route.ts) checks it here with siteverify
 * before Auth.js runs, so a request without a valid token never reaches the
 * sign-in email limits (lib/email/signInLimits.ts) or the email provider.
 *
 * Fails closed: a missing token, a network error or anything but
 * `success: true` is a failure. The secret (TURNSTILE_SECRET_KEY) is a Worker
 * secret. Without it the check is skipped, except on the production Worker
 * (APP_ENV=production), where a missing secret refuses every request.
 */

export const TURNSTILE_FIELD = 'cf-turnstile-response'

/** The `error` code the sign-in form shows as "could not confirm you're human". */
export const TURNSTILE_ERROR = 'Turnstile'

const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

/** The path Auth.js uses for "email me a sign-in link". */
export const EMAIL_SIGN_IN_PATH = '/api/auth/signin/email'

/** Whether requests for a sign-in link must carry a valid Turnstile token. */
export function turnstileRequired(env: NodeJS.ProcessEnv = process.env): boolean {
    return Boolean(env.TURNSTILE_SECRET_KEY) || env.APP_ENV === 'production'
}

/** Checks a token with siteverify. `ip` is CF-Connecting-IP when present. */
export async function verifyTurnstile(
    token: string | null | undefined,
    ip: string | null | undefined,
    env: NodeJS.ProcessEnv = process.env
): Promise<boolean> {
    const secret = env.TURNSTILE_SECRET_KEY
    if (!secret || !token || token.length > 2048) return false
    const body = new FormData()
    body.set('secret', secret)
    body.set('response', token)
    if (ip) body.set('remoteip', ip)
    body.set('idempotency_key', crypto.randomUUID())
    try {
        const response = await fetch(SITEVERIFY, { method: 'POST', body })
        if (!response.ok) return false
        const result = (await response.json()) as { success?: unknown }
        return result.success === true
    } catch {
        return false
    }
}

/**
 * For a request for a sign-in link: null when it may go on to Auth.js, or the
 * response Auth.js itself would give for a refused sign-in (the client's
 * `signIn` reads `error` from the returned URL).
 */
export async function checkSignInTurnstile(request: Request): Promise<Response | null> {
    if (request.method !== 'POST') return null
    const url = new URL(request.url)
    if (url.pathname !== EMAIL_SIGN_IN_PATH || !turnstileRequired()) return null

    let token: string | null = null
    try {
        const form = await request.clone().formData()
        const value = form.get(TURNSTILE_FIELD)
        token = typeof value === 'string' ? value : null
    } catch {
        // Not a form body: no token.
    }
    const ip = request.headers.get('cf-connecting-ip')?.trim()
    if (await verifyTurnstile(token, ip)) return null

    const refused = new URL(`/?error=${TURNSTILE_ERROR}`, url.origin).toString()
    if (request.headers.get('x-auth-return-redirect')) {
        return Response.json({ url: refused })
    }
    return Response.redirect(refused, 302)
}
