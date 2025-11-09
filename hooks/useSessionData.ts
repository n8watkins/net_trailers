import { useSessionStore } from '../stores/sessionStore'
import { useGuestStore } from '../stores/guestStore'
import { useAuthStore } from '../stores/authStore'

/**
 * Hook for accessing current session data (guest or authenticated)
 *
 * Provides a unified interface for accessing user data regardless of session type.
 * Automatically routes to the appropriate store (guestStore or authStore) based on
 * the current session type from sessionStore.
 *
 * @returns Object containing session data, preferences, and data management actions
 *
 * @example
 * ```tsx
 * const {
 *   sessionType,
 *   defaultWatchlist,
 *   likedMovies,
 *   addToWatchlist,
 *   removeFromWatchlist,
 *   isInWatchlist
 * } = useSessionData()
 *
 * // Check if content is in watchlist
 * const inWatchlist = isInWatchlist(movieId)
 *
 * // Add content to watchlist
 * addToWatchlist(movie)
 *
 * // Remove from watchlist
 * removeFromWatchlist(movieId)
 * ```
 */
export const useSessionData = () => {
    // Use granular selectors for session store
    const sessionType = useSessionStore((state) => state.sessionType)
    const activeSessionId = useSessionStore((state) => state.activeSessionId)
    const isInitialized = useSessionStore((state) => state.isInitialized)
    const isTransitioning = useSessionStore((state) => state.isTransitioning)

    // Select data from guest store with granular selectors
    const guestWatchlist = useGuestStore((state) => state.defaultWatchlist)
    const guestLikedMovies = useGuestStore((state) => state.likedMovies)
    const guestHiddenMovies = useGuestStore((state) => state.hiddenMovies)
    const guestUserCreatedWatchlists = useGuestStore((state) => state.userCreatedWatchlists)
    const guestLastActive = useGuestStore((state) => state.lastActive)
    const guestAutoMute = useGuestStore((state) => state.autoMute)
    const guestDefaultVolume = useGuestStore((state) => state.defaultVolume)
    const guestChildSafetyMode = useGuestStore((state) => state.childSafetyMode)
    const guestImproveRecommendations = useGuestStore((state) => state.improveRecommendations)

    // Select actions from guest store
    const guestAddToWatchlist = useGuestStore((state) => state.addToWatchlist)
    const guestRemoveFromWatchlist = useGuestStore((state) => state.removeFromWatchlist)
    const guestAddLikedMovie = useGuestStore((state) => state.addLikedMovie)
    const guestRemoveLikedMovie = useGuestStore((state) => state.removeLikedMovie)
    const guestAddHiddenMovie = useGuestStore((state) => state.addHiddenMovie)
    const guestRemoveHiddenMovie = useGuestStore((state) => state.removeHiddenMovie)
    const guestCreateList = useGuestStore((state) => state.createList)
    const guestUpdateList = useGuestStore((state) => state.updateList)
    const guestDeleteList = useGuestStore((state) => state.deleteList)
    const guestAddToList = useGuestStore((state) => state.addToList)
    const guestRemoveFromList = useGuestStore((state) => state.removeFromList)
    const guestClearAllData = useGuestStore((state) => state.clearAllData)

    // Select data from auth store with granular selectors
    const authWatchlist = useAuthStore((state) => state.defaultWatchlist)
    const authLikedMovies = useAuthStore((state) => state.likedMovies)
    const authHiddenMovies = useAuthStore((state) => state.hiddenMovies)
    const authUserCreatedWatchlists = useAuthStore((state) => state.userCreatedWatchlists)
    const authLastActive = useAuthStore((state) => state.lastActive)
    const authAutoMute = useAuthStore((state) => state.autoMute)
    const authDefaultVolume = useAuthStore((state) => state.defaultVolume)
    const authChildSafetyMode = useAuthStore((state) => state.childSafetyMode)
    const authImproveRecommendations = useAuthStore((state) => state.improveRecommendations)

    // Select actions from auth store
    const authAddToWatchlist = useAuthStore((state) => state.addToWatchlist)
    const authRemoveFromWatchlist = useAuthStore((state) => state.removeFromWatchlist)
    const authAddLikedMovie = useAuthStore((state) => state.addLikedMovie)
    const authRemoveLikedMovie = useAuthStore((state) => state.removeLikedMovie)
    const authAddHiddenMovie = useAuthStore((state) => state.addHiddenMovie)
    const authRemoveHiddenMovie = useAuthStore((state) => state.removeHiddenMovie)
    const authCreateList = useAuthStore((state) => state.createList)
    const authUpdateList = useAuthStore((state) => state.updateList)
    const authDeleteList = useAuthStore((state) => state.deleteList)
    const authAddToList = useAuthStore((state) => state.addToList)
    const authRemoveFromList = useAuthStore((state) => state.removeFromList)
    const authClearLocalCache = useAuthStore((state) => state.clearLocalCache)

    // Session initialization is now handled by SessionSyncManager component
    // Auth state changes are now handled by SessionSyncManager component
    // Data loading is now handled by SessionSyncManager component

    // AUTO-SAVE DISABLED - Saving happens directly in store actions to prevent infinite loops
    // The previous auto-save was causing excessive Firestore writes (20k+ per day)
    // because it triggered on every data change, including lastActive updates

    // Select appropriate data and actions based on session type
    const isAuth = sessionType === 'authenticated'

    const defaultWatchlist = isAuth ? authWatchlist : guestWatchlist
    const likedMovies = isAuth ? authLikedMovies : guestLikedMovies
    const hiddenMovies = isAuth ? authHiddenMovies : guestHiddenMovies
    const userCreatedWatchlists = isAuth ? authUserCreatedWatchlists : guestUserCreatedWatchlists
    const lastActive = isAuth ? authLastActive : guestLastActive
    const autoMute = (isAuth ? authAutoMute : guestAutoMute) ?? true
    const defaultVolume = (isAuth ? authDefaultVolume : guestDefaultVolume) ?? 50
    const childSafetyMode = (isAuth ? authChildSafetyMode : guestChildSafetyMode) ?? false
    const improveRecommendations =
        (isAuth ? authImproveRecommendations : guestImproveRecommendations) ?? true

    const addToWatchlist = isAuth ? authAddToWatchlist : guestAddToWatchlist
    const removeFromWatchlist = isAuth ? authRemoveFromWatchlist : guestRemoveFromWatchlist
    const addLikedMovie = isAuth ? authAddLikedMovie : guestAddLikedMovie
    const removeLikedMovie = isAuth ? authRemoveLikedMovie : guestRemoveLikedMovie
    const addHiddenMovie = isAuth ? authAddHiddenMovie : guestAddHiddenMovie
    const removeHiddenMovie = isAuth ? authRemoveHiddenMovie : guestRemoveHiddenMovie
    const createList = isAuth ? authCreateList : guestCreateList
    const updateList = isAuth ? authUpdateList : guestUpdateList
    const deleteList = isAuth ? authDeleteList : guestDeleteList
    const addToList = isAuth ? authAddToList : guestAddToList
    const removeFromList = isAuth ? authRemoveFromList : guestRemoveFromList

    return {
        // Session info
        sessionType,
        activeSessionId,
        isInitialized,
        isTransitioning,

        // Current store data (NEW SCHEMA)
        defaultWatchlist,
        likedMovies,
        hiddenMovies,
        userCreatedWatchlists,
        lastActive,

        // Preferences
        autoMute,
        defaultVolume,
        childSafetyMode,
        improveRecommendations,

        // Actions (unified interface - NEW SCHEMA)
        addToWatchlist,
        removeFromWatchlist,
        addLikedMovie,
        removeLikedMovie,
        addHiddenMovie,
        removeHiddenMovie,
        createList,
        updateList,
        deleteList,
        addToList,
        removeFromList,

        // Store-specific actions
        clearAllData: guestClearAllData,
        clearLocalCache: authClearLocalCache,

        // Utilities (NEW SCHEMA)
        isInWatchlist: (contentId: number) =>
            defaultWatchlist.some((item) => item.id === contentId),
        isLiked: (contentId: number) => likedMovies.some((item) => item.id === contentId),
        isHidden: (contentId: number) => hiddenMovies.some((item) => item.id === contentId),
    }
}
