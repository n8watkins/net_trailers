/**
 * Guest session atoms - LEGACY
 * TODO: Migrate to Zustand stores
 * These are temporary type definitions and symbols for backwards compatibility
 */
import { Content } from '../typings'
import { UserList } from '../types/userLists'

// NEW SCHEMA - No more ratings, no more userLists.lists
export interface GuestPreferences {
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

export interface GuestSession {
    guestId: string
    preferences: GuestPreferences
    isActive: boolean
    createdAt: number
}

// Default guest session
export const defaultGuestSession: GuestSession = {
    guestId: '',
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
    createdAt: Date.now(),
}

// Legacy atom symbols (will be handled by useGuestData hook directly, not through compat layer)
export const guestSessionState = Symbol('guestSessionState_v1')
export const isGuestSessionActiveState = Symbol('isGuestSessionActiveState_v1')
