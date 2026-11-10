import { NextResponse } from 'next/server'
import { getAiHealth } from '@/lib/aiHealth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/health/ai: 200 {"ai":"ok"} when Gemini answers, otherwise 503 with a
 * reason code (not_configured, key_invalid, quota, timeout, upstream_error).
 * Results are cached for 45 minutes (lib/aiHealth.ts).
 */
export async function GET() {
    const health = await getAiHealth()
    const checkedAt = new Date(health.checkedAt).toISOString()
    return health.ok
        ? NextResponse.json({ ai: 'ok', checkedAt }, { headers: { 'Cache-Control': 'no-store' } })
        : NextResponse.json(
              { ai: 'down', reason: health.reason, checkedAt },
              { status: 503, headers: { 'Cache-Control': 'no-store' } }
          )
}
