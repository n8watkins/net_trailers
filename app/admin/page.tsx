import Link from '@/components/common/Link'
import { desc, isNotNull } from 'drizzle-orm'
import { ArrowRight, CircleAlert, CircleCheck, CircleDashed, LoaderCircle } from 'lucide-react'

import { AdminPageHeader } from '@/components/admin/shell/AdminPageHeader'
import { CARD } from '@/components/admin/shell/ui'
import { db } from '@/db'
import { users } from '@/db/schema'
import { buildAppStats, type AppStats } from '@/lib/admin/appStats'
import { listAdminAudit } from '@/lib/admin/audit'
import { actionLabel } from '@/lib/admin/auditLabels'
import { formatAgo } from '@/lib/admin/format'

// The Overview reads the database on the server (app/admin/layout.tsx has
// already checked the admin), so it renders in one pass with no spinners.
export const dynamic = 'force-dynamic'

function Tile({
    href,
    label,
    value,
    sub,
    tone,
    meter,
}: {
    href: string
    label: string
    value: React.ReactNode
    sub: React.ReactNode
    tone?: 'bad' | 'warn'
    meter?: { value: number; limit: number }
}) {
    const share = meter && meter.limit > 0 ? Math.min(1, meter.value / meter.limit) : 0
    return (
        <Link
            href={href}
            className={`${CARD} group flex min-w-0 flex-col gap-1 p-4 transition-colors hover:border-amber-400/40 hover:bg-[#181818] focus-visible:outline-2 focus-visible:outline-amber-400`}
        >
            <span className="flex items-center justify-between gap-2 text-[13px] text-gray-400">
                {label}
                <ArrowRight
                    aria-hidden
                    className="size-3.5 text-gray-600 transition-transform group-hover:translate-x-0.5 group-hover:text-amber-400"
                />
            </span>
            <span
                className={`text-[28px] leading-tight font-semibold tabular-nums ${
                    tone === 'bad'
                        ? 'text-red-300'
                        : tone === 'warn'
                          ? 'text-amber-300'
                          : 'text-white'
                }`}
            >
                {value}
            </span>
            <span className="truncate text-[13px] text-gray-400">{sub}</span>
            {meter && (
                <span
                    role="meter"
                    aria-label={label}
                    aria-valuenow={meter.value}
                    aria-valuemin={0}
                    aria-valuemax={meter.limit}
                    className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-white/10"
                >
                    <span
                        className={`block h-full rounded-full ${share >= 1 ? 'bg-red-400' : share >= 0.7 ? 'bg-amber-300' : 'bg-amber-500'}`}
                        style={{ width: `${Math.max(share * 100, meter.value > 0 ? 2 : 0)}%` }}
                    />
                </span>
            )}
        </Link>
    )
}

const JOB_ICON = {
    ok: <CircleCheck aria-label="Succeeded" className="size-4 shrink-0 text-emerald-400" />,
    failed: <CircleAlert aria-label="Failed" className="size-4 shrink-0 text-red-400" />,
    running: (
        <LoaderCircle aria-label="Running" className="size-4 shrink-0 animate-spin text-sky-400" />
    ),
    never: <CircleDashed aria-label="Never run" className="size-4 shrink-0 text-gray-500" />,
} as const

function PanelHead({ title, href, link }: { title: string; href: string; link: string }) {
    return (
        <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-white">{title}</h2>
            <Link
                href={href}
                className="text-[13px] text-amber-400 hover:text-amber-300 focus-visible:outline-2 focus-visible:outline-amber-400"
            >
                {link}
            </Link>
        </div>
    )
}

function attention(stats: AppStats): { text: string; href: string; tone: 'bad' | 'warn' }[] {
    const items: { text: string; href: string; tone: 'bad' | 'warn' }[] = []
    for (const job of stats.jobs)
        if (job.status === 'failed')
            items.push({ text: `${job.label}: last run failed`, href: '/admin/jobs', tone: 'bad' })
    for (const q of stats.quotas) {
        const share = q.limit > 0 ? q.used / q.limit : 0
        if (share >= 1)
            items.push({ text: `${q.label}: cap reached`, href: '/admin/email/usage', tone: 'bad' })
        else if (share >= 0.7)
            items.push({
                text: `${q.label}: ${Math.round(share * 100)}% of the cap`,
                href: '/admin/email/usage',
                tone: 'warn',
            })
    }
    return items
}

