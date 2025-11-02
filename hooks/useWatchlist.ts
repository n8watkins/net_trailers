import { useSessionStore } from '../stores/sessionStore'
import { useAuthStore } from '../stores/authStore'
import { useGuestStore } from '../stores/guestStore'

/**
 * Lightweight hook for components that only need watchlist operations
 * Directly uses Zustand stores based on session type
 */
export const useWatchlist = () => {
    const sessionType = useSessionStore((state) => state.sessionType)

    // Use the appropriate store based on session type
    const authWatchlist = useAuthStore((state) => state.defaultWatchlist)
    const authAddToWatchlist = useAuthStore((state) => state.addToWatchlist)
    const authRemoveFromWatchlist = useAuthStore((state) => state.removeFromWatchlist)

    const guestWatchlist = useGuestStore((state) => state.defaultWatchlist)
    const guestAddToWatchlist = useGuestStore((state) => state.addToWatchlist)
    const guestRemoveFromWatchlist = useGuestStore((state) => state.removeFromWatchlist)

    const isAuth = sessionType === 'authenticated'
    const watchlist = isAuth ? authWatchlist : guestWatchlist
    const addToWatchlist = isAuth ? authAddToWatchlist : guestAddToWatchlist
    const removeFromWatchlist = isAuth ? authRemoveFromWatchlist : guestRemoveFromWatchlist

    const isInWatchlist = (contentId: number) => {
        return watchlist.some((item) => item.id === contentId)
    }

    return {
        watchlist,
        addToWatchlist,
        removeFromWatchlist,
        isInWatchlist,
    }
}
