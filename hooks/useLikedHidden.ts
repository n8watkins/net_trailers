import { useSessionStore } from '../stores/sessionStore'
import { useAuthStore } from '../stores/authStore'
import { useGuestStore } from '../stores/guestStore'
import { Content } from '../typings'
import type { RatedContent } from '../types/shared'

/**
 * Lightweight hook for components that need liked/hidden/rating operations
 * Directly uses Zustand stores based on session type
 * Replaces the old useRatings hook
 *
 * Now also provides access to the unified myRatings system
 */
export const useLikedHidden = () => {
    const sessionType = useSessionStore((state) => state.sessionType)

    // Use the appropriate store based on session type
    const authLikedMovies = useAuthStore((state) => state.likedMovies)
    const authHiddenMovies = useAuthStore((state) => state.hiddenMovies)
    const authMyRatings = useAuthStore((state) => state.myRatings)
    const authAddLikedMovie = useAuthStore((state) => state.addLikedMovie)
    const authRemoveLikedMovie = useAuthStore((state) => state.removeLikedMovie)
    const authAddHiddenMovie = useAuthStore((state) => state.addHiddenMovie)
    const authRemoveHiddenMovie = useAuthStore((state) => state.removeHiddenMovie)
    const authRateContent = useAuthStore((state) => state.rateContent)
    const authRemoveRating = useAuthStore((state) => state.removeRating)
    const authGetRating = useAuthStore((state) => state.getRating)
    const authGetLikedContent = useAuthStore((state) => state.getLikedContent)
    const authGetDislikedContent = useAuthStore((state) => state.getDislikedContent)

    const guestLikedMovies = useGuestStore((state) => state.likedMovies)
    const guestHiddenMovies = useGuestStore((state) => state.hiddenMovies)
    const guestMyRatings = useGuestStore((state) => state.myRatings)
    const guestAddLikedMovie = useGuestStore((state) => state.addLikedMovie)
    const guestRemoveLikedMovie = useGuestStore((state) => state.removeLikedMovie)
    const guestAddHiddenMovie = useGuestStore((state) => state.addHiddenMovie)
    const guestRemoveHiddenMovie = useGuestStore((state) => state.removeHiddenMovie)
    const guestRateContent = useGuestStore((state) => state.rateContent)
    const guestRemoveRating = useGuestStore((state) => state.removeRating)
    const guestGetRating = useGuestStore((state) => state.getRating)
    const guestGetLikedContent = useGuestStore((state) => state.getLikedContent)
    const guestGetDislikedContent = useGuestStore((state) => state.getDislikedContent)

    const isAuth = sessionType === 'authenticated'

    // Legacy arrays (deprecated but maintained for backward compatibility)
    const likedMovies = isAuth ? authLikedMovies : guestLikedMovies
    const hiddenMovies = isAuth ? authHiddenMovies : guestHiddenMovies

    // New unified ratings
    const myRatings = isAuth ? authMyRatings : guestMyRatings

    // Legacy actions
    const addLikedMovie = isAuth ? authAddLikedMovie : guestAddLikedMovie
    const removeLikedMovie = isAuth ? authRemoveLikedMovie : guestRemoveLikedMovie
    const addHiddenMovie = isAuth ? authAddHiddenMovie : guestAddHiddenMovie
    const removeHiddenMovie = isAuth ? authRemoveHiddenMovie : guestRemoveHiddenMovie

    // New rating actions
    const rateContent = isAuth ? authRateContent : guestRateContent
    const removeRating = isAuth ? authRemoveRating : guestRemoveRating
    const getRatingFn = isAuth ? authGetRating : guestGetRating
    const getLikedContentFn = isAuth ? authGetLikedContent : guestGetLikedContent
    const getDislikedContentFn = isAuth ? authGetDislikedContent : guestGetDislikedContent

    const isLiked = (contentId: number) => {
        // Check myRatings first (new system), fall back to legacy
        const rating = getRatingFn(contentId)
        if (rating) {
            return rating.rating === 'like'
        }
        return likedMovies.some((m) => m.id === contentId)
    }

    const isHidden = (contentId: number) => {
        // Check myRatings first (new system), fall back to legacy
        const rating = getRatingFn(contentId)
        if (rating) {
            return rating.rating === 'dislike'
        }
        return hiddenMovies.some((m) => m.id === contentId)
    }

    const getRating = (contentId: number): 'like' | 'dislike' | null => {
        const rating = getRatingFn(contentId)
        if (rating) {
            return rating.rating
        }
        // Check legacy arrays
        if (likedMovies.some((m) => m.id === contentId)) return 'like'
        if (hiddenMovies.some((m) => m.id === contentId)) return 'dislike'
        return null
    }

    const toggleLiked = (content: Content) => {
        if (isLiked(content.id)) {
            removeRating(content.id)
        } else {
            rateContent(content, 'like')
        }
    }

    const toggleHidden = (content: Content) => {
        if (isHidden(content.id)) {
            removeRating(content.id)
        } else {
            rateContent(content, 'dislike')
        }
    }

    // Get liked content from myRatings
    const getLikedContent = (): Content[] => {
        return getLikedContentFn()
    }

    // Get disliked content from myRatings
    const getDislikedContent = (): Content[] => {
        return getDislikedContentFn()
    }

    return {
        // Legacy (deprecated but maintained)
        likedMovies,
        hiddenMovies,
        addLikedMovie,
        removeLikedMovie,
        addHiddenMovie,
        removeHiddenMovie,

        // New unified system
        myRatings,
        rateContent,
        removeRating,
        getRating,
        getLikedContent,
        getDislikedContent,

        // Utility functions
        isLiked,
        isHidden,
        toggleLiked,
        toggleHidden,
    }
}
