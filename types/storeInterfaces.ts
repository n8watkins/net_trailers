// Type interfaces for store state structures
// Used to enable type-safe service methods that work with both auth and guest stores

import { Content } from '../typings'
import { UserList } from './collections'

/**
 * Base interface for stores that manage user lists
 * Implemented by both authStore and guestStore
 */
export interface StateWithLists {
    userCreatedWatchlists: UserList[]
    defaultWatchlist: Content[]
    likedMovies: Content[]
    hiddenMovies: Content[]
}

/**
 * Extended interface for stores with full user preferences
 * Includes UI and behavior preferences along with list data
 */
export interface StateWithPreferences extends StateWithLists {
    autoMute: boolean
    defaultVolume: number
    childSafetyMode: boolean
    improveRecommendations: boolean
    lastActive: number
}
