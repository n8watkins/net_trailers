import { atom } from 'recoil'
import { Content } from '../typings'
import { UserList, UserListsState } from '../types/userLists'

export interface AuthRating {
    contentId: number
    rating: 'liked' | 'disliked'
    timestamp: number
    content?: Content
}

export interface AuthPreferences {
    watchlist: Content[]
    ratings: AuthRating[]
    userLists: UserListsState
    lastActive: number
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
    isActive: false,
    lastSyncedAt: Date.now(),
}

// Auth session state atom
export const authSessionState = atom<AuthSession>({
    key: 'authSessionState_v1',
    default: defaultAuthSession,
})

// Auth session active state
export const isAuthSessionActiveState = atom<boolean>({
    key: 'isAuthSessionActiveState_v1',
    default: false,
})
