import { Content } from '../typings'

export interface UserRating {
    contentId: number
    rating: 'liked' | 'disliked'
    timestamp: number
    content?: Content
}

export interface UserPreferences {
    watchlist: Content[]
    ratings: UserRating[]
    userLists: any[]
    lastActive: number
}

export interface UserSession {
    isGuest: boolean
    guestId?: string
    userId?: string
    preferences: UserPreferences
}
