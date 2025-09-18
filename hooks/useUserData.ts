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
        const initializeUserSession = async () => {
            if (user && userSession.isGuest) {
                // User just authenticated - migrate guest data and load from Firebase
                try {
                    await UserDataService.migrateGuestToAuth(userSession.preferences, user.uid)
                    const userData = await UserDataService.loadUserData(user.uid)

                    setUserSession({
                        isGuest: false,
                        userId: user.uid,
                        guestId: undefined,
                        preferences: userData,
                    })
                } catch (error) {
                    console.error('Failed to migrate guest data:', error)
                    // Fallback to just switching to authenticated mode without migration
                    const userData = await UserDataService.loadUserData(user.uid)
                    setUserSession({
                        isGuest: false,
                        userId: user.uid,
                        guestId: undefined,
                        preferences: userData,
                    })
                }
            } else if (user && !userSession.isGuest && userSession.userId !== user.uid) {
                // Different authenticated user - load their data
                try {
                    const userData = await UserDataService.loadUserData(user.uid)
                    setUserSession({
                        isGuest: false,
                        userId: user.uid,
                        guestId: undefined,
                        preferences: userData,
                    })
                } catch (error) {
                    console.error('Failed to load user data:', error)
                }
            } else if (!user && !userSession.isGuest && !userSession.userId) {
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
        }

        initializeUserSession()
    }, [user, setUserSession])

    // Save data whenever preferences change
    useEffect(() => {
        const saveUserData = async () => {
            if (userSession.isGuest && userSession.preferences) {
                // Save guest data to localStorage
                UserDataService.saveGuestData(userSession.preferences)
            } else if (!userSession.isGuest && userSession.userId && userSession.preferences) {
                // Save authenticated user data to Firebase
                try {
                    await UserDataService.saveUserData(userSession.userId, userSession.preferences)
                } catch (error) {
                    console.error('Failed to save user data to Firebase:', error)
                }
            }
        }

        // Only save if preferences exist (avoid initial empty saves)
        if (userSession.preferences && (userSession.preferences.ratings.length > 0 || userSession.preferences.watchlist.length > 0)) {
            saveUserData()
        }
    }, [userSession.isGuest, userSession.userId, userSession.preferences])

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