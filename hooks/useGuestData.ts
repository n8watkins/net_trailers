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

    // Liked/Hidden operations (replaces rating operations)
    const addLikedMovie = (content: Content) => {
        updateSession((session) => ({
            ...session,
            preferences: GuestStorageService.addLikedMovie(session.preferences, content),
        }))
    }

    const removeLikedMovie = (contentId: number) => {
        updateSession((session) => ({
            ...session,
            preferences: GuestStorageService.removeLikedMovie(session.preferences, contentId),
        }))
    }

    const addHiddenMovie = (content: Content) => {
        updateSession((session) => ({
            ...session,
            preferences: GuestStorageService.addHiddenMovie(session.preferences, content),
        }))
    }

    const removeHiddenMovie = (contentId: number) => {
        updateSession((session) => ({
            ...session,
            preferences: GuestStorageService.removeHiddenMovie(session.preferences, contentId),
        }))
    }

    const isLiked = (contentId: number) => {
        return GuestStorageService.isLiked(guestSession.preferences, contentId)
    }

    const isHidden = (contentId: number) => {
        return GuestStorageService.isHidden(guestSession.preferences, contentId)
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

    const getAllLists = (): UserList[] => {
        return UserListsService.getAllLists(guestSession.preferences)
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

        // Data (NEW SCHEMA)
        defaultWatchlist: guestSession.preferences.defaultWatchlist,
        likedMovies: guestSession.preferences.likedMovies,
        hiddenMovies: guestSession.preferences.hiddenMovies,
        userCreatedWatchlists: guestSession.preferences.userCreatedWatchlists,

        // Liked/Hidden actions (replaces rating actions)
        addLikedMovie,
        removeLikedMovie,
        addHiddenMovie,
        removeHiddenMovie,
        isLiked,
        isHidden,

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
        getAllLists,

        // Account management actions (guest-specific)
        clearAccountData,
        getAccountDataSummary,
        exportAccountData,
    }
}
