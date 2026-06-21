/**
 * Ranking Store (Zustand)
 *
 * Manages ranking state — previously backed by Firestore, now backed by the
 * Turso/Drizzle API routes under /api/rankings/**.
 *
 * All mutating calls use authenticatedFetch() (cookie-based Auth.js session).
 * Public reads (community feed, single ranking, comments) use plain fetch.
 *
 * Exported action signatures are unchanged so all callers continue to work.
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

import { authenticatedFetch } from '@/lib/authenticatedFetch'
import {
    canCreateRankings,
    type CreateCommentRequest,
    type CreateRankingRequest,
    type Ranking,
    type RankingComment,
    type RankingLike,
    type ReorderRankingRequest,
    type UpdateRankingRequest,
} from '@/types/rankings'

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const GUEST_ID_PREFIX = 'guest_'

const isGuestUserId = (userId?: string | null): boolean =>
    Boolean(userId && userId.startsWith(GUEST_ID_PREFIX))

function ensureAuthUser(userId: string | null | undefined, action: string): userId is string {
    if (!userId) {
        console.warn(`Cannot ${action}: No user ID`)
        return false
    }
    if (isGuestUserId(userId)) {
        console.warn(`Cannot ${action}: Authentication required`)
        return false
    }
    return true
}

/** Thin wrapper: throw on non-ok responses with the server error message. */
async function expectOk(res: Response): Promise<unknown> {
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
        throw new Error((json as { error?: string }).error || `Request failed (${res.status})`)
    }
    return json
}

/* -------------------------------------------------------------------------- */
/*  Store types (unchanged public surface)                                     */
/* -------------------------------------------------------------------------- */

interface RankingState {
    // State
    rankings: Ranking[]
    communityRankings: Ranking[]
    currentRanking: Ranking | null
    comments: RankingComment[]
    likes: RankingLike[]
    viewedRankings: Set<string>
    isLoading: boolean
    error: string | null

    // Filters
    sortBy: 'recent' | 'popular' | 'most-liked' | 'most-viewed'
    filterByMediaType: 'all' | 'movie' | 'tv'

    // Rankings CRUD
    loadUserRankings: (userId: string | null) => Promise<void>
    loadCommunityRankings: (limit?: number) => Promise<void>
    loadRanking: (rankingId: string, userId?: string | null) => Promise<void>
    createRanking: (
        userId: string | null,
        displayName: string,
        username: string | undefined,
        userAvatar: string | undefined,
        request: CreateRankingRequest
    ) => Promise<string | null>
    updateRanking: (userId: string | null, request: UpdateRankingRequest) => Promise<void>
    reorderRanking: (userId: string | null, request: ReorderRankingRequest) => Promise<void>
    deleteRanking: (userId: string | null, rankingId: string) => Promise<void>

    // Engagement
    likeRanking: (userId: string | null, rankingId: string, userName: string) => Promise<void>
    unlikeRanking: (userId: string | null, rankingId: string) => Promise<void>
    incrementView: (rankingId: string, userId?: string | null) => Promise<void>

    // Comments
    loadComments: (rankingId: string, limit?: number) => Promise<void>
    createComment: (
        userId: string | null,
        username: string,
        userAvatar: string | undefined,
        request: CreateCommentRequest
    ) => Promise<void>
    deleteComment: (
        userId: string | null,
        commentId: string,
        rankingOwnerId: string
    ) => Promise<void>
    likeComment: (userId: string | null, commentId: string) => Promise<void>
    unlikeComment: (userId: string | null, commentId: string) => Promise<void>

    // Utility
    setSortBy: (sortBy: RankingState['sortBy']) => void
    setFilterByMediaType: (filter: RankingState['filterByMediaType']) => void
    clearCurrentRanking: () => void
    clearError: () => void
    setError: (error: string | null) => void
}

/* -------------------------------------------------------------------------- */
/*  Store implementation                                                       */
/* -------------------------------------------------------------------------- */

