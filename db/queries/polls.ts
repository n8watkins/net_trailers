/**
 * Poll & PollVote queries (Turso / Drizzle).
 *
 * The polls table stores `options` as a JSON PollOption[] column; each option
 * carries its own vote count and percentage so a single row select returns
 * complete results without joins.
 *
 * Invariants enforced here:
 *  - One PollVote row per (pollId, userId) — enforced by checking before insert.
 *  - Updating vote counts is done inside a db.transaction() so the options JSON
 *    and totalVotes counter are always consistent.
 *  - Owner OR admin may delete a poll (and all its votes).
 */

import { and, desc, eq } from 'drizzle-orm'

import { db } from '@/db'
import { polls, pollVotes } from '@/db/schema'
import type { ForumCategory, PollOption } from '@/types/forum'
import { isCurrentUserAdmin, now } from './_helpers'

/* -------------------------------------------------------------------------- */
/*  Row-level types returned from this module                                  */
/* -------------------------------------------------------------------------- */

/** A poll row as returned by SELECT queries (timestamps as epoch ms). */
export interface PollRow {
    id: string
    question: string
    description: string | null
    category: ForumCategory
    userId: string
    userName: string | null
    userAvatar: string | null
    createdAt: number
    expiresAt: number | null
    options: PollOption[]
    totalVotes: number
    isMultipleChoice: boolean
    allowAddOptions: boolean
    isHidden: boolean
    tags: string[] | null
}

/** A poll row enriched with the viewing user's existing vote (null = no vote). */
export interface PollRowWithVote extends PollRow {
    viewerVote: string[] | null
}

/** The caller's existing vote for a poll, or null. */
export interface UserVoteRow {
    id: string
    pollId: string
    userId: string
    optionIds: string[]
    votedAt: number
}

/* -------------------------------------------------------------------------- */
/*  Internal helpers                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Recompute `percentage` for every option given the updated vote counts.
 * Percentages are rounded integers that sum to ≤ 100 (rounding artefact is
 * acceptable for display).
 */
function recomputePercentages(options: PollOption[], total: number): PollOption[] {
    return options.map((opt) => ({
        ...opt,
        percentage: total > 0 ? Math.round((opt.votes / total) * 100) : 0,
    }))
}

/* -------------------------------------------------------------------------- */
/*  CREATE                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Create a new poll.
 *
 * `optionTexts` is an array of plain strings; this function converts them into
 * `PollOption[]` with stable IDs (`option-0`, `option-1`, …) and zero votes.
 *
 * Returns the new poll's id.
 */
export async function createPoll(opts: {
    userId: string
    userName: string
    userAvatar: string | null
    question: string
    optionTexts: string[]
    category: ForumCategory
    description?: string
    tags?: string[]
}): Promise<string> {
    const { userId, userName, userAvatar, question, optionTexts, category, description, tags } =
        opts

    const options: PollOption[] = optionTexts.map((text, i) => ({
        id: `option-${i}`,
        text,
        votes: 0,
        percentage: 0,
    }))

    const ts = now()
    const [row] = await db
        .insert(polls)
        .values({
            question,
            description: description ?? null,
            category,
            userId,
            userName,
            userAvatar,
            createdAt: ts,
            options,
            totalVotes: 0,
            isMultipleChoice: false,
            allowAddOptions: false,
            isHidden: false,
            tags: tags ?? [],
        })
        .returning({ id: polls.id })

    return row.id
}

/* -------------------------------------------------------------------------- */
/*  READ — single poll                                                         */
/* -------------------------------------------------------------------------- */

/** Fetch a single poll by id.  Returns null when not found. */
export async function getPollById(pollId: string): Promise<PollRow | null> {
    const rows = await db.select().from(polls).where(eq(polls.id, pollId)).limit(1)
    if (rows.length === 0) return null
    return rowToPollRow(rows[0])
}

/**
 * Fetch a single poll AND the viewer's existing vote in one round-trip.
 *
 * `viewerId` may be null (unauthenticated visitor) — in that case
 * `viewerVote` is always null.
 */
export async function getPollByIdWithVote(
    pollId: string,
    viewerId: string | null
): Promise<PollRowWithVote | null> {
    const poll = await getPollById(pollId)
    if (!poll) return null

    const viewerVote = viewerId ? await getUserVoteForPoll(pollId, viewerId) : null
    return { ...poll, viewerVote: viewerVote ? viewerVote.optionIds : null }
}

