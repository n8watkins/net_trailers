import { useSessionStore } from '../stores/sessionStore'
import { useGuestStore } from '../stores/guestStore'
import { useAuthStore } from '../stores/authStore'

export const useSessionData = () => {
    const { sessionType, activeSessionId, isInitialized, isTransitioning } = useSessionStore()

    const guestStore = useGuestStore()
    const authStoreData = useAuthStore()

    // Session initialization is now handled by SessionSyncManager component

    // Auth state changes are now handled by SessionSyncManager component

    // Data loading is now handled by SessionSyncManager component

    // AUTO-SAVE DISABLED - Saving happens directly in store actions to prevent infinite loops
    // The previous auto-save was causing excessive Firestore writes (20k+ per day)
    // because it triggered on every data change, including lastActive updates

    // Return the appropriate store data based on session type
    const currentStore = sessionType === 'authenticated' ? authStoreData : guestStore

    return {
        // Session info
        sessionType,
        activeSessionId,
        isInitialized,
        isTransitioning,

        // Current store data (NEW SCHEMA)
        defaultWatchlist: currentStore.defaultWatchlist,
        likedMovies: currentStore.likedMovies,
        hiddenMovies: currentStore.hiddenMovies,
        userCreatedWatchlists: currentStore.userCreatedWatchlists,
        lastActive: currentStore.lastActive,

        // Actions (unified interface - NEW SCHEMA)
        addToWatchlist: currentStore.addToWatchlist,
        removeFromWatchlist: currentStore.removeFromWatchlist,
        addLikedMovie: currentStore.addLikedMovie,
        removeLikedMovie: currentStore.removeLikedMovie,
        addHiddenMovie: currentStore.addHiddenMovie,
        removeHiddenMovie: currentStore.removeHiddenMovie,
        createList: currentStore.createList,
        updateList: currentStore.updateList,
        deleteList: currentStore.deleteList,
        addToList: currentStore.addToList,
        removeFromList: currentStore.removeFromList,

        // Store-specific actions
        guestActions: guestStore,
        authActions: authStoreData,
        clearAllData: guestStore.clearAllData,
        clearLocalCache: authStoreData.clearLocalCache,

        // Utilities (NEW SCHEMA)
        isInWatchlist: (contentId: number) =>
            currentStore.defaultWatchlist.some((item) => item.id === contentId),
        isLiked: (contentId: number) =>
            currentStore.likedMovies.some((item) => item.id === contentId),
        isHidden: (contentId: number) =>
            currentStore.hiddenMovies.some((item) => item.id === contentId),
    }
}
