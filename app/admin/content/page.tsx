import { count, desc, eq } from 'drizzle-orm'

import { ContentTables, type RankingRow, type ReportRow } from '@/components/admin/ContentTables'
import { AdminPageHeader } from '@/components/admin/shell/AdminPageHeader'
import { CARD } from '@/components/admin/shell/ui'
import { db } from '@/db'
import {
    contentReports,
    pollVotes,
    polls,
    rankingComments,
    rankings,
    threadReplies,
    threads,
} from '@/db/schema'

// Read on the server: app/admin/layout.tsx has already checked the admin.
export const dynamic = 'force-dynamic'

/** Where a reported item lives on the site. */
function reportHref(type: string, id: string): string | null {
    if (type === 'ranking') return `/rankings/${id}`
    if (type === 'thread') return `/community/thread/${id}`
    if (type === 'poll') return `/community/polls/${id}`
    return null
}

export default async function ContentPage() {
    const one = async (q: Promise<{ n: number }[]>) => (await q)[0]?.n ?? 0
    const [
        rankingTotal,
        rankingPublic,
        comments,
        threadTotal,
        replies,
        pollTotal,
        votes,
        openReports,
        recentRankings,
        reports,
    ] = await Promise.all([
        one(db.select({ n: count() }).from(rankings)),
        one(db.select({ n: count() }).from(rankings).where(eq(rankings.isPublic, true))),
        one(db.select({ n: count() }).from(rankingComments)),
        one(db.select({ n: count() }).from(threads)),
        one(db.select({ n: count() }).from(threadReplies)),
        one(db.select({ n: count() }).from(polls)),
        one(db.select({ n: count() }).from(pollVotes)),
        one(
            db
                .select({ n: count() })
                .from(contentReports)
                .where(eq(contentReports.status, 'pending'))
        ),
        db
            .select({
                id: rankings.id,
                title: rankings.title,
                owner: rankings.userUsername,
                ownerName: rankings.userName,
                isPublic: rankings.isPublic,
                itemCount: rankings.itemCount,
                likes: rankings.likes,
                views: rankings.views,
                createdAt: rankings.createdAt,
            })
            .from(rankings)
            .orderBy(desc(rankings.createdAt))
            .limit(200),
        db
            .select({
                id: contentReports.id,
                contentId: contentReports.contentId,
                contentType: contentReports.contentType,
                reason: contentReports.reason,
                details: contentReports.details,
                status: contentReports.status,
                createdAt: contentReports.createdAt,
            })
            .from(contentReports)
            .orderBy(desc(contentReports.createdAt))
            .limit(200),
    ])

    const tiles = [
        { label: 'Rankings', value: rankingTotal, sub: `${rankingPublic} public` },
        { label: 'Ranking comments', value: comments },
        { label: 'Threads', value: threadTotal, sub: `${replies} replies` },
        { label: 'Polls', value: pollTotal, sub: `${votes} votes` },
        { label: 'Open reports', value: openReports, tone: openReports > 0 },
    ]

    const rankingRows: RankingRow[] = recentRankings.map((r) => ({
        ...r,
        owner: r.owner ?? r.ownerName ?? 'Unknown',
    }))
    const reportRows: ReportRow[] = reports.map((r) => ({
        ...r,
        href: reportHref(r.contentType, r.contentId),
    }))

    return (
        <>
            <AdminPageHeader
                title="Content and Rankings"
                lead="What people made on the site. Open an item to see it as visitors do."
            />
            <dl className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                {tiles.map((t) => (
                    <div key={t.label} className={`${CARD} px-4 py-3`}>
                        <dt className="text-[13px] text-gray-400">{t.label}</dt>
                        <dd
                            className={`text-xl font-semibold tabular-nums ${t.tone ? 'text-amber-300' : 'text-white'}`}
                        >
                            {t.value}
                        </dd>
                        {t.sub && <dd className="text-[13px] text-gray-500">{t.sub}</dd>}
                    </div>
                ))}
            </dl>
            <ContentTables rankings={rankingRows} reports={reportRows} />
        </>
    )
}