/* -------------------------------------------------------------------------- */
/*  READ — poll lists                                                          */
/* -------------------------------------------------------------------------- */

export type PollListSort = 'recent' | 'most-voted'

/**
 * List polls, optionally filtered by category, with the viewing user's vote
 * attached to each row.
 *
 * Hidden polls are excluded for non-owners.
 */
export async function listPolls(opts: {
    category?: ForumCategory
    sort?: PollListSort
    limit?: number
    offset?: number
    viewerId?: string | null
}): Promise<PollRowWithVote[]> {
    const { category, sort = 'recent', limit: pageSize = 20, offset = 0, viewerId } = opts

    // Build WHERE conditions
    const conditions = []
    // Exclude hidden polls (the owner can still see their own via a separate query)
    conditions.push(eq(polls.isHidden, false))
    if (category) {
        conditions.push(eq(polls.category, category))
    }

    const orderExpr = sort === 'most-voted' ? desc(polls.totalVotes) : desc(polls.createdAt)

    const rows = await db
        .select()
        .from(polls)
        .where(and(...conditions))
        .orderBy(orderExpr)
        .limit(pageSize)
        .offset(offset)

    // Fetch the viewer's votes for these polls in a single query
    const pollIds = rows.map((r) => r.id)
    const voteMap = viewerId ? await batchGetUserVotes(pollIds, viewerId) : {}

    return rows.map((row) => {
        const pollRow = rowToPollRow(row)
        return {
            ...pollRow,
            viewerVote: voteMap[row.id] ?? null,
        }
    })
}

/**
 * Fetch all polls owned by a specific user (for public profile pages).
 * Hidden polls ARE included so the owner's profile page can show them.
 */
export async function listPollsByUser(
    userId: string,
    viewerId?: string | null
): Promise<PollRowWithVote[]> {
    const rows = await db
        .select()
        .from(polls)
        .where(eq(polls.userId, userId))
        .orderBy(desc(polls.createdAt))

    const pollIds = rows.map((r) => r.id)
    const voteMap = viewerId ? await batchGetUserVotes(pollIds, viewerId) : {}

    return rows.map((row) => {
        const pollRow = rowToPollRow(row)
        return {
            ...pollRow,
            viewerVote: voteMap[row.id] ?? null,
        }
    })
}

/* -------------------------------------------------------------------------- */
/*  READ — votes                                                               */
/* -------------------------------------------------------------------------- */

/** Fetch the authenticated user's vote for a single poll. */
export async function getUserVoteForPoll(
    pollId: string,
    userId: string
): Promise<UserVoteRow | null> {
    const rows = await db
        .select()
        .from(pollVotes)
        .where(and(eq(pollVotes.pollId, pollId), eq(pollVotes.userId, userId)))
        .limit(1)

    if (rows.length === 0) return null

    const r = rows[0]
    return {
        id: r.id,
        pollId: r.pollId,
        userId: r.userId,
        optionIds: r.optionIds,
        votedAt: r.votedAt,
    }
}

/**
 * Batch-fetch the viewer's votes for a list of polls.
 * Returns a map of pollId → string[] (optionIds).
 */
async function batchGetUserVotes(
    pollIds: string[],
    userId: string
): Promise<Record<string, string[]>> {
    if (pollIds.length === 0) return {}

    // Drizzle / libSQL doesn't support `inArray` with a raw array in all
    // driver versions; use a simple loop-based approach that stays within
    // the rate the driver can handle.  For the typical page size of ≤ 20
    // polls this is acceptable (20 reads = well within Turso limits).
    const results = await Promise.all(
        pollIds.map((pollId) =>
            db
                .select({ pollId: pollVotes.pollId, optionIds: pollVotes.optionIds })
                .from(pollVotes)
                .where(and(eq(pollVotes.pollId, pollId), eq(pollVotes.userId, userId)))
                .limit(1)
        )
    )

    const map: Record<string, string[]> = {}
    for (const rows of results) {
        if (rows.length > 0) {
            map[rows[0].pollId] = rows[0].optionIds
        }
    }
    return map
}

