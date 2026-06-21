/**
 * Forum Store
 *
 * Manages forum state including threads, polls, and user interactions.
 * Following the same pattern as other Zustand stores in the app.
 *
 * THREADS & REPLIES — migrated to Turso/Drizzle via /api/threads/* routes.
 * POLLS             — migrated to Turso/Drizzle via /api/polls/* routes (polls agent).
 * CONTENT REPORTS   — still Firestore (admin domain, untouched).
 */

import { create } from 'zustand'
import {
    Thread,
    ThreadReply,
    Poll,
    ForumCategory,
    ForumSortBy,
    ForumFilters,
    ReportReason,
    ReportContentType,
} from '@/types/forum'
import { collection, addDoc, updateDoc, Timestamp, QueryDocumentSnapshot } from 'firebase/firestore'
import { db } from '@/firebase'
import { authenticatedFetch } from '@/lib/authenticatedFetch'

/* -------------------------------------------------------------------------- */
/*  Shared fetch helpers for the poll domain                                   */
/* -------------------------------------------------------------------------- */

/**
 * Thin wrapper around fetch for poll API calls that mutate data.
 * Auth is handled by the Auth.js session cookie — no explicit token needed.
 */
async function pollMutate(
    url: string,
    method: 'POST' | 'PATCH' | 'DELETE',
    body?: unknown
): Promise<unknown> {
    const res = await fetch(url, {
        method,
        credentials: 'include', // send Auth.js session cookie
        headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
        body: body !== undefined ? JSON.stringify(body) : undefined,
    })

    if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error((json as { error?: string }).error ?? `Request failed (${res.status})`)
    }

    return res.json()
}

/**
 * Convert a PollRow returned by the API (epoch-ms timestamps) into the Poll
 * shape expected by existing components.  We keep the `createdAt` field as a
 * plain number so components that previously handled both Timestamp and number
 * continue to work via the existing `canEditPoll` guards.
 */
function apiPollToStorePoll(apiPoll: Record<string, unknown>): Poll {
    return {
        id: apiPoll.id as string,
        question: apiPoll.question as string,
        description: apiPoll.description as string | undefined,
        category: apiPoll.category as ForumCategory,
        userId: apiPoll.userId as string,
        userName: apiPoll.userName as string,
        userAvatar: apiPoll.userAvatar as string | undefined,
        // Keep as number — components guard for both Timestamp and number
        createdAt: apiPoll.createdAt as unknown as Timestamp,
        expiresAt: apiPoll.expiresAt as unknown as Timestamp | undefined,
        options: apiPoll.options as Poll['options'],
        totalVotes: apiPoll.totalVotes as number,
        isMultipleChoice: Boolean(apiPoll.isMultipleChoice),
        allowAddOptions: Boolean(apiPoll.allowAddOptions),
        isHidden: Boolean(apiPoll.isHidden),
        tags: apiPoll.tags as string[] | undefined,
    }
}

interface ForumState {
    // Threads (migrated to Turso/Drizzle)
    threads: Thread[]
    currentThread: Thread | null
    threadReplies: ThreadReply[]
    isLoadingThreads: boolean
    threadsError: string | null
    /** Offset cursor for loadMoreThreads (replaces lastThreadDoc). */
    threadOffset: number
    hasMoreThreads: boolean

    // Polls (migrated to Turso/Drizzle — Firestore cursors removed)
    polls: Poll[]
    currentPoll: Poll | null
    isLoadingPolls: boolean
    pollsError: string | null
    /** Viewer's known votes: pollId → optionIds[] (populated from API responses). */
    knownVotes: Record<string, string[]>

    // Filters
    filters: ForumFilters

    // Actions - Threads
    loadThreads: (category?: ForumCategory, limit?: number) => Promise<void>
    loadMoreThreads: () => Promise<void>
    loadThreadById: (threadId: string) => Promise<void>
    loadThreadReplies: (threadId: string) => Promise<void>
    createThread: (
        userId: string,
        userName: string,
        userAvatar: string | undefined,
        title: string,
        content: string,
        category: ForumCategory,
        tags?: string[],
        images?: string[]
    ) => Promise<string>
    replyToThread: (
        userId: string,
        userName: string,
        userAvatar: string | undefined,
        threadId: string,
        content: string,
        parentReplyId?: string,
        images?: string[]
    ) => Promise<void>
    likeThread: (userId: string, threadId: string) => Promise<void>
    unlikeThread: (userId: string, threadId: string) => Promise<void>
    likeReply: (userId: string, replyId: string) => Promise<void>
    unlikeReply: (userId: string, replyId: string) => Promise<void>
    deleteThread: (userId: string, threadId: string) => Promise<void>
    deleteReply: (userId: string, replyId: string) => Promise<void>

