/**
 * "For you" recommendations: TMDB finds candidates similar to the titles a
 * visitor loves, then Gemini ranks them and writes a one-line reason each.
 *
 * - Candidates come from TMDB's similar + recommended lists for each seed;
 *   a title suggested by several seeds ranks higher. Adult and barely-rated
 *   titles are already filtered by isRecommendable.
 * - The AI ranking is cached per taste profile (seeds + candidate set) for a
 *   day in the database, so revisits and other visitors with the same picks
 *   cost nothing. A live call spends one unit of the same daily cap as AI
 *   search (lib/aiQuota.ts).
 * - If the AI is unavailable or the cap is used up, the TMDB picks are
 *   returned without reasons and `ai` says why. It never fails outright
 *   because of the AI.
 */
import { sql } from 'drizzle-orm'
import { db } from '@/db'
import type { Content } from '@/typings'
import { getHybridRecommendations } from '@/utils/tmdb/recommendations'
import { consumeAiQuota, quotaExhaustedMessage, refundAiQuota, type AiQuota } from '@/lib/aiQuota'
import { routeGeminiRequest, extractGeminiText } from '@/lib/geminiRouter'
import { apiError } from '@/utils/debugLogger'

export const MAX_SEEDS = 8
export const PICK_COUNT = 12
const CANDIDATE_COUNT = 30
const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const MAX_REASON_LENGTH = 120

export interface ForYouSeed {
    id: number
    media_type: 'movie' | 'tv'
    title: string
}

export interface ForYouPick {
    content: Content
    /** One-line AI reason, or null when the AI did not rank this result */
    reason: string | null
    /** The loved title that led to this pick */
    becauseOf: string
}

export type ForYouAiStatus = 'ok' | 'cached' | 'quota' | 'unavailable'

export interface ForYouResult {
    picks: ForYouPick[]
    ai: ForYouAiStatus
    /** Why the reasons are missing, for the page to show */
    notice: string | null
    quota: AiQuota | null
}

export interface Candidate {
    key: string
    content: Content
    score: number
    becauseOf: string
}

export function contentKeyOf(item: { id: number; media_type?: string; title?: string }): string {
    const type = item.media_type ?? (item.title ? 'movie' : 'tv')
    return `${type}-${item.id}`
}

function titleOf(content: Content): string {
    const c = content as { title?: string; name?: string }
    return c.title || c.name || 'Untitled'
}

function yearOf(content: Content): string {
    const c = content as { release_date?: string; first_air_date?: string }
    return (c.release_date || c.first_air_date || '').slice(0, 4)
}

/**
 * Merge per-seed candidate lists. A title earns more for ranking high in a
 * seed's list and for appearing under several seeds.
 */
export function rankCandidates(
    seeds: ForYouSeed[],
    lists: Content[][],
    exclude: ReadonlySet<string>,
    limit = CANDIDATE_COUNT
): Candidate[] {
    const seedKeys = new Set(seeds.map((s) => `${s.media_type}-${s.id}`))
    const byKey = new Map<string, Candidate & { bestRank: number }>()
    lists.forEach((list, seedIndex) => {
        list.forEach((content, rank) => {
            const key = contentKeyOf(content)
            if (seedKeys.has(key) || exclude.has(key)) return
            const points = Math.max(1, 20 - rank)
            const existing = byKey.get(key)
            if (existing) {
                existing.score += points + 10 // bonus for agreeing seeds
                if (rank < existing.bestRank) {
                    existing.bestRank = rank
                    existing.becauseOf = seeds[seedIndex].title
                }
            } else {
                byKey.set(key, {
                    key,
                    content,
                    score: points,
                    becauseOf: seeds[seedIndex].title,
                    bestRank: rank,
                })
            }
        })
    })
    return [...byKey.values()]
        .sort(
            (a, b) => b.score - a.score || (b.content.popularity ?? 0) - (a.content.popularity ?? 0)
        )
        .slice(0, limit)
        .map(({ bestRank: _bestRank, ...candidate }) => candidate)
}

