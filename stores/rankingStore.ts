/**
 * Ranking Store (Zustand)
 *
 * Manages ranking state with Firestore sync
 * Guest users can view but cannot create/edit rankings
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import {
    Ranking,
    RankingComment,
    RankingLike,
    CreateRankingRequest,
    UpdateRankingRequest,
    ReorderRankingRequest,
    CreateCommentRequest,
    canCreateRankings,
} from '../types/rankings'
import {
    getUserRankings,
    getPublicRankings,
    getRanking,
    createRanking as createRankingInFirestore,
    updateRanking as updateRankingInFirestore,
    deleteRanking as deleteRankingInFirestore,
    likeRanking as likeRankingInFirestore,
    unlikeRanking as unlikeRankingInFirestore,
    incrementRankingView,
} from '../utils/firestore/rankings'
import {
    getRankingComments,
    createComment as createCommentInFirestore,
    deleteComment as deleteCommentInFirestore,
    likeComment as likeCommentInFirestore,
    unlikeComment as unlikeCommentInFirestore,
} from '../utils/firestore/rankingComments'

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

interface RankingState {
    // State
    rankings: Ranking[] // User's rankings or browsed rankings
    communityRankings: Ranking[] // Public rankings for community page
    currentRanking: Ranking | null // Currently viewed ranking
    comments: RankingComment[] // Comments for current ranking
    likes: RankingLike[] // User's likes
    isLoading: boolean
    error: string | null

    // Filters & pagination
    sortBy: 'recent' | 'popular' | 'most-liked' | 'most-viewed'
    filterByMediaType: 'all' | 'movie' | 'tv'

    // Actions - Rankings CRUD
    loadUserRankings: (userId: string | null) => Promise<void>
    loadCommunityRankings: (limit?: number) => Promise<void>
    loadRanking: (rankingId: string, userId?: string | null) => Promise<void>
    createRanking: (
        userId: string | null,
        username: string,
        userAvatar: string | undefined,
        request: CreateRankingRequest
    ) => Promise<string | null>
    updateRanking: (userId: string | null, request: UpdateRankingRequest) => Promise<void>
    reorderRanking: (userId: string | null, request: ReorderRankingRequest) => Promise<void>
    deleteRanking: (userId: string | null, rankingId: string) => Promise<void>

    // Actions - Engagement
    likeRanking: (userId: string | null, rankingId: string) => Promise<void>
    unlikeRanking: (userId: string | null, rankingId: string) => Promise<void>
    incrementView: (rankingId: string, userId?: string | null) => Promise<void>

    // Actions - Comments
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

export const useRankingStore = create<RankingState>()(
    devtools(
        (set, get) => ({
            // Initial state
            rankings: [],
            communityRankings: [],
            currentRanking: null,
            comments: [],
            likes: [],
            isLoading: false,
            error: null,
            sortBy: 'recent',
            filterByMediaType: 'all',

            // Load user's rankings
            loadUserRankings: async (userId: string | null) => {
                if (!userId) {
                    set({ rankings: [], isLoading: false })
                    return
                }

                set({ isLoading: true, error: null })

                try {
                    const rankings = await getUserRankings(userId)
                    set({ rankings, isLoading: false })
                } catch (error) {
                    console.error('Error loading user rankings:', error)
                    set({
                        error: error instanceof Error ? error.message : 'Failed to load rankings',
                        isLoading: false,
                    })
                }
            },

            // Load community rankings (public only)
            loadCommunityRankings: async (limit = 50) => {
                set({ isLoading: true, error: null })

                try {
                    const rankings = await getPublicRankings(get().sortBy, limit)
                    set({ communityRankings: rankings, isLoading: false })
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

            // Load specific ranking
            loadRanking: async (rankingId: string, userId?: string | null) => {
                set({ isLoading: true, error: null })

                try {
                    const ranking = await getRanking(rankingId)

                    if (!ranking) {
                        set({ error: 'Ranking not found', isLoading: false })
                        return
                    }

                    // Check if private and user is not owner
                    if (!ranking.isPublic && ranking.userId !== userId) {
                        set({ error: 'This ranking is private', isLoading: false })
                        return
                    }

                    set({ currentRanking: ranking, isLoading: false })
                } catch (error) {
                    console.error('Error loading ranking:', error)
                    set({
                        error: error instanceof Error ? error.message : 'Failed to load ranking',
                        isLoading: false,
                    })
                }
            },

            // Create new ranking
            createRanking: async (
                userId: string | null,
                username: string,
                userAvatar: string | undefined,
                request: CreateRankingRequest
            ) => {
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
                    const rankingId = await createRankingInFirestore(
                        userId,
                        username,
                        userAvatar,
                        request
                    )

                    // Reload user rankings
                    await get().loadUserRankings(userId)

                    set({ isLoading: false })
                    return rankingId
                } catch (error) {
                    console.error('Error creating ranking:', error)
                    set({
                        error: error instanceof Error ? error.message : 'Failed to create ranking',
                        isLoading: false,
                    })
                    return null
                }
            },

            // Update existing ranking
            updateRanking: async (userId: string | null, request: UpdateRankingRequest) => {
                if (!ensureAuthUser(userId, 'update ranking')) {
                    set({ error: 'Authentication required' })
                    return
                }

                set({ isLoading: true, error: null })

                try {
                    await updateRankingInFirestore(userId, request.id, request)

                    // Update local state
                    set((state) => ({
                        rankings: state.rankings.map((r) =>
                            r.id === request.id ? { ...r, ...request, updatedAt: Date.now() } : r
                        ),
                        currentRanking:
                            state.currentRanking?.id === request.id
                                ? { ...state.currentRanking, ...request, updatedAt: Date.now() }
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

            // Reorder items in ranking
            reorderRanking: async (userId: string | null, request: ReorderRankingRequest) => {
                if (!ensureAuthUser(userId, 'reorder ranking')) {
                    set({ error: 'Authentication required' })
                    return
                }

                try {
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

                    await updateRankingInFirestore(userId, request.rankingId, {
                        id: request.rankingId,
                        rankedItems: request.rankedItems,
                    })
                } catch (error) {
                    console.error('Error reordering ranking:', error)
                    set({
                        error: error instanceof Error ? error.message : 'Failed to reorder ranking',
                    })
                }
            },

            // Delete ranking
            deleteRanking: async (userId: string | null, rankingId: string) => {
                if (!ensureAuthUser(userId, 'delete ranking')) {
                    set({ error: 'Authentication required' })
                    return
                }

                set({ isLoading: true, error: null })

                try {
                    await deleteRankingInFirestore(userId, rankingId)

                    // Update local state
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

            // Like ranking
            likeRanking: async (userId: string | null, rankingId: string) => {
                if (!ensureAuthUser(userId, 'like ranking')) {
                    set({ error: 'Authentication required to like rankings' })
                    return
                }

                try {
                    // Optimistic update
                    set((state) => ({
                        currentRanking: state.currentRanking
                            ? {
                                  ...state.currentRanking,
                                  likes: state.currentRanking.likes + 1,
                              }
                            : null,
                    }))

                    await likeRankingInFirestore(userId, rankingId)
                } catch (error) {
                    console.error('Error liking ranking:', error)
                    set({
                        error: error instanceof Error ? error.message : 'Failed to like ranking',
                    })
                }
            },

            // Unlike ranking
            unlikeRanking: async (userId: string | null, rankingId: string) => {
                if (!ensureAuthUser(userId, 'unlike ranking')) {
                    set({ error: 'Authentication required' })
                    return
                }

                try {
                    // Optimistic update
                    set((state) => ({
                        currentRanking: state.currentRanking
                            ? {
                                  ...state.currentRanking,
                                  likes: Math.max(0, state.currentRanking.likes - 1),
                              }
                            : null,
                    }))

                    await unlikeRankingInFirestore(userId, rankingId)
                } catch (error) {
                    console.error('Error unliking ranking:', error)
                    set({
                        error: error instanceof Error ? error.message : 'Failed to unlike ranking',
                    })
                }
            },

            // Increment view count
            incrementView: async (rankingId: string, userId?: string | null) => {
                try {
                    await incrementRankingView(rankingId, userId || undefined)

                    // Update local state
                    set((state) => ({
                        currentRanking: state.currentRanking
                            ? {
                                  ...state.currentRanking,
                                  views: state.currentRanking.views + 1,
                              }
                            : null,
                    }))
                } catch (error) {
                    console.error('Error incrementing view:', error)
                }
            },

            // Load comments
            loadComments: async (rankingId: string, limit = 20) => {
                set({ isLoading: true, error: null })

                try {
                    const comments = await getRankingComments(rankingId, limit)
                    set({ comments, isLoading: false })
                } catch (error) {
                    console.error('Error loading comments:', error)
                    set({
                        error: error instanceof Error ? error.message : 'Failed to load comments',
                        isLoading: false,
                    })
                }
            },

            // Create comment
            createComment: async (
                userId: string | null,
                username: string,
                userAvatar: string | undefined,
                request: CreateCommentRequest
            ) => {
                if (!ensureAuthUser(userId, 'comment on ranking')) {
                    set({ error: 'Authentication required to comment' })
                    return
                }

                try {
                    await createCommentInFirestore(userId, username, userAvatar, request)

                    // Update local state
                    set((state) => ({
                        currentRanking: state.currentRanking
                            ? {
                                  ...state.currentRanking,
                                  comments: state.currentRanking.comments + 1,
                              }
                            : null,
                    }))

                    // Reload comments
                    await get().loadComments(request.rankingId)
                } catch (error) {
                    console.error('Error creating comment:', error)
                    set({
                        error: error instanceof Error ? error.message : 'Failed to create comment',
                    })
                }
            },

            // Delete comment
            deleteComment: async (
                userId: string | null,
                commentId: string,
                rankingOwnerId: string
            ) => {
                if (!ensureAuthUser(userId, 'delete comment')) {
                    set({ error: 'Authentication required' })
                    return
                }

                try {
                    // Check permission: comment owner or ranking owner
                    const comment = get().comments.find((c) => c.id === commentId)
                    if (!comment) {
                        set({ error: 'Comment not found' })
                        return
                    }

                    if (comment.userId !== userId && rankingOwnerId !== userId) {
                        set({ error: 'Not authorized to delete this comment' })
                        return
                    }

                    await deleteCommentInFirestore(userId, commentId, rankingOwnerId)

                    // Update local state
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

            // Like comment
            likeComment: async (userId: string | null, commentId: string) => {
                if (!ensureAuthUser(userId, 'like comment')) {
                    set({ error: 'Authentication required to like comments' })
                    return
                }

                try {
                    await likeCommentInFirestore(userId, commentId)

                    // Update local state
                    set((state) => ({
                        comments: state.comments.map((c) =>
                            c.id === commentId ? { ...c, likes: c.likes + 1 } : c
                        ),
                    }))
                } catch (error) {
                    console.error('Error liking comment:', error)
                }
            },

            // Unlike comment
            unlikeComment: async (userId: string | null, commentId: string) => {
                if (!ensureAuthUser(userId, 'unlike comment')) {
                    set({ error: 'Authentication required' })
                    return
                }

                try {
                    await unlikeCommentInFirestore(userId, commentId)

                    // Update local state
                    set((state) => ({
                        comments: state.comments.map((c) =>
                            c.id === commentId ? { ...c, likes: Math.max(0, c.likes - 1) } : c
                        ),
                    }))
                } catch (error) {
                    console.error('Error unliking comment:', error)
                }
            },

            // Set sort order
            setSortBy: (sortBy) => {
                set({ sortBy })
                // Reload community rankings with new sort
                get().loadCommunityRankings()
            },

            // Set media type filter
            setFilterByMediaType: (filter) => {
                set({ filterByMediaType: filter })
            },

            // Clear current ranking
            clearCurrentRanking: () => {
                set({ currentRanking: null, comments: [] })
            },

            // Clear error
            clearError: () => {
                set({ error: null })
            },

            // Set error
            setError: (error) => {
                set({ error })
            },
        }),
        { name: 'RankingStore' }
    )
)