    // Actions - Polls
    loadPolls: (category?: ForumCategory, limit?: number) => Promise<void>
    loadMorePolls: () => Promise<void>
    loadPollById: (pollId: string) => Promise<void>
    createPoll: (
        userId: string,
        userName: string,
        userAvatar: string | undefined,
        question: string,
        options: string[],
        category: ForumCategory
    ) => Promise<string>
    updatePoll: (
        userId: string,
        pollId: string,
        updates: { question?: string; options?: string[]; category?: ForumCategory }
    ) => Promise<void>
    hidePoll: (userId: string, pollId: string) => Promise<void>
    unhidePoll: (userId: string, pollId: string) => Promise<void>
    canEditPoll: (poll: Poll) => boolean
    voteOnPoll: (userId: string, pollId: string, optionIds: string[]) => Promise<void>
    deletePoll: (userId: string, pollId: string) => Promise<void>
    getUserVote: (userId: string, pollId: string) => Promise<string[] | null>

    // Actions - Reports
    reportContent: (
        userId: string,
        userName: string,
        contentId: string,
        contentType: ReportContentType,
        reason: ReportReason,
        details?: string
    ) => Promise<void>

    // Actions - Filters
    setFilters: (filters: Partial<ForumFilters>) => void
    setSortBy: (sortBy: ForumSortBy) => void
    setCategory: (category: ForumCategory | 'all') => void
    setSearchQuery: (query: string) => void

    // Reset
    reset: () => void
}

const initialFilters: ForumFilters = {
    category: 'all',
    sortBy: 'recent',
    searchQuery: '',
    tags: [],
}

