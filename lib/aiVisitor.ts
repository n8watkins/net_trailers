/**
 * Who a live AI call is charged to (lib/aiQuota.ts).
 *
 * Signed-in visitors are keyed on their user id. Guests are keyed on
 * CF-Connecting-IP, which Cloudflare sets on every request at its edge and
 * overwrites if a client sends it, so it cannot be forged from outside. The
 * address is hashed before it is stored. X-Forwarded-For and X-Real-IP are
 * never used: clients can set them freely.
 *
 * Without CF-Connecting-IP (local development, tests), every guest shares one
 * `ip:unknown` counter.
 */

import { auth } from '@/auth'

export interface AiVisitor {
    userId: string | null
    key: string
}

async function sha256Hex(value: string): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Key for a guest, from Cloudflare's client IP header only. */
export async function guestKeyFromHeaders(headers: Headers): Promise<string> {
    const ip = headers.get('cf-connecting-ip')?.trim()
    if (!ip) return 'ip:unknown'
    // Salted so the stored value is not a plain hash of an IP address.
    const salt = process.env.AUTH_SECRET ?? 'nettrailers-ai-quota'
    return `ip:${(await sha256Hex(`${salt}:${ip}`)).slice(0, 32)}`
}

export async function getAiVisitor(request: Request): Promise<AiVisitor> {
    const session = await auth()
    if (session?.user?.id) {
        return { userId: session.user.id, key: `user:${session.user.id}` }
    }
    return { userId: null, key: await guestKeyFromHeaders(request.headers) }
}
