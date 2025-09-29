import { useSessionStore } from '../stores/sessionStore'
import { useAuthStore } from '../stores/authStore'
import { useGuestStore } from '../stores/guestStore'
import { UserListsService } from '../services/userListsService'

/**
 * Lightweight hook for components that only need read-only list access
 * Directly uses Zustand stores without triggering syncs
 */
export const useListsReadOnly = () => {
    const sessionType = useSessionStore((state) => state.sessionType)

    // Use the appropriate store based on session type
    const authUserLists = useAuthStore((state) => state.userLists)
    const guestUserLists = useGuestStore((state) => state.userLists)

    const isAuth = sessionType === 'authenticated'
    const userLists = isAuth ? authUserLists : guestUserLists

    const getDefaultLists = () => {
        return UserListsService.getDefaultLists({ userLists } as any)
    }

    const getCustomLists = () => {
        return UserListsService.getCustomLists({ userLists } as any)
    }

    const getListsContaining = (contentId: number) => {
        return userLists.lists.filter((list) => list.items.some((item) => item.id === contentId))
    }

    const getList = (listId: string) => {
        return userLists.lists.find((l) => l.id === listId) || null
    }

    const isContentInList = (listId: string, contentId: number) => {
        const list = userLists.lists.find((l) => l.id === listId)
        return list ? list.items.some((item) => item.id === contentId) : false
    }

    return {
        userLists,
        getDefaultLists,
        getCustomLists,
        getListsContaining,
        getList,
        isContentInList,
    }
}
