import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { guestKeyFromHeaders } from '@/lib/aiVisitor'
import { consumeLimits, tooManyRequests } from '@/lib/durableLimit'

export interface RequestIdentity {
    userId: string | null
    rateLimitKey: string
}

/**
 * Rate-limit identity: the signed-in user, or for guests a hash of Cloudflare's
 * client IP (never X-Forwarded-For, which clients can set; see lib/aiVisitor.ts).
 */
export async function getRequestIdentity(request: NextRequest): Promise<RequestIdentity> {
    const session = await auth()
    if (session?.user?.id) {
        return { userId: session.user.id, rateLimitKey: `user:${session.user.id}` }
    }
    return { userId: null, rateLimitKey: `guest:${await guestKeyFromHeaders(request.headers)}` }
}

/**
 * A durable per-caller limit for a route: `limit` requests per `windowMs` for
 * each signed-in user, or each guest IP (CF-Connecting-IP). Returns the 429
 * response to send, or null when the request may go on.
 */
export async function rateLimitRequest(
    request: NextRequest,
    name: string,
    limit: number,
    windowMs: number
): Promise<NextResponse | null> {
    const { rateLimitKey } = await getRequestIdentity(request)
    const result = await consumeLimits([
        { key: `${name}:${rateLimitKey}`, limit, window: { ms: windowMs } },
    ])
    return result.allowed ? null : tooManyRequests(result)
}
