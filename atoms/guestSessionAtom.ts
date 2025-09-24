import { atom } from 'recoil'
import { Content } from '../typings'
import { UserList, UserListsState } from '../types/userLists'

export interface GuestRating {
    contentId: number
    rating: 'liked' | 'disliked'
    timestamp: number
    content?: Content
}

export interface GuestPreferences {
    watchlist: Content[]
    ratings: GuestRating[]
    userLists: UserListsState
    lastActive: number
}

export interface GuestSession {
    guestId: string
    preferences: GuestPreferences
    isActive: boolean
    createdAt: number
}

// Default guest session
const defaultGuestSession: GuestSession = {
    guestId: '',
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
    createdAt: Date.now(),
}

// Guest session state atom
export const guestSessionState = atom<GuestSession>({
    key: 'guestSessionState_v1',
    default: defaultGuestSession,
})

// Guest session active state
export const isGuestSessionActiveState = atom<boolean>({
    key: 'isGuestSessionActiveState_v1',
    default: false,
})
