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
    initializeAuthSession: (userId: string) => void
    switchToGuest: () => void
    switchToAuth: (userId: string) => void
    setMigrationAvailable: (available: boolean | ((prev: boolean) => boolean)) => void
    setTransitioning: (transitioning: boolean | ((prev: boolean) => boolean)) => void
    // Individual setters for compatibility with SessionManagerService
    setSessionType: (type: SessionType | ((prev: SessionType) => SessionType)) => void
    setActiveSessionId: (id: string | ((prev: string) => string)) => void
    setIsInitialized: (initialized: boolean | ((prev: boolean) => boolean)) => void
}

export type SessionStore = SessionState & SessionActions

const generateGuestId = (): string => {
    // Generate empty string during SSR, actual ID only on client
    // This prevents hydration mismatches while still providing unique IDs after hydration
    if (typeof window === 'undefined') {
        return '' // Empty string during SSR
    }
    return `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export const useSessionStore = create<SessionStore>((set, get) => ({
    // Initial state
    sessionType: 'initializing',
    activeSessionId: '',
    isInitialized: false,
    isTransitioning: false,
    migrationAvailable: false,

    // Actions
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

    initializeAuthSession: (userId: string) => {
        set({
            sessionType: 'authenticated',
            activeSessionId: userId,
            isInitialized: true,
            isTransitioning: false,
            migrationAvailable: false,
        })
        // Initialize session isolation service
        SessionStorageService.initializeSession(userId, 'auth')
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
}))
