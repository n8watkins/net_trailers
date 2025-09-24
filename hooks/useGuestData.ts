import { useRecoilState } from 'recoil'
import { guestSessionState, GuestSession } from '../atoms/guestSessionAtom'
import { GuestStorageService } from '../services/guestStorageService'
import { UserListsService } from '../services/userListsService'
import { Content } from '../typings'
import { UserList, CreateListRequest, UpdateListRequest } from '../types/userLists'

export function useGuestData() {
    const [guestSession, setGuestSession] = useRecoilState(guestSessionState)

    // Save data whenever preferences change
    const saveGuestData = (updatedSession: GuestSession) => {
        if (updatedSession.guestId && updatedSession.preferences) {
            GuestStorageService.saveGuestData(updatedSession.guestId, updatedSession.preferences)
        }
    }

    // Update session helper
    const updateSession = (updater: (session: GuestSession) => GuestSession) => {
        setGuestSession((prev) => {
            const updated = updater(prev)
            saveGuestData(updated)
            return updated
        })
    }

    // Rating operations
    const setRating = (contentId: number, rating: 'liked' | 'disliked', content?: Content) => {
        updateSession((session) => ({
            ...session,
            preferences: GuestStorageService.addRating(
                session.preferences,
                contentId,
                rating,
                content
            ),
        }))
    }

    const removeRating = (contentId: number) => {
        updateSession((session) => ({
            ...session,
            preferences: GuestStorageService.removeRating(session.preferences, contentId),
        }))
    }

    const getRating = (contentId: number) => {
        return GuestStorageService.getRating(guestSession.preferences, contentId)
    }

    // Watchlist operations
    const addToWatchlist = (content: Content) => {
        updateSession((session) => ({
            ...session,
            preferences: GuestStorageService.addToWatchlist(session.preferences, content),
        }))
    }

    const removeFromWatchlist = (contentId: number) => {
        updateSession((session) => ({
            ...session,
            preferences: GuestStorageService.removeFromWatchlist(session.preferences, contentId),
        }))
    }

    const isInWatchlist = (contentId: number) => {
        return GuestStorageService.isInWatchlist(guestSession.preferences, contentId)
    }

    // User Lists Management
    const createList = (request: CreateListRequest) => {
        updateSession((session) => ({
            ...session,
            preferences: UserListsService.createList(session.preferences, request),
        }))
    }

    const updateList = (request: UpdateListRequest) => {
        updateSession((session) => ({
            ...session,
            preferences: UserListsService.updateList(session.preferences, request),
        }))
    }

    const deleteList = (listId: string) => {
        updateSession((session) => ({
            ...session,
            preferences: UserListsService.deleteList(session.preferences, listId),
        }))
    }

    const addToList = (listId: string, content: Content) => {
        updateSession((session) => ({
            ...session,
            preferences: UserListsService.addToList(session.preferences, { listId, content }),
        }))
    }

    const removeFromList = (listId: string, contentId: number) => {
        updateSession((session) => ({
            ...session,
            preferences: UserListsService.removeFromList(session.preferences, {
                listId,
                contentId,
            }),
        }))
    }

    const getList = (listId: string): UserList | null => {
        return UserListsService.getList(guestSession.preferences, listId)
    }

    const isContentInList = (listId: string, contentId: number): boolean => {
        return UserListsService.isContentInList(guestSession.preferences, listId, contentId)
    }

    const getListsContaining = (contentId: number): UserList[] => {
        return UserListsService.getListsContaining(guestSession.preferences, contentId)
    }

    const getDefaultLists = () => {
        return UserListsService.getDefaultLists(guestSession.preferences)
    }

    const getCustomLists = (): UserList[] => {
        return UserListsService.getCustomLists(guestSession.preferences)
    }

    // Account management functions
    const clearAccountData = () => {
        const clearedPrefs = GuestStorageService.clearCurrentGuestData(guestSession.guestId)
        setGuestSession((prev) => ({
            ...prev,
            preferences: clearedPrefs,
        }))
    }

    const getAccountDataSummary = () => {
        return GuestStorageService.getDataSummary(guestSession.guestId)
    }

    const exportAccountData = () => {
        return GuestStorageService.exportGuestData(guestSession.guestId)
    }

    return {
        // Session info
        guestSession,
        isGuest: true,
        isAuthenticated: false,
        sessionId: guestSession.guestId,

        // Data
        watchlist: guestSession.preferences.watchlist,
        ratings: guestSession.preferences.ratings,
        userLists: guestSession.preferences.userLists,

        // Rating actions
        setRating,
        removeRating,
        getRating,

        // Watchlist actions
        addToWatchlist,
        removeFromWatchlist,
        isInWatchlist,

        // List management actions
        createList,
        updateList,
        deleteList,
        addToList,
        removeFromList,
        getList,
        isContentInList,
        getListsContaining,
        getDefaultLists,
        getCustomLists,

        // Account management actions (guest-specific)
        clearAccountData,
        getAccountDataSummary,
        exportAccountData,
    }
}
