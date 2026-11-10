/**
 * Health of the live AI provider, for GET /api/health/ai (monitored hourly).
 *
 * One minimal real Gemini call (a one-token reply), cached for 45 minutes in
 * memory and in the `ai_health` table, so frequent checks cost nothing. The
 * result says only "ok" or a reason code: never the key or the provider's text.
 */

import { sql } from 'drizzle-orm'

import { db } from '@/db'
import { DEFAULT_MODEL_PRIORITY } from '@/lib/geminiRouter'

export const AI_HEALTH_TTL_MS = 45 * 60 * 1000
const TIMEOUT_MS = 10_000

export type AiHealthReason =
    'not_configured' | 'key_invalid' | 'quota' | 'timeout' | 'upstream_error'

export interface AiHealth {
    ok: boolean
    reason: AiHealthReason | null
    checkedAt: number
}

let memo: AiHealth | null = null

/** Map a Gemini error response to a reason code. */
export function classifyGeminiFailure(status: number, body: unknown): AiHealthReason {
    const error = (body as { error?: { status?: string; message?: string; details?: unknown[] } })
        ?.error
    const text = JSON.stringify(error ?? {}).toUpperCase()
    if (status === 429 || text.includes('RESOURCE_EXHAUSTED')) return 'quota'
    if (
        status === 401 ||
        status === 403 ||
        text.includes('API_KEY_INVALID') ||
        text.includes('API KEY NOT VALID') ||
        text.includes('API_KEY_SERVICE_BLOCKED') ||
        text.includes('PERMISSION_DENIED')
    ) {
        return 'key_invalid'
    }
    return 'upstream_error'
}

/** Make the one minimal real call. */
export async function probeGemini(
    apiKey: string | undefined,
    fetchImpl: typeof fetch = fetch
): Promise<AiHealth> {
    const checkedAt = Date.now()
    if (!apiKey) return { ok: false, reason: 'not_configured', checkedAt }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
        const response = await fetchImpl(
            `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL_PRIORITY[0]}:generateContent`,
            {
                method: 'POST',
                // The key goes in a header, not the URL, so it never lands in logs.
                headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: 'Reply with the single word: ok' }] }],
                    generationConfig: { maxOutputTokens: 1, temperature: 0 },
                }),
                signal: controller.signal,
            }
        )
        if (response.ok) return { ok: true, reason: null, checkedAt }
        const body = await response.json().catch(() => null)
        return { ok: false, reason: classifyGeminiFailure(response.status, body), checkedAt }
    } catch (error) {
        const aborted = (error as Error)?.name === 'AbortError'
        return { ok: false, reason: aborted ? 'timeout' : 'upstream_error', checkedAt }
    } finally {
        clearTimeout(timer)
    }
}

async function readStored(): Promise<AiHealth | null> {
    await db.run(
        sql`CREATE TABLE IF NOT EXISTS ai_health (id text PRIMARY KEY NOT NULL, ok integer NOT NULL, reason text, checkedAt integer NOT NULL)`
    )
    const rows = await db.all<{ ok: number; reason: string | null; checkedAt: number }>(
        sql`SELECT ok, reason, checkedAt FROM ai_health WHERE id = 'gemini'`
    )
    const row = rows[0]
    return row
        ? {
              ok: Boolean(row.ok),
              reason: row.reason as AiHealthReason | null,
              checkedAt: row.checkedAt,
          }
        : null
}

async function store(health: AiHealth): Promise<void> {
    await db.run(
        sql`INSERT INTO ai_health (id, ok, reason, checkedAt) VALUES ('gemini', ${health.ok ? 1 : 0}, ${health.reason}, ${health.checkedAt})
            ON CONFLICT(id) DO UPDATE SET ok = excluded.ok, reason = excluded.reason, checkedAt = excluded.checkedAt`
    )
}

const fresh = (health: AiHealth | null, now: number): health is AiHealth =>
    Boolean(health && now - health.checkedAt < AI_HEALTH_TTL_MS)

/** Cached health: memory, then the database, then one real call. */
export async function getAiHealth(now: number = Date.now()): Promise<AiHealth> {
    if (fresh(memo, now)) return memo

    let stored: AiHealth | null = null
    try {
        stored = await readStored()
    } catch {
        // No database: still answer from a live probe (cached in memory only).
    }
    if (fresh(stored, now)) {
        memo = stored
        return stored
    }

    const health = await probeGemini(process.env.GEMINI_API_KEY)
    memo = health
    await store(health).catch(() => undefined)
    return health
}
