import { ArrowUpRight } from 'lucide-react'

import { AdminPageHeader } from '@/components/admin/shell/AdminPageHeader'
import { CARD } from '@/components/admin/shell/ui'
import { adminEmails } from '@/lib/admin'
import { FRESH_SIGN_IN_MS } from '@/lib/admin/guard'
import { readLimit } from '@/lib/durableLimit'
import { emailDailyCap, emailMonthlyCap } from '@/lib/email/gate'

// Read on the server: app/admin/layout.tsx has already checked the admin.
export const dynamic = 'force-dynamic'

function Rows({ title, rows }: { title: string; rows: [string, React.ReactNode, string?][] }) {
    return (
        <section className={`${CARD} p-4 sm:p-5`}>
            <h2 className="mb-2 text-sm font-semibold text-white">{title}</h2>
            <dl className="divide-y divide-white/5">
                {rows.map(([label, value, source]) => (
                    <div
                        key={label}
                        className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-2.5 text-sm"
                    >
                        <dt className="text-gray-400">
                            {label}
                            {source && (
                                <span className="ml-2 font-mono text-xs text-gray-600">
                                    {source}
                                </span>
                            )}
                        </dt>
                        <dd className="text-right text-gray-100 tabular-nums">{value}</dd>
                    </div>
                ))}
            </dl>
        </section>
    )
}

const LINKS = [
    { label: 'All apps on admin.n8builds.dev', href: 'https://admin.n8builds.dev' },
    {
        label: 'The net-trailers Worker on Cloudflare',
        href: 'https://dash.cloudflare.com/?to=/:account/workers/services/view/net-trailers/production',
    },
    { label: 'Errors on Sentry', href: 'https://sentry.io/issues/' },
]

export default function SystemConfigPage() {
    const admins = adminEmails()
    return (
        <>
            <AdminPageHeader
                title="System"
                lead="The limits and settings this deployment runs with. Change them in wrangler.jsonc or as Worker secrets."
            />
            <div className="grid gap-3 lg:grid-cols-2">
                <Rows
                    title="Email caps"
                    rows={[
                        ['Site-wide per day', emailDailyCap(), 'EMAIL_DAILY_CAP'],
                        ['Site-wide per month', emailMonthlyCap(), 'EMAIL_MONTHLY_CAP'],
                        [
                            'Sign-in links per address per day',
                            readLimit('EMAIL_SIGNIN_PER_ADDRESS_DAILY', 5),
                            'EMAIL_SIGNIN_PER_ADDRESS_DAILY',
                        ],
                        [
                            'Sign-in links per IP per day',
                            readLimit('EMAIL_SIGNIN_PER_IP_DAILY', 20),
                            'EMAIL_SIGNIN_PER_IP_DAILY',
                        ],
                    ]}
                />
                <Rows
                    title="Admin access"
                    rows={[
                        ['Admins', admins.length > 0 ? admins.join(', ') : 'None', 'ADMIN_EMAILS'],
                        [
                            'Fresh sign-in for sending and jobs',
                            `${FRESH_SIGN_IN_MS / 60_000} minutes`,
                        ],
                        [
                            'Scheduled jobs',
                            process.env.CRONS_ENABLED === 'true' ? 'On' : 'Off',
                            'CRONS_ENABLED',
                        ],
                    ]}
                />
                <section className={`${CARD} p-4 sm:p-5 lg:col-span-2`}>
                    <h2 className="mb-2 text-sm font-semibold text-white">Elsewhere</h2>
                    <ul className="flex flex-wrap gap-2">
                        {LINKS.map((l) => (
                            <li key={l.href}>
                                <a
                                    href={l.href}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 text-sm text-gray-100 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-amber-400"
                                >
                                    {l.label}
                                    <ArrowUpRight aria-hidden className="size-4 text-gray-400" />
                                </a>
                            </li>
                        ))}
                    </ul>
                </section>
            </div>
        </>
    )
}
