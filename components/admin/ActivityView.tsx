'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

import { AdminPageHeader } from '@/components/admin/shell/AdminPageHeader'
import { DataTable } from '@/components/admin/shell/DataTable'
import { CARD, ErrorNote, cx } from '@/components/admin/shell/ui'
import { formatDate, formatDateTime } from '@/lib/admin/format'
import type { AdminUserRow } from '@/types/admin'

type Period = 'week' | 'month'

const PERIOD_MS: Record<Period, number> = { week: 7 * 86_400_000, month: 30 * 86_400_000 }

type ActivityRow = {
    id: string
    type: 'login' | 'view'
    userId?: string
    userEmail?: string
    page?: string
    userAgent?: string
    timestamp: number
}

type ActivityStats = { total: number; uniqueUsers: number; activeDays: number; avgPerDay: number }

/** Week or month, as a two-button switch in the page header. */
function PeriodSwitch({ period, onChange }: { period: Period; onChange: (p: Period) => void }) {
    return (
        <div
            role="group"
            aria-label="Period"
            className="inline-flex rounded-lg border border-white/10 bg-black/40 p-0.5"
        >
            {(['week', 'month'] as const).map((p) => (
                <button
                    key={p}
                    type="button"
                    aria-pressed={period === p}
                    onClick={() => onChange(p)}
                    className={cx(
                        'min-h-8 rounded-md px-3 text-[13px] font-medium focus-visible:outline-2 focus-visible:outline-amber-400',
                        period === p ? 'bg-amber-500 text-black' : 'text-gray-300 hover:text-white'
                    )}
                >
                    {p === 'week' ? 'This week' : 'This month'}
                </button>
            ))}
        </div>
    )
}

function Summary({ items }: { items: { label: string; value: number | string }[] }) {
    return (
        <dl className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {items.map((i) => (
                <div key={i.label} className={`${CARD} px-4 py-3`}>
                    <dt className="text-[13px] text-gray-400">{i.label}</dt>
                    <dd className="text-xl font-semibold text-white tabular-nums">{i.value}</dd>
                </div>
            ))}
        </dl>
    )
}

/** Logins or page views (user_activity), filtered by period and optionally one user. */
export function ActivityView({ type }: { type: 'login' | 'view' }) {
    const userId = useSearchParams()?.get('userId') ?? null
    const [period, setPeriod] = useState<Period>('month')
    const [rows, setRows] = useState<ActivityRow[]>([])
    const [stats, setStats] = useState<ActivityStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        setLoading(true)
        setError('')
        const params = new URLSearchParams({ type, period })
        if (userId) params.set('userId', userId)
        fetch(`/api/admin/activity?${params}`)
            .then(async (r) => {
                if (!r.ok) throw new Error()
                const data = (await r.json()) as { activities: ActivityRow[]; stats: ActivityStats }
                setRows(data.activities)
                setStats(data.stats)
            })
            .catch(() => setError('The activity could not be loaded. Reload to try again.'))
            .finally(() => setLoading(false))
    }, [type, period, userId])

    const noun = type === 'login' ? 'Sign-ins' : 'Page views'
    const filteredEmail = userId ? rows.find((r) => r.userId === userId)?.userEmail : null

    return (
        <>
            <AdminPageHeader
                title="Activity"
                lead={
                    userId ? (
                        <>
                            Only {filteredEmail ?? 'one user'}.{' '}
                            <Link
                                href={
                                    type === 'login' ? '/admin/activity' : '/admin/activity/views'
                                }
                                className="text-amber-400 hover:text-amber-300"
                            >
                                Show everyone
                            </Link>
                        </>
                    ) : (
                        `${noun} by signed-in users. Guests are not recorded.`
                    )
                }
                actions={<PeriodSwitch period={period} onChange={setPeriod} />}
            />
            {error && <ErrorNote>{error}</ErrorNote>}
            {stats && (
                <Summary
                    items={[
                        { label: noun, value: stats.total },
                        { label: 'People', value: stats.uniqueUsers },
                        { label: 'Active days', value: stats.activeDays },
                        { label: 'Per day', value: Math.round(stats.avgPerDay * 10) / 10 },
                    ]}
                />
            )}
            <section className={`${CARD} p-4 sm:p-5`}>
                <DataTable
                    label={noun}
                    rows={rows}
                    loading={loading}
                    rowKey={(r) => r.id}
                    empty={`No ${noun.toLowerCase()} ${period === 'week' ? 'this week' : 'this month'}.`}
                    search={{
                        placeholder:
                            type === 'view' ? 'Search by email or page' : 'Search by email',
                        text: (r) => `${r.userEmail ?? ''} ${r.page ?? ''}`,
                    }}
                    columns={[
                        {
                            key: 'who',
                            header: 'User',
                            cell: (r) => (
                                <div className="min-w-0">
                                    {r.userId ? (
                                        <Link
                                            href={`?userId=${encodeURIComponent(r.userId)}`}
                                            className="break-all text-white hover:text-amber-300"
                                        >
                                            {r.userEmail ?? r.userId}
                                        </Link>
                                    ) : (
                                        'Unknown'
                                    )}
                                    {r.page && (
                                        <p className="font-mono text-xs break-all text-gray-500 sm:hidden">
                                            {r.page}
                                        </p>
                                    )}
                                </div>
                            ),
                        },
                        ...(type === 'view'
                            ? [
                                  {
                                      key: 'page',
                                      header: 'Page',
                                      hideOnPhone: true,
                                      cell: (r: ActivityRow) => (
                                          <span className="font-mono text-[13px] break-all text-gray-300">
                                              {r.page ?? '-'}
                                          </span>
                                      ),
                                  },
                              ]
                            : []),
                        {
                            key: 'when',
                            header: 'When',
                            className: 'whitespace-nowrap',
                            cell: (r) => formatDateTime(r.timestamp),
                        },
                    ]}
                />
            </section>
        </>
    )
}

