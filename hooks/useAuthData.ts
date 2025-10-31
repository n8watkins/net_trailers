import React from 'react'
import { useAuthStore } from '../stores/authStore'
import { UserList } from '../types/userLists'

export function useAuthData(userId: string) {
    const authStore = useAuthStore()

    // Ensure session is for the correct user
    React.useEffect(() => {
        if (authStore.userId && authStore.userId !== userId) {
            console.warn(
                `⚠️ Auth store user mismatch! Store: ${authStore.userId}, Expected: ${userId}`
            )
            // Sync with the correct user
            authStore.syncWithFirebase(userId)
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
        // Clear all data in the store
        await authStore.updatePreferences({
            likedMovies: [],
            hiddenMovies: [],
            defaultWatchlist: [],
            userCreatedWatchlists: [],
        })
    }

    const getAccountDataSummary = async () => {
        return {
            watchlistCount: authStore.defaultWatchlist.length,
            ratingsCount: authStore.likedMovies.length + authStore.hiddenMovies.length,
            listsCount: authStore.userCreatedWatchlists.length,
            totalItems:
                authStore.defaultWatchlist.length +
                authStore.likedMovies.length +
                authStore.hiddenMovies.length +
                authStore.userCreatedWatchlists.reduce((sum, list) => sum + list.items.length, 0),
            isEmpty:
                authStore.defaultWatchlist.length === 0 &&
                authStore.likedMovies.length === 0 &&
                authStore.hiddenMovies.length === 0 &&
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
            await authStore.syncWithFirebase(authStore.userId)
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
        forceSyncData: () => authStore.syncWithFirebase(userId),

        // Account management actions (auth-specific)
        clearAccountData,
        getAccountDataSummary,
        exportAccountData,
        deleteAccount,
        softDeleteAccount,
        restoreAccount,
    }
}
