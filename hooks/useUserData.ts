import { useRecoilValue } from 'recoil'
import { sessionTypeState, activeSessionIdState } from '../atoms/sessionManagerAtom'
import { useSessionManager } from './useSessionManager'
import { useGuestData } from './useGuestData'
import { useAuthData } from './useAuthData'

/**
 * Main hook for user data management with complete session isolation
 *
 * Routes to appropriate session (guest or authenticated) based on current session type.
 * No automatic data migration - sessions are completely isolated.
 */
export default function useUserData() {
    const sessionType = useRecoilValue(sessionTypeState)
    const activeSessionId = useRecoilValue(activeSessionIdState)
    const sessionManager = useSessionManager()

    // Route to appropriate data hook based on session type
    const guestData = useGuestData()
    const authData = useAuthData(activeSessionId)

    // Return the appropriate session data
    if (sessionType === 'guest') {
        const result = {
            ...guestData,

            // Session manager functions
            sessionType,
            activeSessionId,
            sessionManager,
        }
        return result
    } else if (sessionType === 'authenticated') {
        const result = {
            ...authData,

            // Session manager functions
            sessionType,
            activeSessionId,
            sessionManager,

            // Session state flags
            isGuest: false,
            isAuthenticated: true,
            isInitializing: false,

            // Legacy compatibility - user session structure
            userSession: {
                isGuest: false,
                guestId: undefined,
                userId: authData.authSession.userId,
                preferences: authData.authSession.preferences,
            },
        }
        return result
    } else {
        // Initializing state - return minimal interface
        return {
            // Session info
            sessionType: 'initializing' as const,
            activeSessionId: '',
            sessionManager,

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
