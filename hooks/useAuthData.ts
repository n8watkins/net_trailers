import React from 'react'
import { useAuthStore } from '../stores/authStore'
import { UserList } from '../types/userLists'
import { authWarn } from '../utils/debugLogger'

export function useAuthData(userId: string) {
    const authStore = useAuthStore()

    // Ensure session is for the correct user
    React.useEffect(() => {
        if (authStore.userId && authStore.userId !== userId) {
            authWarn(`⚠️ Auth store user mismatch! Store: ${authStore.userId}, Expected: ${userId}`)
            // Sync with the correct user
            authStore.syncWithFirebase!(userId)
        }
    }, [userId, authStore.userId])

    // Helper functions that wrap store actions
    const isLiked = (contentId: number) => {
        return authStore.likedMovies.some((m) => m.id === contentId)
    }

    const isHidden = (contentId: number) => {
        return authStore.hiddenMovies.some((m) => m.id === contentId)
    }

    const isInWatchlist = (contentId: number) => {
        return authStore.defaultWatchlist.some((item) => item.id === contentId)
    }

    const getList = (listId: string): UserList | null => {
        return authStore.userCreatedWatchlists.find((list) => list.id === listId) || null
    }

    const isContentInList = (listId: string, contentId: number): boolean => {
        const list = getList(listId)
        return list ? list.items.some((item) => item.id === contentId) : false
    }

    const getListsContaining = (contentId: number): UserList[] => {
        return authStore.userCreatedWatchlists.filter((list) =>
            list.items.some((item) => item.id === contentId)
        )
    }

    const getAllLists = (): UserList[] => {
        return authStore.userCreatedWatchlists
    }

    // Wrapper for account management functions
    const clearAccountData = async () => {
        console.log('[useAuthData] 🗑️ Starting clearAccountData for user:', userId)

        // Clear all data in the store
        await authStore.updatePreferences({
            likedMovies: [],
            hiddenMovies: [],
            defaultWatchlist: [],
            userCreatedWatchlists: [],
        })
        console.log('[useAuthData] ✅ Cleared collections and ratings')

        // Clear watch history from store and Firestore
        const { useWatchHistoryStore } = await import('../stores/watchHistoryStore')
        const { saveWatchHistory } = await import('../utils/firestore/watchHistory')

        console.log('[useAuthData] 🗑️ Clearing watch history...')

        // First, clear watch history in Firestore
        if (userId) {
            await saveWatchHistory(userId, [])
            console.log('[useAuthData] ✅ Cleared watch history from Firestore')

            // Verify it was cleared (debug)
            const { getWatchHistory } = await import('../utils/firestore/watchHistory')
            const verifyEmpty = await getWatchHistory(userId)
            console.log(
                '[useAuthData] 🔍 Verification: Firestore has',
                verifyEmpty?.length || 0,
                'entries'
            )
        }

        // Then clear watch history in store while maintaining session
        const watchStore = useWatchHistoryStore.getState()
        const historyCountBefore = watchStore.history.length
        watchStore.clearHistory()
        console.log(`[useAuthData] Cleared ${historyCountBefore} watch history entries from store`)

        // Restore session ID after clearing (clearHistory sets it to null)
        // Set lastSyncedAt to now so it doesn't try to reload from Firestore
        useWatchHistoryStore.setState({
            currentSessionId: userId,
            lastSyncedAt: Date.now(),
            syncError: null,
        })

        // Clear notifications from store and Firestore
        const { useNotificationStore } = await import('../stores/notificationStore')
        if (userId) {
            console.log('[useAuthData] 🗑️ Clearing notifications...')
            const notifCountBefore = useNotificationStore.getState().notifications.length
            await useNotificationStore.getState().deleteAllNotifications(userId)
            console.log(`[useAuthData] ✅ Cleared ${notifCountBefore} notifications from Firestore`)
        }

        // Clear rankings from store and Firestore
        const { useRankingStore } = await import('../stores/rankingStore')
        if (userId) {
            console.log('[useAuthData] 🗑️ Clearing rankings...')
            const rankings = useRankingStore.getState().rankings
            const userRankings = rankings.filter((r) => r.userId === userId)
            for (const ranking of userRankings) {
                await useRankingStore.getState().deleteRanking(userId, ranking.id)
            }
            console.log(`[useAuthData] ✅ Cleared ${userRankings.length} rankings from Firestore`)
        }

        // Clear forum threads and polls
        const { useForumStore } = await import('../stores/forumStore')
        if (userId) {
            console.log('[useAuthData] 🗑️ Clearing forum content...')
            const { threads, polls } = useForumStore.getState()
            const userThreads = threads.filter((t) => t.userId === userId)
            const userPolls = polls.filter((p) => p.userId === userId)

            for (const thread of userThreads) {
                await useForumStore.getState().deleteThread(userId, thread.id)
            }
            for (const poll of userPolls) {
                await useForumStore.getState().deletePoll(userId, poll.id)
            }
            console.log(
                `[useAuthData] ✅ Cleared ${userThreads.length} threads and ${userPolls.length} polls from Firestore`
            )
        }

        console.log('[useAuthData] ✅ clearAccountData completed')
    }

    const getAccountDataSummary = async () => {
        const { useWatchHistoryStore } = await import('../stores/watchHistoryStore')
        const watchHistoryCount = useWatchHistoryStore.getState().history.length

        return {
            watchlistCount: authStore.defaultWatchlist.length,
            likedCount: authStore.likedMovies.length,
            hiddenCount: authStore.hiddenMovies.length,
            ratingsCount: authStore.likedMovies.length + authStore.hiddenMovies.length,
            listsCount: authStore.userCreatedWatchlists.length,
            watchHistoryCount,
            totalItems:
                authStore.defaultWatchlist.length +
                authStore.likedMovies.length +
                authStore.hiddenMovies.length +
                watchHistoryCount +
                authStore.userCreatedWatchlists.reduce((sum, list) => sum + list.items.length, 0),
            isEmpty:
                authStore.defaultWatchlist.length === 0 &&
                authStore.likedMovies.length === 0 &&
                authStore.hiddenMovies.length === 0 &&
                watchHistoryCount === 0 &&
                authStore.userCreatedWatchlists.length === 0,
        }
    }

    const exportAccountData = async () => {
        if (!authStore.userId) {
            throw new Error('No authenticated user to export data for')
        }
        return {
            userId: authStore.userId,
            defaultWatchlist: authStore.defaultWatchlist,
            likedMovies: authStore.likedMovies,
            hiddenMovies: authStore.hiddenMovies,
            userCreatedWatchlists: authStore.userCreatedWatchlists,
            autoMute: authStore.autoMute,
            defaultVolume: authStore.defaultVolume,
            childSafetyMode: authStore.childSafetyMode,
            lastActive: authStore.lastActive,
        }
    }

    // Note: Delete/restore account operations would need to be handled by AuthStorageService
    // These are kept as stubs that would interact with the service layer
    const deleteAccount = async () => {
        if (!authStore.userId) {
            throw new Error('No authenticated user to delete account for')
        }
        const { AuthStorageService } = await import('../services/authStorageService')
        await AuthStorageService.deleteUserAccount(authStore.userId)
    }

    const softDeleteAccount = async () => {
        if (!authStore.userId) {
            throw new Error('No authenticated user to soft delete account for')
        }
        const { AuthStorageService } = await import('../services/authStorageService')
        await AuthStorageService.softDeleteUserData(authStore.userId)
    }

    const restoreAccount = async (): Promise<boolean> => {
        if (!authStore.userId) {
            return false
        }
        const { AuthStorageService } = await import('../services/authStorageService')
        const restored = await AuthStorageService.restoreUserData(authStore.userId)
        if (restored) {
            await authStore.syncWithFirebase!(authStore.userId)
        }
        return restored
    }

    return {
        // Session info
        authSession: {
            userId: authStore.userId,
            preferences: {
                defaultWatchlist: authStore.defaultWatchlist,
                likedMovies: authStore.likedMovies,
                hiddenMovies: authStore.hiddenMovies,
                userCreatedWatchlists: authStore.userCreatedWatchlists,
                lastActive: authStore.lastActive,
                autoMute: authStore.autoMute ?? false,
                defaultVolume: authStore.defaultVolume ?? 50,
                childSafetyMode: authStore.childSafetyMode ?? false,
            },
            lastSyncedAt: authStore.lastActive,
        },
        isGuest: false,
        isAuthenticated: true,
        sessionId: authStore.userId,

        // Data (NEW SCHEMA)
        defaultWatchlist: authStore.defaultWatchlist,
        likedMovies: authStore.likedMovies,
        hiddenMovies: authStore.hiddenMovies,
        userCreatedWatchlists: authStore.userCreatedWatchlists,

        // Liked/Hidden actions (replaces rating actions)
        addLikedMovie: authStore.addLikedMovie,
        removeLikedMovie: authStore.removeLikedMovie,
        addHiddenMovie: authStore.addHiddenMovie,
        removeHiddenMovie: authStore.removeHiddenMovie,
        isLiked,
        isHidden,

        // Watchlist actions
        addToWatchlist: authStore.addToWatchlist,
        removeFromWatchlist: authStore.removeFromWatchlist,
        isInWatchlist,

        // List management actions
        createList: authStore.createList,
        updateList: authStore.updateList,
        deleteList: authStore.deleteList,
        addToList: authStore.addToList,
        removeFromList: authStore.removeFromList,
        getList,
        isContentInList,
        getListsContaining,
        getAllLists,

        // Auth-specific actions
        forceSyncData: () => authStore.syncWithFirebase!(userId),

        // Account management actions (auth-specific)
        clearAccountData,
        getAccountDataSummary,
        exportAccountData,
        deleteAccount,
        softDeleteAccount,
        restoreAccount,
    }
}
