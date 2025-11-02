import { createUserStore, UserState, UserActions } from './createUserStore'
import { FirebaseStorageAdapter } from '../services/firebaseStorageAdapter'
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

// Create the auth store using the factory with Firebase adapter
const adapter = new FirebaseStorageAdapter({
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
