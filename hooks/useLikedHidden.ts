import { useSessionStore } from '../stores/sessionStore'
import { useAuthStore } from '../stores/authStore'
import { useGuestStore } from '../stores/guestStore'
import { Content } from '../typings'

/**
 * Lightweight hook for components that need liked/hidden operations
 * Directly uses Zustand stores based on session type
 * Replaces the old useRatings hook
 */
export const useLikedHidden = () => {
    const sessionType = useSessionStore((state) => state.sessionType)

    // Use the appropriate store based on session type
    const authLikedMovies = useAuthStore((state) => state.likedMovies)
    const authHiddenMovies = useAuthStore((state) => state.hiddenMovies)
    const authAddLikedMovie = useAuthStore((state) => state.addLikedMovie)
    const authRemoveLikedMovie = useAuthStore((state) => state.removeLikedMovie)
    const authAddHiddenMovie = useAuthStore((state) => state.addHiddenMovie)
    const authRemoveHiddenMovie = useAuthStore((state) => state.removeHiddenMovie)

    const guestLikedMovies = useGuestStore((state) => state.likedMovies)
    const guestHiddenMovies = useGuestStore((state) => state.hiddenMovies)
    const guestAddLikedMovie = useGuestStore((state) => state.addLikedMovie)
    const guestRemoveLikedMovie = useGuestStore((state) => state.removeLikedMovie)
    const guestAddHiddenMovie = useGuestStore((state) => state.addHiddenMovie)
    const guestRemoveHiddenMovie = useGuestStore((state) => state.removeHiddenMovie)

    const isAuth = sessionType === 'authenticated'
    const likedMovies = isAuth ? authLikedMovies : guestLikedMovies
    const hiddenMovies = isAuth ? authHiddenMovies : guestHiddenMovies
    const addLikedMovie = isAuth ? authAddLikedMovie : guestAddLikedMovie
    const removeLikedMovie = isAuth ? authRemoveLikedMovie : guestRemoveLikedMovie
    const addHiddenMovie = isAuth ? authAddHiddenMovie : guestAddHiddenMovie
    const removeHiddenMovie = isAuth ? authRemoveHiddenMovie : guestRemoveHiddenMovie

    const isLiked = (contentId: number) => {
        return likedMovies.some((m) => m.id === contentId)
    }

    const isHidden = (contentId: number) => {
        return hiddenMovies.some((m) => m.id === contentId)
    }

    const toggleLiked = (content: Content) => {
        if (isLiked(content.id)) {
            removeLikedMovie(content.id)
        } else {
            addLikedMovie(content)
        }
    }

    const toggleHidden = (content: Content) => {
        if (isHidden(content.id)) {
            removeHiddenMovie(content.id)
        } else {
            addHiddenMovie(content)
        }
    }

    return {
        likedMovies,
        hiddenMovies,
        isLiked,
        isHidden,
        addLikedMovie,
        removeLikedMovie,
        addHiddenMovie,
        removeHiddenMovie,
        toggleLiked,
        toggleHidden,
    }
}
