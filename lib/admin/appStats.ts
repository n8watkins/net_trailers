/**
 * NetTrailers' totals for the central admin (admin.n8builds.dev), in the
 * shared shape n8builds-admin documents in docs/APP-STATS.md (`AppStats`,
 * schema 1). Totals only: never an email, a name or a per-user row.
 *
 * Served to the Worker's AdminStats entrypoint (worker/adminStats.ts) by the
 * service-only route /api/internal/admin-stats; nothing public reaches it.
 */

import { and, count, countDistinct, eq, gte } from 'drizzle-orm'

import { db } from '@/db'
import { cronRuns, userActivity, users } from '@/db/schema'
import { getEmailUsage } from '@/lib/email/gate'
import { JOB_NAMES, JOBS, lastRuns, type LastRun } from '@/lib/jobs'

export type AppStatsTone = 'good' | 'warn' | 'bad' | 'quiet'

export type AppStats = {
    schema: 1
    app: string
    name: string
    generatedAt: string
    adminUrl: string
    tile: {
        headline: { value: number; label: string }
        meter?: { value: number; limit: number; label: string }
        note: string
        tone: AppStatsTone
    }
    totals: { key: string; label: string; value: number }[]
    quotas: { key: string; label: string; used: number; limit: number; period: 'day' | 'month' }[]
    jobs: {
        key: string
        label: string
        schedule: string
        lastRunAt: string | null
        status: 'ok' | 'failed' | 'running' | 'never'
    }[]
    errors: { count: number; windowHours: number }
    deploy: { version: string; deployedAt: string | null }
}

const DAY_MS = 24 * 60 * 60 * 1000
const ERROR_WINDOW_HOURS = 24
/** Where a quota turns the tile amber. */
const WARN_SHARE = 0.7

export function jobStatus(run: LastRun | null): AppStats['jobs'][number]['status'] {
    if (!run) return 'never'
    if (run.ok === true) return 'ok'
    if (run.ok === false) return 'failed'
    return run.finishedAt ? 'failed' : 'running'
}

/** The tile's tone: a failed last run or a reached cap is bad; errors or a cap at 70% is a warning. */
export function statsTone(stats: Pick<AppStats, 'jobs' | 'quotas' | 'errors'>): AppStatsTone {
    const share = (q: AppStats['quotas'][number]) => (q.limit > 0 ? q.used / q.limit : 0)
    if (stats.jobs.some((j) => j.status === 'failed') || stats.quotas.some((q) => share(q) >= 1))
        return 'bad'
    if (stats.errors.count > 0 || stats.quotas.some((q) => share(q) >= WARN_SHARE)) return 'warn'
    return 'quiet'
}

export async function buildAppStats(
    now: Date = new Date(),
    deploy: AppStats['deploy'] = { version: 'unknown', deployedAt: null }
): Promise<AppStats> {
    const weekAgo = now.getTime() - 7 * DAY_MS
    const errorsSince = now.getTime() - ERROR_WINDOW_HOURS * 60 * 60 * 1000
    const [[{ total }], [{ fresh }], [{ active }], [{ failed }], email, runs] = await Promise.all([
        db.select({ total: count() }).from(users),
        db.select({ fresh: count() }).from(users).where(gte(users.createdAt, weekAgo)),
        db
            .select({ active: countDistinct(userActivity.userId) })
            .from(userActivity)
            .where(gte(userActivity.timestamp, weekAgo)),
        db
            .select({ failed: count() })
            .from(cronRuns)
            .where(and(eq(cronRuns.ok, false), gte(cronRuns.startedAt, errorsSince))),
        getEmailUsage(now),
        lastRuns(),
    ])

    const jobs = JOB_NAMES.map((name) => ({
        key: name,
        label: JOBS[name].title,
        schedule: JOBS[name].schedule,
        lastRunAt: runs[name] ? new Date(runs[name].startedAt).toISOString() : null,
        status: jobStatus(runs[name]),
    }))
    const quotas: AppStats['quotas'] = [
        {
            key: 'email-day',
            label: 'Emails today',
            used: email.today,
            limit: email.dailyCap,
            period: 'day',
        },
        {
            key: 'email-month',
            label: 'Emails this month',
            used: email.thisMonth,
            limit: email.monthlyCap,
            period: 'month',
        },
    ]
    const errors = { count: failed, windowHours: ERROR_WINDOW_HOURS }

    return {
        schema: 1,
        app: 'nettrailers',
        name: 'NetTrailers',
        generatedAt: now.toISOString(),
        adminUrl: 'https://net-trailers.n8builds.dev/admin',
        tile: {
            headline: { value: total, label: total === 1 ? 'user' : 'users' },
            meter: { value: email.thisMonth, limit: email.monthlyCap, label: 'Emails this month' },
            note: `${fresh} new and ${active} active this week`,
            tone: statsTone({ jobs, quotas, errors }),
        },
        totals: [
            { key: 'users', label: 'Users', value: total },
            { key: 'new-7d', label: 'New this week', value: fresh },
            { key: 'active-7d', label: 'Active this week', value: active },
            { key: 'email-today', label: 'Emails today', value: email.today },
        ],
        quotas,
        jobs,
        errors,
        deploy,
    }
}
