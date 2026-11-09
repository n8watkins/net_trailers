import { NextRequest, NextResponse } from 'next/server'
import { getAiVisitor } from '@/lib/aiVisitor'
import { getAiQuota } from '@/lib/aiQuota'
import { apiError } from '@/utils/debugLogger'

export const dynamic = 'force-dynamic'

/** GET /api/ai/quota: the visitor's live AI searches left today (spends nothing). */
export async function GET(request: NextRequest) {
    try {
        const visitor = await getAiVisitor(request)
        const quota = await getAiQuota(visitor.key)
        return NextResponse.json(quota, { headers: { 'Cache-Control': 'no-store' } })
    } catch (error) {
        apiError('[AI Quota] lookup failed:', error)
        return NextResponse.json(
            { error: 'Quota unavailable' },
            { status: 503, headers: { 'Cache-Control': 'no-store' } }
        )
    }
}
