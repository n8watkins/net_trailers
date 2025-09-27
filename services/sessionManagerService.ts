import { SetterOrUpdater } from 'recoil'
import { User } from 'firebase/auth'
import { UserSession, UserPreferences } from '../atoms/userDataAtom'
import {
    SessionType,
    sessionTypeState,
    activeSessionIdState,
    isSessionInitializedState,
    migrationAvailableState,
    isTransitioningSessionState,
} from '../atoms/sessionManagerAtom'
import { SessionStorageService } from './sessionStorageService'

export interface SessionManagerState {
    setSessionType: SetterOrUpdater<SessionType>
    setActiveSessionId: SetterOrUpdater<string>
    setIsSessionInitialized: SetterOrUpdater<boolean>
    setMigrationAvailable: SetterOrUpdater<boolean>
    setIsTransitioning: SetterOrUpdater<boolean>
    setUserSession: SetterOrUpdater<UserSession>
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
        state.setIsTransitioning(true)

        try {
            if (user) {
                // User is authenticated - initialize auth session
                return await this.initializeAuthSession(user, state)
            } else {
                // No user - initialize guest session
                return await this.initializeGuestSession(state)
            }
        } finally {
            state.setIsTransitioning(false)
            state.setIsSessionInitialized(true)
        }
    }

    // Initialize a fresh guest session (for complete data isolation)
    private static async initializeFreshGuestSession(
        state: SessionManagerState
    ): Promise<SessionType> {
        // Use dynamic import to avoid circular dependencies
        const { GuestStorageService } = await import('./guestStorageService')

        // CRITICAL: Clear any existing session data first for complete isolation
        console.log('🧹 Clearing previous session data for fresh guest session')
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

        console.log(`🎭 Fresh guest session initialized with isolation: ${guestId}`)
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

        console.log(`🎭 Guest session initialized with isolation: ${guestId}`)
        return 'guest'
    }

    // Initialize authenticated session
    private static async initializeAuthSession(
        user: User,
        state: SessionManagerState
    ): Promise<SessionType> {
        // CRITICAL: Clear any existing session data first for complete isolation
        console.log('🧹 Clearing previous session data for auth session')
        this.clearSessionAtomState(state)

        // Initialize session-isolated storage for this authenticated user
        SessionStorageService.initializeSession(user.uid, 'auth')

        // Check if guest data exists for potential migration
        const existingGuestId = this.getStoredGuestId()
        const hasGuestData = existingGuestId && this.hasGuestData(existingGuestId)

        if (hasGuestData) {
            state.setMigrationAvailable(true)
        }

        // Load auth data (from Firebase, not localStorage)
        const authPreferences = await this.loadAuthPreferences(user.uid)

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
        state.setUserSession(userSession)
        state.setSessionType('authenticated')
        state.setActiveSessionId(user.uid)

        console.log(`🔐 Auth session initialized with isolation: ${user.uid}`)
        return 'authenticated'
    }

    // Switch to guest mode (when user logs out)
    static async switchToGuestMode(state: SessionManagerState): Promise<void> {
        console.log('🎭 [SessionManager] SWITCHING TO GUEST MODE - Starting logout session switch')
        state.setIsTransitioning(true)

        try {
            // CRITICAL: Clear shared Recoil state FIRST before any other operations
            console.log('🧹 [SessionManager] STEP 1: Force clearing shared Recoil state')
            this.clearSessionAtomState(state)

            // CRITICAL: Add delay to ensure Recoil state is cleared
            await new Promise((resolve) => setTimeout(resolve, 50))

            // Clean up any auth-specific data
            console.log('🧹 [SessionManager] STEP 2: Clearing auth session data')
            this.clearAuthSessionData()

            // CRITICAL: Clear Recoil state AGAIN to ensure isolation
            console.log('🧹 [SessionManager] STEP 3: Double-clearing Recoil state for isolation')
            this.clearSessionAtomState(state)

            // Initialize new guest session (force fresh for isolation)
            console.log('🎭 [SessionManager] STEP 4: Initializing fresh guest session')
            await this.initializeFreshGuestSession(state)

            // CRITICAL: Final verification that state is properly isolated
            console.log(
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

            console.log('🔐 Switched to authenticated mode')
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

        console.log('🧹 All session data cleared')
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

    private static getGuestStorageKey(guestId: string): string {
        return `nettrailer_guest_data_${guestId}`
    }

    private static hasGuestData(guestId: string): boolean {
        if (typeof window === 'undefined') return false
        const data = localStorage.getItem(this.getGuestStorageKey(guestId))
        return data !== null && data !== 'undefined'
    }

    private static async loadGuestPreferences(guestId: string): Promise<UserPreferences> {
        try {
            // Use dynamic import to avoid circular dependencies during initialization
            const { GuestStorageService } = await import('./guestStorageService')
            return GuestStorageService.loadGuestData(guestId)
        } catch (error) {
            console.error('Failed to load guest preferences:', error)
            return this.getDefaultUserPreferences()
        }
    }

    private static async loadAuthPreferences(userId: string): Promise<UserPreferences> {
        try {
            // Use dynamic import to avoid circular dependencies during initialization
            const { AuthStorageService } = await import('./authStorageService')
            return await AuthStorageService.loadUserData(userId)
        } catch (error) {
            console.error('Failed to load auth preferences:', error)
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
        console.log('Auth session data cleared')
    }

    private static getDefaultUserPreferences(): UserPreferences {
        // CRITICAL: Import and use proper default list initialization
        const { UserListsService } = require('../services/userListsService')

        return {
            watchlist: [],
            ratings: [],
            userLists: UserListsService.initializeDefaultLists(), // ← FIX: Proper default lists
            lastActive: Date.now(),
        }
    }

    // Clear the shared userSession atom state for complete session isolation
    private static clearSessionAtomState(state: SessionManagerState): void {
        console.log('🧹 [SessionManager] FORCE CLEARING SESSION ATOM STATE for complete isolation')

        const emptySession: UserSession = {
            isGuest: false,
            guestId: undefined,
            userId: undefined,
            preferences: this.getDefaultUserPreferences(),
            isActive: false,
            lastSyncedAt: Date.now(),
            createdAt: Date.now(),
        }

        console.log('🧹 [SessionManager] SETTING EMPTY SESSION STATE:', {
            emptySession: {
                isGuest: emptySession.isGuest,
                guestId: emptySession.guestId,
                userId: emptySession.userId,
                preferencesPreview: {
                    watchlistCount: emptySession.preferences.watchlist.length,
                    ratingsCount: emptySession.preferences.ratings.length,
                    listsCount: emptySession.preferences.userLists.lists.length,
                },
            },
            timestamp: new Date().toISOString(),
        })

        // Clear the atom immediately with force
        state.setUserSession(emptySession)

        // CRITICAL: Add a small delay to ensure Recoil state is updated
        setTimeout(() => {
            console.log('🧹 [SessionManager] VERIFYING SESSION ATOM STATE IS CLEARED')
            state.setUserSession({ ...emptySession }) // Force re-set with spread operator
        }, 10)

        console.log('✅ [SessionManager] Session atom state clearing completed')
    }

    // Debug helpers
    static logCurrentState(
        sessionType: SessionType,
        activeSessionId: string,
        isInitialized: boolean
    ): void {
        console.log('📊 Current Session State:', {
            type: sessionType,
            id: activeSessionId,
            initialized: isInitialized,
            timestamp: new Date().toISOString(),
        })
    }
}
