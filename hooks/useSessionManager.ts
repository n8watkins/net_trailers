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
import useAuth from './useAuth'

export function useSessionManager() {
    const { user, loading: authLoading } = useAuth()

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

    // Initialize session when auth state changes
    useEffect(() => {
        const effectTime = Date.now()

        // Skip if we're already transitioning to prevent race conditions
        if (isTransitioning) {
            console.log('⏳ [SESSION-TIMING] Already transitioning, skipping initialization')
            return
        }

        // Create state object inside useEffect to ensure fresh references
        const state: SessionManagerState = {
            setSessionType,
            setActiveSessionId,
            setIsSessionInitialized,
            setMigrationAvailable,
            setIsTransitioning,
            setUserSession,
        }

        console.log('📡 [SESSION-TIMING] Auth state change detected', {
            user: user?.uid,
            userEmail: user?.email,
            userExists: !!user,
            authLoading,
            currentSessionType: sessionType,
            isSessionInitialized,
            isTransitioning,
            timestamp: new Date().toISOString(),
        })

        const initializeSession = async () => {
            // Determine what type of session we should have based on auth state
            const shouldBeAuthenticated = user !== null
            const isCurrentlyAuthenticated = sessionType === 'authenticated'
            const isInitializing = sessionType === 'initializing'

            // Check if we need to change session type
            const needsSessionChange =
                (shouldBeAuthenticated && !isCurrentlyAuthenticated) ||
                (!shouldBeAuthenticated && isCurrentlyAuthenticated)

            // Check if we need initial setup
            const needsInitialSetup = !isSessionInitialized && isInitializing

            if (needsSessionChange || needsInitialSetup) {
                const initStartTime = Date.now()
                console.log('🔄 [SESSION-TIMING] Session update required', {
                    needsSessionChange,
                    needsInitialSetup,
                    shouldBeAuthenticated,
                    isCurrentlyAuthenticated,
                    timeFromEffect: Date.now() - effectTime,
                })

                try {
                    const newSessionType = await SessionManagerService.initializeSession(
                        user,
                        state
                    )
                    const initTime = Date.now() - initStartTime
                    console.log(
                        `✅ [SESSION-TIMING] Session initialized to ${newSessionType} in ${initTime}ms`
                    )
                } catch (error) {
                    console.error('🚨 [SESSION-TIMING] Session initialization failed:', error)
                    // On error, ensure we at least have a guest session
                    if (sessionType === 'initializing') {
                        await SessionManagerService.initializeSession(null, state)
                    }
                }
            } else {
                console.log('⏭️ [SESSION-TIMING] No session change needed', {
                    authLoading,
                    sessionType,
                    isSessionInitialized,
                })
            }
        }

        initializeSession()
    }, [
        user,
        isTransitioning,
        sessionType,
        isSessionInitialized,
        setSessionType,
        setActiveSessionId,
        setIsSessionInitialized,
        setMigrationAvailable,
        setIsTransitioning,
        setUserSession,
    ])

    // Handle auth loading state - when auth context is ready but still determining auth status
    // This replaces the setTimeout approach with proper state management
    useEffect(() => {
        // If auth is done loading and we're still initializing, we know there's no user
        if (!authLoading && sessionType === 'initializing' && !isTransitioning) {
            console.log(
                '🎭 [useSessionManager] Auth loaded with no user, initializing guest session'
            )

            const state: SessionManagerState = {
                setSessionType,
                setActiveSessionId,
                setIsSessionInitialized,
                setMigrationAvailable,
                setIsTransitioning,
                setUserSession,
            }

            // Auth has confirmed no user, initialize guest session
            SessionManagerService.initializeSession(null, state).catch((error) => {
                console.error('🚨 Guest session initialization failed:', error)
            })
        }
    }, [
        authLoading,
        sessionType,
        isTransitioning,
        setSessionType,
        setActiveSessionId,
        setIsSessionInitialized,
        setMigrationAvailable,
        setIsTransitioning,
        setUserSession,
    ])

    // Handle session type switching
    const switchToGuest = async () => {
        if (sessionType !== 'guest' && !isTransitioning) {
            console.log('🎭 Switching to guest mode...')
            const state: SessionManagerState = {
                setSessionType,
                setActiveSessionId,
                setIsSessionInitialized,
                setMigrationAvailable,
                setIsTransitioning,
                setUserSession,
            }
            await SessionManagerService.switchToGuestMode(state)
        }
    }

    const switchToAuth = async () => {
        if (user && sessionType !== 'authenticated' && !isTransitioning) {
            const state: SessionManagerState = {
                setSessionType,
                setActiveSessionId,
                setIsSessionInitialized,
                setMigrationAvailable,
                setIsTransitioning,
                setUserSession,
            }
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
            // Data loading is handled by SessionSyncManager component
            // Just set up the session state here (NEW SCHEMA)
            setUserSession({
                isGuest: false,
                guestId: undefined,
                userId: user.uid,
                preferences: {
                    defaultWatchlist: [],
                    likedMovies: [],
                    hiddenMovies: [],
                    userCreatedWatchlists: [],
                    lastActive: Date.now(),
                },
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
        const state: SessionManagerState = {
            setSessionType,
            setActiveSessionId,
            setIsSessionInitialized,
            setMigrationAvailable,
            setIsTransitioning,
            setUserSession,
        }
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
