import { useSessionStore } from '../stores/sessionStore'
import { useAuthStore } from '../stores/authStore'
import { useGuestStore } from '../stores/guestStore'
import { UserList } from '../types/userLists'

/**
 * Lightweight hook for components that only need read-only list access
 * Directly uses Zustand stores without triggering syncs
 * NEW SCHEMA - Includes default Watchlist + userCreatedWatchlists
 */
export const useListsReadOnly = () => {
    const sessionType = useSessionStore((state) => state.sessionType)

    // Use the appropriate store based on session type
    const authDefaultWatchlist = useAuthStore((state) => state.defaultWatchlist)
    const guestDefaultWatchlist = useGuestStore((state) => state.defaultWatchlist)
    const authLists = useAuthStore((state) => state.userCreatedWatchlists)
    const guestLists = useGuestStore((state) => state.userCreatedWatchlists)

    const isAuth = sessionType === 'authenticated'
    const defaultWatchlist = isAuth ? authDefaultWatchlist : guestDefaultWatchlist
    const userCreatedWatchlists = isAuth ? authLists : guestLists

    // Get all lists including default Watchlist + custom lists
    const getAllLists = (): UserList[] => {
        // Create a virtual "Watchlist" list from defaultWatchlist items
        const watchlistVirtual: UserList = {
            id: 'default-watchlist',
            name: 'Watchlist',
            items: defaultWatchlist,
            emoji: '📺',
            color: '#E50914',
            isPublic: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        }

        // Return Watchlist + custom lists
        return [watchlistVirtual, ...userCreatedWatchlists]
    }

    const getListsContaining = (contentId: number) => {
        const lists = getAllLists()
        return lists.filter((list) => list.items.some((item) => item.id === contentId))
    }

    const getList = (listId: string) => {
        const lists = getAllLists()
        return lists.find((l) => l.id === listId) || null
    }

    const isContentInList = (listId: string, contentId: number) => {
        const list = getList(listId)
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
