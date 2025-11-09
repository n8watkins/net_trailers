import { Content } from '../typings'

/**
 * Smart Search System Types
 * Unified search/suggestion system for movie discovery, row creation, and watchlist creation
 */

export type SmartSearchMode = 'suggestions' | 'row' | 'watchlist'

export interface ConversationMessage {
    role: 'user' | 'assistant'
    content: string
}

export interface SmartSearchState {
    // Search state
    query: string
    isActive: boolean // true when user clicks/focuses search
    isLoading: boolean

    // Mode & results
    mode: SmartSearchMode
    results: Content[]
    removedIds: Set<number> // Track removed content IDs

    // Metadata from Gemini
    generatedName: string // For row/watchlist creation
    genreFallback: number[] // Genre IDs for infinite content
    mediaType: 'movie' | 'tv' | 'both'

    // Settings
    enableInfinite: boolean // Only applicable for row mode

    // Conversation history for "Ask for More"
    conversationHistory: ConversationMessage[]
}

export interface SmartSearchActions {
    // Query management
    setQuery: (query: string) => void
    setActive: (isActive: boolean) => void
    setLoading: (isLoading: boolean) => void

    // Mode management
    setMode: (mode: SmartSearchMode) => void

    // Results management
    setResults: (results: Content[], metadata: SmartSearchMetadata) => void
    addResults: (results: Content[]) => void // For "Ask for More"
    removeContent: (tmdbId: number) => void

    // Settings
    setGeneratedName: (name: string) => void
    toggleInfinite: () => void

    // Conversation
    addToConversation: (message: ConversationMessage) => void
    clearConversation: () => void

    // Reset
    reset: (clearQuery?: boolean) => void
}

export interface SmartSearchMetadata {
    generatedName: string
    genreFallback: number[]
    mediaType: 'movie' | 'tv' | 'both'
}

export interface ExistingMovie {
    title: string
    year: string
}

export interface SmartSearchAPIRequest {
    query: string
    mode: SmartSearchMode
    conversationHistory?: ConversationMessage[]
    existingMovies?: ExistingMovie[] // For "Ask for More" - send titles and years
}

export interface SmartSearchAPIResponse {
    results: Content[]
    generatedName: string
    genreFallback: number[]
    mediaType: 'movie' | 'tv' | 'both'
}
