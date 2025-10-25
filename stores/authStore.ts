import { create } from 'zustand'
import { Content, getTitle } from '../typings'
import { UserList } from '../types/userLists'
import { UserListsService } from '../services/userListsService'
import { AuthStorageService } from '../services/authStorageService'
import { firebaseTracker } from '../utils/firebaseCallTracker'
import { createDebouncedFunction } from '../utils/debounce'
import { syncManager } from '../utils/firebaseSyncManager'

// NEW SCHEMA - Flat structure with liked/hidden instead of ratings
export interface AuthState {
    userId?: string // Track which user this data belongs to
    likedMovies: Content[]
    hiddenMovies: Content[]
    defaultWatchlist: Content[]
    userCreatedWatchlists: UserList[]
    lastActive: number
    syncStatus: 'synced' | 'syncing' | 'offline'
    // Playback preferences
    autoMute?: boolean
    defaultVolume?: number // 0-100
    // Content filtering preferences
    childSafetyMode?: boolean // Restricts to PG-13 and below
}

export interface AuthActions {
    addToWatchlist: (content: Content) => Promise<void>
    removeFromWatchlist: (contentId: number) => Promise<void>
    addLikedMovie: (content: Content) => Promise<void>
    removeLikedMovie: (contentId: number) => Promise<void>
    addHiddenMovie: (content: Content) => Promise<void>
    removeHiddenMovie: (contentId: number) => Promise<void>
    createList: (request: {
        name: string
        emoji?: string
        color?: string
        isPublic?: boolean
    }) => Promise<string>
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
    likedMovies: [],
    hiddenMovies: [],
    defaultWatchlist: [],
    userCreatedWatchlists: [],
    lastActive: 0, // Initialize to 0 for SSR compatibility, will be set to actual timestamp after hydration
    autoMute: true, // Default to muted for better UX
    defaultVolume: 50, // Default to 50%
    childSafetyMode: false, // Default to off
    syncStatus: 'synced',
})

