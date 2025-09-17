import { useEffect } from 'react'
import { useRecoilState } from 'recoil'
import { userSessionState } from '../atoms/userDataAtom'
import { UserDataService } from '../services/userDataService'
import { Content } from '../typings'
import useAuth from './useAuth'

export default function useUserData() {
    const [userSession, setUserSession] = useRecoilState(userSessionState)
    const { user } = useAuth()

    // Initialize user session on mount
    useEffect(() => {
        if (user) {
            // Authenticated user - load from Firebase (TODO: implement)
            setUserSession(prev => ({
                ...prev,
                isGuest: false,
                userId: user.uid,
                guestId: undefined,
            }))
        } else if (!userSession.isGuest && !userSession.userId) {
            // Not authenticated and no guest session - create guest session
            const guestId = UserDataService.getGuestId()
            const guestData = UserDataService.loadGuestData()

            setUserSession({
                isGuest: true,
                guestId,
                userId: undefined,
                preferences: guestData,
            })
        }
    }, [user, userSession.isGuest, userSession.userId, setUserSession])

    // Save guest data whenever preferences change
    useEffect(() => {
        if (userSession.isGuest && userSession.preferences) {
            UserDataService.saveGuestData(userSession.preferences)
        }
    }, [userSession.isGuest, userSession.preferences])

    // Add or update rating for content
    const setRating = (contentId: number, rating: 'liked' | 'disliked' | 'loved') => {
        setUserSession(prev => ({
            ...prev,
            preferences: UserDataService.addRating(prev.preferences, contentId, rating),
        }))
    }

    // Remove rating for content
    const removeRating = (contentId: number) => {
        setUserSession(prev => ({
            ...prev,
            preferences: UserDataService.removeRating(prev.preferences, contentId),
        }))
    }

    // Add content to watchlist
    const addToWatchlist = (content: Content) => {
        setUserSession(prev => ({
            ...prev,
            preferences: UserDataService.addToWatchlist(prev.preferences, content),
        }))
    }

    // Remove content from watchlist
    const removeFromWatchlist = (contentId: number) => {
        setUserSession(prev => ({
            ...prev,
            preferences: UserDataService.removeFromWatchlist(prev.preferences, contentId),
        }))
    }

    // Get rating for specific content
    const getRating = (contentId: number) => {
        return UserDataService.getRating(userSession.preferences, contentId)
    }

    // Check if content is in watchlist
    const isInWatchlist = (contentId: number) => {
        return UserDataService.isInWatchlist(userSession.preferences, contentId)
    }

    // Start guest session
    const startGuestSession = () => {
        const guestId = UserDataService.getGuestId()
        const guestData = UserDataService.loadGuestData()

        setUserSession({
            isGuest: true,
            guestId,
            userId: undefined,
            preferences: guestData,
        })
    }

    // Migrate guest data when user authenticates
    const migrateGuestData = async () => {
        if (userSession.isGuest && user && userSession.preferences) {
            await UserDataService.migrateGuestToAuth(userSession.preferences, user.uid)

            // Update session to authenticated user
            setUserSession(prev => ({
                isGuest: false,
                guestId: undefined,
                userId: user.uid,
                preferences: prev.preferences, // Keep the data
            }))
        }
    }

    return {
        userSession,
        isGuest: userSession.isGuest,
        isAuthenticated: !!user && !userSession.isGuest,
        watchlist: userSession.preferences.watchlist,
        ratings: userSession.preferences.ratings,

        // Actions
        setRating,
        removeRating,
        addToWatchlist,
        removeFromWatchlist,
        getRating,
        isInWatchlist,
        startGuestSession,
        migrateGuestData,
    }
}