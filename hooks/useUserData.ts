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

            // Data from Zustand store
            watchlist: sessionData.watchlist,
            ratings: sessionData.ratings,
            userLists: sessionData.userLists,

            // Actions from Zustand store
            setRating: (contentId: number, rating: 'liked' | 'disliked', content?: any) => {
                sessionData.addRating(contentId, rating, content)
            },
            removeRating: sessionData.removeRating,
            addToWatchlist: sessionData.addToWatchlist,
            removeFromWatchlist: sessionData.removeFromWatchlist,
            getRating: sessionData.getRating,
            isInWatchlist: sessionData.isInWatchlist,

            // List management
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
                sessionData.userLists.lists.find((l) => l.id === listId) || null,
            isContentInList: (listId: string, contentId: number) => {
                const list = sessionData.userLists.lists.find((l) => l.id === listId)
                return list ? list.items.some((item) => item.id === contentId) : false
            },
            getListsContaining: (contentId: number) =>
                sessionData.userLists.lists.filter((list) =>
                    list.items.some((item) => item.id === contentId)
                ),
            getDefaultLists: () =>
                UserListsService.getDefaultLists({ userLists: sessionData.userLists } as any),
            getCustomLists: () =>
                UserListsService.getCustomLists({ userLists: sessionData.userLists } as any),

            // Account management (guest has limited functionality)
            getAccountDataSummary: () => ({
                watchlistCount: sessionData.watchlist.length,
                ratingsCount: sessionData.ratings.length,
                listsCount: sessionData.userLists.lists.length,
                totalItems: sessionData.watchlist.length + sessionData.ratings.length,
                isEmpty: sessionData.watchlist.length === 0 && sessionData.ratings.length === 0,
            }),
            clearAccountData: () => {
                sessionData.clearAllData()
            },
            exportAccountData: () => ({
                watchlist: sessionData.watchlist,
                ratings: sessionData.ratings,
                userLists: sessionData.userLists,
                exportDate: new Date(),
            }),

            // Legacy compatibility - user session structure
            userSession: {
                isGuest: true,
                guestId: sessionData.activeSessionId,
                userId: undefined,
                preferences: {
                    watchlist: sessionData.watchlist,
                    ratings: sessionData.ratings,
                    userLists: sessionData.userLists,
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

            // Data from Zustand store
            watchlist: sessionData.watchlist,
            ratings: sessionData.ratings,
            userLists: sessionData.userLists,

            // Actions from Zustand store
            setRating: (contentId: number, rating: 'liked' | 'disliked', content?: any) => {
                sessionData.addRating(contentId, rating, content)
            },
            removeRating: sessionData.removeRating,
            addToWatchlist: sessionData.addToWatchlist,
            removeFromWatchlist: sessionData.removeFromWatchlist,
            getRating: sessionData.getRating,
            isInWatchlist: sessionData.isInWatchlist,

            // List management
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
                sessionData.userLists.lists.find((l) => l.id === listId) || null,
            isContentInList: (listId: string, contentId: number) => {
                const list = sessionData.userLists.lists.find((l) => l.id === listId)
                return list ? list.items.some((item) => item.id === contentId) : false
            },
            getListsContaining: (contentId: number) =>
                sessionData.userLists.lists.filter((list) =>
                    list.items.some((item) => item.id === contentId)
                ),
            getDefaultLists: () =>
                UserListsService.getDefaultLists({ userLists: sessionData.userLists } as any),
            getCustomLists: () =>
                UserListsService.getCustomLists({ userLists: sessionData.userLists } as any),

            // Account management (authenticated has full functionality)
            getAccountDataSummary: async () => ({
                watchlistCount: sessionData.watchlist.length,
                ratingsCount: sessionData.ratings.length,
                listsCount: sessionData.userLists.lists.length,
                totalItems: sessionData.watchlist.length + sessionData.ratings.length,
                isEmpty: sessionData.watchlist.length === 0 && sessionData.ratings.length === 0,
                accountCreated: new Date(), // This would come from Firebase auth
            }),
            clearAccountData: async () => {
                sessionData.clearLocalCache()
            },
            exportAccountData: async () => ({
                watchlist: sessionData.watchlist,
                ratings: sessionData.ratings,
                userLists: sessionData.userLists,
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
                    watchlist: sessionData.watchlist,
                    ratings: sessionData.ratings,
                    userLists: sessionData.userLists,
                    lastActive: sessionData.lastActive,
                },
            },

            // Auth-specific actions
            authSession: {
                userId: sessionData.activeSessionId,
                preferences: {
                    watchlist: sessionData.watchlist,
                    ratings: sessionData.ratings,
                    userLists: sessionData.userLists,
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

            // Empty data during initialization
            watchlist: [],
            ratings: [],
            userLists: { lists: [], defaultListIds: { watchlist: '', liked: '', disliked: '' } },

            // Placeholder functions (will throw errors if called during initialization)
            setRating: () => {
                throw new Error('Cannot modify data while session is initializing')
            },
            removeRating: () => {
                throw new Error('Cannot modify data while session is initializing')
            },
            addToWatchlist: () => {
                throw new Error('Cannot modify data while session is initializing')
            },
            removeFromWatchlist: () => {
                throw new Error('Cannot modify data while session is initializing')
            },
            getRating: () => null,
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
            getDefaultLists: () => ({ watchlist: null, liked: null, disliked: null }),
            getCustomLists: () => [],

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
                    watchlist: [],
                    ratings: [],
                    userLists: {
                        lists: [],
                        defaultListIds: { watchlist: '', liked: '', disliked: '' },
                    },
                    lastActive: Date.now(),
                },
            },
        }
    }
}
