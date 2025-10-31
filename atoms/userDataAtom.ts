/**
 * User data atoms - re-exported from compat layer
 * Backed by Zustand stores, not Recoil
 */
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

export { userSessionState, showDemoMessageState, contentLoadedSuccessfullyState } from './compat'