/**
 * Fetch all polls a user has voted on (for the "Voted" tab on the profile page).
 * Returns the full poll rows with the user's existing vote attached.
 */
export async function listPollsVotedByUser(userId: string): Promise<PollRowWithVote[]> {
    // Get all vote rows for the user
    const voteRows = await db
        .select()
        .from(pollVotes)
        .where(eq(pollVotes.userId, userId))
        .orderBy(desc(pollVotes.votedAt))

    if (voteRows.length === 0) return []

    const pollIds = voteRows.map((v) => v.pollId)

    // Fetch the actual poll rows
    const pollRows = await Promise.all(
        pollIds.map((pollId) => db.select().from(polls).where(eq(polls.id, pollId)).limit(1))
    )

    const voteByPollId: Record<string, string[]> = {}
    for (const v of voteRows) {
        voteByPollId[v.pollId] = v.optionIds
    }

    return pollRows
        .flat()
        .filter(Boolean)
        .map((row) => ({
            ...rowToPollRow(row),
            viewerVote: voteByPollId[row.id] ?? null,
        }))
}

/* -------------------------------------------------------------------------- */
/*  VOTE (transactional)                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Cast or change a vote on a poll.
 *
 * Rules:
 *  - One vote row per (pollId, userId).  If a row already exists the user is
 *    changing their vote — decrement the old selections, increment the new ones.
 *  - `totalVotes` increments only when the user has never voted before.
 *  - All mutations happen inside a single transaction so options JSON and
 *    totalVotes are always consistent.
 *
 * Returns the updated poll row (with percentages recomputed).
 */
export async function castVote(
    pollId: string,
    userId: string,
    newOptionIds: string[]
): Promise<PollRow> {
    return db.transaction(async (tx) => {
        // 1. Lock-read the poll
        const pollRows = await tx.select().from(polls).where(eq(polls.id, pollId)).limit(1)
        if (pollRows.length === 0) throw new Error('Poll not found')
        const poll = pollRows[0]

        // 1a. Validate the requested option ids against the poll's own options.
        //     Drop unknown ids (a malicious client could send arbitrary strings),
        //     and for single-choice polls keep at most one selection so the
        //     per-option counts can never sum past totalVotes (>100%).
        const validIds = new Set((poll.options as PollOption[]).map((o) => o.id))
        let optionIds = newOptionIds.filter((id) => validIds.has(id))
        if (optionIds.length === 0) throw new Error('No valid option selected')
        if (!poll.isMultipleChoice && optionIds.length > 1) {
            optionIds = [optionIds[0]]
        }

        // 2. Check for an existing vote
        const existingVoteRows = await tx
            .select()
            .from(pollVotes)
            .where(and(eq(pollVotes.pollId, pollId), eq(pollVotes.userId, userId)))
            .limit(1)

        const existingVote = existingVoteRows[0] ?? null
        const previousOptionIds: string[] = existingVote?.optionIds ?? []
        const isNewVoter = existingVote === null

        // 3. Upsert the vote row
        const ts = now()
        if (isNewVoter) {
            await tx.insert(pollVotes).values({
                pollId,
                userId,
                optionIds,
                votedAt: ts,
            })
        } else {
            await tx
                .update(pollVotes)
                .set({ optionIds, votedAt: ts })
                .where(and(eq(pollVotes.pollId, pollId), eq(pollVotes.userId, userId)))
        }

        // 4. Update per-option vote counts
        const updatedOptions = (poll.options as PollOption[]).map((opt) => {
            let votes = opt.votes
            if (previousOptionIds.includes(opt.id) && !optionIds.includes(opt.id)) {
                votes = Math.max(0, votes - 1)
            }
            if (optionIds.includes(opt.id) && !previousOptionIds.includes(opt.id)) {
                votes = votes + 1
            }
            return { ...opt, votes }
        })

        // 5. Recompute totalVotes (only increments for brand-new voters)
        const newTotal = isNewVoter ? poll.totalVotes + 1 : poll.totalVotes
        const optionsWithPct = recomputePercentages(updatedOptions, newTotal)

        // 6. Write the updated poll
        await tx
            .update(polls)
            .set({ options: optionsWithPct, totalVotes: newTotal })
            .where(eq(polls.id, pollId))

        return rowToPollRow({ ...poll, options: optionsWithPct, totalVotes: newTotal })
    })
}

