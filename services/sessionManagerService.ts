import { sessionLog, sessionError } from '../utils/debugLogger'
import { User } from 'firebase/auth'
import { UserPreferences, SessionType, UserSession } from '../types/shared'
import { SessionStorageService } from './sessionStorageService'
import { GuestStorageService } from './guestStorageService'

// Zustand-compatible setter type
type SetterOrUpdater<T> = (value: T | ((prev: T) => T)) => void

export interface SessionManagerState {
    setSessionType: SetterOrUpdater<SessionType>
    setActiveSessionId: SetterOrUpdater<string>
    setIsSessionInitialized: SetterOrUpdater<boolean>
    setMigrationAvailable: SetterOrUpdater<boolean>
    setIsTransitioning: SetterOrUpdater<boolean>
    setUserSession: SetterOrUpdater<any> // Updated to work with Zustand
}

export class SessionManagerService {
    private static generateGuestId(): string {
        return `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    // Initialize session based on auth state
    static async initializeSession(
        user: User | null,
        state: SessionManagerState
    ): Promise<SessionType> {
        const initStartTime = Date.now()
        sessionLog('🔄 [SERVICE-TIMING] SessionManagerService.initializeSession Starting...', {
            user: user ? { uid: user.uid, email: user.email } : null,
            userExists: !!user,
            timestamp: new Date().toISOString(),
        })

        // Check if there's an existing auth session stored
        const storedAuthId = this.getStoredAuthId()
        sessionLog('🔍 [SERVICE-TIMING] Stored auth ID check:', {
            hasStoredAuth: !!storedAuthId,
            storedAuthId,
            currentUser: user?.uid,
            match: storedAuthId === user?.uid,
        })

        state.setIsTransitioning(true)

        try {
            if (user) {
                // User is authenticated - initialize auth session
                sessionLog(
                    '✅ [SessionManagerService] User authenticated, initializing auth session for:',
                    user.email
                )
                // Store the auth session ID for persistence across refreshes
                this.storeAuthId(user.uid)
                const authStartTime = Date.now()
                const sessionType = await this.initializeAuthSession(user, state)
                const authTime = Date.now() - authStartTime
                const totalTime = Date.now() - initStartTime
                sessionLog(
                    `✅ [SERVICE-TIMING] Auth session initialized in ${authTime}ms, total: ${totalTime}ms`
                )
                state.setIsTransitioning(false)
                state.setIsSessionInitialized(true)
                return sessionType
            } else {
                // No user - clear any stored auth session and initialize guest session
                sessionLog(
                    '🎭 [SessionManagerService] No authenticated user, initializing guest session'
                )
                this.clearStoredAuthId()
                const sessionType = await this.initializeGuestSession(state)
                state.setIsTransitioning(false)
                state.setIsSessionInitialized(true)
                return sessionType
            }
        } catch (error) {
            sessionError('🚨 [SessionManagerService] Session initialization failed:', error)
            state.setIsTransitioning(false)

            // Fallback to guest session on error
            try {
                sessionLog('🎭 [SessionManagerService] Attempting fallback to guest session')
                const sessionType = await this.initializeGuestSession(state)
                state.setIsSessionInitialized(true)
                return sessionType
            } catch (fallbackError) {
                sessionError('🚨 [SessionManagerService] Fallback failed:', fallbackError)
                state.setIsSessionInitialized(true)
                return 'guest' // Return guest as last resort
            }
        }
    }

    // Initialize a fresh guest session (for complete data isolation)
    private static async initializeFreshGuestSession(
        state: SessionManagerState
    ): Promise<SessionType> {
        // Use dynamic import to avoid circular dependencies
        const { GuestStorageService } = await import('./guestStorageService')

        // CRITICAL: Clear any existing session data first for complete isolation
        sessionLog('🧹 Clearing previous session data for fresh guest session')
        this.clearSessionAtomState(state)

        // Force create a completely fresh guest session with session-isolated storage
        const guestId = GuestStorageService.createFreshGuestSession()

        // Initialize session-isolated storage for this guest
        SessionStorageService.initializeSession(guestId, 'guest')

        const guestPreferences = GuestStorageService.loadGuestData(guestId)

        const userSession: UserSession = {
            isGuest: true,
            guestId,
            userId: undefined,
            preferences: guestPreferences,
            isActive: true,
            lastSyncedAt: Date.now(),
            createdAt: Date.now(),
        }

        // Update atoms atomically
        state.setUserSession(userSession)
        state.setSessionType('guest')
        state.setActiveSessionId(guestId)

        sessionLog(`🎭 Fresh guest session initialized with isolation: ${guestId}`)
        return 'guest'
    }

    // Initialize guest session
    private static async initializeGuestSession(state: SessionManagerState): Promise<SessionType> {
        // Check if we have an existing guest session
        const existingGuestId = this.getStoredGuestId()
        const guestId = existingGuestId || this.generateGuestId()

        if (!existingGuestId) {
            this.storeGuestId(guestId)
        }

        // Initialize session-isolated storage for this guest
        SessionStorageService.initializeSession(guestId, 'guest')

        // Load guest data
        const guestPreferences = await this.loadGuestPreferences(guestId)

        const userSession: UserSession = {
            isGuest: true,
            guestId,
            userId: undefined,
            preferences: guestPreferences,
            isActive: true,
            lastSyncedAt: Date.now(),
            createdAt: Date.now(),
        }

        // Update atoms
        state.setUserSession(userSession)
        state.setSessionType('guest')
        state.setActiveSessionId(guestId)

        sessionLog(`🎭 Guest session initialized with isolation: ${guestId}`)
        return 'guest'
    }

    // Initialize authenticated session
    private static async initializeAuthSession(
        user: User,
        state: SessionManagerState
    ): Promise<SessionType> {
        const authInitStart = Date.now()
        sessionLog('🔐 [AUTH-INIT-TIMING] Starting auth session initialization', {
            userId: user.uid,
            email: user.email,
            timestamp: new Date().toISOString(),
        })

        // CRITICAL: Clear any existing session data first for complete isolation
        const clearStart = Date.now()
        sessionLog('🧹 [AUTH-INIT-TIMING] Clearing previous session data for auth session')
        this.clearSessionAtomState(state)
        sessionLog(`🧹 [AUTH-INIT-TIMING] Session cleared in ${Date.now() - clearStart}ms`)

        // Initialize session-isolated storage for this authenticated user
        const storageStart = Date.now()
        SessionStorageService.initializeSession(user.uid, 'auth')
        sessionLog(`💾 [AUTH-INIT-TIMING] Storage initialized in ${Date.now() - storageStart}ms`)

        // Check if guest data exists for potential migration
        const existingGuestId = this.getStoredGuestId()
        const hasGuestData = existingGuestId && this.hasGuestData(existingGuestId)

        if (hasGuestData) {
            state.setMigrationAvailable(true)
        }

        // Load auth data - but don't wait forever
        const loadStart = Date.now()

        // Start with default preferences and load Firebase data async
        let authPreferences = this.getDefaultUserPreferences()

        // Load Firebase data in background with timeout
        const currentUserId = user.uid
        this.loadAuthPreferences(currentUserId)
            .then((prefs) => {
                authPreferences = prefs
                sessionLog(
                    `📚 [AUTH-INIT-TIMING] Auth preferences loaded async in ${Date.now() - loadStart}ms for user:`,
                    currentUserId
                )

                // CRITICAL: Only update if this is still the current user
                // Check stored auth ID to prevent race conditions
                const storedAuthId = this.getStoredAuthId()
                if (storedAuthId === currentUserId) {
                    sessionLog(
                        `✅ Updating session with loaded data for correct user: ${currentUserId}`
                    )
                    // Update the session with loaded data
                    state.setUserSession({
                        isGuest: false,
                        guestId: undefined,
                        userId: currentUserId,
                        preferences: prefs,
                        isActive: true,
                        lastSyncedAt: Date.now(),
                        createdAt: Date.now(),
                    })
                } else {
                    sessionLog(
                        `⚠️ User changed (${storedAuthId} != ${currentUserId}), not updating session with stale data`
                    )
                }
            })
            .catch((error) => {
                sessionError('🚨 Failed to load auth preferences async:', error)
            })

        sessionLog(
            `📚 [AUTH-INIT-TIMING] Using default preferences initially, Firebase loading in background`
        )

        const userSession: UserSession = {
            isGuest: false,
            guestId: undefined,
            userId: user.uid,
            preferences: authPreferences,
            isActive: true,
            lastSyncedAt: Date.now(),
            createdAt: Date.now(),
        }

        // Update atoms atomically
        const atomStart = Date.now()
        sessionLog('🔄 [AUTH-INIT-TIMING] Updating atoms with auth session data')
        state.setUserSession(userSession)
        state.setSessionType('authenticated')
        state.setActiveSessionId(user.uid)
        sessionLog(`⚛️ [AUTH-INIT-TIMING] Atoms updated in ${Date.now() - atomStart}ms`)

        const totalAuthTime = Date.now() - authInitStart
        sessionLog(`🔐 [AUTH-INIT-TIMING] Auth session initialized in ${totalAuthTime}ms`, {
            sessionType: 'authenticated',
            userId: user.uid,
            isGuest: false,
            preferences: {
                watchlistCount: userSession.preferences.defaultWatchlist.length,
                likedCount: userSession.preferences.likedMovies.length,
                hiddenCount: userSession.preferences.hiddenMovies.length,
                listsCount: userSession.preferences.userCreatedWatchlists.length,
            },
            breakdown: {
                clearSession: `${clearStart}ms`,
                storage: `${storageStart}ms`,
                loadPrefs: `${loadStart}ms`,
                updateAtoms: `${atomStart}ms`,
                total: `${totalAuthTime}ms`,
            },
        })
        return 'authenticated'
    }

    // Switch to guest mode (when user logs out)
    static async switchToGuestMode(state: SessionManagerState): Promise<void> {
        sessionLog('🎭 [SessionManager] SWITCHING TO GUEST MODE - Starting logout session switch')
        state.setIsTransitioning(true)

        try {
            // CRITICAL: Clear stored auth ID immediately to prevent stale updates
            this.clearStoredAuthId()

            // CRITICAL: Clear shared state FIRST before any other operations
            sessionLog('🧹 [SessionManager] STEP 1: Force clearing shared state')
            this.clearSessionAtomState(state)

            // Ensure state is properly cleared before proceeding
            // Using a microtask to ensure state updates are processed
            await Promise.resolve()

            // Clean up any auth-specific data
            sessionLog('🧹 [SessionManager] STEP 2: Clearing auth session data')
            this.clearAuthSessionData()

            // Clear stored auth ID to prevent persistence issues
            this.clearStoredAuthId()

            // CRITICAL: Clear state AGAIN to ensure isolation
            sessionLog('🧹 [SessionManager] STEP 3: Double-clearing state for isolation')
            this.clearSessionAtomState(state)

            // Initialize new guest session (force fresh for isolation)
            sessionLog('🎭 [SessionManager] STEP 4: Initializing fresh guest session')
            await this.initializeFreshGuestSession(state)

            // CRITICAL: Final verification that state is properly isolated
            sessionLog(
                '✅ [SessionManager] STEP 5: Guest mode switch completed - should have complete isolation'
            )
        } finally {
            state.setIsTransitioning(false)
        }
    }

    // Switch to authenticated mode (when user logs in)
    static async switchToAuthMode(user: User, state: SessionManagerState): Promise<void> {
        state.setIsTransitioning(true)

        try {
            // Check if guest data exists
            const existingGuestId = this.getStoredGuestId()
            const hasGuestData = existingGuestId && this.hasGuestData(existingGuestId)

            if (hasGuestData) {
                state.setMigrationAvailable(true)
            }

            // Initialize auth session
            await this.initializeAuthSession(user, state)

            sessionLog('🔐 Switched to authenticated mode')
        } finally {
            state.setIsTransitioning(false)
        }
    }

    // Clear all session data (for complete reset)
    static clearAllSessionData(state: SessionManagerState): void {
        // Clear atoms
        state.setSessionType('initializing')
        state.setActiveSessionId('')
        state.setIsSessionInitialized(false)
        state.setMigrationAvailable(false)

        // Clear stored data
        this.clearGuestSessionData()
        this.clearAuthSessionData()

        sessionLog('🧹 All session data cleared')
    }

    // Storage helpers
    private static getStoredGuestId(): string | null {
        if (typeof window === 'undefined') return null
        return localStorage.getItem('nettrailer_guest_id')
    }

    private static storeGuestId(guestId: string): void {
        if (typeof window === 'undefined') return
        localStorage.setItem('nettrailer_guest_id', guestId)
    }

    private static getStoredAuthId(): string | null {
        if (typeof window === 'undefined') return null
        return localStorage.getItem('nettrailer_auth_id')
    }

    private static storeAuthId(authId: string): void {
        if (typeof window === 'undefined') return
        localStorage.setItem('nettrailer_auth_id', authId)
    }

    private static clearStoredAuthId(): void {
        if (typeof window === 'undefined') return
        localStorage.removeItem('nettrailer_auth_id')
    }

    private static hasGuestData(guestId: string): boolean {
        if (typeof window === 'undefined') return false
        // Use GuestStorageService to check for guest data with correct v2 storage key
        return GuestStorageService.hasGuestData(guestId)
    }

    private static async loadGuestPreferences(guestId: string): Promise<UserPreferences> {
        try {
            // Use dynamic import to avoid circular dependencies during initialization
            const { GuestStorageService } = await import('./guestStorageService')
            return GuestStorageService.loadGuestData(guestId)
        } catch (error) {
            sessionError('Failed to load guest preferences:', error)
            return this.getDefaultUserPreferences()
        }
    }

    private static async loadAuthPreferences(userId: string): Promise<UserPreferences> {
        try {
            // Use dynamic import to avoid circular dependencies during initialization
            const { AuthStorageService } = await import('./authStorageService')
            return await AuthStorageService.loadUserData(userId)
        } catch (error) {
            sessionError('Failed to load auth preferences:', error)
            return this.getDefaultUserPreferences()
        }
    }

    private static clearGuestSessionData(): void {
        if (typeof window === 'undefined') return

        const guestId = this.getStoredGuestId()
        if (guestId) {
            localStorage.removeItem(this.getGuestStorageKey(guestId))
            localStorage.removeItem('nettrailer_guest_id')
        }

        // Also clear legacy storage
        localStorage.removeItem('nettrailer_guest_data')
    }

    private static clearAuthSessionData(): void {
        // Clear any auth-specific session data
        // This will be expanded when we implement auth storage service
        sessionLog('Auth session data cleared')
    }

    private static getDefaultUserPreferences(): UserPreferences {
        return {
            defaultWatchlist: [],
            likedMovies: [],
            hiddenMovies: [],
            userCreatedWatchlists: [],
            lastActive: Date.now(),
            autoMute: true,
            defaultVolume: 50,
            childSafetyMode: false,
        }
    }

    // Clear the shared userSession atom state for complete session isolation
    private static clearSessionAtomState(state: SessionManagerState): void {
        sessionLog('🧹 [SessionManager] FORCE CLEARING SESSION ATOM STATE for complete isolation')

        const emptySession: UserSession = {
            isGuest: false,
            guestId: undefined,
            userId: undefined,
            preferences: this.getDefaultUserPreferences(),
            isActive: false,
            lastSyncedAt: Date.now(),
            createdAt: Date.now(),
        }

        sessionLog('🧹 [SessionManager] SETTING EMPTY SESSION STATE:', {
            emptySession: {
                isGuest: emptySession.isGuest,
                guestId: emptySession.guestId,
                userId: emptySession.userId,
                preferencesPreview: {
                    watchlistCount: emptySession.preferences.defaultWatchlist.length,
                    likedCount: emptySession.preferences.likedMovies.length,
                    hiddenCount: emptySession.preferences.hiddenMovies.length,
                    listsCount: emptySession.preferences.userCreatedWatchlists.length,
                },
            },
            timestamp: new Date().toISOString(),
        })

        // Clear the atom immediately
        state.setUserSession(emptySession)

        sessionLog('✅ [SessionManager] Session atom state clearing completed')
    }

    // Debug helpers
    static logCurrentState(
        sessionType: SessionType,
        activeSessionId: string,
        isInitialized: boolean
    ): void {
        sessionLog('📊 Current Session State:', {
            type: sessionType,
            id: activeSessionId,
            initialized: isInitialized,
            timestamp: new Date().toISOString(),
        })
    }
}