export function buildPrompt(seeds: ForYouSeed[], candidates: Candidate[]): string {
    const loved = seeds.map((s) => `- ${s.title}`).join('\n')
    const options = candidates
        .map((c) => {
            const overview = (c.content.overview || '').replace(/\s+/g, ' ').slice(0, 160)
            return `${c.key} | ${titleOf(c.content)} (${yearOf(c.content) || 'n/a'}) | ${overview}`
        })
        .join('\n')
    return `You recommend movies and TV shows.

The viewer loves:
${loved}

Candidates (key | title (year) | summary):
${options}

Choose the ${PICK_COUNT} candidates this viewer is most likely to love, best first. Use only keys from the list.
For each, write one reason of at most 90 characters in the form "Because you liked <one loved title>: <what they share>".
Answer with JSON only, no prose: [{"key":"movie-123","reason":"Because you liked Arrival: a quiet, big-idea sci-fi"}]`
}

/** Parse the model's JSON; keep only known keys, one each, with a cleaned reason. */
export function parseRanking(
    text: string,
    candidateKeys: ReadonlySet<string>
): { key: string; reason: string }[] {
    const start = text.indexOf('[')
    const end = text.lastIndexOf(']')
    if (start < 0 || end <= start) return []
    let raw: unknown
    try {
        raw = JSON.parse(text.slice(start, end + 1))
    } catch {
        return []
    }
    if (!Array.isArray(raw)) return []
    const seen = new Set<string>()
    const out: { key: string; reason: string }[] = []
    for (const entry of raw) {
        if (!entry || typeof entry !== 'object') continue
        const { key, reason } = entry as { key?: unknown; reason?: unknown }
        if (typeof key !== 'string' || !candidateKeys.has(key) || seen.has(key)) continue
        if (typeof reason !== 'string') continue
        const cleaned = reason
            .replace(/[\r\n]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
        if (!cleaned) continue
        seen.add(key)
        out.push({
            key,
            reason:
                cleaned.length > MAX_REASON_LENGTH
                    ? `${cleaned.slice(0, MAX_REASON_LENGTH - 1).trimEnd()}…`
                    : cleaned,
        })
        if (out.length >= PICK_COUNT) break
    }
    return out
}

async function sha256Hex(value: string): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

export async function cacheKeyFor(seeds: ForYouSeed[], candidates: Candidate[]): Promise<string> {
    const seedPart = seeds
        .map((s) => `${s.media_type}-${s.id}:${s.title}`)
        .sort()
        .join('|')
    const candidatePart = candidates
        .map((c) => c.key)
        .sort()
        .join('|')
    return `for-you:v1:${await sha256Hex(`${seedPart}#${candidatePart}`)}`
}

let cacheReady: Promise<void> | null = null
function ensureCacheTable(): Promise<void> {
    if (!cacheReady) {
        cacheReady = db
            .run(
                sql`CREATE TABLE IF NOT EXISTS ai_cache (key text PRIMARY KEY NOT NULL, value text NOT NULL, expiresAt integer NOT NULL)`
            )
            .then(() => undefined)
            .catch((error) => {
                cacheReady = null
                throw error
            })
    }
    return cacheReady
}

async function readCache(key: string): Promise<{ key: string; reason: string }[] | null> {
    try {
        await ensureCacheTable()
        const rows = await db.all<{ value: string }>(
            sql`SELECT value FROM ai_cache WHERE key = ${key} AND expiresAt > ${Date.now()}`
        )
        return rows[0] ? (JSON.parse(rows[0].value) as { key: string; reason: string }[]) : null
    } catch {
        return null
    }
}

async function writeCache(key: string, value: { key: string; reason: string }[]): Promise<void> {
    try {
        await ensureCacheTable()
        await db.run(
            sql`INSERT INTO ai_cache (key, value, expiresAt) VALUES (${key}, ${JSON.stringify(value)}, ${Date.now() + CACHE_TTL_MS})
                ON CONFLICT(key) DO UPDATE SET value = excluded.value, expiresAt = excluded.expiresAt`
        )
    } catch (error) {
        apiError('[For You] cache write failed:', error)
    }
}

function toPicks(
    candidates: Candidate[],
    ranking: { key: string; reason: string }[] | null
): ForYouPick[] {
    if (!ranking || ranking.length === 0) {
        return candidates
            .slice(0, PICK_COUNT)
            .map((c) => ({ content: c.content, reason: null, becauseOf: c.becauseOf }))
    }
    const byKey = new Map(candidates.map((c) => [c.key, c]))
    return ranking.flatMap(({ key, reason }) => {
        const c = byKey.get(key)
        return c ? [{ content: c.content, reason, becauseOf: c.becauseOf }] : []
    })
}

/** Ask Gemini to rank; null when the AI could not answer usefully. */
async function rankWithAi(
    seeds: ForYouSeed[],
    candidates: Candidate[]
): Promise<{ key: string; reason: string }[] | null> {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) return null
    const result = await routeGeminiRequest(
        {
            contents: [{ parts: [{ text: buildPrompt(seeds, candidates) }] }],
            generationConfig: { temperature: 0.4, maxOutputTokens: 2000 },
        },
        apiKey
    )
    if (!result.success) {
        apiError('[For You] Gemini error:', result.error)
        return null
    }
    const text = extractGeminiText(result.data)
    const ranking = text ? parseRanking(text, new Set(candidates.map((c) => c.key))) : []
    // Fewer than half the picks means the answer was mostly unusable
    return ranking.length >= Math.ceil(PICK_COUNT / 2) ? ranking : null
}

