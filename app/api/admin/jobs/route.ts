/**
 * GET /api/admin/jobs (admin only): each scheduled job with its real schedule,
 * next run and last recorded run (cron_runs).
 */

import { NextResponse } from 'next/server'

import { requireAdmin, serverError } from '@/lib/admin/guard'
import { JOB_NAMES, JOBS, lastRuns, nextWeeklyRun } from '@/lib/jobs'

export async function GET() {
    const guard = await requireAdmin()
    if (!guard.ok) return guard.response
    try {
        const last = await lastRuns()
        const now = Date.now()
        return NextResponse.json({
            jobs: JOB_NAMES.map((name) => ({
                name,
                title: JOBS[name].title,
                schedule: JOBS[name].schedule,
                nextRun: nextWeeklyRun(JOBS[name].cron, now),
                lastRun: last[name],
            })),
        })
    } catch (error) {
        console.error('[admin/jobs] Error:', error)
        return serverError('Failed to load jobs')
    }
}
