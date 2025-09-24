import { Content } from '../typings'
import {
    UserList,
    UserListsState,
    CreateListRequest,
    UpdateListRequest,
    AddToListRequest,
    RemoveFromListRequest,
} from '../types/userLists'
import { UserPreferences } from '../atoms/userDataAtom'
export class UserListsService {
    // Generate a unique ID
    private static generateId(): string {
        return `list_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    // Initialize default lists for new users
    static initializeDefaultLists(): UserListsState {
        const watchlistId = this.generateId()
        const likedId = this.generateId()
        const dislikedId = this.generateId()

        const watchlist: UserList = {
            id: watchlistId,
            name: 'Watchlist',
            description: 'Movies and TV shows you want to watch',
            items: [],
            isPublic: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            color: '#0ea5e9', // sky-500
        }

        const liked: UserList = {
            id: likedId,
            name: 'Liked',
            description: 'Movies and TV shows you enjoyed',
            items: [],
            isPublic: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            color: '#10b981', // emerald-500
        }

        const disliked: UserList = {
            id: dislikedId,
            name: 'Not For Me',
            description: "Movies and TV shows that weren't your taste",
            items: [],
            isPublic: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            color: '#ef4444', // red-500
        }

        return {
            lists: [watchlist, liked, disliked],
            defaultListIds: {
                watchlist: watchlistId,
                liked: likedId,
                disliked: dislikedId,
            },
        }
    }

    // Migrate old preferences to new list system
    static migrateOldPreferences(preferences: UserPreferences): UserPreferences {
        // If user already has lists, return as-is
        if (preferences.userLists && preferences.userLists.lists.length > 0) {
            return preferences
        }

        // Initialize default lists
        const userLists = this.initializeDefaultLists()

        // Migrate watchlist items to the new watchlist
        const watchlistIndex = userLists.lists.findIndex(
            (list) => list.id === userLists.defaultListIds.watchlist
        )
        if (watchlistIndex >= 0 && preferences.watchlist) {
            userLists.lists[watchlistIndex].items = [...preferences.watchlist]
            userLists.lists[watchlistIndex].updatedAt = Date.now()
        }

        // Migrate ratings to appropriate lists
        if (preferences.ratings) {
            const likedIndex = userLists.lists.findIndex(
                (list) => list.id === userLists.defaultListIds.liked
            )
            const dislikedIndex = userLists.lists.findIndex(
                (list) => list.id === userLists.defaultListIds.disliked
            )

            preferences.ratings.forEach((rating) => {
                if (rating.content) {
                    if (rating.rating === 'liked' && likedIndex >= 0) {
                        userLists.lists[likedIndex].items.push(rating.content)
                        userLists.lists[likedIndex].updatedAt = Date.now()
                    } else if (rating.rating === 'disliked' && dislikedIndex >= 0) {
                        userLists.lists[dislikedIndex].items.push(rating.content)
                        userLists.lists[dislikedIndex].updatedAt = Date.now()
                    }
                }
            })
        }

        return {
            ...preferences,
            userLists,
            // Keep existing ratings (they are already 'liked' or 'disliked' only)
            ratings: preferences.ratings || [],
        }
    }

    // Create a new custom list
    static createList(preferences: UserPreferences, request: CreateListRequest): UserPreferences {
        const newList: UserList = {
            id: this.generateId(),
            name: request.name,
            description: request.description,
            items: [],
            isPublic: request.isPublic || false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            color: request.color,
            emoji: request.emoji,
        }

        return {
            ...preferences,
            userLists: {
                ...preferences.userLists,
                lists: [...preferences.userLists.lists, newList],
            },
        }
    }

    // Update an existing list
    static updateList(preferences: UserPreferences, request: UpdateListRequest): UserPreferences {
        const listIndex = preferences.userLists.lists.findIndex((list) => list.id === request.id)
        if (listIndex === -1) return preferences

        const updatedList = {
            ...preferences.userLists.lists[listIndex],
            ...request,
            updatedAt: Date.now(),
        }

        const updatedLists = [...preferences.userLists.lists]
        updatedLists[listIndex] = updatedList

        return {
            ...preferences,
            userLists: {
                ...preferences.userLists,
                lists: updatedLists,
            },
        }
    }

    // Delete a list
    static deleteList(preferences: UserPreferences, listId: string): UserPreferences {
        // Prevent deletion of default lists
        const { watchlist, liked, disliked } = preferences.userLists.defaultListIds
        if ([watchlist, liked, disliked].includes(listId)) {
            return preferences
        }

        return {
            ...preferences,
            userLists: {
                ...preferences.userLists,
                lists: preferences.userLists.lists.filter((list) => list.id !== listId),
            },
        }
    }

    // Add content to a list
    static addToList(preferences: UserPreferences, request: AddToListRequest): UserPreferences {
        const listIndex = preferences.userLists.lists.findIndex(
            (list) => list.id === request.listId
        )
        if (listIndex === -1) return preferences

        const currentList = preferences.userLists.lists[listIndex]

        // Check if item already exists in the list
        const itemExists = currentList.items.some((item) => item.id === request.content.id)
        if (itemExists) return preferences

        const updatedList = {
            ...currentList,
            items: [...currentList.items, request.content],
            updatedAt: Date.now(),
        }

        const updatedLists = [...preferences.userLists.lists]
        updatedLists[listIndex] = updatedList

        return {
            ...preferences,
            userLists: {
                ...preferences.userLists,
                lists: updatedLists,
            },
        }
    }

    // Remove content from a list
    static removeFromList(
        preferences: UserPreferences,
        request: RemoveFromListRequest
    ): UserPreferences {
        const listIndex = preferences.userLists.lists.findIndex(
            (list) => list.id === request.listId
        )
        if (listIndex === -1) return preferences

        const currentList = preferences.userLists.lists[listIndex]

        const updatedList = {
            ...currentList,
            items: currentList.items.filter((item) => item.id !== request.contentId),
            updatedAt: Date.now(),
        }

        const updatedLists = [...preferences.userLists.lists]
        updatedLists[listIndex] = updatedList

        return {
            ...preferences,
            userLists: {
                ...preferences.userLists,
                lists: updatedLists,
            },
        }
    }

    // Get a specific list
    static getList(preferences: UserPreferences, listId: string): UserList | null {
        return preferences.userLists.lists.find((list) => list.id === listId) || null
    }

    // Check if content is in a specific list
    static isContentInList(
        preferences: UserPreferences,
        listId: string,
        contentId: number
    ): boolean {
        const list = this.getList(preferences, listId)
        return list ? list.items.some((item) => item.id === contentId) : false
    }

    // Get all lists containing specific content
    static getListsContaining(preferences: UserPreferences, contentId: number): UserList[] {
        return preferences.userLists.lists.filter((list) =>
            list.items.some((item) => item.id === contentId)
        )
    }

    // Get default lists
    static getDefaultLists(preferences: UserPreferences) {
        const { watchlist, liked, disliked } = preferences.userLists.defaultListIds

        return {
            watchlist: this.getList(preferences, watchlist),
            liked: this.getList(preferences, liked),
            disliked: this.getList(preferences, disliked),
        }
    }

    // Get custom lists (non-default)
    static getCustomLists(preferences: UserPreferences): UserList[] {
        const { watchlist, liked, disliked } = preferences.userLists.defaultListIds
        const defaultIds = [watchlist, liked, disliked]

        return preferences.userLists.lists.filter((list) => !defaultIds.includes(list.id))
    }
}
