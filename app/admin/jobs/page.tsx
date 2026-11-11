'use client'

import { useCallback, useEffect, useState } from 'react'
import {
    CircleAlert,
    CircleCheck,
    CircleDashed,
    LoaderCircle,
    Mail,
    Play,
    RefreshCw,
    Users,
} from 'lucide-react'

import { adminPost, ConfirmDialog, useReauthDialog } from '@/components/admin/AdminDialogs'
import { AdminPageHeader } from '@/components/admin/shell/AdminPageHeader'
import { BUTTON, CARD, ErrorNote, Loading } from '@/components/admin/shell/ui'
import { useToast } from '@/hooks/useToast'
import { formatAgo, formatDateTime } from '@/lib/admin/format'

type JobName = 'trending' | 'cache' | 'social'

type JobInfo = {
    name: JobName
    title: string
    schedule: string
    nextRun: number
    lastRun: {
        trigger: string
        scope: string
        startedAt: number
        finishedAt: number | null
        ok: boolean | null
        summary: Record<string, number> | null
    } | null
}

const ICONS: Record<JobName, React.ReactNode> = {
    trending: <Mail aria-hidden className="size-5 text-amber-400" />,
    cache: <RefreshCw aria-hidden className="size-5 text-amber-400" />,
    social: <Users aria-hidden className="size-5 text-amber-400" />,
}

/** What each job does, and what "for all users" means for it. */
const DETAILS: Record<JobName, { summary: string; does: string[]; all: string }> = {
    trending: {
        summary: "Emails the week's trending titles to opted-in users.",
        does: [
            'Fetches the current trending movies and TV shows from TMDB.',
            'Emails the top 5 of each to users with trending updates and email on.',
            'Creates in-app notifications for the top 3 of each.',
        ],
        all: 'Emails everyone who turned on trending updates and email.',
    },
    cache: {
        summary: 'Refreshes collection caches and deletes page views older than 90 days.',
        does: [
            'Re-fetches the top 50 of TMDB genre collections with actor or director filters.',
            'Skips collections refreshed in the last 7 days and notifies owners of new titles.',
            'Deletes signed-in page views older than 90 days (all-users runs only).',
        ],
        all: "Refreshes every user's collections and deletes page views older than 90 days.",
    },
    social: {
        summary: "Batches the week's comments and likes into one email per user.",
        does: [
            'Collects unsent comment and like notifications from the past 7 days.',
            'Sends one digest per user and marks them as emailed.',
        ],
        all: 'Emails a digest to everyone with unsent comment or like notifications.',
    },
}

function summaryText(summary: Record<string, number> | null): string {
    if (!summary) return ''
    return Object.entries(summary)
        .map(([key, value]) => `${value} ${key.replace(/([A-Z])/g, ' $1').toLowerCase()}`)
        .join(', ')
}

function LastRun({ job }: { job: JobInfo }) {
    const run = job.lastRun
    if (!run)
        return (
            <p className="flex items-center gap-2 text-sm text-gray-400">
                <CircleDashed aria-hidden className="size-4 text-gray-500" />
                No run recorded yet
            </p>
        )
    const icon =
        run.ok === null ? (
            <LoaderCircle aria-hidden className="size-4 animate-spin text-sky-400" />
        ) : run.ok ? (
            <CircleCheck aria-hidden className="size-4 text-emerald-400" />
        ) : (
            <CircleAlert aria-hidden className="size-4 text-red-400" />
        )
    const status = run.ok === null ? 'Running' : run.ok ? 'Succeeded' : 'Failed'
    return (
        <div className="space-y-1 text-sm">
            <p className="flex items-center gap-2 text-gray-200">
                {icon}
                {status} {formatAgo(run.startedAt)}
                <span className="text-gray-500">
                    ({run.trigger === 'cron' ? 'scheduled' : 'by admin'}
                    {run.scope === 'admin' ? ', admin only' : ''})
                </span>
            </p>
            {run.summary && <p className="text-[13px] text-gray-400">{summaryText(run.summary)}</p>}
        </div>
    )
}

