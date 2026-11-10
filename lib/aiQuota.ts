/**
 * Durable daily caps on live AI (Gemini) calls.
 *
 * Every live AI request spends one unit from two counters in the `ai_usage`
 * table: the visitor's own (signed-in user id, or a hash of Cloudflare's client
 * IP for guests) and a site-wide `global` counter. Counters reset at 00:00 UTC.
 * Example moods (public/example-moods) never touch these counters.
 *
 * The counters live in the database, not in memory, so they hold across Worker
 * isolates and deploys.
 */

import { sql } from 'drizzle-orm'

import { db } from '@/db'

/** Live AI searches one visitor may run per UTC day. */
export const PER_VISITOR_DAILY_LIMIT = readLimit('AI_DAILY_LIMIT_PER_VISITOR', 10)
/** Live AI calls the whole site may make per UTC day. */
export const GLOBAL_DAILY_LIMIT = readLimit('AI_DAILY_LIMIT_GLOBAL', 300)

const GLOBAL_KEY = 'global'

function readLimit(name: string, fallback: number): number {
    const value = Number(process.env[name])
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback
}

export interface AiQuota {
    /** Units the visitor may still spend today. */
    remaining: number
    /** The visitor's daily limit. */
    limit: number
    /** Why nothing is left, when remaining is 0. */
    exhausted: 'visitor' | 'global' | null
    /** When the counters reset (ISO 8601, next 00:00 UTC). */
    resetsAt: string
}

export interface ConsumeResult extends AiQuota {
    allowed: boolean
}

/** UTC calendar day, e.g. "2026-11-08". */
export function utcDay(now: Date = new Date()): string {
    return now.toISOString().slice(0, 10)
}

function nextUtcMidnight(now: Date = new Date()): string {
    const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))
    return next.toISOString()
}

let tableReady: Promise<void> | null = null

/**
 * The table also comes from migration 0002; creating it here (idempotently) means
 * a deploy works before `npm run db:migrate` has been run.
 */
function ensureTable(): Promise<void> {
    if (!tableReady) {
        tableReady = db
            .run(
                sql`CREATE TABLE IF NOT EXISTS ai_usage (key text NOT NULL, day text NOT NULL, count integer DEFAULT 0 NOT NULL, updatedAt integer NOT NULL, PRIMARY KEY(key, day))`
            )
            .then(() => undefined)
            .catch((error) => {
                tableReady = null
                throw error
            })
    }
    return tableReady
}

async function readCount(key: string, day: string): Promise<number> {
    const rows = await db.all<{ count: number }>(
        sql`SELECT count FROM ai_usage WHERE key = ${key} AND day = ${day}`
    )
    return rows[0]?.count ?? 0
}

async function increment(key: string, day: string, by: number): Promise<number> {
    const rows = await db.all<{ count: number }>(
        sql`INSERT INTO ai_usage (key, day, count, updatedAt) VALUES (${key}, ${day}, ${by}, ${Date.now()})
            ON CONFLICT(key, day) DO UPDATE SET count = count + ${by}, updatedAt = ${Date.now()}
            RETURNING count`
    )
    return rows[0]?.count ?? by
}

function quotaFrom(visitorCount: number, globalCount: number, now: Date): AiQuota {
    const visitorLeft = Math.max(0, PER_VISITOR_DAILY_LIMIT - visitorCount)
    const globalLeft = Math.max(0, GLOBAL_DAILY_LIMIT - globalCount)
    const remaining = Math.min(visitorLeft, globalLeft)
    return {
        remaining,
        limit: PER_VISITOR_DAILY_LIMIT,
        exhausted: remaining > 0 ? null : visitorLeft === 0 ? 'visitor' : 'global',
        resetsAt: nextUtcMidnight(now),
    }
}

/** The visitor's quota for today, without spending anything. */
export async function getAiQuota(visitorKey: string, now: Date = new Date()): Promise<AiQuota> {
    await ensureTable()
    const day = utcDay(now)
    const [visitorCount, globalCount] = await Promise.all([
        readCount(visitorKey, day),
        readCount(GLOBAL_KEY, day),
    ])
    return quotaFrom(visitorCount, globalCount, now)
}

/**
 * Spend one unit for a live AI call. Both counters are incremented atomically
 * (INSERT ... ON CONFLICT ... RETURNING); if either is over its limit the
 * increments are undone and the call is refused.
 */
export async function consumeAiQuota(
    visitorKey: string,
    now: Date = new Date()
): Promise<ConsumeResult> {
    await ensureTable()
    const day = utcDay(now)

    const visitorCount = await increment(visitorKey, day, 1)
    if (visitorCount > PER_VISITOR_DAILY_LIMIT) {
        await increment(visitorKey, day, -1)
        const globalCount = await readCount(GLOBAL_KEY, day)
        return { allowed: false, ...quotaFrom(visitorCount - 1, globalCount, now) }
    }

    const globalCount = await increment(GLOBAL_KEY, day, 1)
    if (globalCount > GLOBAL_DAILY_LIMIT) {
        await Promise.all([increment(visitorKey, day, -1), increment(GLOBAL_KEY, day, -1)])
        return { allowed: false, ...quotaFrom(visitorCount - 1, globalCount - 1, now) }
    }

    return { allowed: true, ...quotaFrom(visitorCount, globalCount, now) }
}

/** User-facing message for a refused call. */
export function quotaExhaustedMessage(quota: AiQuota): string {
    return quota.exhausted === 'global'
        ? 'AI search has reached its daily limit for everyone. Try an example mood, or come back tomorrow.'
        : `You've used today's ${quota.limit} AI searches. Try an example mood, or come back tomorrow.`
}

/**
 * Give a unit back when the AI provider failed (bad key, outage), so visitors
 * are not charged for calls that produced nothing.
 */
export async function refundAiQuota(visitorKey: string, now: Date = new Date()): Promise<void> {
    await ensureTable()
    const day = utcDay(now)
    await db.run(
        sql`UPDATE ai_usage SET count = MAX(count - 1, 0), updatedAt = ${Date.now()} WHERE day = ${day} AND key IN (${visitorKey}, ${GLOBAL_KEY})`
    )
}
