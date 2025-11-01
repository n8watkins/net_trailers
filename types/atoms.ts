// Type definitions that were previously in atoms files
// Migrated to types directory for use across the application

export interface UserPreferences {
    defaultWatchlist: any[]
    likedMovies: any[]
    hiddenMovies: any[]
    userCreatedWatchlists: any[]
    lastActive: number
    autoMute: boolean
    defaultVolume: number
    childSafetyMode: boolean
}

export interface UserSession {
    isGuest: boolean
    guestId?: string
    userId?: string
    preferences: UserPreferences
    isActive: boolean
    lastSyncedAt: number
    createdAt: number
}

export type SessionType = 'guest' | 'authenticated' | 'initializing' | undefined

// Auth session for authenticated users
export interface AuthSession {
    userId: string
    preferences: UserPreferences
    lastSyncedAt: number
}

export const defaultAuthSession: AuthSession = {
    userId: '',
    preferences: {
        defaultWatchlist: [],
        likedMovies: [],
        hiddenMovies: [],
        userCreatedWatchlists: [],
        lastActive: Date.now(),
        autoMute: true,
        defaultVolume: 50,
        childSafetyMode: false,
    },
    lastSyncedAt: Date.now(),
}

// Guest session for unauthenticated users
export interface GuestSession {
    guestId: string
    preferences: UserPreferences
    lastSyncedAt: number
}

export const defaultGuestSession: GuestSession = {
    guestId: '',
    preferences: {
        defaultWatchlist: [],
        likedMovies: [],
        hiddenMovies: [],
        userCreatedWatchlists: [],
        lastActive: Date.now(),
        autoMute: true,
        defaultVolume: 50,
        childSafetyMode: false,
    },
    lastSyncedAt: Date.now(),
}
