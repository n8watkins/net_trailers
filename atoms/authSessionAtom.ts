import { atom } from 'recoil'
import { Content } from '../typings'
import { UserList } from '../types/userLists'

// NEW SCHEMA - No more ratings, no more userLists.lists
export interface AuthPreferences {
    likedMovies: Content[]
    hiddenMovies: Content[]
    defaultWatchlist: Content[]
    userCreatedWatchlists: UserList[]
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
        likedMovies: [],
        hiddenMovies: [],
        defaultWatchlist: [],
        userCreatedWatchlists: [],
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
