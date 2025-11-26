/**
 * useSearchDirect - Direct Zustand hook for search functionality
 */

import { useSearchStore } from '../stores/searchStore'
import { Content } from '../typings'

export function useSearchDirect() {
    const search = useSearchStore()

    // Convenience methods
    const updateFilters = (filters: Partial<typeof search.filters>) => {
        search.setSearchFilters(filters)
    }

    const resetSearch = () => {
        search.setSearch(() => ({
            searchMode: 'content',
            query: '',
            results: [],
            filteredResults: [],
            peopleResults: [],
            filteredPeopleResults: [],
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
            peopleFilters: {
                department: 'all',
            },
            history: search.history, // Preserve history
            recentSearches: search.recentSearches, // Preserve recent
        }))
    }

    const setError = (error: string | null) => {
        search.setSearch((prev) => ({ ...prev, error }))
    }

    const setHasSearched = (hasSearched: boolean) => {
        search.setSearch((prev) => ({ ...prev, hasSearched }))
    }

    const setFilteredResults = (filteredResults: Content[]) => {
        search.setSearch((prev) => ({ ...prev, filteredResults }))
    }

    const setTotalResults = (totalResults: number) => {
        search.setSearch((prev) => ({ ...prev, totalResults }))
    }

    const setCurrentPage = (currentPage: number) => {
        search.setSearch((prev) => ({ ...prev, currentPage }))
    }

    const setHasAllResults = (hasAllResults: boolean) => {
        search.setSearch((prev) => ({ ...prev, hasAllResults }))
    }

    const setIsLoadingAll = (isLoadingAll: boolean) => {
        search.setSearch((prev) => ({ ...prev, isLoadingAll }))
    }

    return {
        // State
        query: search.query,
        results: search.results,
        filteredResults: search.filteredResults,
        isLoading: search.isLoading,
        error: search.error,
        hasSearched: search.hasSearched,
        totalResults: search.totalResults,
        currentPage: search.currentPage,
        hasAllResults: search.hasAllResults,
        isLoadingAll: search.isLoadingAll,
        isTruncated: search.isTruncated,
        filters: search.filters,
        history: search.history,
        recentSearches: search.recentSearches,

        // Core actions (from store)
        setSearchQuery: search.setSearchQuery,
        setSearchResults: search.setSearchResults,
        setSearchLoading: search.setSearchLoading,
        setSearchFilters: search.setSearchFilters,
        addToSearchHistory: search.addToSearchHistory,
        clearSearchHistory: search.clearSearchHistory,

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
