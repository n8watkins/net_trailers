import { AdminPageHeader } from '@/components/admin/shell/AdminPageHeader'
import { CARD, cx } from '@/components/admin/shell/ui'
import { getEmailUsage, type EmailKind } from '@/lib/email/gate'

// Read on the server: app/admin/layout.tsx has already checked the admin.
export const dynamic = 'force-dynamic'

const KIND_LABELS: Record<EmailKind, string> = {
    'sign-in': 'Sign-in links',
    'forum-reply': 'Forum replies',
    'social-digest': 'Social digest',
    trending: 'Trending digest',
    announcement: 'Announcements',
    custom: 'Custom emails',
}

function Meter({
    label,
    used,
    cap,
    note,
}: {
    label: string
    used: number
    cap: number
    note: string
}) {
    const share = cap > 0 ? Math.min(1, used / cap) : 0
    return (
        <section className={`${CARD} p-4 sm:p-5`}>
            <h2 className="text-sm text-gray-400">{label}</h2>
            <p className="mt-1 text-3xl font-semibold text-white tabular-nums">
                {used}
                <span className="text-lg font-normal text-gray-500"> / {cap}</span>
            </p>
            <div
                role="meter"
                aria-label={label}
                aria-valuenow={used}
                aria-valuemin={0}
                aria-valuemax={cap}
                className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"
            >
                <div
                    className={cx(
                        'h-full rounded-full',
                        share >= 1 ? 'bg-red-400' : share >= 0.7 ? 'bg-amber-300' : 'bg-amber-500'
                    )}
                    style={{ width: `${Math.max(share * 100, used > 0 ? 1.5 : 0)}%` }}
                />
            </div>
            <p className="mt-2 text-[13px] text-gray-400">{note}</p>
        </section>
    )
}

export default async function EmailUsagePage() {
    const usage = await getEmailUsage()
    const kinds = Object.entries(usage.byKind) as [EmailKind, { sent: number; refused: number }][]
    return (
        <>
            <AdminPageHeader
                title="Email"
                lead="Every email the site sends counts against these caps, sign-in links included."
            />
            <div className="grid gap-3 sm:grid-cols-2" data-testid="email-usage">
                <Meter
                    label="Today"
                    used={usage.today}
                    cap={usage.dailyCap}
                    note="Resets at 00:00 UTC."
                />
                <Meter
                    label="This month"
                    used={usage.thisMonth}
                    cap={usage.monthlyCap}
                    note="Resets on the 1st, 00:00 UTC."
                />
            </div>
            <section className={`${CARD} mt-3 p-4 sm:p-5`}>
                <h2 className="mb-3 text-sm font-semibold text-white">Today by kind</h2>
                <div className="overflow-x-auto rounded-lg border border-white/10">
                    <table className="w-full text-left text-sm" aria-label="Emails today by kind">
                        <thead className="bg-white/[0.03] text-xs tracking-wide text-gray-400 uppercase">
                            <tr>
                                <th scope="col" className="px-3 py-2.5 font-medium">
                                    Kind
                                </th>
                                <th scope="col" className="px-3 py-2.5 text-right font-medium">
                                    Sent
                                </th>
                                <th scope="col" className="px-3 py-2.5 text-right font-medium">
                                    Refused by a cap
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {kinds.map(([kind, c]) => (
                                <tr key={kind}>
                                    <td className="px-3 py-2.5 text-gray-200">
                                        {KIND_LABELS[kind] ?? kind}
                                    </td>
                                    <td className="px-3 py-2.5 text-right text-gray-200 tabular-nums">
                                        {c.sent}
                                    </td>
                                    <td
                                        className={cx(
                                            'px-3 py-2.5 text-right tabular-nums',
                                            c.refused > 0 ? 'text-amber-300' : 'text-gray-500'
                                        )}
                                    >
                                        {c.refused}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </>
    )
}
