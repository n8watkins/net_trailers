import { create } from 'zustand'
import { Content } from '../types/atoms'
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
    generatedName: '',
    genreFallback: [],
    mediaType: 'both',
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

        set({
            results: [...state.results, ...uniqueResults],
        })
    },

    removeContent: (tmdbId: number) => {
        const state = get()
        set({
            results: state.results.filter((r) => r.id !== tmdbId),
            removedIds: new Set([...state.removedIds, tmdbId]),
        })
    },

    // Settings
    setGeneratedName: (name: string) =>
        set({
            generatedName: name,
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
            // Preserve query unless explicitly requested to clear
            query: clearQuery ? '' : get().query,
        }),
}))
