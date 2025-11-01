import { Content } from '../typings'
import {
    UserList,
    CreateListRequest,
    UpdateListRequest,
    AddToListRequest,
    RemoveFromListRequest,
} from '../types/userLists'
import { UserPreferences } from '../types/userData'
import { StateWithLists } from '../types/storeInterfaces'

// NEW SCHEMA - No more UserListsState or defaultListIds
// All methods now work with userCreatedWatchlists directly
// Generic methods accept any state that extends StateWithLists
export class UserListsService {
    // Generate a unique ID
    private static generateId(): string {
        return `list_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    // Create a new custom list
    static createList<T extends StateWithLists>(state: T, request: CreateListRequest): T {
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
            ...state,
            userCreatedWatchlists: [...state.userCreatedWatchlists, newList],
        }
    }

    // Update an existing list
    static updateList<T extends StateWithLists>(state: T, request: UpdateListRequest): T {
        const listIndex = state.userCreatedWatchlists.findIndex((list) => list.id === request.id)
        if (listIndex === -1) return state

        const updatedList = {
            ...state.userCreatedWatchlists[listIndex],
            ...request,
            updatedAt: Date.now(),
        }

        const updatedLists = [...state.userCreatedWatchlists]
        updatedLists[listIndex] = updatedList

        return {
            ...state,
            userCreatedWatchlists: updatedLists,
        }
    }

    // Delete a list
    static deleteList<T extends StateWithLists>(state: T, listId: string): T {
        return {
            ...state,
            userCreatedWatchlists: state.userCreatedWatchlists.filter((list) => list.id !== listId),
        }
    }

    // Add content to a list
    static addToList<T extends StateWithLists>(state: T, request: AddToListRequest): T {
        const listIndex = state.userCreatedWatchlists.findIndex(
            (list) => list.id === request.listId
        )
        if (listIndex === -1) return state

        const currentList = state.userCreatedWatchlists[listIndex]

        // Check if item already exists in the list
        const itemExists = currentList.items.some((item) => item.id === request.content.id)
        if (itemExists) return state

        const updatedList = {
            ...currentList,
            items: [...currentList.items, request.content],
            updatedAt: Date.now(),
        }

        const updatedLists = [...state.userCreatedWatchlists]
        updatedLists[listIndex] = updatedList

        return {
            ...state,
            userCreatedWatchlists: updatedLists,
        }
    }

    // Remove content from a list
    static removeFromList<T extends StateWithLists>(state: T, request: RemoveFromListRequest): T {
        const listIndex = state.userCreatedWatchlists.findIndex(
            (list) => list.id === request.listId
        )
        if (listIndex === -1) return state

        const currentList = state.userCreatedWatchlists[listIndex]

        const updatedList = {
            ...currentList,
            items: currentList.items.filter((item) => item.id !== request.contentId),
            updatedAt: Date.now(),
        }

        const updatedLists = [...state.userCreatedWatchlists]
        updatedLists[listIndex] = updatedList

        return {
            ...state,
            userCreatedWatchlists: updatedLists,
        }
    }

    // Get a specific list
    static getList<T extends StateWithLists>(state: T, listId: string): UserList | null {
        return state.userCreatedWatchlists.find((list) => list.id === listId) || null
    }

    // Check if content is in a specific list
    static isContentInList<T extends StateWithLists>(
        state: T,
        listId: string,
        contentId: number
    ): boolean {
        const list = this.getList(state, listId)
        return list ? list.items.some((item) => item.id === contentId) : false
    }

    // Get all lists containing specific content
    static getListsContaining<T extends StateWithLists>(state: T, contentId: number): UserList[] {
        return state.userCreatedWatchlists.filter((list) =>
            list.items.some((item) => item.id === contentId)
        )
    }

    // Get all custom lists
    static getAllLists<T extends StateWithLists>(state: T): UserList[] {
        return state.userCreatedWatchlists
    }
}