/* -------------------------------------------------------------------------- */
/*  UPDATE                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Update a poll's question, options, and/or category within the 5-minute
 * edit window.  Changing options resets all votes.
 *
 * Only the poll owner may update; the edit window is enforced server-side.
 * Returns the updated poll row.
 */
export async function updatePoll(
    pollId: string,
    requestingUserId: string,
    updates: {
        question?: string
        optionTexts?: string[]
        category?: ForumCategory
    }
): Promise<PollRow> {
    return db.transaction(async (tx) => {
        const pollRows = await tx.select().from(polls).where(eq(polls.id, pollId)).limit(1)
        if (pollRows.length === 0) throw new Error('Poll not found')
        const poll = pollRows[0]

        if (poll.userId !== requestingUserId) throw new Error('Unauthorized')

        // Enforce 5-minute edit window
        const FIVE_MINUTES = 5 * 60 * 1000
        if (now() - poll.createdAt >= FIVE_MINUTES) {
            throw new Error('Edit window has expired (5 minutes)')
        }

        const setValues: Partial<typeof polls.$inferInsert> = {}

        if (updates.question !== undefined) {
            setValues.question = updates.question
        }
        if (updates.category !== undefined) {
            setValues.category = updates.category
        }
        if (updates.optionTexts !== undefined) {
            // Reset options with zero votes, delete existing votes
            setValues.options = updates.optionTexts.map((text, i) => ({
                id: `option-${i}`,
                text,
                votes: 0,
                percentage: 0,
            }))
            setValues.totalVotes = 0

            await tx.delete(pollVotes).where(eq(pollVotes.pollId, pollId))
        }

        const [updated] = await tx
            .update(polls)
            .set(setValues)
            .where(eq(polls.id, pollId))
            .returning()

        return rowToPollRow(updated)
    })
}

/**
 * Toggle the `isHidden` flag on a poll.  Only the owner may hide/unhide.
 */
export async function setPollVisibility(
    pollId: string,
    requestingUserId: string,
    hidden: boolean
): Promise<PollRow> {
    const pollRows = await db.select().from(polls).where(eq(polls.id, pollId)).limit(1)
    if (pollRows.length === 0) throw new Error('Poll not found')
    if (pollRows[0].userId !== requestingUserId) throw new Error('Unauthorized')

    const [updated] = await db
        .update(polls)
        .set({ isHidden: hidden })
        .where(eq(polls.id, pollId))
        .returning()

    return rowToPollRow(updated)
}

/* -------------------------------------------------------------------------- */
/*  DELETE                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Delete a poll and all its votes.
 *
 * Only the poll owner OR an admin may delete.
 */
export async function deletePoll(pollId: string, requestingUserId: string): Promise<void> {
    const pollRows = await db.select().from(polls).where(eq(polls.id, pollId)).limit(1)
    if (pollRows.length === 0) throw new Error('Poll not found')

    const isAdmin = await isCurrentUserAdmin()
    if (pollRows[0].userId !== requestingUserId && !isAdmin) {
        throw new Error('Unauthorized')
    }

    await db.transaction(async (tx) => {
        await tx.delete(pollVotes).where(eq(pollVotes.pollId, pollId))
        await tx.delete(polls).where(eq(polls.id, pollId))
    })
}

/* -------------------------------------------------------------------------- */
/*  Internal row mapper                                                        */
/* -------------------------------------------------------------------------- */

/** Convert a raw Drizzle select result to a typed PollRow. */
function rowToPollRow(row: typeof polls.$inferSelect): PollRow {
    return {
        id: row.id,
        question: row.question,
        description: row.description ?? null,
        category: row.category as ForumCategory,
        userId: row.userId,
        userName: row.userName ?? null,
        userAvatar: row.userAvatar ?? null,
        createdAt: row.createdAt,
        expiresAt: row.expiresAt ?? null,
        options: (row.options ?? []) as PollOption[],
        totalVotes: row.totalVotes,
        isMultipleChoice: Boolean(row.isMultipleChoice),
        allowAddOptions: Boolean(row.allowAddOptions),
        isHidden: Boolean(row.isHidden),
        tags: (row.tags ?? null) as string[] | null,
    }
}
