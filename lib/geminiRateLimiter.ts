import { MemoryRateLimiter, RateLimitStatus } from './rateLimiter'

const DEFAULT_LIMIT = 100 // requests per day (increased from 25 to support more usage)
const DEFAULT_WINDOW_MS = 24 * 60 * 60 * 1000 // 24 hours

const limit = Number(process.env.GEMINI_MAX_REQUESTS_PER_WINDOW || DEFAULT_LIMIT)
const windowMs = Number(process.env.GEMINI_RATE_WINDOW_MS || DEFAULT_WINDOW_MS)

const geminiLimiter = new MemoryRateLimiter(limit, windowMs)

export function consumeGeminiRateLimit(identifier: string): RateLimitStatus {
    return geminiLimiter.consume(identifier)
}
