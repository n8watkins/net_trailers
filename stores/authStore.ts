import { create } from 'zustand'
import { Content, getTitle } from '../typings'
import { UserRating } from '../types/userData'
import { UserListsState } from '../types/userLists'
import { UserListsService } from '../services/userListsService'
import { AuthStorageService } from '../services/authStorageService'
import { firebaseTracker } from '../utils/firebaseCallTracker'
import { createDebouncedFunction } from '../utils/debounce'
import { syncManager } from '../utils/firebaseSyncManager'

export interface AuthState {
    userId?: string // Track which user this data belongs to
    watchlist: Content[]
    ratings: UserRating[]
    userLists: UserListsState
    lastActive: number
    syncStatus: 'synced' | 'syncing' | 'offline'
}

export interface AuthActions {
    addToWatchlist: (content: Content) => Promise<void>
    removeFromWatchlist: (contentId: number) => Promise<void>
    addRating: (contentId: number, rating: 'liked' | 'disliked', content?: Content) => Promise<void>
    removeRating: (contentId: number) => Promise<void>
    createList: (listName: string) => Promise<string>
    addToList: (listId: string, content: Content) => Promise<void>
    removeFromList: (listId: string, contentId: number) => Promise<void>
    updateList: (
        listId: string,
        updates: { name?: string; emoji?: string; color?: string }
    ) => Promise<void>
    deleteList: (listId: string) => Promise<void>
    updatePreferences: (prefs: Partial<AuthState>) => Promise<void>
    syncWithFirebase: (userId: string) => Promise<void>
    clearLocalCache: () => void
    loadData: (data: AuthState) => void
}

export type AuthStore = AuthState & AuthActions

const getDefaultState = (): AuthState => ({
    userId: undefined,
    watchlist: [],
    ratings: [],
    userLists: UserListsService.initializeDefaultLists(),
    lastActive: 0, // Initialize to 0 for SSR compatibility, will be set to actual timestamp after hydration
    syncStatus: 'synced',
})

