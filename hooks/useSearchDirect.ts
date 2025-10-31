/**
 * useSearchDirect - Direct Zustand hook for search functionality
 */

import { useAppStore } from '../stores/appStore'
import { Content } from '../typings'

export function useSearchDirect() {
    const {
        search,
        setSearch,
        setSearchQuery,
        setSearchResults,
        setSearchLoading,
        setSearchFilters,
        addToSearchHistory,
        clearSearchHistory,
    } = useAppStore()

    // Convenience methods
    const updateFilters = (filters: Partial<typeof search.filters>) => {
        setSearchFilters(filters)
    }

    const resetSearch = () => {
        setSearch(() => ({
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
            filters: {
                genres: [],
                contentType: 'all',
                releaseYear: 'all',
                rating: 'all',
                sortBy: 'popularity.desc',
                year: 'all',
            },
            history: search.history, // Preserve history
            recentSearches: search.recentSearches, // Preserve recent
        }))
    }

    const setError = (error: string | null) => {
        setSearch((prev) => ({ ...prev, error }))
    }

    const setHasSearched = (hasSearched: boolean) => {
        setSearch((prev) => ({ ...prev, hasSearched }))
    }

    const setFilteredResults = (filteredResults: Content[]) => {
        setSearch((prev) => ({ ...prev, filteredResults }))
    }

    const setTotalResults = (totalResults: number) => {
        setSearch((prev) => ({ ...prev, totalResults }))
    }

    const setCurrentPage = (currentPage: number) => {
        setSearch((prev) => ({ ...prev, currentPage }))
    }

    const setHasAllResults = (hasAllResults: boolean) => {
        setSearch((prev) => ({ ...prev, hasAllResults }))
    }

    const setIsLoadingAll = (isLoadingAll: boolean) => {
        setSearch((prev) => ({ ...prev, isLoadingAll }))
    }

    return {
        // State
        ...search,

        // Core actions (from store)
        setSearchQuery,
        setSearchResults,
        setSearchLoading,
        setSearchFilters,
        addToSearchHistory,
        clearSearchHistory,

        // Additional actions
        updateFilters,
        resetSearch,
        setError,
        setHasSearched,
        setFilteredResults,
        setTotalResults,
        setCurrentPage,
        setHasAllResults,
        setIsLoadingAll,

        // Convenience getters
        hasResults: search.results.length > 0,
        isSearching: search.isLoading,
        hasActiveFilters:
            search.filters.contentType !== 'all' ||
            search.filters.rating !== 'all' ||
            search.filters.year !== 'all' ||
            search.filters.genres.length > 0,
    }
}

// Export type for components that need it
export type UseSearchDirectReturn = ReturnType<typeof useSearchDirect>
