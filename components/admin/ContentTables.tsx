'use client'

import Link from 'next/link'

import { DataTable, type FilterGroup } from '@/components/admin/shell/DataTable'
import { CARD } from '@/components/admin/shell/ui'
import { formatDate } from '@/lib/admin/format'

export type RankingRow = {
    id: string
    title: string
    owner: string
    isPublic: boolean
    itemCount: number
    likes: number
    views: number
    createdAt: number
}

export type ReportRow = {
    id: string
    contentId: string
    contentType: string
    reason: string
    details: string | null
    status: string
    createdAt: number
    href: string | null
}

const RANKING_FILTERS: FilterGroup<RankingRow>[] = [
    {
        id: 'visibility',
        label: 'Visibility',
        options: [
            { id: 'all', label: 'All', test: () => true },
            { id: 'public', label: 'Public', test: (r) => r.isPublic },
            { id: 'private', label: 'Private', test: (r) => !r.isPublic },
        ],
    },
]

const REPORT_FILTERS: FilterGroup<ReportRow>[] = [
    {
        id: 'status',
        label: 'Status',
        options: [
            { id: 'pending', label: 'Open', test: (r) => r.status === 'pending' },
            { id: 'all', label: 'All', test: () => true },
        ],
    },
]

export function ContentTables({
    rankings,
    reports,
}: {
    rankings: RankingRow[]
    reports: ReportRow[]
}) {
    return (
        <div className="grid gap-3 xl:grid-cols-[3fr_2fr]">
            <section className={`${CARD} min-w-0 p-4 sm:p-5`}>
                <h2 className="mb-3 text-sm font-semibold text-white">Rankings</h2>
                <DataTable
                    label="Rankings"
                    rows={rankings}
                    rowKey={(r) => r.id}
                    pageSize={10}
                    empty="No rankings yet."
                    filters={RANKING_FILTERS}
                    search={{
                        placeholder: 'Search by title or owner',
                        text: (r) => `${r.title} ${r.owner}`,
                    }}
                    columns={[
                        {
                            key: 'title',
                            header: 'Ranking',
                            cell: (r) => (
                                <div className="min-w-0">
                                    {r.isPublic ? (
                                        <Link
                                            href={`/rankings/${r.id}`}
                                            className="text-white hover:text-amber-300"
                                        >
                                            {r.title}
                                        </Link>
                                    ) : (
                                        <span className="text-white">{r.title}</span>
                                    )}
                                    <p className="text-[13px] text-gray-500">
                                        {r.owner} · {r.itemCount} titles
                                        {r.isPublic ? '' : ' · private'}
                                    </p>
                                </div>
                            ),
                        },
                        {
                            key: 'likes',
                            header: 'Likes',
                            hideOnPhone: true,
                            className: 'text-right tabular-nums',
                            cell: (r) => r.likes,
                        },
                        {
                            key: 'views',
                            header: 'Views',
                            hideOnPhone: true,
                            className: 'text-right tabular-nums',
                            cell: (r) => r.views,
                        },
                        {
                            key: 'made',
                            header: 'Made',
                            className: 'whitespace-nowrap',
                            cell: (r) => formatDate(r.createdAt),
                        },
                    ]}
                />
            </section>
            <section className={`${CARD} min-w-0 p-4 sm:p-5`}>
                <h2 className="mb-3 text-sm font-semibold text-white">Reports</h2>
                <DataTable
                    label="Content reports"
                    rows={reports}
                    rowKey={(r) => r.id}
                    pageSize={10}
                    empty="Nobody has reported anything."
                    filters={REPORT_FILTERS}
                    columns={[
                        {
                            key: 'what',
                            header: 'Report',
                            cell: (r) => (
                                <div className="min-w-0">
                                    <p className="text-white">
                                        {r.href ? (
                                            <Link href={r.href} className="hover:text-amber-300">
                                                {r.contentType}
                                            </Link>
                                        ) : (
                                            r.contentType
                                        )}
                                        <span className="text-gray-400">: {r.reason}</span>
                                    </p>
                                    {r.details && (
                                        <p className="text-[13px] break-words text-gray-500">
                                            {r.details}
                                        </p>
                                    )}
                                </div>
                            ),
                        },
                        {
                            key: 'when',
                            header: 'When',
                            className: 'whitespace-nowrap',
                            cell: (r) => formatDate(r.createdAt),
                        },
                    ]}
                />
            </section>
        </div>
    )
}