export const useAuthStore = create<AuthStore>((set, get) => ({
    // Initial state
    ...getDefaultState(),

    // Actions
    addToWatchlist: async (content: Content) => {
        const state = get()
        const isAlreadyInWatchlist = state.defaultWatchlist.some((item) => item.id === content.id)
        if (isAlreadyInWatchlist) {
            console.log('⚠️ [AuthStore] Item already in watchlist:', getTitle(content))
            return
        }

        set({ syncStatus: 'syncing' })

        const newWatchlist = [...state.defaultWatchlist, content]
        set({
            defaultWatchlist: newWatchlist,
            lastActive: typeof window !== 'undefined' ? Date.now() : 0,
        })

        // Save to Firebase with debounce tracking
        if (state.userId) {
            firebaseTracker.track('saveUserData-addToWatchlist', 'AuthStore', state.userId, {
                watchlistCount: newWatchlist.length,
            })
            const { AuthStorageService } = await import('../services/authStorageService')
            AuthStorageService.saveUserData(state.userId, {
                likedMovies: state.likedMovies,
                hiddenMovies: state.hiddenMovies,
                defaultWatchlist: newWatchlist,
                userCreatedWatchlists: state.userCreatedWatchlists,
                lastActive: Date.now(),
                autoMute: state.autoMute ?? false,
                defaultVolume: state.defaultVolume ?? 50,
                childSafetyMode: state.childSafetyMode ?? false,
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

        const newWatchlist = state.defaultWatchlist.filter((item) => item.id !== contentId)
        set({
            defaultWatchlist: newWatchlist,
            lastActive: typeof window !== 'undefined' ? Date.now() : 0,
        })

        // Save to Firebase with debounce tracking
        if (state.userId) {
            firebaseTracker.track('saveUserData-removeFromWatchlist', 'AuthStore', state.userId, {
                watchlistCount: newWatchlist.length,
            })
            const { AuthStorageService } = await import('../services/authStorageService')
            AuthStorageService.saveUserData(state.userId, {
                likedMovies: state.likedMovies,
                hiddenMovies: state.hiddenMovies,
                defaultWatchlist: newWatchlist,
                userCreatedWatchlists: state.userCreatedWatchlists,
                lastActive: Date.now(),
                autoMute: state.autoMute ?? false,
                defaultVolume: state.defaultVolume ?? 50,
                childSafetyMode: state.childSafetyMode ?? false,
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

    addLikedMovie: async (content: Content) => {
        const state = get()
        const isAlreadyLiked = state.likedMovies.some((m) => m.id === content.id)
        if (isAlreadyLiked) {
            console.log('⚠️ [AuthStore] Movie already liked:', getTitle(content))
            return
        }

        set({ syncStatus: 'syncing' })

        const newLikedMovies = [...state.likedMovies, content]

        set({
            likedMovies: newLikedMovies,
            lastActive: typeof window !== 'undefined' ? Date.now() : 0,
        })

        // Save to Firebase
        if (state.userId) {
            firebaseTracker.track('saveUserData-addLiked', 'AuthStore', state.userId, {
                likedCount: newLikedMovies.length,
            })
            const { AuthStorageService } = await import('../services/authStorageService')
            AuthStorageService.saveUserData(state.userId, {
                likedMovies: newLikedMovies,
                hiddenMovies: state.hiddenMovies,
                defaultWatchlist: state.defaultWatchlist,
                userCreatedWatchlists: state.userCreatedWatchlists,
                lastActive: Date.now(),
                autoMute: state.autoMute ?? false,
                defaultVolume: state.defaultVolume ?? 50,
                childSafetyMode: state.childSafetyMode ?? false,
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

        console.log('👍 [AuthStore] Added to liked:', getTitle(content))
    },

    removeLikedMovie: async (contentId: number) => {
        const state = get()
        set({ syncStatus: 'syncing' })

        const newLikedMovies = state.likedMovies.filter((m) => m.id !== contentId)
        set({
            likedMovies: newLikedMovies,
            lastActive: typeof window !== 'undefined' ? Date.now() : 0,
        })

        // Save to Firebase
        if (state.userId) {
            firebaseTracker.track('saveUserData-removeLiked', 'AuthStore', state.userId, {
                likedCount: newLikedMovies.length,
            })
            const { AuthStorageService } = await import('../services/authStorageService')
            AuthStorageService.saveUserData(state.userId, {
                likedMovies: newLikedMovies,
                hiddenMovies: state.hiddenMovies,
                defaultWatchlist: state.defaultWatchlist,
                userCreatedWatchlists: state.userCreatedWatchlists,
                lastActive: Date.now(),
                autoMute: state.autoMute ?? false,
                defaultVolume: state.defaultVolume ?? 50,
                childSafetyMode: state.childSafetyMode ?? false,
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

        console.log('🗑️ [AuthStore] Removed from liked:', contentId)
    },

    addHiddenMovie: async (content: Content) => {
        const state = get()
        const isAlreadyHidden = state.hiddenMovies.some((m) => m.id === content.id)
        if (isAlreadyHidden) {
            console.log('⚠️ [AuthStore] Movie already hidden:', getTitle(content))
            return
        }

        set({ syncStatus: 'syncing' })

        const newHiddenMovies = [...state.hiddenMovies, content]

        set({
            hiddenMovies: newHiddenMovies,
            lastActive: typeof window !== 'undefined' ? Date.now() : 0,
        })

        // Save to Firebase
        if (state.userId) {
            firebaseTracker.track('saveUserData-addHidden', 'AuthStore', state.userId, {
                hiddenCount: newHiddenMovies.length,
            })
            const { AuthStorageService } = await import('../services/authStorageService')
            AuthStorageService.saveUserData(state.userId, {
                likedMovies: state.likedMovies,
                hiddenMovies: newHiddenMovies,
                defaultWatchlist: state.defaultWatchlist,
                userCreatedWatchlists: state.userCreatedWatchlists,
                lastActive: Date.now(),
                autoMute: state.autoMute ?? false,
                defaultVolume: state.defaultVolume ?? 50,
                childSafetyMode: state.childSafetyMode ?? false,
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

        console.log('🙈 [AuthStore] Added to hidden:', getTitle(content))
    },

    removeHiddenMovie: async (contentId: number) => {
        const state = get()
        set({ syncStatus: 'syncing' })

        const newHiddenMovies = state.hiddenMovies.filter((m) => m.id !== contentId)
        set({
            hiddenMovies: newHiddenMovies,
            lastActive: typeof window !== 'undefined' ? Date.now() : 0,
        })

        // Save to Firebase
        if (state.userId) {
            firebaseTracker.track('saveUserData-removeHidden', 'AuthStore', state.userId, {
                hiddenCount: newHiddenMovies.length,
            })
            const { AuthStorageService } = await import('../services/authStorageService')
            AuthStorageService.saveUserData(state.userId, {
                likedMovies: state.likedMovies,
                hiddenMovies: newHiddenMovies,
                defaultWatchlist: state.defaultWatchlist,
                userCreatedWatchlists: state.userCreatedWatchlists,
                lastActive: Date.now(),
                autoMute: state.autoMute ?? false,
                defaultVolume: state.defaultVolume ?? 50,
                childSafetyMode: state.childSafetyMode ?? false,
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

        console.log('🗑️ [AuthStore] Removed from hidden:', contentId)
    },

    createList: async (request: {
        name: string
        emoji?: string
        color?: string
        isPublic?: boolean
    }) => {
        const state = get()
        set({ syncStatus: 'syncing' })

        // Create a new list using the UserListsService
        const updatedPrefs = UserListsService.createList(state as any, request)
        const newList =
            updatedPrefs.userCreatedWatchlists[updatedPrefs.userCreatedWatchlists.length - 1]

        set({
            userCreatedWatchlists: updatedPrefs.userCreatedWatchlists,
            lastActive: typeof window !== 'undefined' ? Date.now() : 0,
        })

        // Save to Firebase with debounce tracking
        if (state.userId) {
            firebaseTracker.track('saveUserData-createList', 'AuthStore', state.userId, {
                listsCount: updatedPrefs.userCreatedWatchlists.length,
            })
            const { AuthStorageService } = await import('../services/authStorageService')
            AuthStorageService.saveUserData(state.userId, {
                likedMovies: state.likedMovies,
                hiddenMovies: state.hiddenMovies,
                defaultWatchlist: state.defaultWatchlist,
                userCreatedWatchlists: updatedPrefs.userCreatedWatchlists,
                lastActive: Date.now(),
                autoMute: state.autoMute ?? false,
                defaultVolume: state.defaultVolume ?? 50,
                childSafetyMode: state.childSafetyMode ?? false,
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

        console.log('📋 [AuthStore] Created list:', request.name, newList.id)
        return newList.id
    },

    addToList: async (listId: string, content: Content) => {
        const state = get()
        set({ syncStatus: 'syncing' })

        // Add content to list using the UserListsService
        const updatedPrefs = UserListsService.addToList(state as any, { listId, content })

        set({
            userCreatedWatchlists: updatedPrefs.userCreatedWatchlists,
            lastActive: typeof window !== 'undefined' ? Date.now() : 0,
        })

        // Save to Firebase
        if (state.userId) {
            firebaseTracker.track('saveUserData-addToList', 'AuthStore', state.userId, {
                listId,
                listsCount: updatedPrefs.userCreatedWatchlists.length,
            })
            const { AuthStorageService } = await import('../services/authStorageService')
            AuthStorageService.saveUserData(state.userId, {
                likedMovies: state.likedMovies,
                hiddenMovies: state.hiddenMovies,
                defaultWatchlist: state.defaultWatchlist,
                userCreatedWatchlists: updatedPrefs.userCreatedWatchlists,
                lastActive: Date.now(),
                autoMute: state.autoMute ?? false,
                defaultVolume: state.defaultVolume ?? 50,
                childSafetyMode: state.childSafetyMode ?? false,
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
        const updatedPrefs = UserListsService.removeFromList(state as any, { listId, contentId })

        set({
            userCreatedWatchlists: updatedPrefs.userCreatedWatchlists,
            lastActive: typeof window !== 'undefined' ? Date.now() : 0,
        })

        // Save to Firebase
        if (state.userId) {
            firebaseTracker.track('saveUserData-removeFromList', 'AuthStore', state.userId, {
                listId,
                listsCount: updatedPrefs.userCreatedWatchlists.length,
            })
            const { AuthStorageService } = await import('../services/authStorageService')
            AuthStorageService.saveUserData(state.userId, {
                likedMovies: state.likedMovies,
                hiddenMovies: state.hiddenMovies,
                defaultWatchlist: state.defaultWatchlist,
                userCreatedWatchlists: updatedPrefs.userCreatedWatchlists,
                lastActive: Date.now(),
                autoMute: state.autoMute ?? false,
                defaultVolume: state.defaultVolume ?? 50,
                childSafetyMode: state.childSafetyMode ?? false,
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
        const updatedPrefs = UserListsService.updateList(state as any, { id: listId, ...updates })

        set({
            userCreatedWatchlists: updatedPrefs.userCreatedWatchlists,
            lastActive: typeof window !== 'undefined' ? Date.now() : 0,
        })

        // Save to Firebase
        if (state.userId) {
            firebaseTracker.track('saveUserData-updateList', 'AuthStore', state.userId, {
                listId,
                listsCount: updatedPrefs.userCreatedWatchlists.length,
            })
            const { AuthStorageService } = await import('../services/authStorageService')
            AuthStorageService.saveUserData(state.userId, {
                likedMovies: state.likedMovies,
                hiddenMovies: state.hiddenMovies,
                defaultWatchlist: state.defaultWatchlist,
                userCreatedWatchlists: updatedPrefs.userCreatedWatchlists,
                lastActive: Date.now(),
                autoMute: state.autoMute ?? false,
                defaultVolume: state.defaultVolume ?? 50,
                childSafetyMode: state.childSafetyMode ?? false,
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
        const updatedPrefs = UserListsService.deleteList(state as any, listId)

        set({
            userCreatedWatchlists: updatedPrefs.userCreatedWatchlists,
            lastActive: typeof window !== 'undefined' ? Date.now() : 0,
        })

        // Save to Firebase
        if (state.userId) {
            firebaseTracker.track('saveUserData-deleteList', 'AuthStore', state.userId, {
                listId,
                listsCount: updatedPrefs.userCreatedWatchlists.length,
            })
            const { AuthStorageService } = await import('../services/authStorageService')
            AuthStorageService.saveUserData(state.userId, {
                likedMovies: state.likedMovies,
                hiddenMovies: state.hiddenMovies,
                defaultWatchlist: state.defaultWatchlist,
                userCreatedWatchlists: updatedPrefs.userCreatedWatchlists,
                lastActive: Date.now(),
                autoMute: state.autoMute ?? false,
                defaultVolume: state.defaultVolume ?? 50,
                childSafetyMode: state.childSafetyMode ?? false,
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

        // Update local state
        set({
            ...prefs,
            lastActive: typeof window !== 'undefined' ? Date.now() : 0,
        })

        // Get the UPDATED state after set()
        const state = get()

        // Save to Firebase (merge preferences with existing data)
        if (state.userId) {
            firebaseTracker.track(
                'saveUserData-updatePreferences',
                'AuthStore',
                state.userId,
                prefs
            )
            const { AuthStorageService } = await import('../services/authStorageService')
            AuthStorageService.saveUserData(state.userId, {
                likedMovies: state.likedMovies,
                hiddenMovies: state.hiddenMovies,
                defaultWatchlist: state.defaultWatchlist,
                userCreatedWatchlists: state.userCreatedWatchlists,
                lastActive: Date.now(),
                autoMute: state.autoMute ?? false,
                defaultVolume: state.defaultVolume ?? 50,
                childSafetyMode: state.childSafetyMode ?? false,
            })
                .then(() => {
                    console.log('✅ [AuthStore] Preferences saved to Firestore:', {
                        autoMute: state.autoMute,
                        defaultVolume: state.defaultVolume,
                        childSafetyMode: state.childSafetyMode,
                    })
                    set({ syncStatus: 'synced' })
                })
                .catch((error) => {
                    console.error('❌ [AuthStore] Failed to save preferences to Firestore:', error)
                    set({ syncStatus: 'offline' })
                })
        } else {
            set({ syncStatus: 'synced' })
        }
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
                        likedMovies: firebaseData.likedMovies,
                        hiddenMovies: firebaseData.hiddenMovies,
                        defaultWatchlist: firebaseData.defaultWatchlist,
                        userCreatedWatchlists: firebaseData.userCreatedWatchlists,
                        lastActive: firebaseData.lastActive,
                        autoMute: firebaseData.autoMute ?? true,
                        defaultVolume: firebaseData.defaultVolume ?? 50,
                        childSafetyMode: firebaseData.childSafetyMode ?? false,
                        syncStatus: 'synced',
                    })

                    console.log(
                        `✅ [AuthStore] Successfully synced with Firebase for user ${userId}:`,
                        {
                            userId,
                            defaultWatchlist: firebaseData.defaultWatchlist.map((w) => ({
                                id: w.id,
                                title: getTitle(w),
                            })),
                            watchlistCount: firebaseData.defaultWatchlist.length,
                            likedCount: firebaseData.likedMovies.length,
                            hiddenCount: firebaseData.hiddenMovies.length,
                            customLists: firebaseData.userCreatedWatchlists.map((l) => ({
                                id: l.id,
                                name: l.name,
                                itemCount: l.items?.length || 0,
                            })),
                            listsCount: firebaseData.userCreatedWatchlists.length,
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
            watchlistCount: data.defaultWatchlist.length,
            likedCount: data.likedMovies.length,
            hiddenCount: data.hiddenMovies.length,
            listsCount: data.userCreatedWatchlists.length,
        })
    },
}))
