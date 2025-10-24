import { Content } from '../typings'
import {
    UserList,
    CreateListRequest,
    UpdateListRequest,
    AddToListRequest,
    RemoveFromListRequest,
} from '../types/userLists'
import { UserPreferences } from '../types/userData'

// NEW SCHEMA - No more UserListsState or defaultListIds
// All methods now work with preferences.userCreatedWatchlists directly
export class UserListsService {
    // Generate a unique ID
    private static generateId(): string {
        return `list_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    // Create a new custom list
    static createList(preferences: UserPreferences, request: CreateListRequest): UserPreferences {
        const newList: UserList = {
            id: this.generateId(),
            name: request.name,
            items: [],
            isPublic: request.isPublic || false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            color: request.color,
            emoji: request.emoji,
        }

        return {
            ...preferences,
            userCreatedWatchlists: [...preferences.userCreatedWatchlists, newList],
        }
    }

    // Update an existing list
    static updateList(preferences: UserPreferences, request: UpdateListRequest): UserPreferences {
        const listIndex = preferences.userCreatedWatchlists.findIndex(
            (list) => list.id === request.id
        )
        if (listIndex === -1) return preferences

        const updatedList = {
            ...preferences.userCreatedWatchlists[listIndex],
            ...request,
            updatedAt: Date.now(),
        }

        const updatedLists = [...preferences.userCreatedWatchlists]
        updatedLists[listIndex] = updatedList

        return {
            ...preferences,
            userCreatedWatchlists: updatedLists,
        }
    }

    // Delete a list
    static deleteList(preferences: UserPreferences, listId: string): UserPreferences {
        return {
            ...preferences,
            userCreatedWatchlists: preferences.userCreatedWatchlists.filter(
                (list) => list.id !== listId
            ),
        }
    }

    // Add content to a list
    static addToList(preferences: UserPreferences, request: AddToListRequest): UserPreferences {
        const listIndex = preferences.userCreatedWatchlists.findIndex(
            (list) => list.id === request.listId
        )
        if (listIndex === -1) return preferences

        const currentList = preferences.userCreatedWatchlists[listIndex]

        // Check if item already exists in the list
        const itemExists = currentList.items.some((item) => item.id === request.content.id)
        if (itemExists) return preferences

        const updatedList = {
            ...currentList,
            items: [...currentList.items, request.content],
            updatedAt: Date.now(),
        }

        const updatedLists = [...preferences.userCreatedWatchlists]
        updatedLists[listIndex] = updatedList

        return {
            ...preferences,
            userCreatedWatchlists: updatedLists,
        }
    }

    // Remove content from a list
    static removeFromList(
        preferences: UserPreferences,
        request: RemoveFromListRequest
    ): UserPreferences {
        const listIndex = preferences.userCreatedWatchlists.findIndex(
            (list) => list.id === request.listId
        )
        if (listIndex === -1) return preferences

        const currentList = preferences.userCreatedWatchlists[listIndex]

        const updatedList = {
            ...currentList,
            items: currentList.items.filter((item) => item.id !== request.contentId),
            updatedAt: Date.now(),
        }

        const updatedLists = [...preferences.userCreatedWatchlists]
        updatedLists[listIndex] = updatedList

        return {
            ...preferences,
            userCreatedWatchlists: updatedLists,
        }
    }

    // Get a specific list
    static getList(preferences: UserPreferences, listId: string): UserList | null {
        return preferences.userCreatedWatchlists.find((list) => list.id === listId) || null
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
        return preferences.userCreatedWatchlists.filter((list) =>
            list.items.some((item) => item.id === contentId)
        )
    }

    // Get all custom lists
    static getAllLists(preferences: UserPreferences): UserList[] {
        return preferences.userCreatedWatchlists
    }
}
