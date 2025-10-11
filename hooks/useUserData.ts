import { useSessionData } from './useSessionData'
import { UserListsService } from '../services/userListsService'

/**
 * Main hook for user data management with complete session isolation
 *
 * Routes to appropriate session (guest or authenticated) based on current session type.
 * No automatic data migration - sessions are completely isolated.
 */
export default function useUserData() {
    const sessionData = useSessionData()

    // Return unified interface that works with both guest and authenticated sessions
    if (sessionData.sessionType === 'guest') {
        const result = {
            // Session info
            sessionType: sessionData.sessionType,
            activeSessionId: sessionData.activeSessionId,

            // Session state flags
            isGuest: true,
            isAuthenticated: false,
            isInitializing: false,

            // Data from Zustand store (NEW SCHEMA)
            defaultWatchlist: sessionData.defaultWatchlist,
            likedMovies: sessionData.likedMovies,
            hiddenMovies: sessionData.hiddenMovies,
            userCreatedWatchlists: sessionData.userCreatedWatchlists,

            // Actions from Zustand store (NEW SCHEMA)
            addLikedMovie: sessionData.addLikedMovie,
            removeLikedMovie: sessionData.removeLikedMovie,
            addHiddenMovie: sessionData.addHiddenMovie,
            removeHiddenMovie: sessionData.removeHiddenMovie,
            addToWatchlist: sessionData.addToWatchlist,
            removeFromWatchlist: sessionData.removeFromWatchlist,
            isLiked: sessionData.isLiked,
            isHidden: sessionData.isHidden,
            isInWatchlist: sessionData.isInWatchlist,

            // List management (NEW SCHEMA)
            createList: (request: any) => sessionData.createList(request.name),
            updateList: (
                listId: string,
                updates: { name?: string; emoji?: string; color?: string }
            ) => {
                sessionData.updateList(listId, updates)
            },
            deleteList: (listId: string) => {
                sessionData.deleteList(listId)
            },
            addToList: sessionData.addToList,
            removeFromList: sessionData.removeFromList,
            getList: (listId: string) =>
                sessionData.userCreatedWatchlists.find((l) => l.id === listId) || null,
            isContentInList: (listId: string, contentId: number) => {
                const list = sessionData.userCreatedWatchlists.find((l) => l.id === listId)
                return list ? list.items.some((item) => item.id === contentId) : false
            },
            getListsContaining: (contentId: number) =>
                sessionData.userCreatedWatchlists.filter((list) =>
                    list.items.some((item) => item.id === contentId)
                ),
            getAllLists: () => sessionData.userCreatedWatchlists,

            // Account management (guest has limited functionality)
            getAccountDataSummary: () => ({
                watchlistCount: sessionData.defaultWatchlist.length,
                likedCount: sessionData.likedMovies.length,
                hiddenCount: sessionData.hiddenMovies.length,
                listsCount: sessionData.userCreatedWatchlists.length,
                totalItems:
                    sessionData.defaultWatchlist.length +
                    sessionData.likedMovies.length +
                    sessionData.hiddenMovies.length,
                isEmpty:
                    sessionData.defaultWatchlist.length === 0 &&
                    sessionData.likedMovies.length === 0 &&
                    sessionData.hiddenMovies.length === 0,
            }),
            clearAccountData: () => {
                sessionData.clearAllData()
            },
            exportAccountData: () => ({
                defaultWatchlist: sessionData.defaultWatchlist,
                likedMovies: sessionData.likedMovies,
                hiddenMovies: sessionData.hiddenMovies,
                userCreatedWatchlists: sessionData.userCreatedWatchlists,
                exportDate: new Date(),
            }),

            // Legacy compatibility - user session structure
            userSession: {
                isGuest: true,
                guestId: sessionData.activeSessionId,
                userId: undefined,
                preferences: {
                    defaultWatchlist: sessionData.defaultWatchlist,
                    likedMovies: sessionData.likedMovies,
                    hiddenMovies: sessionData.hiddenMovies,
                    userCreatedWatchlists: sessionData.userCreatedWatchlists,
                    lastActive: sessionData.lastActive,
                },
            },
        }
        return result
    } else if (sessionData.sessionType === 'authenticated') {
        const result = {
            // Session info
            sessionType: sessionData.sessionType,
            activeSessionId: sessionData.activeSessionId,

            // Session state flags
            isGuest: false,
            isAuthenticated: true,
            isInitializing: false,

            // Data from Zustand store (NEW SCHEMA)
            defaultWatchlist: sessionData.defaultWatchlist,
            likedMovies: sessionData.likedMovies,
            hiddenMovies: sessionData.hiddenMovies,
            userCreatedWatchlists: sessionData.userCreatedWatchlists,

            // Actions from Zustand store (NEW SCHEMA)
            addLikedMovie: sessionData.addLikedMovie,
            removeLikedMovie: sessionData.removeLikedMovie,
            addHiddenMovie: sessionData.addHiddenMovie,
            removeHiddenMovie: sessionData.removeHiddenMovie,
            addToWatchlist: sessionData.addToWatchlist,
            removeFromWatchlist: sessionData.removeFromWatchlist,
            isLiked: sessionData.isLiked,
            isHidden: sessionData.isHidden,
            isInWatchlist: sessionData.isInWatchlist,

            // List management (NEW SCHEMA)
            createList: (request: any) => sessionData.createList(request.name),
            updateList: (
                listId: string,
                updates: { name?: string; emoji?: string; color?: string }
            ) => {
                sessionData.updateList(listId, updates)
            },
            deleteList: (listId: string) => {
                sessionData.deleteList(listId)
            },
            addToList: sessionData.addToList,
            removeFromList: sessionData.removeFromList,
            getList: (listId: string) =>
                sessionData.userCreatedWatchlists.find((l) => l.id === listId) || null,
            isContentInList: (listId: string, contentId: number) => {
                const list = sessionData.userCreatedWatchlists.find((l) => l.id === listId)
                return list ? list.items.some((item) => item.id === contentId) : false
            },
            getListsContaining: (contentId: number) =>
                sessionData.userCreatedWatchlists.filter((list) =>
                    list.items.some((item) => item.id === contentId)
                ),
            getAllLists: () => sessionData.userCreatedWatchlists,

            // Account management (authenticated has full functionality)
            getAccountDataSummary: async () => ({
                watchlistCount: sessionData.defaultWatchlist.length,
                likedCount: sessionData.likedMovies.length,
                hiddenCount: sessionData.hiddenMovies.length,
                listsCount: sessionData.userCreatedWatchlists.length,
                totalItems:
                    sessionData.defaultWatchlist.length +
                    sessionData.likedMovies.length +
                    sessionData.hiddenMovies.length,
                isEmpty:
                    sessionData.defaultWatchlist.length === 0 &&
                    sessionData.likedMovies.length === 0 &&
                    sessionData.hiddenMovies.length === 0,
                accountCreated: new Date(), // This would come from Firebase auth
            }),
            clearAccountData: async () => {
                sessionData.clearLocalCache()
            },
            exportAccountData: async () => ({
                defaultWatchlist: sessionData.defaultWatchlist,
                likedMovies: sessionData.likedMovies,
                hiddenMovies: sessionData.hiddenMovies,
                userCreatedWatchlists: sessionData.userCreatedWatchlists,
                exportDate: new Date(),
            }),
            deleteAccount: async () => {
                // This would need actual Firebase auth deletion
                console.warn('deleteAccount not fully implemented')
            },

            // Legacy compatibility - user session structure
            userSession: {
                isGuest: false,
                guestId: undefined,
                userId: sessionData.activeSessionId,
                preferences: {
                    defaultWatchlist: sessionData.defaultWatchlist,
                    likedMovies: sessionData.likedMovies,
                    hiddenMovies: sessionData.hiddenMovies,
                    userCreatedWatchlists: sessionData.userCreatedWatchlists,
                    lastActive: sessionData.lastActive,
                },
            },

            // Auth-specific actions
            authSession: {
                userId: sessionData.activeSessionId,
                preferences: {
                    defaultWatchlist: sessionData.defaultWatchlist,
                    likedMovies: sessionData.likedMovies,
                    hiddenMovies: sessionData.hiddenMovies,
                    userCreatedWatchlists: sessionData.userCreatedWatchlists,
                    lastActive: sessionData.lastActive,
                },
            },
        }
        return result
    } else {
        // Initializing state - return minimal interface
        return {
            // Session info
            sessionType: 'initializing' as const,
            activeSessionId: '',

            // Session state flags
            isGuest: false,
            isAuthenticated: false,
            isInitializing: true,

            // Empty data during initialization (NEW SCHEMA)
            defaultWatchlist: [],
            likedMovies: [],
            hiddenMovies: [],
            userCreatedWatchlists: [],

            // Placeholder functions (will throw errors if called during initialization)
            addLikedMovie: () => {
                throw new Error('Cannot modify data while session is initializing')
            },
            removeLikedMovie: () => {
                throw new Error('Cannot modify data while session is initializing')
            },
            addHiddenMovie: () => {
                throw new Error('Cannot modify data while session is initializing')
            },
            removeHiddenMovie: () => {
                throw new Error('Cannot modify data while session is initializing')
            },
            addToWatchlist: () => {
                throw new Error('Cannot modify data while session is initializing')
            },
            removeFromWatchlist: () => {
                throw new Error('Cannot modify data while session is initializing')
            },
            isLiked: () => false,
            isHidden: () => false,
            isInWatchlist: () => false,
            createList: () => {
                throw new Error('Cannot modify data while session is initializing')
            },
            updateList: () => {
                throw new Error('Cannot modify data while session is initializing')
            },
            deleteList: () => {
                throw new Error('Cannot modify data while session is initializing')
            },
            addToList: () => {
                throw new Error('Cannot modify data while session is initializing')
            },
            removeFromList: () => {
                throw new Error('Cannot modify data while session is initializing')
            },
            getList: () => null,
            isContentInList: () => false,
            getListsContaining: () => [],
            getAllLists: () => [],

            // Account management (disabled during initialization)
            getAccountDataSummary: () => {
                throw new Error('Cannot get data summary while session is initializing')
            },
            clearAccountData: () => {
                throw new Error('Cannot clear data while session is initializing')
            },
            exportAccountData: () => {
                throw new Error('Cannot export data while session is initializing')
            },

            // Legacy compatibility
            userSession: {
                isGuest: false,
                guestId: undefined,
                userId: undefined,
                preferences: {
                    defaultWatchlist: [],
                    likedMovies: [],
                    hiddenMovies: [],
                    userCreatedWatchlists: [],
                    lastActive: Date.now(),
                },
            },
        }
    }
}
