/**
 * POST /api/admin/jobs/[name] with `{ scope: 'admin' | 'all' }` (admin only,
 * fresh sign-in): run a scheduled job now, through the same code the cron runs
 * (lib/jobs). `admin` limits it to the admin's own account; `all` emails
 * everyone opted in, and the page asks for confirmation first. Audited.
 */

import { NextRequest, NextResponse } from 'next/server'

import { writeAdminAudit } from '@/lib/admin/audit'
import { badRequest, readJson, requireAdmin } from '@/lib/admin/guard'
import { jobRunBody } from '@/lib/admin/schemas'
import { isJobName, runJob } from '@/lib/jobs'

export async function POST(request: NextRequest, context: { params: Promise<{ name: string }> }) {
    const { name } = await context.params
    if (!isJobName(name)) return NextResponse.json({ error: 'Unknown job' }, { status: 404 })

    const guard = await requireAdmin({ fresh: true })
    if (!guard.ok) return guard.response

    const parsed = jobRunBody.safeParse(await readJson(request))
    if (!parsed.success) return badRequest()
    const { scope } = parsed.data

    try {
        const summary = await runJob(name, { scope, trigger: 'admin' })
        await writeAdminAudit(guard.actor, 'job.run', { job: name, scope, ok: true, ...summary })
        return NextResponse.json({ success: true, job: name, scope, ...summary })
    } catch (error) {
        console.error(`[admin/jobs/${name}] failed:`, error)
        await writeAdminAudit(guard.actor, 'job.run', { job: name, scope, ok: false })
        return NextResponse.json({ error: 'The job failed' }, { status: 500 })
    }
}
