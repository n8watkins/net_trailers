import { create } from 'zustand'
import { Content, getTitle } from '../typings'
import { UserList } from '../types/userLists'
import { UserListsService } from '../services/userListsService'
import { GuestStorageService } from '../services/guestStorageService'

// NEW SCHEMA - Flat structure with liked/hidden instead of ratings
export interface GuestState {
    guestId?: string // Track which guest session this data belongs to
    likedMovies: Content[]
    hiddenMovies: Content[]
    defaultWatchlist: Content[]
    userCreatedWatchlists: UserList[]
    lastActive: number
}

export interface GuestActions {
    addToWatchlist: (content: Content) => void
    removeFromWatchlist: (contentId: number) => void
    addLikedMovie: (content: Content) => void
    removeLikedMovie: (contentId: number) => void
    addHiddenMovie: (content: Content) => void
    removeHiddenMovie: (contentId: number) => void
    createList: (listName: string) => string
    addToList: (listId: string, content: Content) => void
    removeFromList: (listId: string, contentId: number) => void
    updateList: (listId: string, updates: { name?: string; emoji?: string; color?: string }) => void
    deleteList: (listId: string) => void
    updatePreferences: (prefs: Partial<GuestState>) => void
    clearAllData: () => void
    loadData: (data: GuestState) => void
    syncFromLocalStorage: (guestId: string) => void
}

export type GuestStore = GuestState & GuestActions

const getDefaultState = (): GuestState => ({
    guestId: undefined,
    likedMovies: [],
    hiddenMovies: [],
    defaultWatchlist: [],
    userCreatedWatchlists: [],
    lastActive: 0, // Initialize to 0 for SSR compatibility, will be set to actual timestamp after hydration
    autoMute: true, // Default to muted for better UX
    defaultVolume: 50, // Default to 50%
    childSafetyMode: false, // Default to off
})

