import { Content } from '../typings'
import { UserList } from './userLists'

// NEW SCHEMA - No more ratings, no more userLists structure
export interface UserPreferences {
    likedMovies: Content[]
    hiddenMovies: Content[]
    defaultWatchlist: Content[]
    userCreatedWatchlists: UserList[]
    lastActive: number
}

export interface UserSession {
    isGuest: boolean
    guestId?: string
    userId?: string
    preferences: UserPreferences
}
