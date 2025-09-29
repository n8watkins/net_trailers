import { create } from 'zustand'
import { Content, getTitle } from '../typings'
import { UserRating } from '../types/userData'
import { UserListsState } from '../types/userLists'
import { UserListsService } from '../services/userListsService'

export interface GuestState {
    watchlist: Content[]
    ratings: UserRating[]
    userLists: UserListsState
    lastActive: number
}

export interface GuestActions {
    addToWatchlist: (content: Content) => void
    removeFromWatchlist: (contentId: number) => void
    addRating: (contentId: number, rating: 'liked' | 'disliked', content?: Content) => void
    removeRating: (contentId: number) => void
    createList: (listName: string) => string
    addToList: (listId: string, content: Content) => void
    removeFromList: (listId: string, contentId: number) => void
    updateList: (listId: string, updates: { name?: string; emoji?: string; color?: string }) => void
    deleteList: (listId: string) => void
    updatePreferences: (prefs: Partial<GuestState>) => void
    clearAllData: () => void
    loadData: (data: GuestState) => void
}

export type GuestStore = GuestState & GuestActions

const getDefaultState = (): GuestState => ({
    watchlist: [],
    ratings: [],
    userLists: UserListsService.initializeDefaultLists(),
    lastActive: 0, // Initialize to 0 for SSR compatibility, will be set to actual timestamp after hydration
})

export const useGuestStore = create<GuestStore>((set, get) => ({
    // Initial state
    ...getDefaultState(),

    // Actions
    addToWatchlist: (content: Content) => {
        const state = get()
        const isAlreadyInWatchlist = state.watchlist.some((item) => item.id === content.id)
        if (isAlreadyInWatchlist) return

        set({
            watchlist: [...state.watchlist, content],
            lastActive: typeof window !== 'undefined' ? Date.now() : 0,
        })
        console.log('📝 [GuestStore] Added to watchlist:', getTitle(content))
    },

    removeFromWatchlist: (contentId: number) => {
        const state = get()
        set({
            watchlist: state.watchlist.filter((item) => item.id !== contentId),
            lastActive: typeof window !== 'undefined' ? Date.now() : 0,
        })
        console.log('🗑️ [GuestStore] Removed from watchlist:', contentId)
    },

    addRating: (contentId: number, rating: 'liked' | 'disliked', content?: Content) => {
        const state = get()
        const existingRatingIndex = state.ratings.findIndex((r) => r.contentId === contentId)

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
        console.log('⭐ [GuestStore] Added rating:', { contentId, rating })
    },

    removeRating: (contentId: number) => {
        const state = get()
        set({
            ratings: state.ratings.filter((r) => r.contentId !== contentId),
            lastActive: typeof window !== 'undefined' ? Date.now() : 0,
        })
        console.log('🗑️ [GuestStore] Removed rating:', contentId)
    },

    createList: (listName: string) => {
        const state = get()
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

        console.log('📋 [GuestStore] Created list:', listName, newList.id)
        return newList.id
    },

    addToList: (listId: string, content: Content) => {
        const state = get()
        // Add content to list using the UserListsService
        const updatedPrefs = UserListsService.addToList(
            { ...state, userLists: state.userLists } as any,
            { listId, content }
        )

        set({
            userLists: updatedPrefs.userLists,
            lastActive: typeof window !== 'undefined' ? Date.now() : 0,
        })

        console.log('📝 [GuestStore] Added to list:', { listId, content: getTitle(content) })
    },

    removeFromList: (listId: string, contentId: number) => {
        const state = get()
        // Remove content from list using the UserListsService
        const updatedPrefs = UserListsService.removeFromList(
            { ...state, userLists: state.userLists } as any,
            { listId, contentId }
        )

        set({
            userLists: updatedPrefs.userLists,
            lastActive: typeof window !== 'undefined' ? Date.now() : 0,
        })

        console.log('🗑️ [GuestStore] Removed from list:', { listId, contentId })
    },

    updateList: (listId: string, updates: { name?: string; emoji?: string; color?: string }) => {
        const state = get()

        // Update list using the UserListsService
        const updatedPrefs = UserListsService.updateList(
            { ...state, userLists: state.userLists } as any,
            { id: listId, ...updates }
        )

        set({
            userLists: updatedPrefs.userLists,
            lastActive: typeof window !== 'undefined' ? Date.now() : 0,
        })

        console.log('✏️ [GuestStore] Updated list:', { listId, updates })
    },

    deleteList: (listId: string) => {
        const state = get()

        // Delete list using the UserListsService
        const updatedPrefs = UserListsService.deleteList(
            { ...state, userLists: state.userLists } as any,
            listId
        )

        set({
            userLists: updatedPrefs.userLists,
            lastActive: typeof window !== 'undefined' ? Date.now() : 0,
        })

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
            watchlistCount: data.watchlist.length,
            ratingsCount: data.ratings.length,
            listsCount: data.userLists.lists.length,
        })
    },
}))