export const useGuestStore = create<GuestStore>((set, get) => ({
    // Initial state
    ...getDefaultState(),

    // Actions
    addToWatchlist: (content: Content) => {
        const state = get()
        const isAlreadyInWatchlist = state.defaultWatchlist.some((item) => item.id === content.id)
        if (isAlreadyInWatchlist) return

        const newWatchlist = [...state.defaultWatchlist, content]
        set({
            defaultWatchlist: newWatchlist,
            lastActive: typeof window !== 'undefined' ? Date.now() : 0,
        })

        // Save to localStorage
        if (state.guestId) {
            GuestStorageService.saveGuestData(state.guestId, {
                likedMovies: state.likedMovies,
                hiddenMovies: state.hiddenMovies,
                defaultWatchlist: newWatchlist,
                userCreatedWatchlists: state.userCreatedWatchlists,
                lastActive: Date.now(),
            })
        }

        console.log('📝 [GuestStore] Added to watchlist:', getTitle(content))
    },

    removeFromWatchlist: (contentId: number) => {
        const state = get()
        const newWatchlist = state.defaultWatchlist.filter((item) => item.id !== contentId)
        set({
            defaultWatchlist: newWatchlist,
            lastActive: typeof window !== 'undefined' ? Date.now() : 0,
        })

        // Save to localStorage
        if (state.guestId) {
            GuestStorageService.saveGuestData(state.guestId, {
                likedMovies: state.likedMovies,
                hiddenMovies: state.hiddenMovies,
                defaultWatchlist: newWatchlist,
                userCreatedWatchlists: state.userCreatedWatchlists,
                lastActive: Date.now(),
            })
        }

        console.log('🗑️ [GuestStore] Removed from watchlist:', contentId)
    },

    addLikedMovie: (content: Content) => {
        const state = get()
        const isAlreadyLiked = state.likedMovies.some((m) => m.id === content.id)
        if (isAlreadyLiked) return

        // Remove from hidden (mutual exclusion)
        const newHiddenMovies = state.hiddenMovies.filter((m) => m.id !== content.id)
        const newLikedMovies = [...state.likedMovies, content]

        set({
            likedMovies: newLikedMovies,
            hiddenMovies: newHiddenMovies,
            lastActive: typeof window !== 'undefined' ? Date.now() : 0,
        })

        // Save to localStorage
        if (state.guestId) {
            GuestStorageService.saveGuestData(state.guestId, {
                likedMovies: newLikedMovies,
                hiddenMovies: newHiddenMovies,
                defaultWatchlist: state.defaultWatchlist,
                userCreatedWatchlists: state.userCreatedWatchlists,
                lastActive: Date.now(),
            })
        }

        console.log('👍 [GuestStore] Added to liked:', getTitle(content))
    },

    removeLikedMovie: (contentId: number) => {
        const state = get()
        const newLikedMovies = state.likedMovies.filter((m) => m.id !== contentId)
        set({
            likedMovies: newLikedMovies,
            lastActive: typeof window !== 'undefined' ? Date.now() : 0,
        })

        // Save to localStorage
        if (state.guestId) {
            GuestStorageService.saveGuestData(state.guestId, {
                likedMovies: newLikedMovies,
                hiddenMovies: state.hiddenMovies,
                defaultWatchlist: state.defaultWatchlist,
                userCreatedWatchlists: state.userCreatedWatchlists,
                lastActive: Date.now(),
            })
        }

        console.log('🗑️ [GuestStore] Removed from liked:', contentId)
    },

    addHiddenMovie: (content: Content) => {
        const state = get()
        const isAlreadyHidden = state.hiddenMovies.some((m) => m.id === content.id)
        if (isAlreadyHidden) return

        // Remove from liked (mutual exclusion)
        const newLikedMovies = state.likedMovies.filter((m) => m.id !== content.id)
        const newHiddenMovies = [...state.hiddenMovies, content]

        set({
            likedMovies: newLikedMovies,
            hiddenMovies: newHiddenMovies,
            lastActive: typeof window !== 'undefined' ? Date.now() : 0,
        })

        // Save to localStorage
        if (state.guestId) {
            GuestStorageService.saveGuestData(state.guestId, {
                likedMovies: newLikedMovies,
                hiddenMovies: newHiddenMovies,
                defaultWatchlist: state.defaultWatchlist,
                userCreatedWatchlists: state.userCreatedWatchlists,
                lastActive: Date.now(),
            })
        }

        console.log('🙈 [GuestStore] Added to hidden:', getTitle(content))
    },

    removeHiddenMovie: (contentId: number) => {
        const state = get()
        const newHiddenMovies = state.hiddenMovies.filter((m) => m.id !== contentId)
        set({
            hiddenMovies: newHiddenMovies,
            lastActive: typeof window !== 'undefined' ? Date.now() : 0,
        })

        // Save to localStorage
        if (state.guestId) {
            GuestStorageService.saveGuestData(state.guestId, {
                likedMovies: state.likedMovies,
                hiddenMovies: newHiddenMovies,
                defaultWatchlist: state.defaultWatchlist,
                userCreatedWatchlists: state.userCreatedWatchlists,
                lastActive: Date.now(),
            })
        }

        console.log('🗑️ [GuestStore] Removed from hidden:', contentId)
    },

    createList: (listName: string) => {
        const state = get()
        // Create a new list using the UserListsService
        const updatedPrefs = UserListsService.createList(state as any, { name: listName })
        const newList =
            updatedPrefs.userCreatedWatchlists[updatedPrefs.userCreatedWatchlists.length - 1]

        set({
            userCreatedWatchlists: updatedPrefs.userCreatedWatchlists,
            lastActive: typeof window !== 'undefined' ? Date.now() : 0,
        })

        // Save to localStorage
        if (state.guestId) {
            GuestStorageService.saveGuestData(state.guestId, {
                likedMovies: state.likedMovies,
                hiddenMovies: state.hiddenMovies,
                defaultWatchlist: state.defaultWatchlist,
                userCreatedWatchlists: updatedPrefs.userCreatedWatchlists,
                lastActive: Date.now(),
            })
        }

        console.log('📋 [GuestStore] Created list:', listName, newList.id)
        return newList.id
    },

    addToList: (listId: string, content: Content) => {
        const state = get()
        // Add content to list using the UserListsService
        const updatedPrefs = UserListsService.addToList(state as any, { listId, content })

        set({
            userCreatedWatchlists: updatedPrefs.userCreatedWatchlists,
            lastActive: typeof window !== 'undefined' ? Date.now() : 0,
        })

        // Save to localStorage
        if (state.guestId) {
            GuestStorageService.saveGuestData(state.guestId, {
                likedMovies: state.likedMovies,
                hiddenMovies: state.hiddenMovies,
                defaultWatchlist: state.defaultWatchlist,
                userCreatedWatchlists: updatedPrefs.userCreatedWatchlists,
                lastActive: Date.now(),
            })
        }

        console.log('📝 [GuestStore] Added to list:', { listId, content: getTitle(content) })
    },

    removeFromList: (listId: string, contentId: number) => {
        const state = get()
        // Remove content from list using the UserListsService
        const updatedPrefs = UserListsService.removeFromList(state as any, { listId, contentId })

        set({
            userCreatedWatchlists: updatedPrefs.userCreatedWatchlists,
            lastActive: typeof window !== 'undefined' ? Date.now() : 0,
        })

        // Save to localStorage
        if (state.guestId) {
            GuestStorageService.saveGuestData(state.guestId, {
                likedMovies: state.likedMovies,
                hiddenMovies: state.hiddenMovies,
                defaultWatchlist: state.defaultWatchlist,
                userCreatedWatchlists: updatedPrefs.userCreatedWatchlists,
                lastActive: Date.now(),
            })
        }

        console.log('🗑️ [GuestStore] Removed from list:', { listId, contentId })
    },

    updateList: (listId: string, updates: { name?: string; emoji?: string; color?: string }) => {
        const state = get()

        // Update list using the UserListsService
        const updatedPrefs = UserListsService.updateList(state as any, { id: listId, ...updates })

        set({
            userCreatedWatchlists: updatedPrefs.userCreatedWatchlists,
            lastActive: typeof window !== 'undefined' ? Date.now() : 0,
        })

        // Save to localStorage
        if (state.guestId) {
            GuestStorageService.saveGuestData(state.guestId, {
                likedMovies: state.likedMovies,
                hiddenMovies: state.hiddenMovies,
                defaultWatchlist: state.defaultWatchlist,
                userCreatedWatchlists: updatedPrefs.userCreatedWatchlists,
                lastActive: Date.now(),
            })
        }

        console.log('✏️ [GuestStore] Updated list:', { listId, updates })
    },

    deleteList: (listId: string) => {
        const state = get()

        // Delete list using the UserListsService
        const updatedPrefs = UserListsService.deleteList(state as any, listId)

        set({
            userCreatedWatchlists: updatedPrefs.userCreatedWatchlists,
            lastActive: typeof window !== 'undefined' ? Date.now() : 0,
        })

        // Save to localStorage
        if (state.guestId) {
            GuestStorageService.saveGuestData(state.guestId, {
                likedMovies: state.likedMovies,
                hiddenMovies: state.hiddenMovies,
                defaultWatchlist: state.defaultWatchlist,
                userCreatedWatchlists: updatedPrefs.userCreatedWatchlists,
                lastActive: Date.now(),
            })
        }

        console.log('🗑️ [GuestStore] Deleted list:', listId)
    },

    updatePreferences: (prefs: Partial<GuestState>) => {
        set({
            ...prefs,
            lastActive: typeof window !== 'undefined' ? Date.now() : 0,
        })
        console.log('🔄 [GuestStore] Updated preferences')
    },

    clearAllData: () => {
        set(getDefaultState())
        console.log('🧹 [GuestStore] Cleared all data')
    },

    loadData: (data: GuestState) => {
        set({
            ...data,
            lastActive: typeof window !== 'undefined' ? Date.now() : 0,
        })
        console.log('📥 [GuestStore] Loaded data:', {
            watchlistCount: data.defaultWatchlist.length,
            likedCount: data.likedMovies.length,
            hiddenCount: data.hiddenMovies.length,
            listsCount: data.userCreatedWatchlists.length,
        })
    },

    syncFromLocalStorage: (guestId: string) => {
        const loadedData = GuestStorageService.loadGuestData(guestId)
        set({
            guestId,
            likedMovies: loadedData.likedMovies,
            hiddenMovies: loadedData.hiddenMovies,
            defaultWatchlist: loadedData.defaultWatchlist,
            userCreatedWatchlists: loadedData.userCreatedWatchlists,
            lastActive: loadedData.lastActive,
        })
        console.log('🔄 [GuestStore] Synced from localStorage:', {
            guestId,
            watchlistCount: loadedData.defaultWatchlist.length,
            likedCount: loadedData.likedMovies.length,
            hiddenCount: loadedData.hiddenMovies.length,
            listsCount: loadedData.userCreatedWatchlists.length,
        })
    },
}))