export default async function AdminOverview() {
    const now = new Date()
    const [stats, audit, recent] = await Promise.all([
        buildAppStats(now),
        listAdminAudit(5),
        db
            .select({ id: users.id, email: users.email, createdAt: users.createdAt })
            .from(users)
            .where(isNotNull(users.createdAt))
            .orderBy(desc(users.createdAt))
            .limit(5),
    ])
    const total = (key: string) => stats.totals.find((t) => t.key === key)?.value ?? 0
    const quota = (key: string) => stats.quotas.find((q) => q.key === key)!
    const month = quota('email-month')
    const today = quota('email-day')
    const failed = stats.jobs.filter((j) => j.status === 'failed').length
    const alerts = attention(stats)

    return (
        <>
            <AdminPageHeader
                title="Overview"
                lead={`Updated ${now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' })} UTC. Each number opens its page.`}
            />

            <section
                aria-label="Key numbers"
                className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6"
            >
                <Tile
                    href="/admin/users"
                    label="Users"
                    value={total('users')}
                    sub="accounts in total"
                />
                <Tile
                    href="/admin/activity/signups"
                    label="New this week"
                    value={total('new-7d')}
                    sub="sign-ups, last 7 days"
                />
                <Tile
                    href="/admin/activity/views"
                    label="Active this week"
                    value={total('active-7d')}
                    sub="signed-in users, 7 days"
                />
                <Tile
                    href="/admin/email/usage"
                    label="Emails this month"
                    value={
                        <>
                            {month.used}
                            <span className="text-base font-normal text-gray-500">
                                {' '}
                                / {month.limit}
                            </span>
                        </>
                    }
                    sub={`${today.used} of ${today.limit} today`}
                    meter={{ value: month.used, limit: month.limit }}
                />
                <Tile
                    href="/admin/jobs"
                    label="Jobs"
                    value={
                        failed > 0
                            ? `${failed} failed`
                            : `${stats.jobs.filter((j) => j.status === 'ok').length} / ${stats.jobs.length} ok`
                    }
                    sub="last run of each job"
                    tone={failed > 0 ? 'bad' : undefined}
                />
                <Tile
                    href="/admin/jobs"
                    label="Errors, 24 h"
                    value={stats.errors.count}
                    sub="failed job runs"
                    tone={stats.errors.count > 0 ? 'warn' : undefined}
                />
            </section>

            <div className="mt-3 grid gap-3 lg:grid-cols-2">
                <section className={`${CARD} p-4`}>
                    <PanelHead title="Jobs" href="/admin/jobs" link="Run or inspect" />
                    <ul className="divide-y divide-white/5">
                        {stats.jobs.map((job) => (
                            <li key={job.key} className="flex min-h-10 items-center gap-3 text-sm">
                                {JOB_ICON[job.status]}
                                <span className="min-w-0 flex-1 truncate text-gray-200">
                                    {job.label}
                                </span>
                                <span className="hidden shrink-0 text-[13px] text-gray-500 sm:inline">
                                    {job.schedule}
                                </span>
                                <span className="w-24 shrink-0 text-right text-[13px] text-gray-400">
                                    {job.lastRunAt ? formatAgo(job.lastRunAt, now) : 'never run'}
                                </span>
                            </li>
                        ))}
                    </ul>
                </section>
                <section className={`${CARD} p-4`}>
                    <PanelHead title="Needs attention" href="/admin/jobs" link="Jobs" />
                    {alerts.length === 0 ? (
                        <p className="flex min-h-10 items-center gap-2 text-sm text-gray-400">
                            <CircleCheck aria-hidden className="size-4 shrink-0 text-emerald-400" />
                            Nothing right now: every job's last run passed and email is under its
                            caps.
                        </p>
                    ) : (
                        <ul className="divide-y divide-white/5">
                            {alerts.map((a) => (
                                <li key={a.text}>
                                    <Link
                                        href={a.href}
                                        className="flex min-h-10 items-center gap-2 text-sm text-gray-200 hover:text-white"
                                    >
                                        <CircleAlert
                                            aria-hidden
                                            className={`size-4 shrink-0 ${a.tone === 'bad' ? 'text-red-400' : 'text-amber-300'}`}
                                        />
                                        {a.text}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
                <section className={`${CARD} p-4`}>
                    <PanelHead title="Recent sign-ups" href="/admin/users" link="All users" />
                    {recent.length === 0 ? (
                        <p className="min-h-10 text-sm text-gray-400">No sign-ups yet.</p>
                    ) : (
                        <ul className="divide-y divide-white/5">
                            {recent.map((u) => (
                                <li
                                    key={u.id}
                                    className="flex min-h-9 items-center justify-between gap-3 text-sm"
                                >
                                    <span className="min-w-0 truncate text-gray-200">
                                        {u.email ?? 'No email'}
                                    </span>
                                    <span className="shrink-0 text-[13px] text-gray-400">
                                        {u.createdAt ? formatAgo(u.createdAt, now) : ''}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
                <section className={`${CARD} p-4`}>
                    <PanelHead title="Recent admin actions" href="/admin/system" link="Audit log" />
                    {audit.length === 0 ? (
                        <p className="min-h-10 text-sm text-gray-400">
                            No admin actions recorded yet.
                        </p>
                    ) : (
                        <ul className="divide-y divide-white/5">
                            {audit.map((e) => (
                                <li
                                    key={e.id}
                                    className="flex min-h-9 items-center justify-between gap-3 text-sm"
                                >
                                    <span className="min-w-0 truncate text-gray-200">
                                        {actionLabel(e)}
                                    </span>
                                    <span className="shrink-0 text-[13px] text-gray-400">
                                        {formatAgo(e.createdAt, now)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </>
    )
}
