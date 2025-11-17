import DOMPurify from 'isomorphic-dompurify'
import {
    UserList,
    CreateListRequest,
    UpdateListRequest,
    AddToListRequest,
    RemoveFromListRequest,
} from '../types/userLists'
import { StateWithLists } from '../types/storeInterfaces'

// NEW SCHEMA - No more UserListsState or defaultListIds
// All methods now work with userCreatedWatchlists directly
// Generic methods accept any state that extends StateWithLists
export class UserListsService {
    // Generate a unique ID
    private static generateId(): string {
        return `list_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    /**
     * Sanitize user-generated text input to prevent XSS attacks
     * Strips all HTML tags and attributes from the input
     * @param text - The text to sanitize
     * @returns Sanitized text with no HTML tags
     */
    private static sanitizeText(text: string): string {
        return DOMPurify.sanitize(text.trim(), {
            ALLOWED_TAGS: [], // No HTML tags allowed
            ALLOWED_ATTR: [], // No HTML attributes allowed
        })
    }

    /**
     * Validate that emoji input is actually emoji characters
     * Prevents injection of arbitrary text/code as emoji
     * @param emoji - The emoji string to validate
     * @returns True if the input is valid emoji characters
     */
    private static isValidEmoji(emoji: string): boolean {
        // Limit length to prevent abuse (max 10 characters for combined emoji with modifiers)
        if (emoji.length > 10) return false

        // Reject strings that contain dangerous characters
        // Disallow: < > " ' / \ { } ( ) ; = & | $ `
        const dangerousCharsRegex = /[<>"'/\\{}();=&|$`]/
        if (dangerousCharsRegex.test(emoji)) return false

        // Reject control characters (0-31 and 127)
        // Split into separate check to avoid ESLint no-control-regex warning
        for (let i = 0; i < emoji.length; i++) {
            const charCode = emoji.charCodeAt(i)
            if ((charCode >= 0 && charCode <= 31) || charCode === 127) {
                return false
            }
        }

        // Reject alphanumeric characters (a-z, A-Z, 0-9)
        // Emoji shouldn't contain regular letters or numbers
        const alphanumericRegex = /[a-zA-Z0-9]/
        if (alphanumericRegex.test(emoji)) return false

        // If it passes all checks, accept it
        // This allows emoji while preventing XSS injection
        return true
    }

    // Create a new custom list
    static createList<T extends StateWithLists>(state: T, request: CreateListRequest): T {
        // Sanitize user inputs to prevent XSS attacks
        const sanitizedName = this.sanitizeText(request.name)
        if (!sanitizedName) {
            throw new Error('List name must include visible characters.')
        }

        // Validate and sanitize emoji if provided
        const sanitizedEmoji =
            request.emoji && this.isValidEmoji(request.emoji) ? request.emoji : undefined

        // Sanitize color if provided (only allow hex color format)
        const sanitizedColor =
            request.color && /^#[0-9A-Fa-f]{6}$/.test(request.color) ? request.color : undefined

        // Sanitize description if provided
        const sanitizedDescription = request.description
            ? this.sanitizeText(request.description)
            : undefined

        // Calculate order (place at end of existing collections)
        const maxOrder = state.userCreatedWatchlists.reduce(
            (max, list) => Math.max(max, list.order ?? 0),
            -1
        )
        const order = maxOrder + 1

        const newList: UserList = {
            id: this.generateId(),
            name: sanitizedName,
            description: sanitizedDescription,
            items: [],
            isPublic: request.isPublic || false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            color: sanitizedColor,
            emoji: sanitizedEmoji,
            collectionType: request.collectionType,
            displayAsRow: request.displayAsRow ?? true,
            order,
            enabled: true,
            // TMDB-based collection fields
            genres: request.genres,
            genreLogic: request.genreLogic,
            mediaType: request.mediaType,
            advancedFilters: request.advancedFilters,
            // Auto-update settings
            autoUpdateEnabled: request.autoUpdateEnabled,
            updateFrequency: request.updateFrequency,
            // AI-generated metadata
            originalQuery: request.originalQuery,
            canGenerateMore: request.canGenerateMore,
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

        // Sanitize user inputs to prevent XSS attacks
        const sanitizedUpdates: Partial<UserList> = {
            updatedAt: Date.now(),
        }

        // Sanitize name if provided
        if (request.name !== undefined) {
            const sanitizedName = this.sanitizeText(request.name)
            if (!sanitizedName) {
                throw new Error('List name must include visible characters.')
            }
            sanitizedUpdates.name = sanitizedName
        }

        // Sanitize description if provided
        if (request.description !== undefined) {
            sanitizedUpdates.description = request.description
                ? this.sanitizeText(request.description)
                : undefined
        }

        // Validate and sanitize emoji if provided
        if (request.emoji !== undefined) {
            sanitizedUpdates.emoji =
                request.emoji && this.isValidEmoji(request.emoji) ? request.emoji : undefined
        }

        // Sanitize color if provided (only allow hex color format)
        if (request.color !== undefined) {
            sanitizedUpdates.color =
                request.color && /^#[0-9A-Fa-f]{6}$/.test(request.color) ? request.color : undefined
        }

        // Include isPublic if provided
        if (request.isPublic !== undefined) {
            sanitizedUpdates.isPublic = request.isPublic
        }

        // Collection-specific fields
        if (request.displayAsRow !== undefined) {
            sanitizedUpdates.displayAsRow = request.displayAsRow
        }

        if (request.enabled !== undefined) {
            sanitizedUpdates.enabled = request.enabled
        }

        if (request.order !== undefined) {
            sanitizedUpdates.order = request.order
        }

        // TMDB-based collection fields
        if (request.genres !== undefined) {
            sanitizedUpdates.genres = request.genres
        }

        if (request.genreLogic !== undefined) {
            sanitizedUpdates.genreLogic = request.genreLogic
        }

        if (request.mediaType !== undefined) {
            sanitizedUpdates.mediaType = request.mediaType
        }

        if (request.advancedFilters !== undefined) {
            sanitizedUpdates.advancedFilters = request.advancedFilters
        }

        // Auto-update settings
        if (request.autoUpdateEnabled !== undefined) {
            sanitizedUpdates.autoUpdateEnabled = request.autoUpdateEnabled
        }

        if (request.updateFrequency !== undefined) {
            sanitizedUpdates.updateFrequency = request.updateFrequency
        }

        // Infinite content toggle
        if (request.canGenerateMore !== undefined) {
            sanitizedUpdates.canGenerateMore = request.canGenerateMore
        }

        const updatedList = {
            ...state.userCreatedWatchlists[listIndex],
            ...sanitizedUpdates,
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
