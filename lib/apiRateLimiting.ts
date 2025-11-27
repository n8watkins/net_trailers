/**
 * API Rate Limiting Middleware
 *
 * Applies rate limiting to protect API routes from abuse
 */

import { NextRequest, NextResponse } from 'next/server'
import { MemoryRateLimiter } from './rateLimiter'

// Different rate limiters for different endpoint types
export const authLimiter = new MemoryRateLimiter(5, 15 * 60 * 1000) // 5 requests per 15 minutes
export const apiLimiter = new MemoryRateLimiter(100, 60 * 1000) // 100 requests per minute
export const strictLimiter = new MemoryRateLimiter(10, 60 * 1000) // 10 requests per minute
export const publicProfileLimiter = new MemoryRateLimiter(20, 60 * 1000) // 20 requests per minute

/**
 * Get rate limit key from request
 * Uses IP address or user ID for tracking
 */
export function getRateLimitKey(request: NextRequest, prefix: string = 'api'): string {
    // Try to get client IP
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded
        ? forwarded.split(',')[0].trim()
        : request.headers.get('x-real-ip') || 'unknown'

    return `${prefix}:${ip}`
}

/**
 * Apply rate limiting to a request
 * Returns null if allowed, NextResponse with 429 status if rate limited
 */
export function applyRateLimit(
    request: NextRequest,
    limiter: MemoryRateLimiter,
    keyPrefix: string = 'api'
): NextResponse | null {
    const key = getRateLimitKey(request, keyPrefix)
    const status = limiter.consume(key)

    if (!status.allowed) {
        return NextResponse.json(
            {
                error: 'Rate limit exceeded',
                message: 'Too many requests. Please try again later.',
                retryAfter: Math.ceil(status.retryAfterMs / 1000), // seconds
            },
            {
                status: 429,
                headers: {
                    'Retry-After': Math.ceil(status.retryAfterMs / 1000).toString(),
                    'X-RateLimit-Limit': limiter['limit'].toString(),
                    'X-RateLimit-Remaining': status.remaining.toString(),
                    'X-RateLimit-Reset': status.resetAt.toString(),
                },
            }
        )
    }

    return null
}

/**
 * Higher-order function to wrap route handlers with rate limiting
 */
export function withRateLimit(
    handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse>,
    limiter: MemoryRateLimiter,
    keyPrefix: string = 'api'
) {
    return async (request: NextRequest, ...args: any[]): Promise<NextResponse> => {
        // Apply rate limiting
        const rateLimitResponse = applyRateLimit(request, limiter, keyPrefix)
        if (rateLimitResponse) {
            return rateLimitResponse
        }

        // Call original handler
        return handler(request, ...args)
    }
}
