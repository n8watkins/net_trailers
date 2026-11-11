'use client'

import { useState } from 'react'
import {
    AlertCircle,
    CheckCircle2,
    Clock,
    Database,
    Mail,
    Play,
    RefreshCw,
    Users,
} from 'lucide-react'

import { useToast } from '@/hooks/useToast'

import { adminPost, ConfirmDialog, useReauthDialog } from './AdminDialogs'

export type JobName = 'trending' | 'cache' | 'social'

export type JobInfo = {
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
    trending: <Mail className="h-5 w-5 text-blue-500" />,
    cache: <RefreshCw className="h-5 w-5 text-teal-500" />,
    social: <Users className="h-5 w-5 text-purple-500" />,
}

const DETAILS: Record<JobName, { summary: string; does: string[]; needs: string[] }> = {
    trending: {
        summary: 'Emails the week’s trending titles to opted-in users',
        does: [
            'Fetches the current trending movies and TV shows from TMDB',
            'Emails the top 5 of each to users with trending updates and email on',
            'Creates in-app notifications for the top 3 of each',
        ],
        needs: ['notifications.email = true', 'notifications.types.trending_update = true'],
    },
    cache: {
        summary: 'Refreshes collection caches; deletes page views older than 90 days',
        does: [
            'Re-fetches the top 50 of TMDB genre collections with actor or director filters',
            'Skips collections refreshed in the last 7 days',
            'Notifies owners when new titles appear',
            'Deletes signed-in page views older than 90 days (all-users runs only)',
        ],
        needs: [],
    },
    social: {
        summary: 'Batches the week’s comments and likes into one email per user',
        does: [
            'Collects unsent comment and like notifications from the past 7 days',
            'Sends one digest per user and marks them as emailed',
        ],
        needs: ['notifications.email = true', 'notifications.types.system is not false'],
    },
}

const formatTime = (ms: number) => new Date(ms).toLocaleString(undefined, { timeZoneName: 'short' })

function summaryText(summary: Record<string, number> | null): string {
    if (!summary) return ''
    return Object.entries(summary)
        .map(([key, value]) => `${value} ${key.replace(/([A-Z])/g, ' $1').toLowerCase()}`)
        .join(', ')
}

export function LastRunLine({ job }: { job: JobInfo }) {
    const run = job.lastRun
    if (!run) return <span className="text-gray-500">No run recorded yet</span>
    const status = run.ok === null ? 'running' : run.ok ? 'ok' : 'failed'
    return (
        <span className={run.ok === false ? 'text-amber-400' : 'text-gray-400'}>
            {formatTime(run.startedAt)} ({status},{' '}
            {run.trigger === 'cron' ? 'scheduled' : 'by admin'}
            {run.scope === 'admin' ? ', admin only' : ''})
        </span>
    )
}

