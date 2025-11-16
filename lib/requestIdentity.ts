import { NextRequest } from 'next/server'
import { verifyIdToken } from './firebase-admin'

export interface RequestIdentity {
    userId: string | null
    rateLimitKey: string
}

export async function getRequestIdentity(request: NextRequest): Promise<RequestIdentity> {
    const authHeader = request.headers.get('authorization')
    const requestWithIp = request as NextRequest & { ip?: string | null }

    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7)
        try {
            const decoded = await verifyIdToken(token)
            return {
                userId: decoded.uid,
                rateLimitKey: `user:${decoded.uid}`,
            }
        } catch (error) {
            console.warn('[RequestIdentity] Failed to verify auth token:', error)
        }
    }

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
