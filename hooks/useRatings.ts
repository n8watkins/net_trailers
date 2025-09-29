import { useSessionStore } from '../stores/sessionStore'
import { useAuthStore } from '../stores/authStore'
import { useGuestStore } from '../stores/guestStore'
import { Content } from '../typings'

/**
 * Lightweight hook for components that only need rating operations
 * Directly uses Zustand stores based on session type
 */
export const useRatings = () => {
    const sessionType = useSessionStore((state) => state.sessionType)

    // Use the appropriate store based on session type
    const authRatings = useAuthStore((state) => state.ratings)
    const authAddRating = useAuthStore((state) => state.addRating)
    const authRemoveRating = useAuthStore((state) => state.removeRating)

    const guestRatings = useGuestStore((state) => state.ratings)
    const guestAddRating = useGuestStore((state) => state.addRating)
    const guestRemoveRating = useGuestStore((state) => state.removeRating)

    const isAuth = sessionType === 'authenticated'
    const ratings = isAuth ? authRatings : guestRatings
    const addRating = isAuth ? authAddRating : guestAddRating
    const removeRating = isAuth ? authRemoveRating : guestRemoveRating

    const getRating = (contentId: number) => {
        return ratings.find((r) => r.contentId === contentId) || null
    }

    const setRating = (contentId: number, rating: 'liked' | 'disliked', content?: Content) => {
        addRating(contentId, rating, content)
    }

    return {
        ratings,
        getRating,
        setRating,
        removeRating,
    }
}
