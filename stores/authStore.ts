import { createUserStore, UserState, UserActions } from './createUserStore'
import { ApiStorageAdapter } from '../services/apiStorageAdapter'
import { authLog, authError, authWarn } from '../utils/debugLogger'

// Export types for backward compatibility
export interface AuthState extends Omit<UserState, 'guestId'> {
    userId?: string
    syncStatus: 'synced' | 'syncing' | 'offline'
}

export interface AuthActions
    extends Omit<UserActions, 'syncWithStorage' | 'syncFromLocalStorage' | 'clearAllData'> {
    syncWithFirebase: (userId: string) => Promise<void>
}

export type AuthStore = AuthState & AuthActions

// Create the auth store using the factory with the Turso API adapter
const adapter = new ApiStorageAdapter({
    log: authLog,
    error: authError,
    warn: authWarn,
})

// Export the raw store from the factory - it's already a properly typed Zustand store
export const useAuthStore = createUserStore({
    adapter,
    logger: {
        log: authLog,
        error: authError,
        warn: authWarn,
    },
    idField: 'userId',
    trackingContext: 'AuthStore',
    enableFirebaseSync: true,
    enableGuestFeatures: false,
})
