import { atom } from 'recoil'
import { Content } from '../typings'
import { UserList, UserListsState } from '../types/userLists'

export interface UserRating {
    contentId: number
    rating: 'liked' | 'disliked'
    timestamp: number
    content?: Content // Store the full content object for display
}

export interface UserPreferences {
    watchlist: Content[]
    ratings: UserRating[]
    userLists: UserListsState
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
        userLists: {
            lists: [],
            defaultListIds: {
                watchlist: '',
                liked: '',
                disliked: '',
            },
        },
        lastActive: Date.now(),
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