export const useRankingStore = create<RankingState>()(
    devtools(
        (set, get) => ({
            // ----------------------------------------------------------------
            //  Initial state
            // ----------------------------------------------------------------
            rankings: [],
            communityRankings: [],
            currentRanking: null,
            comments: [],
            likes: [],
            viewedRankings: new Set<string>(),
            isLoading: false,
            error: null,
            sortBy: 'recent',
            filterByMediaType: 'all',

            // ----------------------------------------------------------------
            //  Load user's own rankings (authenticated)
            // ----------------------------------------------------------------
            loadUserRankings: async (userId) => {
                if (!userId) {
                    set({ rankings: [], isLoading: false })
                    return
                }

                set({ isLoading: true, error: null })
                try {
                    const res = await authenticatedFetch('/api/rankings?scope=mine')
                    const json = (await expectOk(res)) as { data: Ranking[] }
                    set({ rankings: json.data, isLoading: false })
                } catch (error) {
                    console.error('Error loading user rankings:', error)
                    set({
                        error: error instanceof Error ? error.message : 'Failed to load rankings',
                        isLoading: false,
                    })
                }
            },

            // ----------------------------------------------------------------
            //  Load public community rankings
            // ----------------------------------------------------------------
            loadCommunityRankings: async (limit = 50) => {
                set({ isLoading: true, error: null })
                const sortBy = get().sortBy
                try {
                    const res = await fetch(`/api/rankings?sort=${sortBy}&limit=${limit}`, {
                        credentials: 'same-origin',
                    })
                    const json = (await expectOk(res)) as { data: Ranking[] }
                    set({ communityRankings: json.data, isLoading: false })
                } catch (error) {
                    console.error('Error loading community rankings:', error)
                    set({
                        error:
                            error instanceof Error
                                ? error.message
                                : 'Failed to load community rankings',
                        isLoading: false,
                    })
                }
            },

            // ----------------------------------------------------------------
            //  Load a single ranking
            // ----------------------------------------------------------------
            loadRanking: async (rankingId, userId) => {
                set({ isLoading: true, error: null })
                try {
                    const res = await fetch(`/api/rankings/${rankingId}`, {
                        credentials: 'same-origin',
                    })

                    if (res.status === 403) {
                        set({ error: 'This ranking is private', isLoading: false })
                        return
                    }
                    if (res.status === 404) {
                        set({ error: 'Ranking not found', isLoading: false })
                        return
                    }

                    const json = (await expectOk(res)) as { ranking: Ranking }
                    set({ currentRanking: json.ranking, isLoading: false })
                } catch (error) {
                    console.error('Error loading ranking:', error)
                    set({
                        error: error instanceof Error ? error.message : 'Failed to load ranking',
                        isLoading: false,
                    })
                }
            },

            // ----------------------------------------------------------------
            //  Create ranking
            // ----------------------------------------------------------------
            createRanking: async (userId, displayName, username, userAvatar, request) => {
                if (!ensureAuthUser(userId, 'create ranking')) {
                    set({ error: 'Authentication required to create rankings' })
                    return null
                }
                if (!canCreateRankings(isGuestUserId(userId))) {
                    set({ error: 'Guest users cannot create rankings' })
                    return null
                }

                set({ isLoading: true, error: null })
                try {
                    const res = await authenticatedFetch('/api/rankings', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ displayName, username, userAvatar, ...request }),
                    })
                    const json = (await expectOk(res)) as { ranking: Ranking }
                    const newRanking = json.ranking

                    set((state) => ({
                        rankings: [newRanking, ...state.rankings],
                        isLoading: false,
                    }))

                    return newRanking.id
                } catch (error) {
                    console.error('Error creating ranking:', error)
                    set({
                        error: error instanceof Error ? error.message : 'Failed to create ranking',
                        isLoading: false,
                    })
                    return null
                }
            },

            // ----------------------------------------------------------------
            //  Update ranking
            // ----------------------------------------------------------------
            updateRanking: async (userId, request) => {
                if (!ensureAuthUser(userId, 'update ranking')) {
                    set({ error: 'Authentication required' })
                    return
                }

                set({ isLoading: true, error: null })
                try {
                    const { id: rankingId, ...updates } = request
                    const res = await authenticatedFetch(`/api/rankings/${rankingId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updates),
                    })
                    await expectOk(res)

                    set((state) => ({
                        rankings: state.rankings.map((r) =>
                            r.id === rankingId ? { ...r, ...updates, updatedAt: Date.now() } : r
                        ),
                        currentRanking:
                            state.currentRanking?.id === rankingId
                                ? { ...state.currentRanking, ...updates, updatedAt: Date.now() }
                                : state.currentRanking,
                        isLoading: false,
                    }))
                } catch (error) {
                    console.error('Error updating ranking:', error)
                    set({
                        error: error instanceof Error ? error.message : 'Failed to update ranking',
                        isLoading: false,
                    })
                }
            },

            // ----------------------------------------------------------------
            //  Reorder ranking items (optimistic)
            // ----------------------------------------------------------------
            reorderRanking: async (userId, request) => {
                if (!ensureAuthUser(userId, 'reorder ranking')) {
                    set({ error: 'Authentication required' })
                    return
                }

                // Optimistic update
                set((state) => ({
                    currentRanking: state.currentRanking
                        ? {
                              ...state.currentRanking,
                              rankedItems: request.rankedItems,
                              updatedAt: Date.now(),
                          }
                        : null,
                }))

                try {
                    const res = await authenticatedFetch(`/api/rankings/${request.rankingId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ rankedItems: request.rankedItems }),
                    })
                    await expectOk(res)
                } catch (error) {
                    console.error('Error reordering ranking:', error)
                    set({
                        error: error instanceof Error ? error.message : 'Failed to reorder ranking',
                    })
                }
            },

            // ----------------------------------------------------------------
            //  Delete ranking
            // ----------------------------------------------------------------
            deleteRanking: async (userId, rankingId) => {
                if (!ensureAuthUser(userId, 'delete ranking')) {
                    set({ error: 'Authentication required' })
                    return
                }

                set({ isLoading: true, error: null })
                try {
                    const res = await authenticatedFetch(`/api/rankings/${rankingId}`, {
                        method: 'DELETE',
                    })
                    await expectOk(res)

                    set((state) => ({
                        rankings: state.rankings.filter((r) => r.id !== rankingId),
                        currentRanking:
                            state.currentRanking?.id === rankingId ? null : state.currentRanking,
                        isLoading: false,
                    }))
                } catch (error) {
                    console.error('Error deleting ranking:', error)
                    set({
                        error: error instanceof Error ? error.message : 'Failed to delete ranking',
                        isLoading: false,
                    })
                }
            },

            // ----------------------------------------------------------------
            //  Like ranking (optimistic)
            // ----------------------------------------------------------------
            likeRanking: async (userId, rankingId, _userName) => {
                if (!ensureAuthUser(userId, 'like ranking')) {
                    set({ error: 'Authentication required to like rankings' })
                    return
                }

                const originalLikes = get().currentRanking?.likes ?? 0

                // Optimistic
                set((state) => ({
                    currentRanking: state.currentRanking
                        ? { ...state.currentRanking, likes: state.currentRanking.likes + 1 }
                        : null,
                }))

                try {
                    const res = await authenticatedFetch(`/api/rankings/${rankingId}/like`, {
                        method: 'POST',
                    })
                    await expectOk(res)
                } catch (error) {
                    console.error('Error liking ranking:', error)
                    // Rollback
                    set((state) => ({
                        currentRanking: state.currentRanking
                            ? { ...state.currentRanking, likes: originalLikes }
                            : null,
                        error: error instanceof Error ? error.message : 'Failed to like ranking',
                    }))
                }
            },

            // ----------------------------------------------------------------
            //  Unlike ranking (optimistic)
            // ----------------------------------------------------------------
            unlikeRanking: async (userId, rankingId) => {
                if (!ensureAuthUser(userId, 'unlike ranking')) {
                    set({ error: 'Authentication required' })
                    return
                }

                const originalLikes = get().currentRanking?.likes ?? 0

                // Optimistic
                set((state) => ({
                    currentRanking: state.currentRanking
                        ? {
                              ...state.currentRanking,
                              likes: Math.max(0, state.currentRanking.likes - 1),
                          }
                        : null,
                }))

                try {
                    const res = await authenticatedFetch(`/api/rankings/${rankingId}/like`, {
                        method: 'DELETE',
                    })
                    await expectOk(res)
                } catch (error) {
                    console.error('Error unliking ranking:', error)
                    // Rollback
                    set((state) => ({
                        currentRanking: state.currentRanking
                            ? { ...state.currentRanking, likes: originalLikes }
                            : null,
                        error: error instanceof Error ? error.message : 'Failed to unlike ranking',
                    }))
                }
            },

            // ----------------------------------------------------------------
            //  Increment view (per-session deduplication)
            // ----------------------------------------------------------------
            incrementView: async (rankingId, _userId) => {
                const state = get()
                if (state.viewedRankings.has(rankingId)) {
                    return // Already viewed in this session
                }

                // Mark viewed before request to prevent races
                set((s) => ({
                    viewedRankings: new Set(s.viewedRankings).add(rankingId),
                }))

                try {
                    await fetch(`/api/rankings/${rankingId}/view`, {
                        method: 'POST',
                        credentials: 'same-origin',
                    })

                    set((s) => ({
                        currentRanking: s.currentRanking
                            ? { ...s.currentRanking, views: s.currentRanking.views + 1 }
                            : null,
                    }))
                } catch (error) {
                    console.error('Error incrementing view:', error)
                    // Allow retry on failure
                    set((s) => {
                        const updated = new Set(s.viewedRankings)
                        updated.delete(rankingId)
                        return { viewedRankings: updated }
                    })
                }
            },

            // ----------------------------------------------------------------
            //  Load comments
            // ----------------------------------------------------------------
            loadComments: async (rankingId, limit = 20) => {
                set({ error: null })
                try {
                    const res = await fetch(`/api/rankings/${rankingId}/comments?limit=${limit}`, {
                        credentials: 'same-origin',
                    })
                    const json = (await expectOk(res)) as { data: RankingComment[] }
                    set({ comments: json.data })
                } catch (error) {
                    console.error('Error loading comments:', error)
                    set({
                        error: error instanceof Error ? error.message : 'Failed to load comments',
                    })
                }
            },

            // ----------------------------------------------------------------
            //  Create comment
            // ----------------------------------------------------------------
            createComment: async (userId, username, userAvatar, request) => {
                if (!ensureAuthUser(userId, 'comment on ranking')) {
                    set({ error: 'Authentication required to comment' })
                    return
                }

                try {
                    const res = await authenticatedFetch(
                        `/api/rankings/${request.rankingId}/comments`,
                        {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userName: username, userAvatar, ...request }),
                        }
                    )
                    await expectOk(res)

                    // Update comment count and reload comments
                    set((state) => ({
                        currentRanking: state.currentRanking
                            ? {
                                  ...state.currentRanking,
                                  comments: state.currentRanking.comments + 1,
                              }
                            : null,
                    }))

                    await get().loadComments(request.rankingId)
                } catch (error) {
                    console.error('Error creating comment:', error)
                    set({
                        error: error instanceof Error ? error.message : 'Failed to create comment',
                    })
                }
            },

            // ----------------------------------------------------------------
            //  Delete comment
            // ----------------------------------------------------------------
            deleteComment: async (userId, commentId, rankingOwnerId) => {
                if (!ensureAuthUser(userId, 'delete comment')) {
                    set({ error: 'Authentication required' })
                    return
                }

                try {
                    const res = await authenticatedFetch(`/api/rankings/comments/${commentId}`, {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ rankingOwnerId }),
                    })
                    await expectOk(res)

                    set((state) => ({
                        comments: state.comments.filter((c) => c.id !== commentId),
                        currentRanking: state.currentRanking
                            ? {
                                  ...state.currentRanking,
                                  comments: Math.max(0, state.currentRanking.comments - 1),
                              }
                            : null,
                    }))
                } catch (error) {
                    console.error('Error deleting comment:', error)
                    set({
                        error: error instanceof Error ? error.message : 'Failed to delete comment',
                    })
                }
            },

            // ----------------------------------------------------------------
            //  Like comment
            // ----------------------------------------------------------------
            likeComment: async (userId, commentId) => {
                if (!ensureAuthUser(userId, 'like comment')) {
                    set({ error: 'Authentication required to like comments' })
                    return
                }

                try {
                    const res = await authenticatedFetch(
                        `/api/rankings/comments/${commentId}/like`,
                        { method: 'POST' }
                    )
                    await expectOk(res)

                    set((state) => ({
                        comments: state.comments.map((c) =>
                            c.id === commentId ? { ...c, likes: c.likes + 1 } : c
                        ),
                    }))
                } catch (error) {
                    console.error('Error liking comment:', error)
                }
            },

            // ----------------------------------------------------------------
            //  Unlike comment
            // ----------------------------------------------------------------
            unlikeComment: async (userId, commentId) => {
                if (!ensureAuthUser(userId, 'unlike comment')) {
                    set({ error: 'Authentication required' })
                    return
                }

                try {
                    const res = await authenticatedFetch(
                        `/api/rankings/comments/${commentId}/like`,
                        { method: 'DELETE' }
                    )
                    await expectOk(res)

                    set((state) => ({
                        comments: state.comments.map((c) =>
                            c.id === commentId ? { ...c, likes: Math.max(0, c.likes - 1) } : c
                        ),
                    }))
                } catch (error) {
                    console.error('Error unliking comment:', error)
                }
            },

            // ----------------------------------------------------------------
            //  Utility
            // ----------------------------------------------------------------
            setSortBy: (sortBy) => {
                set({ sortBy })
                get().loadCommunityRankings()
            },

            setFilterByMediaType: (filter) => {
                set({ filterByMediaType: filter })
            },

            clearCurrentRanking: () => {
                set({ currentRanking: null, comments: [] })
            },

            clearError: () => {
                set({ error: null })
            },

            setError: (error) => {
                set({ error })
            },
        }),
        { name: 'RankingStore' }
    )
)
