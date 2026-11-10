import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { guestKeyFromHeaders } from '@/lib/aiVisitor'

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
