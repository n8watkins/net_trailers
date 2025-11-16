import { useSessionData } from './useSessionData'
import { authError } from '../utils/debugLogger'
import { Content } from '../typings'
import { UserList, CreateListRequest, UpdateListRequest } from '../types/userLists'
import { useInteractionTracking } from './useInteractionTracking'

/**
 * Creates a virtual default watchlist object
 * @param items - Content items for the watchlist
 * @returns Virtual UserList representing the default watchlist
 */
const createDefaultWatchlistVirtual = (items: Content[]): UserList => ({
    id: 'default-watchlist',
    name: 'Watch Later',
    items,
    emoji: '📺',
    color: '#E50914',
    isPublic: false,
    collectionType: 'manual',
    displayAsRow: true,
    order: 0,
    enabled: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
})

/**
 * Shared list management operations for both guest and authenticated sessions
 * @param sessionData - The session data from useSessionData hook
 * @returns Object containing common list management functions
 */
const createListManagementOps = (sessionData: ReturnType<typeof useSessionData>) => ({
    createList: (request: CreateListRequest) => sessionData.createList(request),
    updateList: (listId: string, updates: Omit<UpdateListRequest, 'id'>) => {
        return sessionData.updateList(listId, updates)
    },
    deleteList: (listId: string) => {
        return sessionData.deleteList(listId)
    },
    addToList: sessionData.addToList,
    removeFromList: sessionData.removeFromList,
    getList: (listId: string) =>
        sessionData.userCreatedWatchlists.find((l) => l.id === listId) || null,
    isContentInList: (listId: string, contentId: number) => {
        const list = sessionData.userCreatedWatchlists.find((l) => l.id === listId)
        return list ? list.items.some((item) => item.id === contentId) : false
    },
    getListsContaining: (contentId: number) => {
        const watchlistVirtual = createDefaultWatchlistVirtual(sessionData.defaultWatchlist)
        const allLists = [watchlistVirtual, ...sessionData.userCreatedWatchlists]
        return allLists.filter((list) => list.items.some((item) => item.id === contentId))
    },
    getAllLists: () => {
        const watchlistVirtual = createDefaultWatchlistVirtual(sessionData.defaultWatchlist)
        return [watchlistVirtual, ...sessionData.userCreatedWatchlists]
    },
})

/**
 * Main hook for user data management with complete session isolation
 *
 * Routes to appropriate session (guest or authenticated) based on current session type.
 * Provides a unified interface for managing user preferences, watchlists, and content interactions.
 * Sessions are completely isolated with no automatic data migration between guest and authenticated modes.
 *
 * @returns Object containing user data, preferences, and management actions
 *
 * @example
 * ```tsx
 * const {
 *   isGuest,
 *   isAuthenticated,
 *   defaultWatchlist,
 *   likedMovies,
 *   userCreatedWatchlists,
 *   addToWatchlist,
 *   createList,
 *   isInWatchlist,
 *   getAccountDataSummary
 * } = useUserData()
 *
 * // Add content to default watchlist
 * addToWatchlist(movie)
 *
 * // Create a custom list
 * createList({ name: 'My Favorites', emoji: '⭐', color: '#FFD700' })
 *
 * // Check if content is in watchlist
 * if (isInWatchlist(movieId)) {
 *   // Already in watchlist
 * }
 *
 * // Get account summary
 * const summary = await getAccountDataSummary()
 * console.log(`Total items: ${summary.totalItems}`)
 * ```
 */
