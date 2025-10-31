/**
 * Auth session atoms - LEGACY
 * TODO: Migrate to Zustand stores
 * These are temporary type definitions and symbols for backwards compatibility
 */
import { Content } from '../typings'
import { UserList } from '../types/userLists'

// NEW SCHEMA - No more ratings, no more userLists.lists
export interface AuthPreferences {
    likedMovies: Content[]
    hiddenMovies: Content[]
    defaultWatchlist: Content[]
    userCreatedWatchlists: UserList[]
    lastActive: number
    // Playback preferences
    autoMute: boolean
    defaultVolume: number // 0-100
    // Content filtering preferences
    childSafetyMode: boolean // Restricts to PG-13 and below
}

export interface AuthSession {
    userId: string
    preferences: AuthPreferences
    isActive: boolean
    lastSyncedAt: number
}

// Default auth session
export const defaultAuthSession: AuthSession = {
    userId: '',
    preferences: {
        likedMovies: [],
        hiddenMovies: [],
        defaultWatchlist: [],
        userCreatedWatchlists: [],
        lastActive: Date.now(),
        autoMute: false,
        defaultVolume: 50,
        childSafetyMode: false,
    },
    isActive: false,
    lastSyncedAt: Date.now(),
}

// Legacy atom symbols (will be handled by useAuthData hook directly, not through compat layer)
export const authSessionState = Symbol('authSessionState_v1')
export const isAuthSessionActiveState = Symbol('isAuthSessionActiveState_v1')
