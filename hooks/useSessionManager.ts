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
import { guestSessionState, isGuestSessionActiveState } from '../atoms/guestSessionAtom'
import { authSessionState, isAuthSessionActiveState } from '../atoms/authSessionAtom'
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

    // Session state atoms
    const [guestSession, setGuestSession] = useRecoilState(guestSessionState)
    const [authSession, setAuthSession] = useRecoilState(authSessionState)
    const [isGuestActive, setIsGuestActive] = useRecoilState(isGuestSessionActiveState)
    const [isAuthActive, setIsAuthActive] = useRecoilState(isAuthSessionActiveState)

    // Current session info
    const currentSession = useRecoilValue(currentSessionInfoSelector)

    // Create state object for service
    const state: SessionManagerState = {
        setSessionType,
        setActiveSessionId,
        setIsSessionInitialized,
        setMigrationAvailable,
        setIsTransitioning,
        setGuestSession,
        setAuthSession,
        setIsGuestActive,
        setIsAuthActive,
    }

    // Initialize session when auth state changes
    useEffect(() => {
        const initializeSession = async () => {
            if (!isTransitioning) {
                console.log('🔄 Initializing session...', {
                    user: user?.uid,
                    currentType: sessionType,
                })
                await SessionManagerService.initializeSession(user, state)
            }
        }

        initializeSession()
    }, [user?.uid]) // Only re-run when user ID changes

    // Handle session type switching
    const switchToGuest = async () => {
        if (sessionType !== 'guest' && !isTransitioning) {
            console.log('🎭 Switching to guest mode...')
            await SessionManagerService.switchToGuestMode(state)
        }
    }

    const switchToAuth = async () => {
        if (user && sessionType !== 'authenticated' && !isTransitioning) {
            console.log('🔐 Switching to auth mode...')
            await SessionManagerService.switchToAuthMode(user, state)
        }
    }

    // Initialize guest session
    const startGuestSession = async () => {
        const guestId = GuestStorageService.getGuestId()
        const preferences = GuestStorageService.loadGuestData(guestId)

        setGuestSession({
            guestId,
            preferences,
            isActive: true,
            createdAt: Date.now(),
        })

        setIsGuestActive(true)
        setIsAuthActive(false)
        setSessionType('guest')
        setActiveSessionId(guestId)
        setIsSessionInitialized(true)

        console.log('🎭 Guest session started:', guestId)
    }

    // Initialize auth session
    const startAuthSession = async () => {
        if (!user) return

        try {
            const preferences = await AuthStorageService.loadUserData(user.uid)

            setAuthSession({
                userId: user.uid,
                preferences,
                isActive: true,
                lastSyncedAt: Date.now(),
            })

            setIsAuthActive(true)
            setIsGuestActive(false)
            setSessionType('authenticated')
            setActiveSessionId(user.uid)
            setIsSessionInitialized(true)

            console.log('🔐 Auth session started:', user.uid)
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
            guest: {
                id: guestSession.guestId,
                active: isGuestActive,
                hasData: GuestStorageService.hasGuestData(guestSession.guestId),
            },
            auth: {
                id: authSession.userId,
                active: isAuthActive,
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
