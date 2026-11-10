import crypto from 'crypto'

/**
 * The CRON_SECRET check, shared by proxy.ts (every /api/cron/* request) and
 * the cron routes themselves (defence in depth). Constant-time comparison.
 */
export function isValidCronSecret(token: string | null | undefined): boolean {
    const cronSecret = process.env.CRON_SECRET
    if (!token || !cronSecret) return false
    try {
        const encoder = new TextEncoder()
        const tokenBytes = encoder.encode(token)
        const secretBytes = encoder.encode(cronSecret)
        if (tokenBytes.length !== secretBytes.length) return false
        return crypto.timingSafeEqual(tokenBytes, secretBytes)
    } catch {
        return false
    }
}

/** Whether the request carries `Authorization: Bearer <CRON_SECRET>`. */
export function hasCronSecret(headers: Headers): boolean {
    const authHeader = headers.get('authorization')
    if (!authHeader) return false
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader
    return isValidCronSecret(token)
}
