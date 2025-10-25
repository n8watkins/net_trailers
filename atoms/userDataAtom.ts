import { atom } from 'recoil'
import { Content } from '../typings'
import { UserList } from '../types/userLists'

// DEPRECATED - UserRating is no longer used in new schema
// Keeping temporarily for backward compatibility during migration
export interface UserRating {
    contentId: number
    rating: 'liked' | 'disliked'
    timestamp: number
    content?: Content // Store the full content object for display
}

// NEW SCHEMA - No more ratings, no more userLists structure
export interface UserPreferences {
    defaultWatchlist: Content[]
    likedMovies: Content[]
    hiddenMovies: Content[]
    userCreatedWatchlists: UserList[]
    lastActive: number
    // Playback preferences
    autoMute: boolean
    defaultVolume: number // 0-100
    // Content filtering preferences
    childSafetyMode: boolean // Restricts to PG-13 and below
}

export interface UserSession {
    isGuest: boolean
    guestId?: string
    userId?: string
    preferences: UserPreferences
    isActive?: boolean
    lastSyncedAt?: number
    createdAt?: number
}

// Default user session (NEW SCHEMA)
const defaultUserSession: UserSession = {
    isGuest: false,
    guestId: undefined,
    userId: undefined,
    preferences: {
        defaultWatchlist: [],
        likedMovies: [],
        hiddenMovies: [],
        userCreatedWatchlists: [],
        lastActive: Date.now(),
        autoMute: false,
        defaultVolume: 50,
        childSafetyMode: false,
    },
}

// Main user session state
export const userSessionState = atom<UserSession>({
    key: 'userSessionState_v2',
    default: defaultUserSession,
})

// Auth mode state
export const authModeState = atom<'login' | 'register' | 'guest'>({
    key: 'authModeState_v2',
    default: 'login',
})

// Demo messaging state
export const showDemoMessageState = atom<boolean>({
    key: 'showDemoMessageState_v2',
    default: true,
})

// Content loading success state
export const contentLoadedSuccessfullyState = atom<boolean>({
    key: 'contentLoadedSuccessfullyState_v2',
    default: false,
})
