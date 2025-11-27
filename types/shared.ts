// Shared type definitions for user sessions and preferences
// Used across stores, services, and components

import { Content } from '../typings'
import { UserList } from './collections'
import { NotificationPreferences } from './notifications'
import { SystemRecommendation } from './recommendations'

// Genre preference for personalized recommendations
export interface GenrePreference {
    genreId: string
    preference: 'love' | 'not_for_me'
    updatedAt: number
}

// Content preference for personalized recommendations
export interface ContentPreference {
    contentId: number
    mediaType: 'movie' | 'tv'
    preference: 'love' | 'not_for_me'
    shownAt: number
}

// Track which content has been shown in preference customizer
export interface ShownPreferenceContent {
    contentId: number
    mediaType: 'movie' | 'tv'
    shownAt: number
}

// Track user's vote on content (for title quiz)
// This is our own data type, NOT from TMDB
export interface VotedContent {
    contentId: number
    mediaType: 'movie' | 'tv'
    vote: 'like' | 'dislike'
    votedAt: number
}

// Track skipped content (excluded from quiz for 2 weeks)
export interface SkippedContent {
    contentId: number
    mediaType: 'movie' | 'tv'
    skippedAt: number // timestamp when skipped
}

// Unified rating for content (merges liked/hidden/voted)
// Stores full content for display without additional API calls
export interface RatedContent {
    content: Content
    rating: 'like' | 'dislike'
    ratedAt: number
}

export interface UserPreferences {
    defaultWatchlist: Content[]
    /** @deprecated Use myRatings with rating='like' instead */
    likedMovies: Content[]
    /** @deprecated Use myRatings with rating='dislike' instead */
    hiddenMovies: Content[]
    userCreatedWatchlists: UserList[]
    systemRecommendations?: SystemRecommendation[] // System recommendation settings (Trending, Top Rated, etc.)
    lastActive: number
    autoMute: boolean
    defaultVolume: number
    childSafetyMode: boolean
    improveRecommendations?: boolean
    showRecommendations?: boolean
    trackWatchHistory?: boolean
    notifications?: NotificationPreferences
    genrePreferences?: GenrePreference[] // Genre preferences for recommendations
    contentPreferences?: ContentPreference[] // Content preferences for recommendations
    shownPreferenceContent?: ShownPreferenceContent[] // Track shown content to avoid repeats
    /** @deprecated Use myRatings instead */
    votedContent?: VotedContent[] // Track user votes on content (title quiz)
    skippedContent?: SkippedContent[] // Track skipped content (excluded from quiz for 2 weeks)
    myRatings?: RatedContent[] // Unified ratings (replaces likedMovies, hiddenMovies, votedContent)
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
        showRecommendations: true, // Enabled by default - row only shows when enough data exists
        trackWatchHistory: true, // Enabled by default
        notifications: {
            inApp: true,
            email: false,
            push: false,
            types: {
                collection_update: true,
                new_release: true,
                trending_update: false, // Disabled by default (opt-in required)
                system: true,
            },
            emailDigest: 'never',
        },
        myRatings: [],
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
        showRecommendations: true, // Enabled by default - row only shows when enough data exists
        trackWatchHistory: true, // Enabled by default
        notifications: {
            inApp: true,
            email: false,
            push: false,
            types: {
                collection_update: true,
                new_release: true,
                trending_update: false, // Disabled by default (opt-in required)
                system: true,
            },
            emailDigest: 'never',
        },
        myRatings: [],
    },
    lastSyncedAt: Date.now(),
}