export default function CronJobsPanel({ jobs, onRan }: { jobs: JobInfo[]; onRan: () => void }) {
    const { showSuccess, showError } = useToast()
    const { needReauth, dialog: reauthDialog } = useReauthDialog()
    const [expanded, setExpanded] = useState<string | null>('overview')
    const [running, setRunning] = useState<string | null>(null)
    const [confirmAll, setConfirmAll] = useState<JobInfo | null>(null)

    const run = async (job: JobInfo, scope: 'admin' | 'all') => {
        setRunning(`${job.name}-${scope}`)
        const result = await adminPost<Record<string, number>>(`/api/admin/jobs/${job.name}`, {
            scope,
        })
        setRunning(null)
        setConfirmAll(null)
        if (!result.ok) {
            if (result.reauth) needReauth()
            else showError(result.error)
            return
        }
        const {
            success: _s,
            job: _j,
            scope: _sc,
            ...counts
        } = result.data as Record<string, unknown>
        showSuccess(`${job.title} done: ${summaryText(counts as Record<string, number>) || 'ok'}`)
        onRan()
    }

    const Section = ({
        id,
        title,
        icon,
        children,
    }: {
        id: string
        title: string
        icon: React.ReactNode
        children: React.ReactNode
    }) => {
        const isExpanded = expanded === id
        return (
            <div className="bg-gray-800 rounded-xl overflow-hidden">
                <button
                    onClick={() => setExpanded(isExpanded ? null : id)}
                    aria-expanded={isExpanded}
                    className="w-full flex items-center justify-between p-6 hover:bg-gray-700/50 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        {icon}
                        <h3 className="text-lg font-semibold text-white">{title}</h3>
                    </div>
                    <div className="text-gray-400">{isExpanded ? '−' : '+'}</div>
                </button>
                {isExpanded && <div className="p-6 pt-0 border-t border-gray-700">{children}</div>}
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {reauthDialog}
            {confirmAll && (
                <ConfirmDialog
                    title={`Run the ${confirmAll.title.toLowerCase()} for all users?`}
                    confirmLabel="Run for all users"
                    danger
                    busy={running !== null}
                    onConfirm={() => run(confirmAll, 'all')}
                    onCancel={() => setConfirmAll(null)}
                >
                    <p>{DETAILS[confirmAll.name].summary}.</p>
                    <p>
                        This is the same run as the schedule ({confirmAll.schedule}) and can send
                        real email to everyone opted in.
                    </p>
                </ConfirmDialog>
            )}

            {/* Header */}
            <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 border border-blue-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-3">
                    <Clock className="h-6 w-6 text-blue-400" />
                    <h2 className="text-2xl font-bold text-white">Cron Jobs Management</h2>
                </div>
                <p className="text-gray-300 text-sm">
                    Weekly jobs run by Cloudflare Cron Triggers at 02:00 UTC. Running one here uses
                    the same code; &quot;Run for me only&quot; limits it to your own account.
                </p>
                <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-700 rounded-lg">
                    <p className="text-sm text-yellow-400 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        <strong>Warning:</strong> &quot;Run for all users&quot; can email everyone
                        opted in. It asks to confirm first.
                    </p>
                </div>
            </div>

            {/* Overview */}
            <Section
                id="overview"
                title="System Overview"
                icon={<Database className="h-5 w-5 text-green-500" />}
            >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {jobs.map((job) => (
                        <div
                            key={job.name}
                            className="bg-gray-900 p-4 rounded-lg"
                            data-testid={`job-overview-${job.name}`}
                        >
                            <div className="flex items-center gap-2 mb-2">
                                {ICONS[job.name]}
                                <h4 className="text-sm font-medium text-white">{job.title}</h4>
                            </div>
                            <p className="text-xs text-gray-400 mb-2">
                                {DETAILS[job.name].summary}
                            </p>
                            <p className="text-xs text-gray-400">Schedule: {job.schedule}</p>
                            <p className="text-xs text-gray-400">
                                Next run: {formatTime(job.nextRun)}
                            </p>
                            <p className="text-xs">
                                <span className="text-gray-400">Last run: </span>
                                <LastRunLine job={job} />
                            </p>
                        </div>
                    ))}
                </div>
            </Section>

            {jobs.map((job) => (
                <Section
                    key={job.name}
                    id={job.name}
                    title={`${job.title} (${job.schedule})`}
                    icon={ICONS[job.name]}
                >
                    <div className="space-y-4">
                        <div className="prose prose-invert prose-sm max-w-none">
                            <h4 className="text-white">What it does:</h4>
                            <ul className="text-gray-300">
                                {DETAILS[job.name].does.map((line) => (
                                    <li key={line}>{line}</li>
                                ))}
                            </ul>
                            {DETAILS[job.name].needs.length > 0 && (
                                <>
                                    <h4 className="text-white mt-4">Who gets email:</h4>
                                    <ul className="text-gray-300">
                                        {DETAILS[job.name].needs.map((line) => (
                                            <li key={line}>
                                                <code>{line}</code>
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            )}
                        </div>

                        <div className="bg-gray-900 rounded-lg p-5 space-y-3">
                            <div className="flex items-start justify-between">
                                <p className="text-xs text-gray-400">
                                    <strong>Last run:</strong> <LastRunLine job={job} />
                                </p>
                                {job.lastRun?.ok === true && (
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                )}
                                {job.lastRun?.ok === false && (
                                    <AlertCircle className="h-4 w-4 text-amber-400" />
                                )}
                            </div>
                            {job.lastRun?.summary && (
                                <p className="text-xs text-gray-400">
                                    {summaryText(job.lastRun.summary)}
                                </p>
                            )}
                            <div className="flex flex-col gap-3 sm:flex-row">
                                <button
                                    onClick={() => run(job, 'admin')}
                                    disabled={running !== null}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-600 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition"
                                >
                                    {running === `${job.name}-admin` ? (
                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Play className="h-4 w-4" />
                                    )}
                                    Run for me only
                                </button>
                                <button
                                    onClick={() => setConfirmAll(job)}
                                    disabled={running !== null}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-700 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition"
                                >
                                    {running === `${job.name}-all` ? (
                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Play className="h-4 w-4" />
                                    )}
                                    Run for all users...
                                </button>
                            </div>
                        </div>
                    </div>
                </Section>
            ))}
        </div>
    )
}
