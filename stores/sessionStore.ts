import { create } from 'zustand'
import { SessionStorageService } from '../services/sessionStorageService'

export type SessionType = 'guest' | 'authenticated' | 'initializing'

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
    setMigrationAvailable: (available: boolean) => void
    setTransitioning: (transitioning: boolean) => void
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
        const guestId = generateGuestId()
        set({
            sessionType: 'guest',
            activeSessionId: guestId,
            isInitialized: true,
            isTransitioning: false,
            migrationAvailable: false,
        })
        // Initialize session isolation service
        SessionStorageService.initializeSession(guestId, 'guest')
        console.log('🎯 [SessionStore] Guest session initialized:', guestId)
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
        console.log('🎯 [SessionStore] Auth session initialized:', userId)
    },

    switchToGuest: () => {
        const guestId = generateGuestId()
        set({
            sessionType: 'guest',
            activeSessionId: guestId,
            isTransitioning: false,
            migrationAvailable: false,
        })
        console.log('🔄 [SessionStore] Switched to guest session:', guestId)
    },

    switchToAuth: (userId: string) => {
        set({
            sessionType: 'authenticated',
            activeSessionId: userId,
            isTransitioning: false,
            migrationAvailable: false,
        })
        console.log('🔄 [SessionStore] Switched to auth session:', userId)
    },

    setMigrationAvailable: (available: boolean) => {
        set({ migrationAvailable: available })
    },

    setTransitioning: (transitioning: boolean) => {
        set({ isTransitioning: transitioning })
    },
}))
