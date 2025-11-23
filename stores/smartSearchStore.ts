import { create } from 'zustand'
import { Content } from '../typings'
import {
    SmartSearchState,
    SmartSearchActions,
    SmartSearchMode,
    SmartSearchMetadata,
    ConversationMessage,
} from '../types/smartSearch'

type SmartSearchStore = SmartSearchState & SmartSearchActions

const initialState: SmartSearchState = {
    query: '',
    isActive: false,
    isLoading: false,
    mode: 'suggestions',
    results: [],
    removedIds: new Set(),
    newlyAddedIds: new Set(), // Track newly added results for animation
    generatedName: '',
    genreFallback: [],
    mediaType: 'both',
    emoji: '🎬',
    color: '#ef4444',
    enableInfinite: false,
    conversationHistory: [],
}

export const useSmartSearchStore = create<SmartSearchStore>((set, get) => ({
    ...initialState,

    // Query management
    setQuery: (query: string) =>
        set({
            query,
        }),

    setActive: (isActive: boolean) =>
        set({
            isActive,
        }),

    setLoading: (isLoading: boolean) =>
        set({
            isLoading,
        }),

    // Mode management
    setMode: (mode: SmartSearchMode) =>
        set({
            mode,
            // Reset infinite toggle when switching modes
            enableInfinite: mode === 'row' ? get().enableInfinite : false,
        }),

    // Results management
    setResults: (results: Content[], metadata: SmartSearchMetadata) =>
        set({
            results,
            generatedName: metadata.generatedName,
            genreFallback: metadata.genreFallback,
            mediaType: metadata.mediaType,
            emoji: metadata.emoji || '🎬',
            color: metadata.color || '#ef4444',
            removedIds: new Set(), // Clear removed IDs on new search
        }),

    addResults: (newResults: Content[]) => {
        const state = get()
        const existingIds = new Set([
            ...state.results.map((r) => r.id),
            ...Array.from(state.removedIds),
        ])

        // Deduplicate: only add results that don't already exist
        const uniqueResults = newResults.filter((r) => !existingIds.has(r.id))

        // Track newly added IDs for staggered animation
        const newIds = new Set(uniqueResults.map((r) => r.id))

        set({
            results: [...state.results, ...uniqueResults],
            newlyAddedIds: newIds,
        })
    },

    clearNewlyAddedIds: () =>
        set({
            newlyAddedIds: new Set(),
        }),

    removeContent: (tmdbId: number) => {
        const state = get()
        set({
            results: state.results.filter((r) => r.id !== tmdbId),
            removedIds: new Set([...Array.from(state.removedIds), tmdbId]),
        })
    },

    // Settings
    setGeneratedName: (name: string) =>
        set({
            generatedName: name,
        }),

    setEmoji: (emoji: string) =>
        set({
            emoji,
        }),

    setColor: (color: string) =>
        set({
            color,
        }),

    toggleInfinite: () =>
        set((state) => ({
            enableInfinite: !state.enableInfinite,
        })),

    // Conversation
    addToConversation: (message: ConversationMessage) =>
        set((state) => ({
            conversationHistory: [...state.conversationHistory, message],
        })),

    clearConversation: () =>
        set({
            conversationHistory: [],
        }),

    // Reset
    reset: (clearQuery = false) =>
        set({
            ...initialState,
            removedIds: new Set(), // Create fresh Set instance (don't reuse shared reference)
            newlyAddedIds: new Set(), // Create fresh Set instance
            conversationHistory: [], // Create fresh array instance
            // Preserve query unless explicitly requested to clear
            query: clearQuery ? '' : get().query,
        }),
}))
