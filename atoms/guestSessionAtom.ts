import { atom } from 'recoil'
import { Content } from '../typings'
import { UserList } from '../types/userLists'

// NEW SCHEMA - No more ratings, no more userLists.lists
export interface GuestPreferences {
    likedMovies: Content[]
    hiddenMovies: Content[]
    defaultWatchlist: Content[]
    userCreatedWatchlists: UserList[]
    lastActive: number
    // Playback preferences
    autoMute: boolean
    defaultVolume: number // 0-100
    // Content filtering preferences
    childSafetyMode: boolean // Restricts to PG-13 and below
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
        likedMovies: [],
        hiddenMovies: [],
        defaultWatchlist: [],
        userCreatedWatchlists: [],
        lastActive: Date.now(),
        autoMute: false,
        defaultVolume: 50,
        childSafetyMode: false,
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
