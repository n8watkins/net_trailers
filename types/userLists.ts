import { Content } from '../typings'
import { ShareSettings } from './sharing'

// Re-export Content for convenience
export type { Content }

/**
 * Collection types define how content is sourced
 */
export type CollectionType =
    | 'ai-generated' // AI-generated from Gemini smart search
    | 'tmdb-genre' // TMDB genre-based (infinite scrolling)
    | 'manual' // Manually curated by user

export interface UserList {
    id: string
    name: string
    description?: string
    items: Content[]
    isPublic: boolean
    createdAt: number
    updatedAt: number
    color?: string // Optional theme color for the list
    emoji?: string // Optional emoji icon for the list

    // Collection display and type flags
    displayAsRow?: boolean // Display collection as a row on home/browse pages
    collectionType?: CollectionType // How the collection content is sourced

    // AI-generated collection metadata
    originalQuery?: string // Original search query for AI-generated collections
    canGenerateMore?: boolean // Can generate more similar content (infinite collection)

    // Sharing settings (Phase 2: Collection Sharing)
    shareSettings?: ShareSettings // Optional share settings for this collection
    sharedLinkId?: string // Active share link ID (if collection is currently shared)
}

// DEPRECATED - OLD SCHEMA
// UserListsState is no longer used in new schema
// New schema uses: userCreatedWatchlists: UserList[] directly
// Keeping temporarily for backward compatibility during migration
export interface UserListsState {
    lists: UserList[]
    defaultListIds: {
        watchlist: string
        liked: string
        disliked: string
    }
}

export interface UserListItem {
    listId: string
    contentId: number
    addedAt: number
}

export interface CreateListRequest {
    name: string
    isPublic?: boolean
    color?: string
    emoji?: string
    displayAsRow?: boolean
    collectionType?: CollectionType
    originalQuery?: string
    canGenerateMore?: boolean
}

export interface UpdateListRequest {
    id: string
    name?: string
    isPublic?: boolean
    color?: string
    emoji?: string
}

export interface AddToListRequest {
    listId: string
    content: Content
}

export interface RemoveFromListRequest {
    listId: string
    contentId: number
}
