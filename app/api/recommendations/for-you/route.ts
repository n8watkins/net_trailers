/**
 * POST /api/recommendations/for-you
 * Body: { seeds: [{ id, media_type, title }], exclude?: ["movie-123", ...] }
 * Works for guests. See lib/forYou.ts.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAiVisitor } from '@/lib/aiVisitor'
import { getForYou, parseExclude, parseSeeds } from '@/lib/forYou'
import { apiError } from '@/utils/debugLogger'

export async function POST(request: NextRequest) {
    let body: unknown
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }
    const seeds = parseSeeds((body as { seeds?: unknown })?.seeds)
    if (!seeds) {
        return NextResponse.json({ error: 'Pick at least one title you love' }, { status: 400 })
    }
    try {
        const visitor = await getAiVisitor(request)
        const result = await getForYou({
            seeds,
            exclude: parseExclude((body as { exclude?: unknown }).exclude),
            visitorKey: visitor.key,
        })
        return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
    } catch (error) {
        apiError('[For You] failed:', error)
        return NextResponse.json({ error: 'Could not load picks right now' }, { status: 500 })
    }
}
