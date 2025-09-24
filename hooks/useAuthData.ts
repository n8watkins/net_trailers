import { useRecoilState } from 'recoil'
import { authSessionState, AuthSession } from '../atoms/authSessionAtom'
import { AuthStorageService } from '../services/authStorageService'
import { UserListsService } from '../services/userListsService'
import { Content } from '../typings'
import { UserList, CreateListRequest, UpdateListRequest } from '../types/userLists'

export function useAuthData(userId: string) {
    const [authSession, setAuthSession] = useRecoilState(authSessionState)

    // Save data whenever preferences change
    const saveAuthData = async (updatedSession: AuthSession) => {
        if (updatedSession.userId && updatedSession.preferences) {
            try {
                await AuthStorageService.saveUserData(
                    updatedSession.userId,
                    updatedSession.preferences
                )
            } catch (error) {
                console.error('Failed to save auth data:', error)
            }
        }
    }

    // Update session helper
    const updateSession = (updater: (session: AuthSession) => AuthSession) => {
        setAuthSession((prev) => {
            const updated = updater(prev)
            // Save asynchronously without blocking UI
            saveAuthData(updated)
            return updated
        })
    }

    // Rating operations
    const setRating = (contentId: number, rating: 'liked' | 'disliked', content?: Content) => {
        updateSession((session) => ({
            ...session,
            preferences: AuthStorageService.addRating(
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
            preferences: AuthStorageService.removeRating(session.preferences, contentId),
        }))
    }

    const getRating = (contentId: number) => {
        return AuthStorageService.getRating(authSession.preferences, contentId)
    }

    // Watchlist operations
    const addToWatchlist = (content: Content) => {
        updateSession((session) => ({
            ...session,
            preferences: AuthStorageService.addToWatchlist(session.preferences, content),
        }))
    }

    const removeFromWatchlist = (contentId: number) => {
        updateSession((session) => ({
            ...session,
            preferences: AuthStorageService.removeFromWatchlist(session.preferences, contentId),
        }))
    }

    const isInWatchlist = (contentId: number) => {
        return AuthStorageService.isInWatchlist(authSession.preferences, contentId)
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
        return UserListsService.getList(authSession.preferences, listId)
    }

    const isContentInList = (listId: string, contentId: number): boolean => {
        return UserListsService.isContentInList(authSession.preferences, listId, contentId)
    }

    const getListsContaining = (contentId: number): UserList[] => {
        return UserListsService.getListsContaining(authSession.preferences, contentId)
    }

    const getDefaultLists = () => {
        return UserListsService.getDefaultLists(authSession.preferences)
    }

    const getCustomLists = (): UserList[] => {
        return UserListsService.getCustomLists(authSession.preferences)
    }

    // Force sync with Firebase (useful for offline recovery)
    const forceSyncData = async () => {
        if (authSession.userId) {
            try {
                const freshData = await AuthStorageService.loadUserData(authSession.userId)
                setAuthSession((prev) => ({
                    ...prev,
                    preferences: freshData,
                    lastSyncedAt: Date.now(),
                }))
            } catch (error) {
                console.error('Failed to force sync auth data:', error)
            }
        }
    }

    // Account management functions
    const clearAccountData = async () => {
        if (authSession.userId) {
            try {
                const clearedPrefs = await AuthStorageService.clearUserData(authSession.userId)
                setAuthSession((prev) => ({
                    ...prev,
                    preferences: clearedPrefs,
                    lastSyncedAt: Date.now(),
                }))
            } catch (error) {
                console.error('Failed to clear account data:', error)
                throw error
            }
        }
    }

    const getAccountDataSummary = async () => {
        if (authSession.userId) {
            return await AuthStorageService.getDataSummary(authSession.userId)
        }
        return {
            watchlistCount: 0,
            ratingsCount: 0,
            listsCount: 0,
            totalItems: 0,
            isEmpty: true,
        }
    }

    const exportAccountData = async () => {
        if (authSession.userId) {
            return await AuthStorageService.exportUserData(authSession.userId)
        }
        throw new Error('No authenticated user to export data for')
    }

    const deleteAccount = async () => {
        if (authSession.userId) {
            await AuthStorageService.deleteUserAccount(authSession.userId)
            // Note: This only deletes the data, not the Firebase Auth account
            // The Auth account deletion should be handled separately
        } else {
            throw new Error('No authenticated user to delete account for')
        }
    }

    const softDeleteAccount = async () => {
        if (authSession.userId) {
            await AuthStorageService.softDeleteUserData(authSession.userId)
        } else {
            throw new Error('No authenticated user to soft delete account for')
        }
    }

    const restoreAccount = async (): Promise<boolean> => {
        if (authSession.userId) {
            const restored = await AuthStorageService.restoreUserData(authSession.userId)
            if (restored) {
                // Reload the data
                await forceSyncData()
            }
            return restored
        }
        return false
    }

    return {
        // Session info
        authSession,
        isGuest: false,
        isAuthenticated: true,
        sessionId: authSession.userId,

        // Data
        watchlist: authSession.preferences.watchlist,
        ratings: authSession.preferences.ratings,
        userLists: authSession.preferences.userLists,

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

        // Auth-specific actions
        forceSyncData,

        // Account management actions (auth-specific)
        clearAccountData,
        getAccountDataSummary,
        exportAccountData,
        deleteAccount,
        softDeleteAccount,
        restoreAccount,
    }
}
