import { Content } from '../typings'

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
}

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
    description?: string
    isPublic?: boolean
    color?: string
    emoji?: string
}

export interface UpdateListRequest {
    id: string
    name?: string
    description?: string
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
