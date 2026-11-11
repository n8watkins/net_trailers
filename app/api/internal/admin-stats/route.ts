/**
 * GET /api/internal/admin-stats: NetTrailers' totals for admin.n8builds.dev
 * (lib/admin/appStats.ts). Service-only: the Worker answers 404 to any
 * /api/internal/ request from outside (worker/index.ts), and the AdminStats
 * entrypoint (worker/adminStats.ts) calls it in-process with CRON_SECRET,
 * which proxy.ts and this route both check.
 */

import { NextResponse } from 'next/server'

import { buildAppStats } from '@/lib/admin/appStats'
import { hasCronSecret } from '@/lib/cronAuth'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    if (!hasCronSecret(request.headers)) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    try {
        return NextResponse.json(await buildAppStats(), {
            headers: { 'Cache-Control': 'no-store' },
        })
    } catch (error) {
        console.error('[internal/admin-stats] Error:', error)
        return NextResponse.json({ error: 'Failed to build the stats' }, { status: 500 })
    }
}
