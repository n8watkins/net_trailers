import { create } from 'zustand'
import { Content } from '../typings'

// Search filters type
export interface SearchFilters {
    genres: string[]
    contentType: 'all' | 'movie' | 'tv'
    releaseYear: string
    rating: string
    sortBy?: string
    year?: string
}

export interface SearchState {
    query: string
    results: Content[]
    filteredResults: Content[]
    isLoading: boolean
    error: string | null
    hasSearched: boolean
    totalResults: number
    currentPage: number
    hasAllResults: boolean
    isLoadingAll: boolean
    isTruncated: boolean
    filters: SearchFilters
    history: string[]
    recentSearches: string[]
}

export interface SearchActions {
    setSearch: (updater: (prev: SearchState) => SearchState) => void
    setSearchQuery: (query: string) => void
    setSearchResults: (results: Content[]) => void
    setSearchLoading: (loading: boolean) => void
    setSearchFilters: (filters: Partial<SearchFilters>) => void
    addToSearchHistory: (query: string) => void
    clearSearchHistory: () => void
}

export type SearchStore = SearchState & SearchActions

// Helper to load search history from localStorage
const loadSearchHistory = (): string[] => {
    if (typeof window === 'undefined') return []
    try {
        const saved = localStorage.getItem('nettrailer-search-history')
        if (saved) {
            return JSON.parse(saved)
        }
    } catch (error) {
        console.error('Failed to load search history:', error)
    }
    return []
}

// Helper to save search history to localStorage
const saveSearchHistory = (history: string[]) => {
    if (typeof window === 'undefined') return
    try {
        localStorage.setItem('nettrailer-search-history', JSON.stringify(history))
    } catch (error) {
        console.error('Failed to save search history:', error)
    }
}

export const useSearchStore = create<SearchStore>((set, get) => ({
    // Initial state
    query: '',
    results: [],
    filteredResults: [],
    isLoading: false,
    error: null,
    hasSearched: false,
    totalResults: 0,
    currentPage: 1,
    hasAllResults: false,
    isLoadingAll: false,
    isTruncated: false,
    filters: {
        genres: [],
        contentType: 'all',
        releaseYear: 'all',
        rating: 'all',
        sortBy: 'popularity.desc',
        year: 'all',
    },
    history: loadSearchHistory(),
    recentSearches: [],

    // Actions
    setSearch: (updater: (prev: SearchState) => SearchState) => {
        set((state) => {
            const currentState: SearchState = {
                query: state.query,
                results: state.results,
                filteredResults: state.filteredResults,
                isLoading: state.isLoading,
                error: state.error,
                hasSearched: state.hasSearched,
                totalResults: state.totalResults,
                currentPage: state.currentPage,
                hasAllResults: state.hasAllResults,
                isLoadingAll: state.isLoadingAll,
                isTruncated: state.isTruncated,
                filters: state.filters,
                history: state.history,
                recentSearches: state.recentSearches,
            }
            return updater(currentState)
        })
    },

    setSearchQuery: (query: string) => {
        set({ query })
    },

    setSearchResults: (results: Content[]) => {
        set({ results })
    },

    setSearchLoading: (loading: boolean) => {
        set({ isLoading: loading })
    },

    setSearchFilters: (filters: Partial<SearchFilters>) => {
        set((state) => ({
            filters: {
                ...state.filters,
                ...filters,
            },
        }))
    },

    addToSearchHistory: (query: string) => {
        const state = get()
        const trimmedQuery = query.trim()

        if (trimmedQuery && !state.history.includes(trimmedQuery)) {
            const newHistory = [trimmedQuery, ...state.history].slice(0, 10) // Keep last 10
            const newRecent = [
                trimmedQuery,
                ...state.recentSearches.filter((q) => q !== trimmedQuery),
            ].slice(0, 5) // Keep last 5

            // Persist to localStorage
            saveSearchHistory(newHistory)

            set({
                history: newHistory,
                recentSearches: newRecent,
            })
        }
    },

    clearSearchHistory: () => {
        // Clear from localStorage
        saveSearchHistory([])

        set({
            history: [],
            recentSearches: [],
        })
    },
}))