/** New accounts in the period (the users API, by account creation time). */
export function SignupsView() {
    const [period, setPeriod] = useState<Period>('month')
    const [users, setUsers] = useState<AdminUserRow[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        fetch('/api/admin/users')
            .then(async (r) => {
                if (!r.ok) throw new Error()
                setUsers(((await r.json()) as { users: AdminUserRow[] }).users)
            })
            .catch(() => setError('The sign-ups could not be loaded. Reload to try again.'))
            .finally(() => setLoading(false))
    }, [])

    const since = Date.now() - PERIOD_MS[period]
    const recent = users
        .filter((u) => u.createdAt && Date.parse(u.createdAt) >= since)
        .sort((a, b) => Date.parse(b.createdAt!) - Date.parse(a.createdAt!))
    const days = new Set(recent.map((u) => formatDate(u.createdAt!))).size

    return (
        <>
            <AdminPageHeader
                title="Activity"
                lead="New accounts, newest first."
                actions={<PeriodSwitch period={period} onChange={setPeriod} />}
            />
            {error && <ErrorNote>{error}</ErrorNote>}
            {!loading && (
                <Summary
                    items={[
                        { label: 'Sign-ups', value: recent.length },
                        { label: 'Days with sign-ups', value: days },
                        { label: 'Accounts in total', value: users.length },
                        { label: 'Verified', value: recent.filter((u) => u.emailVerified).length },
                    ]}
                />
            )}
            <section className={`${CARD} p-4 sm:p-5`}>
                <DataTable
                    label="Sign-ups"
                    rows={recent}
                    loading={loading}
                    rowKey={(u) => u.uid}
                    empty={`No sign-ups ${period === 'week' ? 'this week' : 'this month'}.`}
                    search={{
                        placeholder: 'Search by name or email',
                        text: (u) => `${u.displayName} ${u.email}`,
                    }}
                    columns={[
                        {
                            key: 'who',
                            header: 'User',
                            cell: (u) => (
                                <div className="min-w-0">
                                    <p className="truncate text-white">{u.email}</p>
                                    {u.displayName && (
                                        <p className="truncate text-[13px] text-gray-500">
                                            {u.displayName}
                                        </p>
                                    )}
                                </div>
                            ),
                        },
                        {
                            key: 'when',
                            header: 'Joined',
                            className: 'whitespace-nowrap',
                            cell: (u) => formatDateTime(u.createdAt!),
                        },
                    ]}
                />
            </section>
        </>
    )
}
