import { useEffect } from 'react'
import { useRecoilState, useRecoilValue } from 'recoil'
import {
    sessionTypeState,
    activeSessionIdState,
    isSessionInitializedState,
    migrationAvailableState,
    isTransitioningSessionState,
    currentSessionInfoSelector,
} from '../atoms/sessionManagerAtom'
import { userSessionState } from '../atoms/userDataAtom'
import { SessionManagerService, SessionManagerState } from '../services/sessionManagerService'
import { GuestStorageService } from '../services/guestStorageService'
import { AuthStorageService } from '../services/authStorageService'
import useAuth from './useAuth'

export function useSessionManager() {
    const { user } = useAuth()

    // Session manager state
    const [sessionType, setSessionType] = useRecoilState(sessionTypeState)
    const [activeSessionId, setActiveSessionId] = useRecoilState(activeSessionIdState)
    const [isSessionInitialized, setIsSessionInitialized] =
        useRecoilState(isSessionInitializedState)
    const [migrationAvailable, setMigrationAvailable] = useRecoilState(migrationAvailableState)
    const [isTransitioning, setIsTransitioning] = useRecoilState(isTransitioningSessionState)

    // Unified session state
    const [userSession, setUserSession] = useRecoilState(userSessionState)

    // Current session info
    const currentSession = useRecoilValue(currentSessionInfoSelector)

    // Create state object for service
    const state: SessionManagerState = {
        setSessionType,
        setActiveSessionId,
        setIsSessionInitialized,
        setMigrationAvailable,
        setIsTransitioning,
        setUserSession,
    }

    // Initialize session when auth state changes
    useEffect(() => {
        console.log('📡 [useSessionManager] useEffect triggered - auth state changed', {
            user: user?.uid,
            isTransitioning,
            isSessionInitialized,
            timestamp: new Date().toISOString(),
        })

        const initializeSession = async () => {
            if (!isTransitioning && !isSessionInitialized) {
                console.log('🔄 [useSessionManager] Initializing session...', {
                    user: user?.uid,
                    isTransitioning,
                    isInitialized: isSessionInitialized,
                })

                try {
                    console.log(
                        '🔄 [useSessionManager] Calling SessionManagerService.initializeSession'
                    )
                    await SessionManagerService.initializeSession(user, state)
                    console.log('✅ [useSessionManager] Session initialization completed')
                } catch (error) {
                    console.error('🚨 [useSessionManager] Session initialization failed:', error)
                }
            } else {
                console.log('🔄 [useSessionManager] Skipping session initialization', {
                    isTransitioning,
                    isSessionInitialized,
                    reason: isTransitioning ? 'transitioning' : 'already initialized',
                })
            }
        }

        // Initialize session immediately when conditions are met
        initializeSession()
    }, [user, isTransitioning, isSessionInitialized])

    // Fallback: Force guest session initialization if Firebase auth is stuck
    useEffect(() => {
        if (!isSessionInitialized && !isTransitioning && sessionType === 'initializing') {
            console.log(
                '🚨 Firebase auth appears stuck, forcing guest session initialization after 2s timeout'
            )
            const fallbackTimer = setTimeout(async () => {
                if (!isSessionInitialized && !isTransitioning) {
                    console.log('🚨 Forcing guest session initialization due to auth timeout')
                    try {
                        // Force initialize guest session regardless of auth state
                        await SessionManagerService.initializeSession(null, state)
                    } catch (error) {
                        console.error('🚨 Fallback session initialization failed:', error)
                    }
                }
            }, 1000) // 1 second timeout - reduced for better UX

            return () => clearTimeout(fallbackTimer)
        }
    }, [isSessionInitialized, isTransitioning, sessionType, state])

    // Handle session type switching
    const switchToGuest = async () => {
        if (sessionType !== 'guest' && !isTransitioning) {
            console.log('🎭 Switching to guest mode...')
            await SessionManagerService.switchToGuestMode(state)
        }
    }

    const switchToAuth = async () => {
        if (user && sessionType !== 'authenticated' && !isTransitioning) {
            await SessionManagerService.switchToAuthMode(user, state)
        }
    }

    // Initialize guest session
    const startGuestSession = async () => {
        const guestId = GuestStorageService.getGuestId()
        const preferences = GuestStorageService.loadGuestData(guestId)

        setUserSession({
            isGuest: true,
            guestId,
            userId: undefined,
            preferences,
            isActive: true,
            lastSyncedAt: Date.now(),
            createdAt: Date.now(),
        })

        setSessionType('guest')
        setActiveSessionId(guestId)
        setIsSessionInitialized(true)

        console.log('🎭 Guest session started:', guestId)
    }

    // Initialize a fresh guest session (for complete data isolation)
    const startFreshGuestSession = async () => {
        const guestId = GuestStorageService.createFreshGuestSession()
        const preferences = GuestStorageService.loadGuestData(guestId)

        setUserSession({
            isGuest: true,
            guestId,
            userId: undefined,
            preferences,
            isActive: true,
            lastSyncedAt: Date.now(),
            createdAt: Date.now(),
        })

        setSessionType('guest')
        setActiveSessionId(guestId)
        setIsSessionInitialized(true)

        console.log('🎭 Fresh guest session started:', guestId)
    }

    // Initialize auth session
    const startAuthSession = async () => {
        if (!user) return

        try {
            const preferences = await AuthStorageService.loadUserData(user.uid)

            setUserSession({
                isGuest: false,
                guestId: undefined,
                userId: user.uid,
                preferences,
                isActive: true,
                lastSyncedAt: Date.now(),
                createdAt: Date.now(),
            })

            setSessionType('authenticated')
            setActiveSessionId(user.uid)
            setIsSessionInitialized(true)
        } catch (error) {
            console.error('Failed to start auth session:', error)
            // Fallback to guest session
            await startGuestSession()
        }
    }

    // Clear all session data
    const clearAllSessions = () => {
        SessionManagerService.clearAllSessionData(state)
        console.log('🧹 All sessions cleared')
    }

    // Migration helpers
    const hasGuestDataForMigration = () => {
        const guestId = GuestStorageService.getGuestId()
        return guestId && GuestStorageService.hasGuestData(guestId)
    }

    const getGuestDataPreview = () => {
        const guestId = GuestStorageService.getGuestId()
        if (!guestId) return null

        return GuestStorageService.getGuestDataOverview(guestId)
    }

    const clearMigrationFlag = () => {
        setMigrationAvailable(false)
    }

    // Debug helpers
    const logCurrentState = () => {
        SessionManagerService.logCurrentState(sessionType, activeSessionId, isSessionInitialized)

        console.log('📊 Session Details:', {
            session: {
                isGuest: userSession.isGuest,
                guestId: userSession.guestId,
                userId: userSession.userId,
                active: userSession.isActive,
                hasGuestData: userSession.guestId
                    ? GuestStorageService.hasGuestData(userSession.guestId)
                    : false,
            },
            migration: {
                available: migrationAvailable,
                hasGuestData: hasGuestDataForMigration(),
            },
        })
    }

    const getAllGuestSessions = () => {
        return GuestStorageService.getAllGuestSessions()
    }

    return {
        // Current session info
        currentSession,
        sessionType,
        activeSessionId,
        isSessionInitialized,
        isTransitioning,
        migrationAvailable,

        // Session switching
        switchToGuest,
        switchToAuth,
        startGuestSession,
        startFreshGuestSession,
        startAuthSession,
        clearAllSessions,

        // Migration helpers
        hasGuestDataForMigration,
        getGuestDataPreview,
        clearMigrationFlag,

        // Debug helpers
        logCurrentState,
        getAllGuestSessions,

        // Session state
        isGuest: sessionType === 'guest',
        isAuthenticated: sessionType === 'authenticated',
        isInitializing: sessionType === 'initializing',
    }
}
