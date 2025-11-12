export interface RateLimitStatus {
    allowed: boolean
    remaining: number
    resetAt: number
    retryAfterMs: number
}

interface RateLimitRecord {
    count: number
    resetAt: number
}

/**
 * Simple in-memory sliding window rate limiter
 * Suitable for short-lived serverless instances.
 */
export class MemoryRateLimiter {
    private readonly store = new Map<string, RateLimitRecord>()

    constructor(
        private readonly limit: number,
        private readonly windowMs: number
    ) {}

    consume(key: string): RateLimitStatus {
        const now = Date.now()

        if (this.limit <= 0) {
            return {
                allowed: true,
                remaining: Number.POSITIVE_INFINITY,
                resetAt: now + this.windowMs,
                retryAfterMs: 0,
            }
        }

        const existing = this.store.get(key)

        if (!existing || now > existing.resetAt) {
            const resetAt = now + this.windowMs
            this.store.set(key, { count: 1, resetAt })
            return {
                allowed: true,
                remaining: this.limit - 1,
                resetAt,
                retryAfterMs: resetAt - now,
            }
        }

        if (existing.count >= this.limit) {
            return {
                allowed: false,
                remaining: 0,
                resetAt: existing.resetAt,
                retryAfterMs: Math.max(0, existing.resetAt - now),
            }
        }

        existing.count += 1
        this.store.set(key, existing)

        return {
            allowed: true,
            remaining: Math.max(0, this.limit - existing.count),
            resetAt: existing.resetAt,
            retryAfterMs: Math.max(0, existing.resetAt - now),
        }
    }
}
