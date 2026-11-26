import { NextResponse } from 'next/server'

/**
 * Turn a failed TMDB call into an honest HTTP answer for our own API routes.
 *
 * - TMDB says it has no such title: 404.
 * - TMDB is rate limiting us: 429 with Retry-After.
 * - TMDB or the network failed, or TMDB refused our key: 502, because the fault
 *   is upstream and a visitor retrying later may succeed.
 * - Anything else (a bug or missing configuration on our side): 500.
 *
 * Error answers are never cached, so one bad moment does not stick for hours.
 */
export function tmdbFailureStatus(error: unknown): number {
    if (error instanceof Error) {
        const { status, code } = error as { status?: number; code?: string }
        if (typeof status === 'number') {
            if (status === 404) return 404
            if (status === 429) return 429
            return 502
        }
        if (code === 'NETWORK_ERROR') return 502
    }
    return 500
}

export function tmdbErrorResponse(error: unknown, message: string): NextResponse {
    const status = tmdbFailureStatus(error)
    const headers: Record<string, string> = { 'Cache-Control': 'no-store' }
    if (status === 429) headers['Retry-After'] = '30'
    return NextResponse.json({ message }, { status, headers })
}
