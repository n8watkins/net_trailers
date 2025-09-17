import { atom } from 'recoil'
import { Content } from '../typings'

export interface UserRating {
    contentId: number
    rating: 'liked' | 'disliked' | 'loved'
    timestamp: number
}

export interface UserPreferences {
    watchlist: Content[]
    ratings: UserRating[]
    lastActive: number
}

export interface UserSession {
    isGuest: boolean
    guestId?: string
    userId?: string
    preferences: UserPreferences
}

// Default user session
const defaultUserSession: UserSession = {
    isGuest: false,
    guestId: undefined,
    userId: undefined,
    preferences: {
        watchlist: [],
        ratings: [],
        lastActive: Date.now(),
    },
}

// Main user session state
export const userSessionState = atom<UserSession>({
    key: 'userSessionState',
    default: defaultUserSession,
})

// Auth mode state
export const authModeState = atom<'login' | 'register' | 'guest'>({
    key: 'authModeState',
    default: 'login',
})

// Demo messaging state
export const showDemoMessageState = atom<boolean>({
    key: 'showDemoMessageState',
    default: true,
})