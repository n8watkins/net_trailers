/**
 * Public profile payload builder — Drizzle / Turso edition.
 *
 * Replaces the former firebase-admin implementation. All data is fetched from
 * the Turso database via Drizzle. The `PublicProfilePayload` shape and the two
 * exported helper functions (`fetchUserIdForUsername`,
 * `buildPublicProfilePayload`) are intentionally unchanged so that the
 * existing route handlers at
 *   app/api/public-profile/[userId]/route.ts
 *   app/api/public-profile/username/[username]/route.ts
 * continue to work without modification.
 *
 * NOTES ON DATA MIGRATION
 * -----------------------
 * `likedMovies` (liked content) and `userCreatedWatchlists` (collections) are
 * stored inside the `user_preferences.data` JSON blob — they are not separate
 * Drizzle tables. We extract them from the preferences row here. If those
 * fields have not yet been migrated for a given user the sections are returned
 * empty (same graceful-degradation behaviour as before).
 *
 * `watchHistory` IS a separate Drizzle table (`watch_history`). We query it
 * directly here.
 *
 * Rankings, threads, polls, threadLikes, pollVotes are already in Drizzle
 * tables (`rankings`, `threads`, `polls`, `thread_likes`, `poll_votes`,
 * `thread_replies`).
 */

import { and, desc, eq, inArray } from 'drizzle-orm'

import { db } from '@/db'
import {
    polls,
    pollVotes,
    profiles,
    rankings,
    threadLikes,
    threads,
    userPreferences,
    watchHistory,
} from '@/db/schema'
import { DEFAULT_PROFILE_VISIBILITY, type ProfileVisibility } from '@/types/profile'
import type { Ranking } from '@/types/rankings'
import type { Movie, TVShow } from '@/typings'
import type { UserList } from '@/types/collections'
import type { ThreadSummary, PollSummary, PollOptionSummary } from '@/types/forum'

export interface PublicProfilePayload {
    profile: {
        displayName: string
        avatarUrl?: string | null
        bio?: string | null
        favoriteGenres?: string[]
    }
    stats: {
        totalRankings: number
        totalLikes: number
        totalViews: number
        totalLiked: number
        totalCollections: number
        totalThreads: number
        totalPollsCreated: number
        totalPollsVoted: number
    }
    rankings: Ranking[]
    likedContent: (Movie | TVShow)[]
    collections: UserList[]
    forum: {
        threads: ThreadSummary[]
        threadsVoted: ThreadSummary[]
        pollsCreated: PollSummary[]
        pollsVoted: PollSummary[]
    }
    watchHistoryPreview: (Movie | TVShow)[]
    visibility: ProfileVisibility
}

const DEFAULT_HEADERS = {
    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
} as const

export function getPublicProfileCacheHeaders() {
    return DEFAULT_HEADERS
}

/**
 * Resolve a username slug to its owner's user id.
 * Returns null when no profile has that username.
 */
export async function fetchUserIdForUsername(username: string): Promise<string | null> {
    if (!username) return null

    const rows = await db
        .select({ userId: profiles.userId })
        .from(profiles)
        .where(eq(profiles.username, username.trim()))
        .limit(1)

    return rows[0]?.userId ?? null
}

/**
 * Build the full public-profile payload for a given user id.
 * Returns null when neither a profile row nor any rankings exist for the user.
 */
