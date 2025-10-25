import { useEffect, useCallback } from 'react'
import { useSessionStore } from '../stores/sessionStore'
import { useAuthStore } from '../stores/authStore'
import { useGuestStore } from '../stores/guestStore'
import { SessionManagerService, SessionManagerState } from '../services/sessionManagerService'
import { GuestStorageService } from '../services/guestStorageService'
import { UserSession } from '../atoms/userDataAtom'
import useAuth from './useAuth'

export function useSessionManager() {
    const { user, loading: authLoading } = useAuth()

    // Session manager state from Zustand stores
    const sessionStore = useSessionStore()
    const authStore = useAuthStore()
    const guestStore = useGuestStore()

    const {
        sessionType,
        activeSessionId,
        isInitialized: isSessionInitialized,
        isTransitioning,
        migrationAvailable,
        setSessionType,
        setActiveSessionId,
        setIsInitialized: setIsSessionInitialized,
        setMigrationAvailable,
        setTransitioning: setIsTransitioning,
    } = sessionStore

    // Create a unified setUserSession wrapper for SessionManagerService compatibility
    // This bridges the old UserSession concept to the new Zustand store architecture
    const setUserSession = useCallback(
        (sessionInput: UserSession | ((prev: UserSession) => UserSession)) => {
            // Handle function updates (for compatibility with Recoil-style updaters)
            let session: UserSession
            if (typeof sessionInput === 'function') {
                // Reconstruct current UserSession from stores
                const currentSession: UserSession = {
                    isGuest: sessionType === 'guest',
                    guestId: sessionType === 'guest' ? activeSessionId : undefined,
                    userId: sessionType === 'authenticated' ? activeSessionId : undefined,
                    preferences:
                        sessionType === 'guest'
                            ? {
                                  defaultWatchlist: guestStore.defaultWatchlist,
                                  likedMovies: guestStore.likedMovies,
                                  hiddenMovies: guestStore.hiddenMovies,
                                  userCreatedWatchlists: guestStore.userCreatedWatchlists,
                                  lastActive: guestStore.lastActive,
                                  autoMute: guestStore.autoMute ?? true,
                                  defaultVolume: guestStore.defaultVolume ?? 50,
                                  childSafetyMode: guestStore.childSafetyMode ?? false,
                              }
                            : {
                                  defaultWatchlist: authStore.defaultWatchlist,
                                  likedMovies: authStore.likedMovies,
                                  hiddenMovies: authStore.hiddenMovies,
                                  userCreatedWatchlists: authStore.userCreatedWatchlists,
                                  lastActive: authStore.lastActive,
                                  autoMute: authStore.autoMute ?? false,
                                  defaultVolume: authStore.defaultVolume ?? 50,
                                  childSafetyMode: authStore.childSafetyMode ?? false,
                              },
                    isActive: true,
                    lastSyncedAt: Date.now(),
                    createdAt: Date.now(),
                }
                session = sessionInput(currentSession)
            } else {
                session = sessionInput
            }

            // Update the appropriate stores based on session type
            if (session.isGuest && session.guestId) {
                // Update guest store
                guestStore.loadData({
                    guestId: session.guestId,
                    likedMovies: session.preferences.likedMovies,
                    hiddenMovies: session.preferences.hiddenMovies,
                    defaultWatchlist: session.preferences.defaultWatchlist,
                    userCreatedWatchlists: session.preferences.userCreatedWatchlists,
                    lastActive: session.preferences.lastActive,
                    autoMute: session.preferences.autoMute,
                    defaultVolume: session.preferences.defaultVolume,
                    childSafetyMode: session.preferences.childSafetyMode,
                })
            } else if (!session.isGuest && session.userId) {
                // Update auth store
                authStore.loadData({
                    userId: session.userId,
                    likedMovies: session.preferences.likedMovies,
                    hiddenMovies: session.preferences.hiddenMovies,
                    defaultWatchlist: session.preferences.defaultWatchlist,
                    userCreatedWatchlists: session.preferences.userCreatedWatchlists,
                    lastActive: session.preferences.lastActive,
                    autoMute: session.preferences.autoMute,
                    defaultVolume: session.preferences.defaultVolume,
                    childSafetyMode: session.preferences.childSafetyMode,
                    syncStatus: 'synced', // Set as synced since we're loading data
                })
            }

            console.log('[useSessionManager] setUserSession updated stores:', {
                isGuest: session.isGuest,
                sessionId: session.guestId || session.userId,
            })
        },
        [sessionType, activeSessionId, authStore, guestStore]
    )

    // Current session info (reconstructed from stores)
    const currentSession = {
        sessionType,
        activeSessionId,
        isInitialized: isSessionInitialized,
    }

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
        // Use guest store's syncFromLocalStorage which handles everything
        guestStore.syncFromLocalStorage(guestId)

        setSessionType('guest')
        setActiveSessionId(guestId)
        setIsSessionInitialized(true)

        console.log('🎭 Guest session started:', guestId)
    }

    // Initialize a fresh guest session (for complete data isolation)
    const startFreshGuestSession = async () => {
        const guestId = GuestStorageService.createFreshGuestSession()
        // Use guest store's syncFromLocalStorage to load the fresh session
        guestStore.syncFromLocalStorage(guestId)

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
            // Just set up the session state here - auth store will load data async
            setSessionType('authenticated')
            setActiveSessionId(user.uid)
            setIsSessionInitialized(true)

            // Note: authStore.loadUserData is called by SessionSyncManager
            console.log('🔐 Auth session started:', user.uid)
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

        const isGuest = sessionType === 'guest'
        const guestId = isGuest ? activeSessionId : undefined
        const userId = !isGuest ? activeSessionId : undefined

        console.log('📊 Session Details:', {
            session: {
                isGuest,
                guestId,
                userId,
                active: isSessionInitialized,
                hasGuestData: guestId ? GuestStorageService.hasGuestData(guestId) : false,
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
