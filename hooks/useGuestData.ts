import { useGuestStore } from '../stores/guestStore'
import { UserList } from '../types/userLists'

export function useGuestData() {
    const guestStore = useGuestStore()

    // Helper functions that wrap store data
    const isLiked = (contentId: number) => {
        return guestStore.likedMovies.some((m) => m.id === contentId)
    }

    const isHidden = (contentId: number) => {
        return guestStore.hiddenMovies.some((m) => m.id === contentId)
    }

    const isInWatchlist = (contentId: number) => {
        return guestStore.defaultWatchlist.some((item) => item.id === contentId)
    }

    const getList = (listId: string): UserList | null => {
        return guestStore.userCreatedWatchlists.find((list) => list.id === listId) || null
    }

    const isContentInList = (listId: string, contentId: number): boolean => {
        const list = getList(listId)
        return list ? list.items.some((item) => item.id === contentId) : false
    }

    const getListsContaining = (contentId: number): UserList[] => {
        return guestStore.userCreatedWatchlists.filter((list) =>
            list.items.some((item) => item.id === contentId)
        )
    }

    const getAllLists = (): UserList[] => {
        return guestStore.userCreatedWatchlists
    }

    // Account management functions
    const clearAccountData = () => {
        guestStore.updatePreferences({
            likedMovies: [],
            hiddenMovies: [],
            defaultWatchlist: [],
            userCreatedWatchlists: [],
        })
    }

    const getAccountDataSummary = () => {
        return {
            watchlistCount: guestStore.defaultWatchlist.length,
            ratingsCount: guestStore.likedMovies.length + guestStore.hiddenMovies.length,
            listsCount: guestStore.userCreatedWatchlists.length,
            totalItems:
                guestStore.defaultWatchlist.length +
                guestStore.likedMovies.length +
                guestStore.hiddenMovies.length +
                guestStore.userCreatedWatchlists.reduce((sum, list) => sum + list.items.length, 0),
            isEmpty:
                guestStore.defaultWatchlist.length === 0 &&
                guestStore.likedMovies.length === 0 &&
                guestStore.hiddenMovies.length === 0 &&
                guestStore.userCreatedWatchlists.length === 0,
        }
    }

    const exportAccountData = () => {
        return {
            guestId: guestStore.guestId,
            defaultWatchlist: guestStore.defaultWatchlist,
            likedMovies: guestStore.likedMovies,
            hiddenMovies: guestStore.hiddenMovies,
            userCreatedWatchlists: guestStore.userCreatedWatchlists,
            autoMute: guestStore.autoMute,
            defaultVolume: guestStore.defaultVolume,
            childSafetyMode: guestStore.childSafetyMode,
            lastActive: guestStore.lastActive,
        }
    }

    return {
        // Session info
        guestSession: {
            guestId: guestStore.guestId,
            preferences: {
                defaultWatchlist: guestStore.defaultWatchlist,
                likedMovies: guestStore.likedMovies,
                hiddenMovies: guestStore.hiddenMovies,
                userCreatedWatchlists: guestStore.userCreatedWatchlists,
                lastActive: guestStore.lastActive,
                autoMute: guestStore.autoMute ?? true,
                defaultVolume: guestStore.defaultVolume ?? 50,
                childSafetyMode: guestStore.childSafetyMode ?? false,
            },
        },
        isGuest: true,
        isAuthenticated: false,
        sessionId: guestStore.guestId,

        // Data (NEW SCHEMA)
        defaultWatchlist: guestStore.defaultWatchlist,
        likedMovies: guestStore.likedMovies,
        hiddenMovies: guestStore.hiddenMovies,
        userCreatedWatchlists: guestStore.userCreatedWatchlists,

        // Liked/Hidden actions (replaces rating actions)
        addLikedMovie: guestStore.addLikedMovie,
        removeLikedMovie: guestStore.removeLikedMovie,
        addHiddenMovie: guestStore.addHiddenMovie,
        removeHiddenMovie: guestStore.removeHiddenMovie,
        isLiked,
        isHidden,

        // Watchlist actions
        addToWatchlist: guestStore.addToWatchlist,
        removeFromWatchlist: guestStore.removeFromWatchlist,
        isInWatchlist,

        // List management actions
        createList: guestStore.createList,
        updateList: guestStore.updateList,
        deleteList: guestStore.deleteList,
        addToList: guestStore.addToList,
        removeFromList: guestStore.removeFromList,
        getList,
        isContentInList,
        getListsContaining,
        getAllLists,

        // Account management actions (guest-specific)
        clearAccountData,
        getAccountDataSummary,
        exportAccountData,
    }
}