export const useAuthStore = create<AuthStore>((set, get) => ({
    // Initial state
    ...getDefaultState(),

    // Actions
    addToWatchlist: async (content: Content) => {
        const state = get()
        const isAlreadyInWatchlist = state.watchlist.some((item) => item.id === content.id)
        if (isAlreadyInWatchlist) {
            console.log('⚠️ [AuthStore] Item already in watchlist:', getTitle(content))
            return
        }

        set({ syncStatus: 'syncing' })

        const newWatchlist = [...state.watchlist, content]
        set({
            watchlist: newWatchlist,
            lastActive: typeof window !== 'undefined' ? Date.now() : 0,
        })

        // Save to Firebase with debounce tracking
        if (state.userId) {
            firebaseTracker.track('saveUserData-addToWatchlist', 'AuthStore', state.userId, {
                watchlistCount: newWatchlist.length,
            })
            const { AuthStorageService } = await import('../services/authStorageService')
            AuthStorageService.saveUserData(state.userId, {
                watchlist: newWatchlist,
                ratings: state.ratings,
                userLists: state.userLists,
                lastActive: Date.now(),
            })
                .then(() => {
                    console.log('✅ [AuthStore] Saved to Firestore')
                    set({ syncStatus: 'synced' })
                })
                .catch((error) => {
                    console.error('❌ [AuthStore] Failed to save to Firestore:', error)
                    set({ syncStatus: 'offline' })
                })
        } else {
            set({ syncStatus: 'synced' })
        }

        console.log('✅ [AuthStore] Added to watchlist:', {
            title: getTitle(content),
            contentId: content.id,
            newWatchlistCount: newWatchlist.length,
            userId: state.userId,
        })
    },

    removeFromWatchlist: async (contentId: number) => {
        const state = get()
        set({ syncStatus: 'syncing' })

        const newWatchlist = state.watchlist.filter((item) => item.id !== contentId)
        set({
            watchlist: newWatchlist,
            lastActive: typeof window !== 'undefined' ? Date.now() : 0,
        })

        // Save to Firebase with debounce tracking
        if (state.userId) {
            firebaseTracker.track('saveUserData-removeFromWatchlist', 'AuthStore', state.userId, {
                watchlistCount: newWatchlist.length,
            })
            const { AuthStorageService } = await import('../services/authStorageService')
            AuthStorageService.saveUserData(state.userId, {
                watchlist: newWatchlist,
                ratings: state.ratings,
                userLists: state.userLists,
                lastActive: Date.now(),
            })
                .then(() => {
                    console.log('✅ [AuthStore] Saved to Firestore')
                    set({ syncStatus: 'synced' })
                })
                .catch((error) => {
                    console.error('❌ [AuthStore] Failed to save to Firestore:', error)
                    set({ syncStatus: 'offline' })
                })
        } else {
            set({ syncStatus: 'synced' })
        }

        console.log('🗑️ [AuthStore] Removed from watchlist:', contentId)
    },

    addRating: async (contentId: number, rating: 'liked' | 'disliked', content?: Content) => {
        const state = get()
        const existingRatingIndex = state.ratings.findIndex((r) => r.contentId === contentId)

        set({ syncStatus: 'syncing' })

        const newRating: UserRating = {
            contentId,
            rating,
            timestamp: typeof window !== 'undefined' ? Date.now() : 0,
            content,
        }

        let updatedRatings: UserRating[]
        if (existingRatingIndex >= 0) {
            updatedRatings = [...state.ratings]
            updatedRatings[existingRatingIndex] = newRating
        } else {
            updatedRatings = [...state.ratings, newRating]
        }

        set({
            ratings: updatedRatings,
            lastActive: typeof window !== 'undefined' ? Date.now() : 0,
        })

        // Save to Firebase
        if (state.userId) {
            firebaseTracker.track('saveUserData-addRating', 'AuthStore', state.userId, {
                ratingsCount: updatedRatings.length,
            })
            const { AuthStorageService } = await import('../services/authStorageService')
            AuthStorageService.saveUserData(state.userId, {
                watchlist: state.watchlist,
                ratings: updatedRatings,
                userLists: state.userLists,
                lastActive: Date.now(),
            })
                .then(() => {
                    console.log('✅ [AuthStore] Saved to Firestore')
                    set({ syncStatus: 'synced' })
                })
                .catch((error) => {
                    console.error('❌ [AuthStore] Failed to save to Firestore:', error)
                    set({ syncStatus: 'offline' })
                })
        } else {
            set({ syncStatus: 'synced' })
        }

        console.log('⭐ [AuthStore] Added rating:', { contentId, rating })
    },

    removeRating: async (contentId: number) => {
        const state = get()
        set({ syncStatus: 'syncing' })

        const updatedRatings = state.ratings.filter((r) => r.contentId !== contentId)
        set({
            ratings: updatedRatings,
            lastActive: typeof window !== 'undefined' ? Date.now() : 0,
        })

        // Save to Firebase
        if (state.userId) {
            firebaseTracker.track('saveUserData-removeRating', 'AuthStore', state.userId, {
                ratingsCount: updatedRatings.length,
            })
            const { AuthStorageService } = await import('../services/authStorageService')
            AuthStorageService.saveUserData(state.userId, {
                watchlist: state.watchlist,
                ratings: updatedRatings,
                userLists: state.userLists,
                lastActive: Date.now(),
            })
                .then(() => {
                    console.log('✅ [AuthStore] Saved to Firestore')
                    set({ syncStatus: 'synced' })
                })
                .catch((error) => {
                    console.error('❌ [AuthStore] Failed to save to Firestore:', error)
                    set({ syncStatus: 'offline' })
                })
        } else {
            set({ syncStatus: 'synced' })
        }

        console.log('🗑️ [AuthStore] Removed rating:', contentId)
    },

    createList: async (listName: string) => {
        const state = get()
        set({ syncStatus: 'syncing' })

        // Create a new list using the UserListsService
        const updatedPrefs = UserListsService.createList(
            { ...state, userLists: state.userLists } as any,
            { name: listName }
        )
        const newList = updatedPrefs.userLists.lists[updatedPrefs.userLists.lists.length - 1]

        set({
            userLists: updatedPrefs.userLists,
            lastActive: typeof window !== 'undefined' ? Date.now() : 0,
        })

        // Save to Firebase with debounce tracking
        if (state.userId) {
            firebaseTracker.track('saveUserData-createList', 'AuthStore', state.userId, {
                listsCount: updatedPrefs.userLists.lists.length,
            })
            const { AuthStorageService } = await import('../services/authStorageService')
            AuthStorageService.saveUserData(state.userId, {
                watchlist: state.watchlist,
                ratings: state.ratings,
                userLists: updatedPrefs.userLists,
                lastActive: Date.now(),
            })
                .then(() => {
                    console.log('✅ [AuthStore] Saved to Firestore')
                    set({ syncStatus: 'synced' })
                })
                .catch((error) => {
                    console.error('❌ [AuthStore] Failed to save to Firestore:', error)
                    set({ syncStatus: 'offline' })
                })
        } else {
            set({ syncStatus: 'synced' })
        }

        console.log('📋 [AuthStore] Created list:', listName, newList.id)
        return newList.id
    },

    addToList: async (listId: string, content: Content) => {
        const state = get()
        set({ syncStatus: 'syncing' })

        // Add content to list using the UserListsService
        const updatedPrefs = UserListsService.addToList(
            { ...state, userLists: state.userLists } as any,
            { listId, content }
        )

        set({
            userLists: updatedPrefs.userLists,
            lastActive: typeof window !== 'undefined' ? Date.now() : 0,
        })

        // Save to Firebase
        if (state.userId) {
            firebaseTracker.track('saveUserData-addToList', 'AuthStore', state.userId, {
                listId,
                listsCount: updatedPrefs.userLists.lists.length,
            })
            const { AuthStorageService } = await import('../services/authStorageService')
            AuthStorageService.saveUserData(state.userId, {
                watchlist: state.watchlist,
                ratings: state.ratings,
                userLists: updatedPrefs.userLists,
                lastActive: Date.now(),
            })
                .then(() => {
                    console.log('✅ [AuthStore] Saved to Firestore')
                    set({ syncStatus: 'synced' })
                })
                .catch((error) => {
                    console.error('❌ [AuthStore] Failed to save to Firestore:', error)
                    set({ syncStatus: 'offline' })
                })
        } else {
            set({ syncStatus: 'synced' })
        }

        console.log('📝 [AuthStore] Added to list:', { listId, content: getTitle(content) })
    },

    removeFromList: async (listId: string, contentId: number) => {
        const state = get()
        set({ syncStatus: 'syncing' })

        // Remove content from list using the UserListsService
        const updatedPrefs = UserListsService.removeFromList(
            { ...state, userLists: state.userLists } as any,
            { listId, contentId }
        )

        set({
            userLists: updatedPrefs.userLists,
            lastActive: typeof window !== 'undefined' ? Date.now() : 0,
        })

        // Save to Firebase
        if (state.userId) {
            firebaseTracker.track('saveUserData-removeFromList', 'AuthStore', state.userId, {
                listId,
                listsCount: updatedPrefs.userLists.lists.length,
            })
            const { AuthStorageService } = await import('../services/authStorageService')
            AuthStorageService.saveUserData(state.userId, {
                watchlist: state.watchlist,
                ratings: state.ratings,
                userLists: updatedPrefs.userLists,
                lastActive: Date.now(),
            })
                .then(() => {
                    console.log('✅ [AuthStore] Saved to Firestore')
                    set({ syncStatus: 'synced' })
                })
                .catch((error) => {
                    console.error('❌ [AuthStore] Failed to save to Firestore:', error)
                    set({ syncStatus: 'offline' })
                })
        } else {
            set({ syncStatus: 'synced' })
        }

        console.log('🗑️ [AuthStore] Removed from list:', { listId, contentId })
    },

    updateList: async (
        listId: string,
        updates: { name?: string; emoji?: string; color?: string }
    ) => {
        const state = get()
        set({ syncStatus: 'syncing' })

        // Update list using the UserListsService
        const updatedPrefs = UserListsService.updateList(
            { ...state, userLists: state.userLists } as any,
            { id: listId, ...updates }
        )

        set({
            userLists: updatedPrefs.userLists,
            lastActive: typeof window !== 'undefined' ? Date.now() : 0,
        })

        // Save to Firebase
        if (state.userId) {
            firebaseTracker.track('saveUserData-updateList', 'AuthStore', state.userId, {
                listId,
                listsCount: updatedPrefs.userLists.lists.length,
            })
            const { AuthStorageService } = await import('../services/authStorageService')
            AuthStorageService.saveUserData(state.userId, {
                watchlist: state.watchlist,
                ratings: state.ratings,
                userLists: updatedPrefs.userLists,
                lastActive: Date.now(),
            })
                .then(() => {
                    console.log('✅ [AuthStore] Saved to Firestore')
                    set({ syncStatus: 'synced' })
                })
                .catch((error) => {
                    console.error('❌ [AuthStore] Failed to save to Firestore:', error)
                    set({ syncStatus: 'offline' })
                })
        } else {
            set({ syncStatus: 'synced' })
        }

        console.log('✏️ [AuthStore] Updated list:', { listId, updates })
    },

    deleteList: async (listId: string) => {
        const state = get()
        set({ syncStatus: 'syncing' })

        // Delete list using the UserListsService
        const updatedPrefs = UserListsService.deleteList(
            { ...state, userLists: state.userLists } as any,
            listId
        )

        set({
            userLists: updatedPrefs.userLists,
            lastActive: typeof window !== 'undefined' ? Date.now() : 0,
        })

        // Save to Firebase
        if (state.userId) {
            firebaseTracker.track('saveUserData-deleteList', 'AuthStore', state.userId, {
                listId,
                listsCount: updatedPrefs.userLists.lists.length,
            })
            const { AuthStorageService } = await import('../services/authStorageService')
            AuthStorageService.saveUserData(state.userId, {
                watchlist: state.watchlist,
                ratings: state.ratings,
                userLists: updatedPrefs.userLists,
                lastActive: Date.now(),
            })
                .then(() => {
                    console.log('✅ [AuthStore] Saved to Firestore')
                    set({ syncStatus: 'synced' })
                })
                .catch((error) => {
                    console.error('❌ [AuthStore] Failed to save to Firestore:', error)
                    set({ syncStatus: 'offline' })
                })
        } else {
            set({ syncStatus: 'synced' })
        }

        console.log('🗑️ [AuthStore] Deleted list:', listId)
    },

    updatePreferences: async (prefs: Partial<AuthState>) => {
        set({ syncStatus: 'syncing' })

        set({
            ...prefs,
            lastActive: typeof window !== 'undefined' ? Date.now() : 0,
        })

        set({ syncStatus: 'synced' })
        console.log('🔄 [AuthStore] Updated preferences')
    },

    syncWithFirebase: async (userId: string) => {
        const state = get()

        // Clear store if switching to a different user
        if (state.userId && state.userId !== userId) {
            console.warn(
                `⚠️ [AuthStore] User ID mismatch! Store: ${state.userId}, Requested: ${userId}. Clearing store.`
            )
            set(getDefaultState())
            syncManager.clearUserSync(state.userId) // Clear old user's sync state
        }

        // Use sync manager to prevent duplicate syncs
        const result = await syncManager.executeSync(
            userId,
            async () => {
                try {
                    console.log(`🔄 [AuthStore] Executing sync for user: ${userId}`)
                    firebaseTracker.track('syncWithFirebase', 'AuthStore', userId)
                    set({ syncStatus: 'syncing', userId })

                    // Load data from Firebase
                    const firebaseData = await AuthStorageService.loadUserData(userId)

                    // Verify we're still loading data for the correct user
                    const currentState = get()
                    if (currentState.userId !== userId) {
                        console.warn(
                            `⚠️ [AuthStore] User changed during sync (${currentState.userId} != ${userId}), aborting`
                        )
                        return null
                    }

                    set({
                        userId,
                        watchlist: firebaseData.watchlist,
                        ratings: firebaseData.ratings,
                        userLists: firebaseData.userLists,
                        lastActive: firebaseData.lastActive,
                        syncStatus: 'synced',
                    })

                    console.log(
                        `✅ [AuthStore] Successfully synced with Firebase for user ${userId}:`,
                        {
                            userId,
                            watchlist: firebaseData.watchlist.map((w) => ({
                                id: w.id,
                                title: getTitle(w),
                            })),
                            watchlistCount: firebaseData.watchlist.length,
                            ratingsCount: firebaseData.ratings.length,
                            customLists: firebaseData.userLists.lists.map((l) => ({
                                id: l.id,
                                name: l.name,
                                itemCount: l.items?.length || 0,
                            })),
                            listsCount: firebaseData.userLists.lists.length,
                        }
                    )
                    return firebaseData
                } catch (error) {
                    console.error('❌ [AuthStore] Failed to sync with Firebase:', error)
                    set({ syncStatus: 'offline' })
                    throw error
                }
            },
            'AuthStore'
        )
    },

    clearLocalCache: () => {
        const state = get()
        const userId = state.userId
        set(getDefaultState())
        console.log(`🧹 [AuthStore] Cleared local cache for user ${userId}`)
    },

    loadData: (data: AuthState) => {
        const state = get()

        // Verify we're loading data for the correct user if userId is provided
        if (data.userId && state.userId && data.userId !== state.userId) {
            console.warn(
                `⚠️ [AuthStore] Attempted to load data for wrong user! Store: ${state.userId}, Data: ${data.userId}`
            )
            return
        }

        set({
            ...data,
            lastActive: typeof window !== 'undefined' ? Date.now() : 0,
        })
        console.log(`📥 [AuthStore] Loaded data for user ${data.userId || 'unknown'}:`, {
            watchlistCount: data.watchlist.length,
            ratingsCount: data.ratings.length,
            listsCount: data.userLists.lists.length,
        })
    },
}))