export default function useUserData() {
    const sessionData = useSessionData()
    const trackInteraction = useInteractionTracking()

    // Create tracked wrapper functions for all interactive actions
    const addToWatchlistTracked = (content: Content) => {
        trackInteraction.addToWatchlist(content as Content)
        return sessionData.addToWatchlist(content)
    }

    const removeFromWatchlistTracked = (contentId: number) => {
        // Find content in watchlist to track
        const content = sessionData.defaultWatchlist.find((c) => c.id === contentId)
        if (content) {
            trackInteraction.removeFromWatchlist(content as Content)
        }
        return sessionData.removeFromWatchlist(contentId)
    }

    const addLikedMovieTracked = (content: Content) => {
        trackInteraction.like(content as Content)
        return sessionData.addLikedMovie(content)
    }

    const removeLikedMovieTracked = (contentId: number) => {
        // Find content in liked movies to track
        const content = sessionData.likedMovies.find((c) => c.id === contentId)
        if (content) {
            trackInteraction.unlike(content as Content)
        }
        return sessionData.removeLikedMovie(contentId)
    }

    const addHiddenMovieTracked = (content: Content) => {
        trackInteraction.hideContent(content as Content)
        return sessionData.addHiddenMovie(content)
    }

    const removeHiddenMovieTracked = (contentId: number) => {
        // Find content in hidden movies to track
        const content = sessionData.hiddenMovies.find((c) => c.id === contentId)
        if (content) {
            trackInteraction.unhideContent(content as Content)
        }
        return sessionData.removeHiddenMovie(contentId)
    }

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

            // Preferences
            autoMute: sessionData.autoMute,
            defaultVolume: sessionData.defaultVolume,
            childSafetyMode: sessionData.childSafetyMode,
            improveRecommendations: sessionData.improveRecommendations,
            showRecommendations: sessionData.showRecommendations,

            // Actions from Zustand store (NEW SCHEMA) - with tracking
            addLikedMovie: addLikedMovieTracked,
            removeLikedMovie: removeLikedMovieTracked,
            addHiddenMovie: addHiddenMovieTracked,
            removeHiddenMovie: removeHiddenMovieTracked,
            addToWatchlist: addToWatchlistTracked,
            removeFromWatchlist: removeFromWatchlistTracked,
            isLiked: sessionData.isLiked,
            isHidden: sessionData.isHidden,
            isInWatchlist: sessionData.isInWatchlist,

            // List management (NEW SCHEMA) - using shared helper
            ...createListManagementOps(sessionData),

            // Account management (guest has limited functionality)
            getAccountDataSummary: () => ({
                watchlistCount: sessionData.defaultWatchlist.length,
                likedCount: sessionData.likedMovies.length,
                hiddenCount: sessionData.hiddenMovies.length,
                listsCount: sessionData.userCreatedWatchlists.length,
                watchHistoryCount: 0,
                totalItems:
                    sessionData.defaultWatchlist.length +
                    sessionData.likedMovies.length +
                    sessionData.hiddenMovies.length,
                isEmpty:
                    sessionData.defaultWatchlist.length === 0 &&
                    sessionData.likedMovies.length === 0 &&
                    sessionData.hiddenMovies.length === 0,
            }),
            clearAccountData: async () => {
                const guestId = sessionData.activeSessionId
                console.log('[useUserData] 🗑️ Starting clearAccountData for guest:', guestId)

                // Clear guest data from store
                sessionData.clearAllData!()
                console.log('[useUserData] ✅ Cleared collections and ratings from store')

                // Clear watch history from store and localStorage
                const { useWatchHistoryStore } = await import('../stores/watchHistoryStore')

                // First, clear watch history in localStorage for guest
                if (guestId) {
                    useWatchHistoryStore.getState().clearGuestSession(guestId)
                    console.log('[useUserData] ✅ Cleared watch history from localStorage')
                }

                // Then clear watch history in store
                const watchStore = useWatchHistoryStore.getState()
                const historyCountBefore = watchStore.history.length
                watchStore.clearHistory()
                console.log(
                    `[useUserData] ✅ Cleared ${historyCountBefore} watch history entries from store`
                )

                // Restore session ID after clearing (clearHistory sets it to null)
                if (guestId) {
                    useWatchHistoryStore.setState({
                        currentSessionId: guestId,
                        lastSyncedAt: Date.now(),
                        syncError: null,
                    })
                }

                // Clear notifications (guest notifications are local only)
                const { useNotificationStore } = await import('../stores/notificationStore')
                const notifCountBefore = useNotificationStore.getState().notifications.length
                useNotificationStore.getState().clearNotifications()
                console.log(`[useUserData] ✅ Cleared ${notifCountBefore} notifications from store`)

                // Clear any seeded forum threads or polls for this guest session
                if (guestId) {
                    const { useForumStore } = await import('../stores/forumStore')
                    const forumState = useForumStore.getState()
                    const threadsCleared = forumState.threads.filter(
                        (thread) => thread.userId === guestId
                    ).length
                    const pollsCleared = forumState.polls.filter(
                        (poll) => poll.userId === guestId
                    ).length

                    useForumStore.setState((state) => ({
                        threads: state.threads.filter((thread) => thread.userId !== guestId),
                        polls: state.polls.filter((poll) => poll.userId !== guestId),
                    }))

                    console.log(
                        `[useUserData] ✅ Cleared ${threadsCleared} threads and ${pollsCleared} polls from store`
                    )
                }

                console.log('[useUserData] ✅ clearAccountData completed for guest')
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
                    autoMute: sessionData.autoMute ?? true,
                    defaultVolume: sessionData.defaultVolume ?? 50,
                    childSafetyMode: sessionData.childSafetyMode ?? false,
                    improveRecommendations: sessionData.improveRecommendations ?? true,
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

            // Preferences
            autoMute: sessionData.autoMute,
            defaultVolume: sessionData.defaultVolume,
            childSafetyMode: sessionData.childSafetyMode,
            improveRecommendations: sessionData.improveRecommendations,
            showRecommendations: sessionData.showRecommendations,

            // Actions from Zustand store (NEW SCHEMA) - with tracking
            addLikedMovie: addLikedMovieTracked,
            removeLikedMovie: removeLikedMovieTracked,
            addHiddenMovie: addHiddenMovieTracked,
            removeHiddenMovie: removeHiddenMovieTracked,
            addToWatchlist: addToWatchlistTracked,
            removeFromWatchlist: removeFromWatchlistTracked,
            isLiked: sessionData.isLiked,
            isHidden: sessionData.isHidden,
            isInWatchlist: sessionData.isInWatchlist,

            // List management (NEW SCHEMA) - using shared helper
            ...createListManagementOps(sessionData),

            // Account management (authenticated has full functionality)
            getAccountDataSummary: async () => ({
                watchlistCount: sessionData.defaultWatchlist.length,
                likedCount: sessionData.likedMovies.length,
                hiddenCount: sessionData.hiddenMovies.length,
                listsCount: sessionData.userCreatedWatchlists.length,
                watchHistoryCount: 0,
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
                const { auth, db } = await import('../firebase')
                const { doc, setDoc, collection, query, where, getDocs } = await import(
                    'firebase/firestore'
                )

                if (!auth.currentUser) {
                    throw new Error('No authenticated user found')
                }

                const userId = auth.currentUser.uid

                console.log('[useUserData] 🗑️ Starting clearAccountData for user:', userId)

                // Clear Firestore data first
                try {
                    const userDocRef = doc(db, 'users', userId)
                    // Use setDoc with merge to handle non-existent documents
                    // Only use NEW SCHEMA fields (no deprecated customRows/userLists/ratings)
                    await setDoc(
                        userDocRef,
                        {
                            defaultWatchlist: [],
                            likedMovies: [],
                            hiddenMovies: [],
                            userCreatedWatchlists: [],
                            lastActive: Date.now(),
                        },
                        { merge: true }
                    )
                    console.log('[useUserData] ✅ Cleared collections and ratings from Firestore')

                    // Also clear watch history document
                    const watchHistoryDocRef = doc(db, 'users', userId, 'data', 'watchHistory')
                    await setDoc(
                        watchHistoryDocRef,
                        {
                            history: [],
                            updatedAt: Date.now(),
                        },
                        { merge: true }
                    )
                    console.log('[useUserData] ✅ Cleared watch history from Firestore')
                } catch (firestoreError) {
                    authError('Error clearing Firestore data:', firestoreError)
                    throw new Error('Failed to clear data from server. Please try again.')
                }

                // Clear local watch history store
                const { useWatchHistoryStore } = await import('../stores/watchHistoryStore')
                const watchHistoryStore = useWatchHistoryStore.getState()
                const historyCountBefore = watchHistoryStore.history.length
                watchHistoryStore.clearHistory()
                console.log(
                    `[useUserData] ✅ Cleared ${historyCountBefore} watch history entries from store`
                )

                // Restore session ID after clearing (clearHistory sets it to null)
                // Set lastSyncedAt to now so it doesn't try to reload from Firestore
                useWatchHistoryStore.setState({
                    currentSessionId: userId,
                    lastSyncedAt: Date.now(),
                    syncError: null,
                })

                // Clear notifications from store and Firestore
                const { useNotificationStore } = await import('../stores/notificationStore')
                console.log('[useUserData] 🗑️ Clearing notifications...')
                const notifCountBefore = useNotificationStore.getState().notifications.length
                await useNotificationStore.getState().deleteAllNotifications(userId)
                console.log(
                    `[useUserData] ✅ Cleared ${notifCountBefore} notifications from Firestore`
                )

                // Clear rankings from store and Firestore
                const { useRankingStore } = await import('../stores/rankingStore')
                console.log('[useUserData] 🗑️ Clearing user rankings...')

                // First load user rankings to ensure we have them
                await useRankingStore.getState().loadUserRankings(userId)
                const userRankings = useRankingStore.getState().rankings
                console.log(`[useUserData] Found ${userRankings.length} rankings to delete`)

                for (const ranking of userRankings) {
                    try {
                        await useRankingStore.getState().deleteRanking(userId, ranking.id)
                        console.log(`[useUserData] ✅ Deleted ranking: ${ranking.title}`)
                    } catch (error) {
                        console.error(
                            `[useUserData] Failed to delete ranking ${ranking.id}:`,
                            error
                        )
                    }
                }
                console.log('[useUserData] ✅ Cleared all rankings from Firestore')

                // Clear forum threads and polls
                const { useForumStore } = await import('../stores/forumStore')
                console.log('[useUserData] 🗑️ Clearing forum threads and polls...')

                const threadsRef = collection(db, 'threads')
                const threadSnapshot = await getDocs(
                    query(threadsRef, where('userId', '==', userId))
                )
                for (const threadDoc of threadSnapshot.docs) {
                    try {
                        await useForumStore.getState().deleteThread(userId, threadDoc.id)
                        console.log(`[useUserData] ✅ Deleted thread ${threadDoc.id}`)
                    } catch (error) {
                        console.error(
                            `[useUserData] Failed to delete thread ${threadDoc.id}:`,
                            error
                        )
                    }
                }

                const pollsRef = collection(db, 'polls')
                const pollSnapshot = await getDocs(query(pollsRef, where('userId', '==', userId)))
                for (const pollDoc of pollSnapshot.docs) {
                    try {
                        await useForumStore.getState().deletePoll(userId, pollDoc.id)
                        console.log(`[useUserData] ✅ Deleted poll ${pollDoc.id}`)
                    } catch (error) {
                        console.error(`[useUserData] Failed to delete poll ${pollDoc.id}:`, error)
                    }
                }

                useForumStore.setState((state) => ({
                    threads: state.threads.filter((thread) => thread.userId !== userId),
                    polls: state.polls.filter((poll) => poll.userId !== userId),
                }))
                console.log('[useUserData] ✅ Cleared forum data from store')

                // Then clear local cache
                sessionData.clearLocalCache()

                console.log('[useUserData] ✅ clearAccountData completed')
            },
            exportAccountData: async () => ({
                defaultWatchlist: sessionData.defaultWatchlist,
                likedMovies: sessionData.likedMovies,
                hiddenMovies: sessionData.hiddenMovies,
                userCreatedWatchlists: sessionData.userCreatedWatchlists,
                exportDate: new Date(),
            }),
            deleteAccount: async () => {
                const { auth, db } = await import('../firebase')
                const { deleteUser } = await import('firebase/auth')
                const { doc, deleteDoc } = await import('firebase/firestore')

                if (!auth.currentUser) {
                    throw new Error('No authenticated user found')
                }

                const userId = auth.currentUser.uid

                // Step 1: Delete Firestore user data
                try {
                    const userDocRef = doc(db, 'users', userId)
                    await deleteDoc(userDocRef)
                } catch (firestoreError) {
                    authError('Error deleting Firestore data:', firestoreError)
                    // Continue with auth deletion even if Firestore fails
                }

                // Step 2: Delete Firebase Auth account
                try {
                    await deleteUser(auth.currentUser)
                } catch (deleteError) {
                    // Handle re-authentication requirement
                    if ((deleteError as { code?: string }).code === 'auth/requires-recent-login') {
                        throw new Error(
                            'This operation requires recent authentication. Please sign out and sign in again before deleting your account.'
                        )
                    }
                    throw deleteError
                }
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
                    autoMute: sessionData.autoMute ?? true,
                    defaultVolume: sessionData.defaultVolume ?? 50,
                    childSafetyMode: sessionData.childSafetyMode ?? false,
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
                    autoMute: sessionData.autoMute ?? true,
                    defaultVolume: sessionData.defaultVolume ?? 50,
                    childSafetyMode: sessionData.childSafetyMode ?? false,
                    improveRecommendations: sessionData.improveRecommendations ?? true,
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

            // Preferences - defaults during initialization
            autoMute: true,
            defaultVolume: 50,
            childSafetyMode: false,
            improveRecommendations: true,
            showRecommendations: false,

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
                    autoMute: true,
                    defaultVolume: 50,
                    childSafetyMode: false,
                    improveRecommendations: true,
                },
            },
        }
    }
}