export async function getForYou({
    seeds,
    exclude,
    visitorKey,
}: {
    seeds: ForYouSeed[]
    exclude: ReadonlySet<string>
    visitorKey: string
}): Promise<ForYouResult> {
    const lists = await Promise.all(
        seeds.map((seed) => getHybridRecommendations(seed.id, seed.media_type, 20))
    )
    const candidates = rankCandidates(seeds, lists, exclude)
    if (candidates.length === 0) {
        return { picks: [], ai: 'unavailable', notice: null, quota: null }
    }

    const cacheKey = await cacheKeyFor(seeds, candidates)
    const cached = await readCache(cacheKey)
    if (cached) {
        return { picks: toPicks(candidates, cached), ai: 'cached', notice: null, quota: null }
    }

    if (!process.env.GEMINI_API_KEY) {
        return {
            picks: toPicks(candidates, null),
            ai: 'unavailable',
            notice: 'AI picks are unavailable right now, so these come straight from TMDB.',
            quota: null,
        }
    }

    const quota = await consumeAiQuota(visitorKey)
    if (!quota.allowed) {
        return {
            picks: toPicks(candidates, null),
            ai: 'quota',
            notice: `${quotaExhaustedMessage(quota)} These picks come straight from TMDB.`,
            quota,
        }
    }

    const ranking = await rankWithAi(seeds, candidates).catch((error) => {
        apiError('[For You] ranking failed:', error)
        return null
    })
    if (!ranking) {
        await refundAiQuota(visitorKey).catch(() => undefined)
        return {
            picks: toPicks(candidates, null),
            ai: 'unavailable',
            notice: 'AI picks are unavailable right now, so these come straight from TMDB.',
            quota: { ...quota, remaining: quota.remaining + 1, exhausted: null },
        }
    }

    await writeCache(cacheKey, ranking)
    return { picks: toPicks(candidates, ranking), ai: 'ok', notice: null, quota }
}

/** Request validation for the API route. */
const MAX_EXCLUDE = 1000

export function parseSeeds(value: unknown): ForYouSeed[] | null {
    if (!Array.isArray(value) || value.length === 0) return null
    const seeds: ForYouSeed[] = []
    for (const entry of value.slice(0, MAX_SEEDS)) {
        if (!entry || typeof entry !== 'object') return null
        const { id, media_type, title } = entry as Record<string, unknown>
        if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0) return null
        if (media_type !== 'movie' && media_type !== 'tv') return null
        const cleanTitle =
            typeof title === 'string'
                ? title
                      .replace(/[\r\n<>`]/g, ' ')
                      .replace(/\s+/g, ' ')
                      .trim()
                      .slice(0, 100)
                : ''
        seeds.push({ id, media_type, title: cleanTitle || `${media_type} ${id}` })
    }
    return seeds
}

export function parseExclude(value: unknown): Set<string> {
    if (!Array.isArray(value)) return new Set()
    return new Set(
        value
            .slice(0, MAX_EXCLUDE)
            .filter((k): k is string => typeof k === 'string' && /^(movie|tv)-\d+$/.test(k))
    )
}
