import { create } from 'zustand'
import { Content, TrendingPerson } from '../typings'

// Search mode type
export type SearchMode = 'content' | 'people'

// Department filter for people search
export type DepartmentFilter = 'all' | 'acting' | 'directing' | 'writing'

// Search filters type for content
export interface SearchFilters {
    genres: string[]
    contentType: 'all' | 'movie' | 'tv'
    releaseYear: string
    rating: string
    sortBy?: string
    year?: string
}

// Search filters type for people
export interface PeopleSearchFilters {
    department: DepartmentFilter
}

export interface SearchState {
    // Search mode
    searchMode: SearchMode
    // Content search state
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
    // People search state
    peopleResults: TrendingPerson[]
    filteredPeopleResults: TrendingPerson[]
    peopleFilters: PeopleSearchFilters
    // Shared state
    history: string[]
    recentSearches: string[]
}

export interface SearchActions {
    setSearch: (updater: (prev: SearchState) => SearchState) => void
    setSearchQuery: (query: string) => void
    setSearchResults: (results: Content[]) => void
    setSearchLoading: (loading: boolean) => void
    setSearchFilters: (filters: Partial<SearchFilters>) => void
    setSearchMode: (mode: SearchMode) => void
    setPeopleResults: (results: TrendingPerson[]) => void
    setPeopleFilters: (filters: Partial<PeopleSearchFilters>) => void
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
    searchMode: 'content',
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
        contentType: 'movie',
        releaseYear: 'all',
        rating: 'all',
        sortBy: 'popularity.desc',
        year: 'all',
    },
    // People search state
    peopleResults: [],
    filteredPeopleResults: [],
    peopleFilters: {
        department: 'all',
    },
    history: loadSearchHistory(),
    recentSearches: [],

    // Actions
    setSearch: (updater: (prev: SearchState) => SearchState) => {
        set((state) => {
            const currentState: SearchState = {
                searchMode: state.searchMode,
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
                peopleResults: state.peopleResults,
                filteredPeopleResults: state.filteredPeopleResults,
                peopleFilters: state.peopleFilters,
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

    setSearchMode: (mode: SearchMode) => {
        set((state) => {
            // If mode is unchanged, don't reset state (prevents infinite loops from effects)
            if (state.searchMode === mode) {
                return state
            }
            return {
                ...state,
                searchMode: mode,
                // Clear results when switching modes
                results: [],
                filteredResults: [],
                peopleResults: [],
                filteredPeopleResults: [],
                hasSearched: false,
                error: null,
                currentPage: 1,
                hasAllResults: false,
                isLoadingAll: false,
                isTruncated: false,
            }
        })
    },

    setPeopleResults: (results: TrendingPerson[]) => {
        set({ peopleResults: results, filteredPeopleResults: results })
    },

    setPeopleFilters: (filters: Partial<PeopleSearchFilters>) => {
        set((state) => ({
            peopleFilters: {
                ...state.peopleFilters,
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
