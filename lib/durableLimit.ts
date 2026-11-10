/**
 * Durable rate limits and usage counters, kept in the `rate_limits` table.
 *
 * On Cloudflare Workers every isolate has its own memory and isolates come and
 * go, so a limit kept in a Map does not hold: a caller simply lands on another
 * isolate. These counters live in the database instead, like the AI quota
 * (lib/aiQuota.ts), and hold across isolates and deploys.
 *
 * A rule names a key, a limit and a window. Windows are UTC calendar days or
 * months, or fixed windows of N milliseconds. `consumeLimits` spends one unit
 * from every rule at once: if any rule is over its limit, the units already
 * spent are given back and the call is refused, so a refused call costs nothing.
 *
 * Keys must never hold a raw email address or IP address: hash them with
 * `hashKey` first.
 */

import { sql } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { db } from '@/db'

export type LimitWindow = 'day' | 'month' | { ms: number }

export interface LimitRule {
    key: string
    limit: number
    window: LimitWindow
}

export type LimitResult =
    { allowed: true } | { allowed: false; rule: LimitRule; retryAfterSeconds: number }

const DAY_MS = 24 * 60 * 60 * 1000

interface WindowInfo {
    id: string
    /** When the window ends (epoch ms). */
    endsAt: number
}

export function windowInfo(window: LimitWindow, now: Date = new Date()): WindowInfo {
    const t = now.getTime()
    if (window === 'day') {
        const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
        return { id: `d:${now.toISOString().slice(0, 10)}`, endsAt: start + DAY_MS }
    }
    if (window === 'month') {
        return {
            id: `m:${now.toISOString().slice(0, 7)}`,
            endsAt: Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
        }
    }
    const index = Math.floor(t / window.ms)
    return { id: `w${window.ms}:${index}`, endsAt: (index + 1) * window.ms }
}

/** A positive integer from an environment variable, or the fallback. */
export function readLimit(name: string, fallback: number): number {
    const value = Number(process.env[name])
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback
}

async function sha256Hex(value: string): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

/** A salted hash for keys built from personal data (email addresses, IPs). */
export async function hashKey(value: string): Promise<string> {
    const salt = process.env.AUTH_SECRET ?? 'nettrailers-rate-limits'
    return (await sha256Hex(`${salt}:${value}`)).slice(0, 32)
}

let tableReady: Promise<void> | null = null

/**
 * The table also comes from migration 0003; creating it here (idempotently)
 * means a deploy works before `npm run db:migrate` has been run.
 */
function ensureTable(): Promise<void> {
    if (!tableReady) {
        tableReady = db
            .run(
                sql`CREATE TABLE IF NOT EXISTS rate_limits (key text NOT NULL, period text NOT NULL, count integer DEFAULT 0 NOT NULL, expiresAt integer NOT NULL, updatedAt integer NOT NULL, PRIMARY KEY(key, period))`
            )
            .then(() =>
                db.run(
                    sql`CREATE INDEX IF NOT EXISTS rate_limits_expires_idx ON rate_limits (expiresAt)`
                )
            )
            .then(() => undefined)
            .catch((error) => {
                tableReady = null
                throw error
            })
    }
    return tableReady
}

async function add(key: string, info: WindowInfo, by: number): Promise<number> {
    const ts = Date.now()
    const rows = await db.all<{ count: number }>(
        sql`INSERT INTO rate_limits (key, period, count, expiresAt, updatedAt)
            VALUES (${key}, ${info.id}, ${by}, ${info.endsAt}, ${ts})
            ON CONFLICT(key, period) DO UPDATE SET count = count + ${by}, updatedAt = ${ts}
            RETURNING count`
    )
    return rows[0]?.count ?? by
}

/** Windows that ended this long ago are deleted (kept a while for usage reports). */
const RETAIN_MS = 40 * DAY_MS
const SWEEP_EVERY_MS = 60 * 60 * 1000
let lastSweep: number | null = null

/** At most once an hour per isolate, old windows are deleted so the table stays small. */
async function maybePrune(now: Date): Promise<void> {
    const t = now.getTime()
    if (lastSweep !== null && Math.abs(t - lastSweep) < SWEEP_EVERY_MS) return
    lastSweep = t
    await db.run(sql`DELETE FROM rate_limits WHERE expiresAt < ${t - RETAIN_MS}`)
}

/**
 * Spend one unit from every rule. Refused (and nothing spent) when any rule
 * would go over its limit. Rules are checked in order, so put the narrowest
 * (per caller) first and the site-wide ones last.
 */
export async function consumeLimits(
    rules: LimitRule[],
    now: Date = new Date()
): Promise<LimitResult> {
    await ensureTable()
    const spent: Array<{ key: string; info: WindowInfo }> = []
    for (const rule of rules) {
        const info = windowInfo(rule.window, now)
        const count = await add(rule.key, info, 1)
        if (count > rule.limit) {
            await add(rule.key, info, -1)
            await Promise.all(spent.map((s) => add(s.key, s.info, -1)))
            return {
                allowed: false,
                rule,
                retryAfterSeconds: Math.max(1, Math.ceil((info.endsAt - now.getTime()) / 1000)),
            }
        }
        spent.push({ key: rule.key, info })
    }
    await maybePrune(now).catch(() => undefined)
    return { allowed: true }
}

/** Add to a plain counter with no limit (usage statistics). */
export async function countEvent(
    key: string,
    window: LimitWindow,
    now: Date = new Date()
): Promise<void> {
    await ensureTable()
    await add(key, windowInfo(window, now), 1)
}

/** The current count for a key in its window, without spending anything. */
export async function readCount(
    key: string,
    window: LimitWindow,
    now: Date = new Date()
): Promise<number> {
    await ensureTable()
    const rows = await db.all<{ count: number }>(
        sql`SELECT count FROM rate_limits WHERE key = ${key} AND period = ${windowInfo(window, now).id}`
    )
    return rows[0]?.count ?? 0
}

/** Clear a key's counter for the current window (e.g. after a correct PIN). */
export async function resetLimit(
    key: string,
    window: LimitWindow,
    now: Date = new Date()
): Promise<void> {
    await ensureTable()
    await db.run(
        sql`DELETE FROM rate_limits WHERE key = ${key} AND period = ${windowInfo(window, now).id}`
    )
}

/** A 429 response body and headers for a refused call. */
export function tooManyRequests(result: Extract<LimitResult, { allowed: false }>): NextResponse {
    return NextResponse.json(
        {
            success: false,
            error: 'Too many requests. Please try again later.',
            retryAfter: result.retryAfterSeconds,
        },
        { status: 429, headers: { 'Retry-After': String(result.retryAfterSeconds) } }
    )
}
