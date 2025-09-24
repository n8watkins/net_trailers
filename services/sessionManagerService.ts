import { SetterOrUpdater } from 'recoil'
import { User } from 'firebase/auth'
import {
    GuestSession,
    guestSessionState,
    GuestPreferences,
    isGuestSessionActiveState,
} from '../atoms/guestSessionAtom'
import {
    AuthSession,
    authSessionState,
    AuthPreferences,
    isAuthSessionActiveState,
} from '../atoms/authSessionAtom'
import {
    SessionType,
    sessionTypeState,
    activeSessionIdState,
    isSessionInitializedState,
    migrationAvailableState,
    isTransitioningSessionState,
} from '../atoms/sessionManagerAtom'

export interface SessionManagerState {
    setSessionType: SetterOrUpdater<SessionType>
    setActiveSessionId: SetterOrUpdater<string>
    setIsSessionInitialized: SetterOrUpdater<boolean>
    setMigrationAvailable: SetterOrUpdater<boolean>
    setIsTransitioning: SetterOrUpdater<boolean>
    setGuestSession: SetterOrUpdater<GuestSession>
    setAuthSession: SetterOrUpdater<AuthSession>
    setIsGuestActive: SetterOrUpdater<boolean>
    setIsAuthActive: SetterOrUpdater<boolean>
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

    // Initialize guest session
    private static async initializeGuestSession(state: SessionManagerState): Promise<SessionType> {
        // Check if we have an existing guest session
        const existingGuestId = this.getStoredGuestId()
        const guestId = existingGuestId || this.generateGuestId()

        if (!existingGuestId) {
            this.storeGuestId(guestId)
        }

        // Load guest data
        const guestPreferences = await this.loadGuestPreferences(guestId)

        const guestSession: GuestSession = {
            guestId,
            preferences: guestPreferences,
            isActive: true,
            createdAt: Date.now(),
        }

        // Update atoms
        state.setGuestSession(guestSession)
        state.setIsGuestActive(true)
        state.setIsAuthActive(false)
        state.setSessionType('guest')
        state.setActiveSessionId(guestId)

        console.log(`🎭 Guest session initialized: ${guestId}`)
        return 'guest'
    }

    // Initialize authenticated session
    private static async initializeAuthSession(
        user: User,
        state: SessionManagerState
    ): Promise<SessionType> {
        // Check if guest data exists for potential migration
        const existingGuestId = this.getStoredGuestId()
        const hasGuestData = existingGuestId && this.hasGuestData(existingGuestId)

        if (hasGuestData) {
            state.setMigrationAvailable(true)
        }

        // Load auth data
        const authPreferences = await this.loadAuthPreferences(user.uid)

        const authSession: AuthSession = {
            userId: user.uid,
            preferences: authPreferences,
            isActive: true,
            lastSyncedAt: Date.now(),
        }

        // Update atoms
        state.setAuthSession(authSession)
        state.setIsAuthActive(true)
        state.setIsGuestActive(false)
        state.setSessionType('authenticated')
        state.setActiveSessionId(user.uid)

        console.log(`🔐 Auth session initialized: ${user.uid}`)
        return 'authenticated'
    }

    // Switch to guest mode (when user logs out)
    static async switchToGuestMode(state: SessionManagerState): Promise<void> {
        state.setIsTransitioning(true)

        try {
            // Clear auth session
            state.setIsAuthActive(false)

            // Clean up any auth-specific data
            this.clearAuthSessionData()

            // Initialize new guest session
            await this.initializeGuestSession(state)

            console.log('🎭 Switched to guest mode')
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

            // Clear guest session (but keep data for potential migration)
            state.setIsGuestActive(false)

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
        state.setIsGuestActive(false)
        state.setIsAuthActive(false)
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

    private static async loadGuestPreferences(guestId: string): Promise<GuestPreferences> {
        try {
            // Use dynamic import to avoid circular dependencies during initialization
            const { GuestStorageService } = await import('./guestStorageService')
            return GuestStorageService.loadGuestData(guestId)
        } catch (error) {
            console.error('Failed to load guest preferences:', error)
            return this.getDefaultGuestPreferences()
        }
    }

    private static async loadAuthPreferences(userId: string): Promise<AuthPreferences> {
        try {
            // Use dynamic import to avoid circular dependencies during initialization
            const { AuthStorageService } = await import('./authStorageService')
            return await AuthStorageService.loadUserData(userId)
        } catch (error) {
            console.error('Failed to load auth preferences:', error)
            return this.getDefaultAuthPreferences()
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

    private static getDefaultGuestPreferences(): GuestPreferences {
        return {
            watchlist: [],
            ratings: [],
            userLists: {
                lists: [],
                defaultListIds: {
                    watchlist: '',
                    liked: '',
                    disliked: '',
                },
            },
            lastActive: Date.now(),
        }
    }

    private static getDefaultAuthPreferences(): AuthPreferences {
        return {
            watchlist: [],
            ratings: [],
            userLists: {
                lists: [],
                defaultListIds: {
                    watchlist: '',
                    liked: '',
                    disliked: '',
                },
            },
            lastActive: Date.now(),
        }
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
