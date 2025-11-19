// Shared type definitions for user sessions and preferences
// Used across stores, services, and components

import { Content } from '../typings'
import { UserList } from './userLists'
import { NotificationPreferences } from './notifications'

export interface UserPreferences {
    defaultWatchlist: Content[]
    likedMovies: Content[]
    hiddenMovies: Content[]
    userCreatedWatchlists: UserList[]
    lastActive: number
    autoMute: boolean
    defaultVolume: number
    childSafetyMode: boolean
    improveRecommendations?: boolean
    showRecommendations?: boolean
    notifications?: NotificationPreferences
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
        improveRecommendations: true,
        showRecommendations: false, // Disabled by default
        notifications: {
            inApp: true,
            email: false,
            push: false,
            types: {
                collection_update: true,
                new_release: true,
                trending_update: true,
                system: true,
            },
            emailDigest: 'never',
        },
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
        improveRecommendations: true,
        showRecommendations: false, // Disabled by default
        notifications: {
            inApp: true,
            email: false,
            push: false,
            types: {
                collection_update: true,
                new_release: true,
                trending_update: true,
                system: true,
            },
            emailDigest: 'never',
        },
    },
    lastSyncedAt: Date.now(),
}