export async function buildPublicProfilePayload(
    userId: string
): Promise<PublicProfilePayload | null> {
    if (!userId) return null

    // ── Fetch profile and preferences in parallel ─────────────────────────────
    const [profileRows, prefRows] = await Promise.all([
        db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1),
        db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1),
    ])

    const profileRow = profileRows[0] ?? null
    const prefsData = prefRows[0]?.data ?? null

    // If there is no profile AND no preferences row, check for any ranking so
    // we can construct a bare fallback (mirrors the old firebase-admin logic).
    if (!profileRow && !prefsData) {
        const fallbackRankings = await db
            .select()
            .from(rankings)
            .where(eq(rankings.userId, userId))
            .limit(1)

        if (fallbackRankings.length === 0) {
            return null
        }
    }

    // ── Resolve visibility ─────────────────────────────────────────────────────
    const rawVisibility = profileRow?.visibility ?? null
    const visibility: ProfileVisibility = {
        ...DEFAULT_PROFILE_VISIBILITY,
        ...(rawVisibility ?? {}),
    }
    const isPublicEnabled = visibility.enablePublicProfile !== false

    // ── Build profile identity ─────────────────────────────────────────────────
    const displayName = profileRow?.displayName ?? 'User'
    const avatarUrl = profileRow?.avatarUrl ?? null
    const bio = profileRow?.description ?? null
    const favoriteGenres = Array.isArray(profileRow?.favoriteGenres)
        ? (profileRow!.favoriteGenres as string[])
        : undefined

    // ── Liked content ──────────────────────────────────────────────────────────
    // Stored in the `user_preferences.data.likedMovies` array.
    const likedContent: (Movie | TVShow)[] =
        isPublicEnabled && visibility.showLikedContent && Array.isArray(prefsData?.likedMovies)
            ? (prefsData!.likedMovies as (Movie | TVShow)[])
            : []

    // ── Collections ────────────────────────────────────────────────────────────
    // Stored in `user_preferences.data.userCreatedWatchlists`.
    let collections: UserList[] = []
    if (isPublicEnabled && visibility.showCollections) {
        const allCollections = Array.isArray(prefsData?.userCreatedWatchlists)
            ? (prefsData!.userCreatedWatchlists as UserList[])
            : []

        collections = allCollections
            .filter((c) => {
                if (c.isSystemCollection) return false
                if (c.showOnPublicProfile === false) return false
                if (c.collectionType === 'tmdb-genre') return true
                return Array.isArray(c.items) && c.items.length > 0
            })
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            .slice(0, 10)
    }

    // ── Watch history preview ──────────────────────────────────────────────────
    // Stored in the `watch_history` Drizzle table.
    let watchHistoryPreview: (Movie | TVShow)[] = []
    if (isPublicEnabled && visibility.showWatchHistory) {
        try {
            const historyRows = await db
                .select({ content: watchHistory.content })
                .from(watchHistory)
                .where(eq(watchHistory.userId, userId))
                .orderBy(desc(watchHistory.watchedAt))
                .limit(12)

            watchHistoryPreview = historyRows
                .map((r) => r.content as Movie | TVShow | null)
                .filter((c): c is Movie | TVShow => c !== null && c !== undefined)
        } catch (error) {
            console.warn('[PublicProfile] Failed to load watch history:', error)
        }
    }

    // ── Rankings ───────────────────────────────────────────────────────────────
    let publicRankings: Ranking[] = []
    if (isPublicEnabled && visibility.showRankings) {
        const rankingRows = await db
            .select()
            .from(rankings)
            .where(and(eq(rankings.userId, userId), eq(rankings.isPublic, true)))
            .orderBy(desc(rankings.updatedAt))
            .limit(20)

        publicRankings = rankingRows.map((r) => ({
            id: r.id,
            userId: r.userId,
            userName: r.userName ?? 'Anonymous',
            userAvatar: r.userAvatar ?? null,
            userUsername: r.userUsername ?? undefined,
            title: r.title,
            description: r.description ?? undefined,
            rankedItems: r.rankedItems ?? [],
            isPublic: r.isPublic,
            itemCount: r.itemCount,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
            likes: r.likes,
            comments: r.comments,
            views: r.views,
            contentIds: r.contentIds ?? [],
            contentTitles: r.contentTitles ?? [],
            shareSettings: r.shareSettings ?? undefined,
            sharedLinkId: r.sharedLinkId ?? undefined,
        })) as Ranking[]
    }

    // ── Threads ────────────────────────────────────────────────────────────────
    let threadSummaries: ThreadSummary[] = []
    if (isPublicEnabled && visibility.showThreads) {
        const threadRows = await db
            .select()
            .from(threads)
            .where(eq(threads.userId, userId))
            .orderBy(desc(threads.createdAt))
            .limit(10)

        threadSummaries = threadRows.map(
            (t): ThreadSummary => ({
                id: t.id,
                title: t.title,
                content: t.content,
                category: t.category as ThreadSummary['category'],
                userId: t.userId,
                userName: t.userName ?? 'Anonymous',
                userAvatar: t.userAvatar ?? undefined,
                likes: t.likes,
                views: t.views,
                replyCount: t.replyCount,
                createdAt: t.createdAt,
                updatedAt: t.updatedAt,
                lastReplyAt: t.lastReplyAt ?? undefined,
                lastReplyBy: (t.lastReplyBy as ThreadSummary['lastReplyBy']) ?? undefined,
                tags: (t.tags as string[] | undefined) ?? undefined,
                isPinned: t.isPinned,
                isLocked: t.isLocked,
            })
        )
    }

    // ── Polls created by user ──────────────────────────────────────────────────
    let pollSummaries: PollSummary[] = []
    if (isPublicEnabled && visibility.showPollsCreated) {
        const pollRows = await db
            .select()
            .from(polls)
            .where(eq(polls.userId, userId))
            .orderBy(desc(polls.createdAt))
            .limit(10)

        pollSummaries = pollRows.map(
            (p): PollSummary => ({
                id: p.id,
                question: p.question,
                category: p.category as PollSummary['category'],
                userId: p.userId,
                userName: p.userName ?? 'Anonymous',
                userAvatar: p.userAvatar ?? undefined,
                totalVotes: p.totalVotes,
                isMultipleChoice: p.isMultipleChoice,
                allowAddOptions: p.allowAddOptions,
                options: Array.isArray(p.options)
                    ? p.options.map((o: unknown): PollOptionSummary => {
                          const opt = o as Record<string, unknown>
                          return {
                              id: (opt.id as string) ?? '',
                              text: (opt.text as string) ?? '',
                              votes: (opt.votes as number) ?? 0,
                              percentage: (opt.percentage as number) ?? 0,
                          }
                      })
                    : [],
                createdAt: p.createdAt,
                expiresAt: p.expiresAt ?? null,
                votedAt: null,
            })
        )
    }

    // ── Polls voted on ─────────────────────────────────────────────────────────
    let orderedVotedPolls: PollSummary[] = []
    if (isPublicEnabled && visibility.showPollsVoted) {
        const voteRows = await db
            .select()
            .from(pollVotes)
            .where(eq(pollVotes.userId, userId))
            .orderBy(desc(pollVotes.votedAt))
            .limit(25)

        // Batch-fetch the voted polls in one query instead of one per vote.
        const votedPollIds = [...new Set(voteRows.map((v) => v.pollId))]
        const votedPollRows = votedPollIds.length
            ? await db.select().from(polls).where(inArray(polls.id, votedPollIds))
            : []
        const votedPollById = new Map(votedPollRows.map((p) => [p.id, p]))

        const votedSummaries = voteRows
            .map((vote) => {
                const p = votedPollById.get(vote.pollId)
                if (!p || p.userId === userId) return null

                const summary: PollSummary = {
                    id: p.id,
                    question: p.question,
                    category: p.category as PollSummary['category'],
                    userId: p.userId,
                    userName: p.userName ?? 'Anonymous',
                    userAvatar: p.userAvatar ?? undefined,
                    totalVotes: p.totalVotes,
                    isMultipleChoice: p.isMultipleChoice,
                    allowAddOptions: p.allowAddOptions,
                    options: Array.isArray(p.options)
                        ? p.options.map((o: unknown): PollOptionSummary => {
                              const opt = o as Record<string, unknown>
                              return {
                                  id: (opt.id as string) ?? '',
                                  text: (opt.text as string) ?? '',
                                  votes: (opt.votes as number) ?? 0,
                                  percentage: (opt.percentage as number) ?? 0,
                              }
                          })
                        : [],
                    createdAt: p.createdAt,
                    expiresAt: p.expiresAt ?? null,
                    votedAt: vote.votedAt,
                }
                return summary
            })
            .filter((s): s is PollSummary => s !== null)

        // Deduplicate by poll id (keep most-recently-voted entry per poll).
        const uniqueVoted = votedSummaries.reduce<Record<string, PollSummary>>((acc, poll) => {
            const existing = acc[poll.id]
            if (!existing || (poll.votedAt ?? 0) > (existing.votedAt ?? 0)) {
                acc[poll.id] = poll
            }
            return acc
        }, {})

        orderedVotedPolls = Object.values(uniqueVoted)
            .sort((a, b) => (b.votedAt ?? 0) - (a.votedAt ?? 0))
            .slice(0, 10)
    }

    // ── Threads voted on (liked) ───────────────────────────────────────────────
    let votedThreadSummaries: ThreadSummary[] = []
    if (isPublicEnabled && visibility.showThreadsVoted) {
        const likeRows = await db
            .select({ threadId: threadLikes.threadId })
            .from(threadLikes)
            .where(eq(threadLikes.userId, userId))
            .limit(25)

        // Batch-fetch the liked threads in one query instead of one per like.
        const likedThreadIds = [...new Set(likeRows.map((l) => l.threadId))]
        const likedThreadRows = likedThreadIds.length
            ? await db.select().from(threads).where(inArray(threads.id, likedThreadIds))
            : []
        const likedThreadById = new Map(likedThreadRows.map((t) => [t.id, t]))

        votedThreadSummaries = likeRows
            .map((like) => {
                const t = likedThreadById.get(like.threadId)
                if (!t || t.userId === userId) return null

                const summary: ThreadSummary = {
                    id: t.id,
                    title: t.title,
                    content: t.content,
                    category: t.category as ThreadSummary['category'],
                    userId: t.userId,
                    userName: t.userName ?? 'Anonymous',
                    userAvatar: t.userAvatar ?? undefined,
                    likes: t.likes,
                    views: t.views,
                    replyCount: t.replyCount,
                    createdAt: t.createdAt,
                    updatedAt: t.updatedAt,
                    lastReplyAt: t.lastReplyAt ?? undefined,
                    lastReplyBy: (t.lastReplyBy as ThreadSummary['lastReplyBy']) ?? undefined,
                    tags: (t.tags as string[] | undefined) ?? undefined,
                    isPinned: t.isPinned,
                    isLocked: t.isLocked,
                }
                return summary
            })
            .filter((s): s is ThreadSummary => s !== null)
            .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
            .slice(0, 10)
    }

    // ── Stats ──────────────────────────────────────────────────────────────────
    const stats: PublicProfilePayload['stats'] = {
        totalRankings: profileRow?.rankingsCount ?? publicRankings.length,
        totalLikes:
            profileRow?.totalLikes ?? publicRankings.reduce((sum, r) => sum + (r.likes ?? 0), 0),
        totalViews:
            profileRow?.totalViews ?? publicRankings.reduce((sum, r) => sum + (r.views ?? 0), 0),
        totalLiked: likedContent.length,
        totalCollections: collections.length,
        totalThreads: threadSummaries.length,
        totalPollsCreated: pollSummaries.length,
        totalPollsVoted: orderedVotedPolls.length,
    }

    return {
        profile: { displayName, avatarUrl, bio, favoriteGenres },
        stats,
        rankings: publicRankings,
        likedContent: isPublicEnabled && visibility.showLikedContent ? likedContent : [],
        collections,
        forum: {
            threads: threadSummaries,
            threadsVoted: votedThreadSummaries,
            pollsCreated: pollSummaries,
            pollsVoted: orderedVotedPolls,
        },
        watchHistoryPreview,
        visibility,
    }
}
