import { NextRequest, NextResponse } from 'next/server'

import { hasCronSecret } from '@/lib/cronAuth'
import { runJob } from '@/lib/jobs'

/**
 * GET /api/cron/refresh-collection-cache: the collection cache refresh (Sundays 02:00 UTC), run by the Cloudflare cron
 * (worker/crons.ts). CRON_SECRET only: an admin session is never enough, so a
 * link an admin clicks cannot start it. Admins run it with
 * POST /api/admin/jobs/cache (fresh sign-in, confirm, audit log) instead.
 * `?adminOnly=true` limits the run to the admin's own account.
 */
export async function GET(request: NextRequest) {
    if (!hasCronSecret(request.headers)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const adminOnly = request.nextUrl.searchParams.get('adminOnly') === 'true'
    try {
        const summary = await runJob('cache', {
            scope: adminOnly ? 'admin' : 'all',
            trigger: 'cron',
        })
        return NextResponse.json({ success: true, ...summary })
    } catch (error) {
        console.error('[cron/refresh-collection-cache] failed:', error)
        return NextResponse.json({ error: 'Job failed' }, { status: 500 })
    }
}
