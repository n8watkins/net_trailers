import { createUserStore, UserState, UserActions } from './createUserStore'
import { LocalStorageAdapter } from '../services/localStorageAdapter'
import { guestLog, guestError } from '../utils/debugLogger'

// Export types for backward compatibility
export interface GuestState extends Omit<UserState, 'syncStatus' | 'userId'> {
    guestId?: string
}

export interface GuestActions extends Omit<UserActions, 'syncWithStorage'> {
    syncFromLocalStorage: (guestId: string) => void
    clearAllData: () => void
}

export type GuestStore = GuestState & GuestActions

// Create the guest store using the factory with LocalStorage adapter
const adapter = new LocalStorageAdapter({
    log: guestLog,
    error: guestError,
    warn: guestLog, // Guest logger doesn't have warn, use log
})

// Export the raw store from the factory - it's already a properly typed Zustand store
export const useGuestStore = createUserStore({
    adapter,
    logger: {
        log: guestLog,
        error: guestError,
        warn: guestLog,
    },
    idField: 'guestId',
    trackingContext: 'GuestStore',
    enableFirebaseSync: false,
    enableGuestFeatures: true,
})
