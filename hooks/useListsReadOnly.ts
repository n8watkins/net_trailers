import { useSessionStore } from '../stores/sessionStore'
import { useAuthStore } from '../stores/authStore'
import { useGuestStore } from '../stores/guestStore'

/**
 * Lightweight hook for components that only need read-only list access
 * Directly uses Zustand stores without triggering syncs
 * NEW SCHEMA - Works with userCreatedWatchlists only (no default lists)
 */
export const useListsReadOnly = () => {
    const sessionType = useSessionStore((state) => state.sessionType)

    // Use the appropriate store based on session type
    const authLists = useAuthStore((state) => state.userCreatedWatchlists)
    const guestLists = useGuestStore((state) => state.userCreatedWatchlists)

    const isAuth = sessionType === 'authenticated'
    const userCreatedWatchlists = isAuth ? authLists : guestLists

    // Get all custom lists (all lists are custom in new schema)
    const getAllLists = () => {
        return userCreatedWatchlists
    }

    const getListsContaining = (contentId: number) => {
        return userCreatedWatchlists.filter((list) =>
            list.items.some((item) => item.id === contentId)
        )
    }

    const getList = (listId: string) => {
        return userCreatedWatchlists.find((l) => l.id === listId) || null
    }

    const isContentInList = (listId: string, contentId: number) => {
        const list = userCreatedWatchlists.find((l) => l.id === listId)
        return list ? list.items.some((item) => item.id === contentId) : false
    }

    return {
        userCreatedWatchlists,
        getAllLists,
        getListsContaining,
        getList,
        isContentInList,
    }
}
