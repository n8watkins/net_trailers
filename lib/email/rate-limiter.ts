/**
 * Email Rate Limiter
 *
 * Prevents abuse of email sending endpoints by limiting:
 * - Per-admin hourly email quota (100 emails/hour)
 * - Per-recipient daily email quota (1 email/day to same user)
 *
 * Uses in-memory LRU cache with TTL for stateless rate limiting
 */

interface RateLimitResult {
    allowed: boolean
    limit: number
    remaining: number
    resetAt?: number
}

// In-memory cache for rate limiting
// Key format: "email:{adminId}" or "recipient:{recipientId}"
const rateLimitCache = new Map<string, { count: number; resetAt: number }>()

// Cleanup expired entries every 5 minutes
setInterval(
    () => {
        const now = Date.now()
        for (const [key, value] of rateLimitCache.entries()) {
            if (value.resetAt < now) {
                rateLimitCache.delete(key)
            }
        }
    },
    5 * 60 * 1000
)

/**
 * Check if admin has exceeded hourly email sending quota
 * @param adminId - Firebase UID of admin user
 * @returns Rate limit result with allowed status and remaining quota
 */
export function checkAdminEmailRateLimit(adminId: string): RateLimitResult {
    const key = `email:${adminId}`
    const limit = 100 // 100 emails per hour per admin
    const windowMs = 60 * 60 * 1000 // 1 hour
    const now = Date.now()

    const existing = rateLimitCache.get(key)

    if (!existing || existing.resetAt < now) {
        // First request or window expired - reset
        rateLimitCache.set(key, { count: 1, resetAt: now + windowMs })
        return { allowed: true, limit, remaining: limit - 1, resetAt: now + windowMs }
    }

    if (existing.count >= limit) {
        // Quota exceeded
        return { allowed: false, limit, remaining: 0, resetAt: existing.resetAt }
    }

    // Increment count
    existing.count++
    rateLimitCache.set(key, existing)
    return { allowed: true, limit, remaining: limit - existing.count, resetAt: existing.resetAt }
}

/**
 * Check if recipient has received too many emails recently
 * @param recipientId - Firebase UID of recipient user
 * @returns Rate limit result
 */
export function checkRecipientEmailRateLimit(recipientId: string): RateLimitResult {
    const key = `recipient:${recipientId}`
    const limit = 3 // Max 3 admin emails per day per user
    const windowMs = 24 * 60 * 60 * 1000 // 24 hours
    const now = Date.now()

    const existing = rateLimitCache.get(key)

    if (!existing || existing.resetAt < now) {
        rateLimitCache.set(key, { count: 1, resetAt: now + windowMs })
        return { allowed: true, limit, remaining: limit - 1 }
    }

    if (existing.count >= limit) {
        return { allowed: false, limit, remaining: 0, resetAt: existing.resetAt }
    }

    existing.count++
    rateLimitCache.set(key, existing)
    return { allowed: true, limit, remaining: limit - existing.count }
}

/**
 * Reset rate limit for testing purposes
 * @param key - Full cache key (e.g., "email:abc123")
 */
export function resetRateLimit(key: string): void {
    rateLimitCache.delete(key)
}
