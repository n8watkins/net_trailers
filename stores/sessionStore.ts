import { create } from 'zustand'
import { SessionStorageService } from '../services/sessionStorageService'
import { GuestStorageService } from '../services/guestStorageService'
import { sessionLog } from '../utils/debugLogger'
import { SessionType } from '../types/shared'

export interface SessionState {
    sessionType: SessionType
    activeSessionId: string
    isInitialized: boolean
    isTransitioning: boolean
    migrationAvailable: boolean
}

export interface SessionActions {
    initializeGuestSession: () => void
    initializeAuthSession: (userId: string) => Promise<void>
    switchToGuest: () => void
    switchToAuth: (userId: string) => void
    setMigrationAvailable: (available: boolean | ((prev: boolean) => boolean)) => void
    setTransitioning: (transitioning: boolean | ((prev: boolean) => boolean)) => void
    // Individual setters for compatibility with SessionManagerService
    setSessionType: (type: SessionType | ((prev: SessionType) => SessionType)) => void
    setActiveSessionId: (id: string | ((prev: string) => string)) => void
    setIsInitialized: (initialized: boolean | ((prev: boolean) => boolean)) => void
    // Helper to get effective user ID (auth user ID or guest ID)
    getUserId: () => string | null
}

export type SessionStore = SessionState & SessionActions

export const useSessionStore = create<SessionStore>((set) => ({
    // Initial state
    sessionType: 'initializing',
    activeSessionId: '',
    isInitialized: false,
    isTransitioning: false,
    migrationAvailable: false,

    // Actions
    /**
     * Initialize a new guest session
     *
     * Gets or creates a guest ID from localStorage and initializes the session.
     * Used when the app starts without authentication.
     *
     * @example
     * ```tsx
     * const { initializeGuestSession } = useSessionStore()
     * initializeGuestSession()
     * ```
     */
    initializeGuestSession: () => {
        // FIXED: Get or create guest ID from localStorage (was always creating new ID)
        const guestId = GuestStorageService.getGuestId()
        set({
            sessionType: 'guest',
            activeSessionId: guestId,
            isInitialized: true,
            isTransitioning: false,
            migrationAvailable: false,
        })
        // Initialize session isolation service
        SessionStorageService.initializeSession(guestId, 'guest')
        sessionLog('🎯 [SessionStore] Guest session initialized:', guestId)
    },

    /**
     * Initialize an authenticated session
     *
     * Sets up session state for a logged-in user with the given Firebase user ID.
     * Called when Firebase authentication state changes to authenticated.
     *
     * @param userId - Firebase user ID
     *
     * @example
     * ```tsx
     * const { initializeAuthSession } = useSessionStore()
     * initializeAuthSession(user.uid)
     * ```
     */
    initializeAuthSession: async (userId: string) => {
        set({
            sessionType: 'authenticated',
            activeSessionId: userId,
            isInitialized: true,
            isTransitioning: false,
            migrationAvailable: false,
        })
        // Initialize session isolation service
        SessionStorageService.initializeSession(userId, 'auth')

        // Update lastLoginAt in Firestore for trending notifications
        try {
            const { doc, updateDoc } = await import('firebase/firestore')
            const { db } = await import('../firebase')
            await updateDoc(doc(db, 'users', userId), {
                lastLoginAt: Date.now(),
            })
            sessionLog('🎯 [SessionStore] Updated lastLoginAt for user:', userId)
        } catch (error) {
            // Silently fail - this is non-critical
            sessionLog('⚠️  [SessionStore] Failed to update lastLoginAt:', error)
        }

        sessionLog('🎯 [SessionStore] Auth session initialized:', userId)
    },

    switchToGuest: () => {
        // FIXED: Get or create guest ID from localStorage (was always creating new ID)
        const guestId = GuestStorageService.getGuestId()
        set({
            sessionType: 'guest',
            activeSessionId: guestId,
            isTransitioning: false,
            migrationAvailable: false,
        })
        sessionLog('🔄 [SessionStore] Switched to guest session:', guestId)
    },

    switchToAuth: (userId: string) => {
        set({
            sessionType: 'authenticated',
            activeSessionId: userId,
            isTransitioning: false,
            migrationAvailable: false,
        })
        sessionLog('🔄 [SessionStore] Switched to auth session:', userId)
    },

    setMigrationAvailable: (available: boolean | ((prev: boolean) => boolean)) => {
        set((state) => ({
            migrationAvailable:
                typeof available === 'function' ? available(state.migrationAvailable) : available,
        }))
    },

    setTransitioning: (transitioning: boolean | ((prev: boolean) => boolean)) => {
        set((state) => ({
            isTransitioning:
                typeof transitioning === 'function'
                    ? transitioning(state.isTransitioning)
                    : transitioning,
        }))
    },

    // Individual setters for compatibility with SessionManagerService
    setSessionType: (type: SessionType | ((prev: SessionType) => SessionType)) => {
        set((state) => ({
            sessionType: typeof type === 'function' ? type(state.sessionType) : type,
        }))
    },

    setActiveSessionId: (id: string | ((prev: string) => string)) => {
        set((state) => ({
            activeSessionId: typeof id === 'function' ? id(state.activeSessionId) : id,
        }))
    },

    setIsInitialized: (initialized: boolean | ((prev: boolean) => boolean)) => {
        set((state) => ({
            isInitialized:
                typeof initialized === 'function' ? initialized(state.isInitialized) : initialized,
        }))
    },

    /**
     * Get the current user ID (auth user ID or guest ID)
     *
     * Returns the active session ID which represents either:
     * - Firebase user ID for authenticated users
     * - Guest ID from localStorage for guest users
     * - null if session is not initialized
     *
     * @returns The current user/guest ID, or null if not initialized
     *
     * @example
     * ```tsx
     * const getUserId = useSessionStore(state => state.getUserId)
     * const userId = getUserId()
     * if (userId) {
     *   // Use userId for API calls
     * }
     * ```
     */
    getUserId: (): string | null => {
        const state: SessionStore = useSessionStore.getState()
        if (!state.isInitialized || state.sessionType === 'initializing') {
            return null
        }
        return state.activeSessionId || null
    },
}))