export const useForumStore = create<ForumState>((set, get) => ({
    // Initial state
    threads: [],
    currentThread: null,
    threadReplies: [],
    isLoadingThreads: false,
    threadsError: null,
    threadOffset: 0,
    hasMoreThreads: true,

    polls: [],
    currentPoll: null,
    isLoadingPolls: false,
    pollsError: null,
    knownVotes: {},

    filters: initialFilters,

    // -------------------------------------------------------------------------
    // Thread actions — Turso/Drizzle via /api/threads/*
    // -------------------------------------------------------------------------

    loadThreads: async (category, limit = 20) => {
        set({ isLoadingThreads: true, threadsError: null, threadOffset: 0 })
        try {
            const { filters } = get()
            const params = new URLSearchParams({
                limit: String(limit),
                sortBy: filters.sortBy,
                offset: '0',
            })
            if (category) params.set('category', category)

            const res = await fetch(`/api/threads?${params}`, { credentials: 'same-origin' })
            if (!res.ok) throw new Error(`Failed to load threads (${res.status})`)

            const json = await res.json()
            const threadList = (json.threads as Record<string, unknown>[]).map(
                (r) => r as unknown as Thread
            )

            set({
                threads: threadList,
                hasMoreThreads: Boolean(json.hasMore),
                threadOffset: threadList.length,
                isLoadingThreads: false,
            })
        } catch (error) {
            console.error('Failed to load threads:', error)
            set({
                threadsError: error instanceof Error ? error.message : 'Failed to load threads',
                isLoadingThreads: false,
            })
        }
    },

    loadMoreThreads: async () => {
        const { hasMoreThreads, isLoadingThreads, filters, threadOffset } = get()
        if (!hasMoreThreads || isLoadingThreads) return

        const LIMIT = 20
        set({ isLoadingThreads: true })
        try {
            const category = filters.category !== 'all' ? filters.category : undefined
            const params = new URLSearchParams({
                limit: String(LIMIT),
                sortBy: filters.sortBy,
                offset: String(threadOffset),
            })
            if (category) params.set('category', category)

            const res = await fetch(`/api/threads?${params}`, { credentials: 'same-origin' })
            if (!res.ok) throw new Error(`Failed to load threads (${res.status})`)

            const json = await res.json()
            const newThreads = (json.threads as Record<string, unknown>[]).map(
                (r) => r as unknown as Thread
            )

            set((state) => ({
                threads: [...state.threads, ...newThreads],
                hasMoreThreads: Boolean(json.hasMore),
                threadOffset: state.threadOffset + newThreads.length,
                isLoadingThreads: false,
            }))
        } catch (error) {
            console.error('Failed to load more threads:', error)
            set({ isLoadingThreads: false })
        }
    },

    loadThreadById: async (threadId) => {
        set({ isLoadingThreads: true, threadsError: null })
        try {
            const res = await fetch(`/api/threads/${threadId}`, { credentials: 'same-origin' })
            if (res.status === 404) {
                set({
                    currentThread: null,
                    isLoadingThreads: false,
                    threadsError: 'Thread not found',
                })
                return
            }
            if (!res.ok) throw new Error(`Failed to load thread (${res.status})`)

            const json = await res.json()
            const thread = json.thread as unknown as Thread
            set({ currentThread: thread, isLoadingThreads: false })
        } catch (error) {
            set({
                threadsError: error instanceof Error ? error.message : 'Failed to load thread',
                isLoadingThreads: false,
            })
        }
    },

    loadThreadReplies: async (threadId) => {
        try {
            const res = await fetch(`/api/threads/${threadId}/replies`, {
                credentials: 'same-origin',
            })
            if (!res.ok) throw new Error(`Failed to load replies (${res.status})`)

            const json = await res.json()
            const replies = (json.replies as Record<string, unknown>[]).map(
                (r) => r as unknown as ThreadReply
            )
            set({ threadReplies: replies })
        } catch (error) {
            console.error('Failed to load thread replies:', error)
        }
    },

    createThread: async (userId, userName, userAvatar, title, content, category, tags, images) => {
        const res = await authenticatedFetch('/api/threads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title,
                content,
                category,
                userName,
                userAvatar,
                tags: tags ?? [],
                images: images ?? [],
            }),
        })

        if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            throw new Error(
                (err as { error?: string }).error ?? `Failed to create thread (${res.status})`
            )
        }

        const json = await res.json()
        void userId // userId is resolved server-side from Auth.js session
        return (json.thread as { id: string }).id
    },

    replyToThread: async (
        userId,
        userName,
        userAvatar,
        threadId,
        content,
        parentReplyId,
        images
    ) => {
        const res = await authenticatedFetch(`/api/threads/${threadId}/replies`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content,
                userName,
                userAvatar,
                parentReplyId,
                images: images ?? [],
            }),
        })

        if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            throw new Error((err as { error?: string }).error ?? `Failed to reply (${res.status})`)
        }

        const json = await res.json()
        const reply = json.reply as unknown as ThreadReply

        // Optimistic update
        set((state) => ({
            threadReplies: [...state.threadReplies, reply],
            currentThread:
                state.currentThread?.id === threadId
                    ? { ...state.currentThread, replyCount: state.currentThread.replyCount + 1 }
                    : state.currentThread,
            threads: state.threads.map((t) =>
                t.id === threadId ? { ...t, replyCount: t.replyCount + 1 } : t
            ),
        }))

        void userId
    },

    likeThread: async (userId, threadId) => {
        const res = await authenticatedFetch(`/api/threads/${threadId}/like`, { method: 'POST' })
        if (!res.ok) throw new Error(`Failed to like thread (${res.status})`)

        set((state) => ({
            currentThread:
                state.currentThread?.id === threadId
                    ? { ...state.currentThread, likes: state.currentThread.likes + 1 }
                    : state.currentThread,
            threads: state.threads.map((t) =>
                t.id === threadId ? { ...t, likes: t.likes + 1 } : t
            ),
        }))

        void userId
    },

    unlikeThread: async (userId, threadId) => {
        const res = await authenticatedFetch(`/api/threads/${threadId}/like`, { method: 'DELETE' })
        if (!res.ok) throw new Error(`Failed to unlike thread (${res.status})`)

        set((state) => ({
            currentThread:
                state.currentThread?.id === threadId
                    ? {
                          ...state.currentThread,
                          likes: Math.max(0, state.currentThread.likes - 1),
                      }
                    : state.currentThread,
            threads: state.threads.map((t) =>
                t.id === threadId ? { ...t, likes: Math.max(0, t.likes - 1) } : t
            ),
        }))

        void userId
    },

    likeReply: async (userId, replyId) => {
        const res = await authenticatedFetch(`/api/threads/replies/${replyId}/like`, {
            method: 'POST',
        })
        if (!res.ok) throw new Error(`Failed to like reply (${res.status})`)

        set((state) => ({
            threadReplies: state.threadReplies.map((r) =>
                r.id === replyId ? { ...r, likes: r.likes + 1 } : r
            ),
        }))

        void userId
    },

    unlikeReply: async (userId, replyId) => {
        const res = await authenticatedFetch(`/api/threads/replies/${replyId}/like`, {
            method: 'DELETE',
        })
        if (!res.ok) throw new Error(`Failed to unlike reply (${res.status})`)

        set((state) => ({
            threadReplies: state.threadReplies.map((r) =>
                r.id === replyId ? { ...r, likes: Math.max(0, r.likes - 1) } : r
            ),
        }))

        void userId
    },

    deleteThread: async (userId, threadId) => {
        const res = await authenticatedFetch(`/api/threads/${threadId}`, { method: 'DELETE' })
        if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            throw new Error(
                (err as { error?: string }).error ?? `Failed to delete thread (${res.status})`
            )
        }

        set((state) => ({
            threads: state.threads.filter((t) => t.id !== threadId),
            currentThread: state.currentThread?.id === threadId ? null : state.currentThread,
        }))

        void userId
    },

    deleteReply: async (userId, replyId) => {
        // Capture threadId before calling the API for optimistic state update
        const replyToDelete = get().threadReplies.find((r) => r.id === replyId)
        const threadId = replyToDelete
            ? (replyToDelete as unknown as { threadId: string }).threadId
            : undefined

        const res = await authenticatedFetch(`/api/threads/replies/${replyId}`, {
            method: 'DELETE',
        })
        if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            throw new Error(
                (err as { error?: string }).error ?? `Failed to delete reply (${res.status})`
            )
        }

        set((state) => ({
            threadReplies: state.threadReplies.filter((r) => r.id !== replyId),
            ...(threadId
                ? {
                      threads: state.threads.map((t) =>
                          t.id === threadId
                              ? { ...t, replyCount: Math.max(0, t.replyCount - 1) }
                              : t
                      ),
                      currentThread:
                          state.currentThread?.id === threadId
                              ? {
                                    ...state.currentThread,
                                    replyCount: Math.max(0, state.currentThread.replyCount - 1),
                                }
                              : state.currentThread,
                  }
                : {}),
        }))

        void userId
    },

    // -------------------------------------------------------------------------
    // Poll actions — migrated to Turso/Drizzle via /api/polls/*
    // -------------------------------------------------------------------------

    loadPolls: async (category, limit = 20) => {
        set({ isLoadingPolls: true, pollsError: null })
        try {
            const params = new URLSearchParams({ limit: String(limit) })
            if (category) params.set('category', category)

            const res = await fetch(`/api/polls?${params}`, { credentials: 'include' })
            const json = await res.json()

            if (!res.ok) throw new Error(json.error ?? 'Failed to load polls')

            const polls: Poll[] = (json.polls as Record<string, unknown>[]).map(apiPollToStorePoll)

            // Extract viewer votes from the response
            const knownVotes: Record<string, string[]> = {}
            for (const p of json.polls as Record<string, unknown>[]) {
                if (Array.isArray(p.viewerVote) && p.viewerVote.length > 0) {
                    knownVotes[p.id as string] = p.viewerVote as string[]
                }
            }

            set({ polls, isLoadingPolls: false, knownVotes })
        } catch (error) {
            console.error('Failed to load polls:', error)
            set({
                pollsError: error instanceof Error ? error.message : 'Failed to load polls',
                isLoadingPolls: false,
            })
        }
    },

    // loadMorePolls: offset-based pagination replaces Firestore cursors.
    loadMorePolls: async () => {
        const { polls, isLoadingPolls, filters } = get()
        if (isLoadingPolls) return

        set({ isLoadingPolls: true })
        try {
            const category = filters.category !== 'all' ? filters.category : undefined
            const limit = 20
            const params = new URLSearchParams({
                limit: String(limit),
                offset: String(polls.length),
            })
            if (category) params.set('category', category)

            const res = await fetch(`/api/polls?${params}`, { credentials: 'include' })
            const json = await res.json()

            if (!res.ok) throw new Error(json.error ?? 'Failed to load polls')

            const newPolls: Poll[] = (json.polls as Record<string, unknown>[]).map(
                apiPollToStorePoll
            )

            // Merge new viewer votes
            const newVotes: Record<string, string[]> = {}
            for (const p of json.polls as Record<string, unknown>[]) {
                if (Array.isArray(p.viewerVote) && p.viewerVote.length > 0) {
                    newVotes[p.id as string] = p.viewerVote as string[]
                }
            }

            set((state) => ({
                polls: [...state.polls, ...newPolls],
                knownVotes: { ...state.knownVotes, ...newVotes },
                isLoadingPolls: false,
            }))
        } catch (error) {
            console.error('Failed to load more polls:', error)
            set({ isLoadingPolls: false })
        }
    },

    loadPollById: async (pollId) => {
        set({ isLoadingPolls: true, pollsError: null })
        try {
            const res = await fetch(`/api/polls/${pollId}`, { credentials: 'include' })
            const json = await res.json()

            if (!res.ok) {
                if (res.status === 404) {
                    set({ currentPoll: null, isLoadingPolls: false, pollsError: 'Poll not found' })
                    return
                }
                throw new Error(json.error ?? 'Failed to load poll')
            }

            const poll = apiPollToStorePoll(json.poll as Record<string, unknown>)

            // Cache the viewer's vote if present
            const viewerVote = (json.poll as Record<string, unknown>).viewerVote
            if (Array.isArray(viewerVote) && viewerVote.length > 0) {
                set((state) => ({
                    knownVotes: { ...state.knownVotes, [poll.id]: viewerVote as string[] },
                }))
            }

            set({ currentPoll: poll, isLoadingPolls: false })
        } catch (error) {
            set({
                pollsError: error instanceof Error ? error.message : 'Failed to load poll',
                isLoadingPolls: false,
            })
        }
    },

    createPoll: async (_userId, userName, userAvatar, question, options, category) => {
        // Note: _userId is ignored — the server derives the real user id from
        // the Auth.js session so the client cannot spoof it.
        try {
            const json = await pollMutate('/api/polls', 'POST', {
                question,
                options,
                category,
                userName,
                userAvatar: userAvatar ?? null,
            })
            return (json as { pollId: string }).pollId
        } catch (error) {
            throw new Error(error instanceof Error ? error.message : 'Failed to create poll')
        }
    },

    voteOnPoll: async (_userId, pollId, optionIds) => {
        try {
            const json = await pollMutate(`/api/polls/${pollId}/vote`, 'POST', { optionIds })
            const updatedPoll = apiPollToStorePoll((json as { poll: Record<string, unknown> }).poll)

            set((state) => ({
                currentPoll: state.currentPoll?.id === pollId ? updatedPoll : state.currentPoll,
                polls: state.polls.map((p) => (p.id === pollId ? updatedPoll : p)),
                knownVotes: { ...state.knownVotes, [pollId]: optionIds },
            }))
        } catch (error) {
            throw new Error(error instanceof Error ? error.message : 'Failed to vote on poll')
        }
    },

    deletePoll: async (_userId, pollId) => {
        try {
            await pollMutate(`/api/polls/${pollId}`, 'DELETE')
            set((state) => ({
                polls: state.polls.filter((p) => p.id !== pollId),
                currentPoll: state.currentPoll?.id === pollId ? null : state.currentPoll,
            }))
        } catch (error) {
            throw new Error(error instanceof Error ? error.message : 'Failed to delete poll')
        }
    },

    getUserVote: async (_userId, pollId) => {
        // Return from local cache first if we already have the vote
        const { knownVotes } = get()
        if (knownVotes[pollId]) return knownVotes[pollId]

        // Fall back to API — the session cookie identifies the user
        try {
            const res = await fetch(`/api/polls/${pollId}`, { credentials: 'include' })
            if (!res.ok) return null
            const json = await res.json()
            const viewerVote = (json.poll as Record<string, unknown>)?.viewerVote
            if (Array.isArray(viewerVote) && viewerVote.length > 0) {
                const vote = viewerVote as string[]
                set((state) => ({ knownVotes: { ...state.knownVotes, [pollId]: vote } }))
                return vote
            }
            return null
        } catch {
            return null
        }
    },

    // Check if poll can be edited (within 5 minutes of creation)
    canEditPoll: (poll: Poll) => {
        const createdAt =
            poll.createdAt instanceof Timestamp
                ? poll.createdAt.toMillis()
                : typeof poll.createdAt === 'number'
                  ? poll.createdAt
                  : new Date(poll.createdAt).getTime()
        const fiveMinutes = 5 * 60 * 1000
        return Date.now() - createdAt < fiveMinutes
    },

    // Update poll (only within 5 minutes of creation, resets all votes)
    updatePoll: async (_userId, pollId, updates) => {
        try {
            const body: Record<string, unknown> = {}
            if (updates.question) body.question = updates.question
            if (updates.category) body.category = updates.category
            if (updates.options) body.options = updates.options

            const json = await pollMutate(`/api/polls/${pollId}`, 'PATCH', body)
            const updatedPoll = apiPollToStorePoll((json as { poll: Record<string, unknown> }).poll)

            set((state) => ({
                currentPoll: state.currentPoll?.id === pollId ? updatedPoll : state.currentPoll,
                polls: state.polls.map((p) => (p.id === pollId ? updatedPoll : p)),
                // Clear cached vote since options were reset
                knownVotes: updates.options
                    ? Object.fromEntries(
                          Object.entries(state.knownVotes).filter(([k]) => k !== pollId)
                      )
                    : state.knownVotes,
            }))
        } catch (error) {
            throw new Error(error instanceof Error ? error.message : 'Failed to update poll')
        }
    },

    // Hide poll (owner only)
    hidePoll: async (_userId, pollId) => {
        try {
            const json = await pollMutate(`/api/polls/${pollId}`, 'PATCH', { hidden: true })
            const updatedPoll = apiPollToStorePoll((json as { poll: Record<string, unknown> }).poll)

            set((state) => ({
                currentPoll: state.currentPoll?.id === pollId ? updatedPoll : state.currentPoll,
                polls: state.polls.map((p) => (p.id === pollId ? updatedPoll : p)),
            }))
        } catch (error) {
            throw new Error(error instanceof Error ? error.message : 'Failed to hide poll')
        }
    },

    // Unhide poll (owner only)
    unhidePoll: async (_userId, pollId) => {
        try {
            const json = await pollMutate(`/api/polls/${pollId}`, 'PATCH', { hidden: false })
            const updatedPoll = apiPollToStorePoll((json as { poll: Record<string, unknown> }).poll)

            set((state) => ({
                currentPoll: state.currentPoll?.id === pollId ? updatedPoll : state.currentPoll,
                polls: state.polls.map((p) => (p.id === pollId ? updatedPoll : p)),
            }))
        } catch (error) {
            throw new Error(error instanceof Error ? error.message : 'Failed to unhide poll')
        }
    },

    // Report content
    reportContent: async (userId, userName, contentId, contentType, reason, details) => {
        try {
            const reportsRef = collection(db, 'content_reports')
            const now = Timestamp.now()

            const reportData = {
                id: '',
                contentId,
                contentType,
                reportedBy: userId,
                reporterName: userName,
                reason,
                details: details || '',
                createdAt: now,
                status: 'pending' as const,
            }

            const docRef = await addDoc(reportsRef, reportData)
            await updateDoc(docRef, { id: docRef.id })
        } catch (error) {
            throw new Error(error instanceof Error ? error.message : 'Failed to report content')
        }
    },

    // Filter actions
    setFilters: (filters) => {
        set((state) => ({
            filters: { ...state.filters, ...filters },
        }))
    },

    setSortBy: (sortBy) => {
        set((state) => ({
            filters: { ...state.filters, sortBy },
        }))
    },

    setCategory: (category) => {
        set((state) => ({
            filters: { ...state.filters, category },
        }))
    },

    setSearchQuery: (searchQuery) => {
        set((state) => ({
            filters: { ...state.filters, searchQuery },
        }))
    },

    // Reset
    reset: () => {
        set({
            threads: [],
            currentThread: null,
            threadReplies: [],
            isLoadingThreads: false,
            threadsError: null,
            threadOffset: 0,
            hasMoreThreads: true,
            polls: [],
            currentPoll: null,
            isLoadingPolls: false,
            pollsError: null,
            knownVotes: {},
            filters: initialFilters,
        })
    },
}))
