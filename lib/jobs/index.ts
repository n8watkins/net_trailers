/**
 * The three scheduled jobs, run by the Cloudflare cron (through the CRON_SECRET
 * /api/cron/* routes, worker/crons.ts) or by an admin (POST /api/admin/jobs/[name]).
 * Every run is recorded in `cron_runs`, so the admin page shows real last runs.
 */

import { desc, eq } from 'drizzle-orm'

import { db } from '@/db'
import { cronRuns } from '@/db/schema'

import { runCollectionCacheRefresh } from './collectionCache'
import { runSocialDigest } from './socialDigest'
import { runTrendingDigest } from './trendingDigest'

export const JOB_NAMES = ['trending', 'cache', 'social'] as const
export type JobName = (typeof JOB_NAMES)[number]

export type JobScope = 'admin' | 'all'
export type JobTrigger = 'cron' | 'admin'

export type JobSummary = Record<string, number>

/** What each job does and when the cron runs it (wrangler.jsonc triggers.crons, UTC). */
export const JOBS: Record<
    JobName,
    {
        title: string
        cron: string
        schedule: string
        run: (o: { adminOnly: boolean }) => Promise<JobSummary>
    }
> = {
    trending: {
        title: 'Trending digest',
        cron: '0 2 * * MON',
        schedule: 'Mondays at 02:00 UTC',
        run: runTrendingDigest,
    },
    cache: {
        title: 'Collection cache refresh',
        cron: '0 2 * * SUN',
        schedule: 'Sundays at 02:00 UTC',
        run: runCollectionCacheRefresh,
    },
    social: {
        title: 'Social digest',
        cron: '0 2 * * WED',
        schedule: 'Wednesdays at 02:00 UTC',
        run: runSocialDigest,
    },
}

export function isJobName(name: string): name is JobName {
    return (JOB_NAMES as readonly string[]).includes(name)
}

/** Run a job and record the run. Rethrows the job's error after recording it. */
export async function runJob(
    name: JobName,
    { scope, trigger }: { scope: JobScope; trigger: JobTrigger }
): Promise<JobSummary> {
    const startedAt = Date.now()
    const [run] = await db
        .insert(cronRuns)
        .values({ job: name, trigger, scope, startedAt })
        .returning({ id: cronRuns.id })
    try {
        const summary = await JOBS[name].run({ adminOnly: scope === 'admin' })
        await db
            .update(cronRuns)
            .set({ finishedAt: Date.now(), ok: true, summary })
            .where(eq(cronRuns.id, run.id))
        return summary
    } catch (error) {
        await db
            .update(cronRuns)
            .set({ finishedAt: Date.now(), ok: false })
            .where(eq(cronRuns.id, run.id))
        throw error
    }
}

export type LastRun = {
    trigger: string
    scope: string
    startedAt: number
    finishedAt: number | null
    ok: boolean | null
    summary: JobSummary | null
}

/** The latest recorded run of each job, or null when it never ran since runs are recorded. */
export async function lastRuns(): Promise<Record<JobName, LastRun | null>> {
    const entries = await Promise.all(
        JOB_NAMES.map(async (name) => {
            const [row] = await db
                .select({
                    trigger: cronRuns.trigger,
                    scope: cronRuns.scope,
                    startedAt: cronRuns.startedAt,
                    finishedAt: cronRuns.finishedAt,
                    ok: cronRuns.ok,
                    summary: cronRuns.summary,
                })
                .from(cronRuns)
                .where(eq(cronRuns.job, name))
                .orderBy(desc(cronRuns.startedAt))
                .limit(1)
            return [name, row ?? null] as const
        })
    )
    return Object.fromEntries(entries) as Record<JobName, LastRun | null>
}

/** The next time a weekly `0 2 * * DAY` cron fires after `now` (UTC). */
export function nextWeeklyRun(cron: string, now: number = Date.now()): number {
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
    const [minute, hour, , , day] = cron.split(' ')
    const target = days.indexOf(day)
    const date = new Date(now)
    date.setUTCHours(Number(hour), Number(minute), 0, 0)
    let add = (target - date.getUTCDay() + 7) % 7
    if (add === 0 && date.getTime() <= now) add = 7
    date.setUTCDate(date.getUTCDate() + add)
    return date.getTime()
}
