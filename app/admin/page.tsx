'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarClock, CalendarDays, Eye, Mail, ShieldCheck, Users } from 'lucide-react'

import CronJobsPanel, { LastRunLine, type JobInfo } from '@/components/admin/CronJobsPanel'
import EmailComposer from '@/components/admin/EmailComposer'
import EmailHistory from '@/components/admin/EmailHistory'
import { useToast } from '@/hooks/useToast'
import type { ActiveUser, ActivityStats, AdminStats } from '@/types/admin'

// Only admins reach this page: app/admin/layout.tsx checks on the server, and
// every admin API checks again.

type EmailUsage = { today: number; thisMonth: number; dailyCap: number; monthlyCap: number }

type AuditEntry = {
    id: string
    actorEmail: string | null
    action: string
    details: Record<string, string | number | boolean | null> | null
    createdAt: number
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T | null> {
    try {
        const response = await fetch(url, init)
        return response.ok ? ((await response.json()) as T) : null
    } catch {
        return null
    }
}

const ACTION_LABELS: Record<string, string> = {
    'email.send': 'Sent an email',
    'email.test': 'Sent a test email to self',
    'job.run': 'Ran a job',
}

function auditDetails(details: AuditEntry['details']): string {
    if (!details) return ''
    return Object.entries(details)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ')
}

export default function AdminDashboard() {
    const router = useRouter()
    const { showError } = useToast()
    const [stats, setStats] = useState<AdminStats | null>(null)
    const [activityStats, setActivityStats] = useState<ActivityStats | null>(null)
    const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([])
    const [usage, setUsage] = useState<EmailUsage | null>(null)
    const [jobs, setJobs] = useState<JobInfo[]>([])
    const [audit, setAudit] = useState<AuditEntry[]>([])
    const [historyKey, setHistoryKey] = useState(0)
    const [statsLoading, setStatsLoading] = useState(true)

    const loadJobs = useCallback(async () => {
        const data = await getJson<{ jobs: JobInfo[] }>('/api/admin/jobs')
        if (data) setJobs(data.jobs)
    }, [])

    const loadAudit = useCallback(async () => {
        const data = await getJson<{ entries: AuditEntry[] }>('/api/admin/audit')
        if (data) setAudit(data.entries)
    }, [])

    const loadUsage = useCallback(async () => {
        const data = await getJson<{ usage: EmailUsage }>('/api/admin/email/usage')
        if (data) setUsage(data.usage)
    }, [])

    useEffect(() => {
        const loadAll = async () => {
            const [accounts, activity] = await Promise.all([
                getJson<{
                    userCount: number
                    signupsThisWeek: number
                    signupsThisMonth: number
                    signupsToday: number
                    lastSignup: number | null
                }>('/api/admin/init-stats', { method: 'POST' }),
                getJson<{
                    stats: ActivityStats
                    activities: { userId?: string; userEmail?: string; timestamp: number }[]
                }>('/api/admin/activity?period=month'),
                loadUsage(),
                loadJobs(),
                loadAudit(),
            ])

            if (accounts) {
                setStats({
                    totalAccounts: accounts.userCount,
                    signupsThisWeek: accounts.signupsThisWeek,
                    signupsThisMonth: accounts.signupsThisMonth,
                    signupsToday: accounts.signupsToday,
                    lastSignup: accounts.lastSignup,
                })
            } else {
                showError('Failed to load account statistics')
            }

            if (activity) {
                setActivityStats(activity.stats)
                const userMap = new Map<string, ActiveUser>()
                for (const a of activity.activities) {
                    if (!a.userId || !a.userEmail) continue
                    const user = userMap.get(a.userId) ?? {
                        userId: a.userId,
                        email: a.userEmail,
                        lastActive: a.timestamp,
                        activityCount: 0,
                    }
                    user.activityCount++
                    user.lastActive = Math.max(user.lastActive, a.timestamp)
                    userMap.set(a.userId, user)
                }
                setActiveUsers(
                    [...userMap.values()].sort((a, b) => b.lastActive - a.lastActive).slice(0, 10)
                )
            } else {
                showError('Failed to load activity statistics')
            }
            setStatsLoading(false)
        }
        loadAll()
    }, [])

    const afterAction = () => {
        loadAudit()
        loadUsage()
        loadJobs()
        setHistoryKey((key) => key + 1)
    }

    if (statsLoading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    <div className="text-white text-xl">Loading statistics...</div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-900 p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
                    <p className="text-gray-400">Accounts, activity, email and scheduled jobs</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <button
                        onClick={() => router.push('/admin/accounts')}
                        className="bg-gray-800 rounded-xl p-6 text-left hover:bg-gray-700/60 transition-colors cursor-pointer"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <Users className="h-8 w-8 text-blue-500" />
                            <span className="text-2xl font-bold text-white">
                                {stats?.totalAccounts ?? 0}
                            </span>
                        </div>
                        <h3 className="text-gray-400 text-sm mb-1">Total Accounts →</h3>
                        <span className="text-xs text-gray-500">
                            {stats?.signupsThisWeek ?? 0} new this week
                        </span>
                    </button>

                    <button
                        onClick={() => router.push('/admin/signups')}
                        className="bg-gray-800 rounded-xl p-6 text-left hover:bg-gray-700/60 transition-colors cursor-pointer"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <CalendarDays className="h-8 w-8 text-green-500" />
                            <span className="text-2xl font-bold text-white">
                                {stats?.signupsThisMonth ?? 0}
                            </span>
                        </div>
                        <h3 className="text-gray-400 text-sm mb-1">Signups This Month →</h3>
                        <span className="text-xs text-gray-500">View timeline and details</span>
                    </button>

                    <button
                        onClick={() => router.push('/admin/activity')}
                        className="bg-gray-800 rounded-xl p-6 text-left hover:bg-gray-700/60 transition-colors cursor-pointer"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <Eye className="h-8 w-8 text-purple-500" />
                            <span className="text-2xl font-bold text-white">
                                {activityStats?.total ?? 0}
                            </span>
                        </div>
                        <h3 className="text-gray-400 text-sm mb-1">Activity This Month →</h3>
                        <span className="text-xs text-gray-500">
                            {activityStats?.uniqueUsers ?? 0} signed-in users
                        </span>
                    </button>

                    {/* Email usage against the site-wide caps (lib/email/gate.ts) */}
                    <div className="bg-gray-800 rounded-xl p-6" data-testid="email-usage">
                        <div className="flex items-center justify-between mb-4">
                            <Mail className="h-8 w-8 text-orange-500" />
                            <span className="text-2xl font-bold text-white">
                                {usage ? `${usage.today} / ${usage.dailyCap}` : '-'}
                            </span>
                        </div>
                        <h3 className="text-gray-400 text-sm mb-1">Emails Today</h3>
                        <span className="text-xs text-gray-500">
                            {usage
                                ? `${usage.thisMonth} / ${usage.monthlyCap} this month`
                                : 'Usage unavailable'}
                        </span>
                    </div>
                </div>

                {/* Action Panels */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-gray-800 rounded-xl p-6">
                        <h2 className="text-xl font-semibold text-white mb-4">Job Schedule</h2>
                        <div className="space-y-3">
                            {jobs.map((job) => (
                                <div key={job.name} className="p-4 bg-gray-900 rounded-lg">
                                    <h3 className="text-sm font-medium text-gray-300 mb-1 flex items-center gap-2">
                                        <CalendarClock className="h-4 w-4 text-blue-400" />
                                        {job.title}: {job.schedule}
                                    </h3>
                                    <p className="text-xs text-gray-400">
                                        Next run: {new Date(job.nextRun).toLocaleString()}
                                    </p>
                                    <p className="text-xs">
                                        <span className="text-gray-400">Last run: </span>
                                        <LastRunLine job={job} />
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-gray-800 rounded-xl p-6">
                        <h2 className="text-xl font-semibold text-white mb-4">
                            Account Management
                        </h2>
                        <div className="p-4 bg-gray-900 rounded-lg">
                            <h3 className="text-sm font-medium text-gray-300 mb-2">
                                Recent Signups
                            </h3>
                            <div className="space-y-1">
                                <p className="text-xs text-gray-400">
                                    Last signup:{' '}
                                    {stats?.lastSignup
                                        ? new Date(stats.lastSignup).toLocaleString()
                                        : 'None recorded yet'}
                                </p>
                                <p className="text-xs text-gray-400">
                                    Today: {stats?.signupsToday ?? 0} signups
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Active Users */}
                <div className="mt-8 bg-gray-800 rounded-xl p-6">
                    <h2 className="text-xl font-semibold text-white mb-4">
                        Active Users This Month ({activeUsers.length})
                    </h2>
                    {activeUsers.length > 0 ? (
                        <div className="space-y-2">
                            {activeUsers.map((user) => (
                                <button
                                    key={user.userId}
                                    onClick={() =>
                                        router.push(`/admin/activity?userId=${user.userId}`)
                                    }
                                    className="w-full flex items-center justify-between p-4 bg-gray-900 rounded-lg hover:bg-gray-700/40 transition-colors text-left"
                                >
                                    <div>
                                        <p className="text-white font-medium">{user.email}</p>
                                        <p className="text-xs text-gray-500">
                                            {user.activityCount} events
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-400">Last active</p>
                                        <p className="text-sm text-white">
                                            {new Date(user.lastActive).toLocaleDateString()}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {new Date(user.lastActive).toLocaleTimeString()}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-400">No user activity recorded this month</p>
                    )}
                </div>

                {/* Email Management */}
                <div className="mt-8 bg-gray-800 rounded-xl p-6">
                    <EmailComposer onSent={afterAction} />
                </div>

                {/* Email History */}
                <div className="mt-8 bg-gray-800 rounded-xl p-6">
                    <EmailHistory key={historyKey} />
                </div>

                {/* Cron Jobs Management */}
                <div className="mt-8">
                    <CronJobsPanel jobs={jobs} onRan={afterAction} />
                </div>

                {/* Admin audit log (admin_audit) */}
                <div className="mt-8 bg-gray-800 rounded-xl p-6">
                    <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-green-500" />
                        Admin Audit Log
                    </h2>
                    <div className="bg-gray-900 rounded-lg p-4 max-h-64 overflow-y-auto">
                        {audit.length === 0 ? (
                            <p className="text-sm text-gray-500">No admin actions recorded yet</p>
                        ) : (
                            <ul className="space-y-2 font-mono text-xs" data-testid="audit-log">
                                {audit.map((entry) => (
                                    <li key={entry.id} className="text-gray-300">
                                        <span className="text-gray-500">
                                            {new Date(entry.createdAt).toLocaleString()}
                                        </span>{' '}
                                        {entry.actorEmail ?? 'admin'}:{' '}
                                        {ACTION_LABELS[entry.action] ?? entry.action}
                                        <span className="text-gray-500">
                                            {' '}
                                            ({auditDetails(entry.details)})
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
