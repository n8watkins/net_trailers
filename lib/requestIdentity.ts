import { NextRequest } from 'next/server'
import { auth } from '@/auth'

export interface RequestIdentity {
    userId: string | null
    rateLimitKey: string
}

export async function getRequestIdentity(request: NextRequest): Promise<RequestIdentity> {
    const requestWithIp = request as NextRequest & { ip?: string | null }

    // Identify the requester via the Auth.js session cookie (no Firebase token needed)
    const session = await auth()
    if (session?.user?.id) {
        return {
            userId: session.user.id,
            rateLimitKey: `user:${session.user.id}`,
        }
    }

    // Fall back to IP-based rate-limit key for unauthenticated requests
    const xff = request.headers.get('x-forwarded-for')
    const ip =
        (xff && xff.split(',')[0].trim()) ||
        requestWithIp.ip ||
        request.headers.get('x-real-ip') ||
        'unknown'

    return {
        userId: null,
        rateLimitKey: `guest:${ip}`,
    }
}