export default function JobsPage() {
    const { showSuccess, showError } = useToast()
    const { needReauth, dialog: reauthDialog } = useReauthDialog()
    const [jobs, setJobs] = useState<JobInfo[] | null>(null)
    const [error, setError] = useState('')
    const [running, setRunning] = useState<string | null>(null)
    const [confirm, setConfirm] = useState<{ job: JobInfo; scope: 'admin' | 'all' } | null>(null)

    const load = useCallback(async () => {
        try {
            const r = await fetch('/api/admin/jobs')
            if (!r.ok) throw new Error()
            setJobs(((await r.json()) as { jobs: JobInfo[] }).jobs)
        } catch {
            setError('The jobs could not be loaded. Reload to try again.')
        }
    }, [])

    useEffect(() => {
        load()
    }, [load])

    const run = async (job: JobInfo, scope: 'admin' | 'all') => {
        setRunning(`${job.name}-${scope}`)
        const result = await adminPost<Record<string, unknown>>(`/api/admin/jobs/${job.name}`, {
            scope,
        })
        setRunning(null)
        setConfirm(null)
        if (!result.ok) {
            if (result.reauth) needReauth()
            else showError(result.error)
            return
        }
        const { success: _s, job: _j, scope: _sc, ...counts } = result.data
        showSuccess(`${job.title} done: ${summaryText(counts as Record<string, number>) || 'ok'}`)
        load()
    }

    return (
        <>
            {reauthDialog}
            {confirm && (
                <ConfirmDialog
                    title={
                        confirm.scope === 'all'
                            ? `Run the ${confirm.job.title.toLowerCase()} for all users?`
                            : `Run the ${confirm.job.title.toLowerCase()} for you only?`
                    }
                    confirmLabel={confirm.scope === 'all' ? 'Run for all users' : 'Run for me only'}
                    danger={confirm.scope === 'all'}
                    busy={running !== null}
                    onConfirm={() => run(confirm.job, confirm.scope)}
                    onCancel={() => setConfirm(null)}
                >
                    {confirm.scope === 'all' ? (
                        <>
                            <p>{DETAILS[confirm.job.name].all}</p>
                            <p>
                                This is the same run as the schedule ({confirm.job.schedule}) and
                                can send real email. It is written to the audit log.
                            </p>
                        </>
                    ) : (
                        <p>
                            The same code limited to your own account: anything it emails goes only
                            to you. It is written to the audit log.
                        </p>
                    )}
                </ConfirmDialog>
            )}
            <AdminPageHeader
                title="Jobs"
                lead="Weekly Cloudflare Cron Triggers at 02:00 UTC. Running one here uses the same code."
            />
            {error && <ErrorNote>{error}</ErrorNote>}
            {!jobs && !error && <Loading />}
            {jobs && (
                <div className="grid gap-3 lg:grid-cols-3">
                    {jobs.map((job) => (
                        <section
                            key={job.name}
                            aria-labelledby={`job-${job.name}`}
                            data-testid={`job-${job.name}`}
                            className={`${CARD} flex min-w-0 flex-col gap-4 p-4 sm:p-5`}
                        >
                            <div className="flex items-start gap-3">
                                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-amber-500/10">
                                    {ICONS[job.name]}
                                </span>
                                <div className="min-w-0">
                                    <h2 id={`job-${job.name}`} className="font-semibold text-white">
                                        {job.title}
                                    </h2>
                                    <p className="text-[13px] text-gray-400">{job.schedule}</p>
                                </div>
                            </div>
                            <p className="text-sm text-gray-300">{DETAILS[job.name].summary}</p>
                            <details className="group text-sm">
                                <summary className="cursor-pointer text-[13px] text-amber-400 hover:text-amber-300">
                                    What it does
                                </summary>
                                <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] text-gray-400">
                                    {DETAILS[job.name].does.map((line) => (
                                        <li key={line}>{line}</li>
                                    ))}
                                </ul>
                            </details>
                            <dl className="space-y-2 border-t border-white/10 pt-3">
                                <div>
                                    <dt className="text-xs tracking-wide text-gray-500 uppercase">
                                        Last run
                                    </dt>
                                    <dd className="mt-1">
                                        <LastRun job={job} />
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-xs tracking-wide text-gray-500 uppercase">
                                        Next run
                                    </dt>
                                    <dd className="mt-1 text-sm text-gray-200">
                                        {formatDateTime(job.nextRun)}
                                    </dd>
                                </div>
                            </dl>
                            <div className="mt-auto flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
                                <button
                                    type="button"
                                    onClick={() => setConfirm({ job, scope: 'admin' })}
                                    disabled={running !== null}
                                    className={`${BUTTON.secondary} flex-1`}
                                >
                                    {running === `${job.name}-admin` ? (
                                        <LoaderCircle aria-hidden className="size-4 animate-spin" />
                                    ) : (
                                        <Play aria-hidden className="size-4" />
                                    )}
                                    Run for me only
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setConfirm({ job, scope: 'all' })}
                                    disabled={running !== null}
                                    className={`${BUTTON.danger} flex-1`}
                                >
                                    {running === `${job.name}-all` ? (
                                        <LoaderCircle aria-hidden className="size-4 animate-spin" />
                                    ) : (
                                        <Play aria-hidden className="size-4" />
                                    )}
                                    Run for all users...
                                </button>
                            </div>
                        </section>
                    ))}
                </div>
            )}
        </>
    )
}
