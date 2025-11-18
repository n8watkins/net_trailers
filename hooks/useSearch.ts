import { useEffect, useCallback, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useSearchStore } from '../stores/searchStore'
import type { Content } from '../typings'
import { getTitle } from '../typings'
import { useChildSafety } from './useChildSafety'
import { useDebounce } from '../utils/debounce'
import { useSearchFilters, applyFilters } from './search/useSearchFilters'
import { useSearchPagination } from './search/useSearchPagination'
import { filterDislikedContent } from '../utils/contentFilter'
import { useSessionData } from './useSessionData'

/**
 * Hook for managing search functionality with filtering, pagination, and real-time updates
 *
 * Provides comprehensive search capabilities including:
 * - Real-time search with 200ms debounce
 * - Advanced filtering (content type, rating, year, sorting)
 * - Pagination with load more functionality
 * - Search history tracking
 * - Child Safety Mode integration
 * - URL synchronization
 *
 * @returns Object containing search state, results, filters, and search actions
 *
 * @example
 * ```tsx
 * const {
 *   query,
 *   results,
 *   isLoading,
 *   updateQuery,
 *   performSearch,
 *   loadMore,
 *   clearSearch
 * } = useSearch()
 *
 * // Update search query (triggers debounced search)
 * updateQuery('action movies')
 *
 * // Load more results
 * if (hasMore && !isLoading) {
 *   loadMore()
 * }
 *
 * // Clear search results
 * clearSearch()
 * ```
 */
export function useSearch() {
    const pathname = usePathname()
    // Use granular selectors to prevent unnecessary re-renders
    const query = useSearchStore((state) => state.query)
    const results = useSearchStore((state) => state.results)
    const filteredResults = useSearchStore((state) => state.filteredResults)
    const isLoading = useSearchStore((state) => state.isLoading)
    const error = useSearchStore((state) => state.error)
    const hasSearched = useSearchStore((state) => state.hasSearched)
    const totalResults = useSearchStore((state) => state.totalResults)
    const currentPage = useSearchStore((state) => state.currentPage)
    const hasAllResults = useSearchStore((state) => state.hasAllResults)
    const isLoadingAll = useSearchStore((state) => state.isLoadingAll)
    const isTruncated = useSearchStore((state) => state.isTruncated)
    const filters = useSearchStore((state) => state.filters)
    const searchHistory = useSearchStore((state) => state.history)

    // Get actions separately
    const setSearch = useSearchStore((state) => state.setSearch)
    const addToSearchHistory = useSearchStore((state) => state.addToSearchHistory)

    const { isEnabled: childSafetyEnabled } = useChildSafety()
    const { hiddenMovies } = useSessionData()
    const debouncedQuery = useDebounce(query, 300)
    const abortControllerRef = useRef<AbortController | undefined>(undefined)
    const lastQueryRef = useRef<string>('')

    // Clear search results but preserve query
    const clearResults = useCallback(() => {
        setSearch((prev) => ({
            ...prev,
            results: [],
            filteredResults: [],
            hasSearched: false,
            error: null,
            isLoading: false,
            currentPage: 1,
            hasAllResults: false,
            isLoadingAll: false,
            isTruncated: false,
        }))
    }, [setSearch])

    // Pagination update handler
    const handlePaginationUpdate = useCallback(
        (update: {
            results?: Content[]
            filteredResults?: Content[]
            currentPage?: number
            hasAllResults?: boolean
            isTruncated?: boolean
            isLoadingAll?: boolean
        }) => {
            setSearch((prev) => ({ ...prev, ...update }))
        },
        [setSearch]
    )

    // Use pagination hook for bulk loading
    const { loadQuickSearchResults, loadAllResults, cancelRequests } = useSearchPagination({
        query,
        childSafetyEnabled,
        currentResults: results,
        currentPage,
        totalResults,
        filters,
        onUpdate: handlePaginationUpdate,
    })

    // Use filters hook
    const { hasActiveFilters } = useSearchFilters(results, filters, (filtered) => {
        setSearch((prev) => {
            // Only update if results have actually changed
            if (JSON.stringify(prev.filteredResults) !== JSON.stringify(filtered)) {
                return { ...prev, filteredResults: filtered }
            }
            return prev
        })
    })

    // Search function
    const performSearch = useCallback(
        async (query: string, page = 1) => {
            const trimmedQuery = query.trim()

            if (!trimmedQuery) {
                clearResults()
                return
            }

            // Cancel previous request
            if (abortControllerRef.current) {
                abortControllerRef.current.abort()
            }

            // Create new abort controller
            const currentController = new AbortController()
            abortControllerRef.current = currentController

            setSearch((prev) => ({
                ...prev,
                isLoading: true,
                error: null,
                hasSearched: true,
                currentPage: page,
                hasAllResults: false,
                isLoadingAll: false,
                isTruncated: false,
            }))

            try {
                const url = `/api/search?query=${encodeURIComponent(trimmedQuery)}&page=${page}&childSafetyMode=${childSafetyEnabled}`

                const response = await fetch(url, {
                    signal: currentController.signal,
                })

                if (!response.ok) {
                    throw new Error(`Search failed: ${response.statusText}`)
                }

                const data = await response.json()

                setSearch((prev) => {
                    const newResults =
                        page === 1 ? data.results || [] : [...prev.results, ...(data.results || [])]

                    return {
                        ...prev,
                        results: newResults,
                        totalResults: data.total_results || 0,
                        isLoading: false,
                        error: null,
                        hasAllResults: false,
                        isLoadingAll: false,
                    }
                })

                // Add to search history if it's a new search (page 1)
                if (page === 1) {
                    addToSearchHistory(trimmedQuery)
                }
            } catch (error) {
                if ((error as { name?: string }).name !== 'AbortError') {
                    const errorMessage = (error as { message?: string }).message || 'Search failed'
                    setSearch((prev) => ({
                        ...prev,
                        isLoading: false,
                        error: errorMessage,
                    }))
                }
                // AbortError is expected when cancelling requests, ignore it
            }
        },
        [setSearch, addToSearchHistory, clearResults, childSafetyEnabled]
    )

    // Effect to trigger search when debounced query changes
    useEffect(() => {
        const trimmedQuery = debouncedQuery.trim()

        // Only trigger if query actually changed
        if (trimmedQuery === lastQueryRef.current) {
            return
        }

        lastQueryRef.current = trimmedQuery

        if (trimmedQuery.length >= 2) {
            performSearchRef.current(trimmedQuery, 1)
        } else if (trimmedQuery.length === 0 && hasSearched) {
            clearResults()
        }
    }, [debouncedQuery, clearResults, hasSearched])

    // Effect to re-fetch search results when Child Safety Mode is toggled
    useEffect(() => {
        // Only refetch if we have an active search
        if (hasSearched && query.trim().length >= 2) {
            performSearchRef.current(query, 1)
        }
    }, [childSafetyEnabled, hasSearched, query])

    // Store performSearch in a ref to avoid dependency issues
    const performSearchRef = useRef(performSearch)
    performSearchRef.current = performSearch

    // Auto-load all results when filters are applied (only on search page)
    // Use a ref to track if we've already triggered auto-load for current filter state
    const lastFilterStateRef = useRef<string>('')

    useEffect(() => {
        // Only auto-load if:
        // 1. We're on the search page (not quick search)
        // 2. Filters are active
        // 3. We have search results
        // 4. We don't have all results yet
        // 5. We're not already loading all results
        const isOnSearchPage = pathname === '/search'

        // Create a unique key for current filter state
        const filterStateKey = JSON.stringify(filters)

        // Only trigger if filters actually changed (not just state updates)
        if (
            isOnSearchPage &&
            hasActiveFilters(filters) &&
            hasSearched &&
            results.length > 0 &&
            !hasAllResults &&
            !isLoadingAll &&
            filterStateKey !== lastFilterStateRef.current
        ) {
            lastFilterStateRef.current = filterStateKey
            loadAllResults()
        }

        // Reset ref when filters are cleared
        if (!hasActiveFilters(filters)) {
            lastFilterStateRef.current = ''
        }
    }, [
        pathname,
        filters,
        hasSearched,
        results.length,
        hasAllResults,
        isLoadingAll,
        hasActiveFilters,
        loadAllResults,
    ])

    // Auto-load first 100 results for quick search when filters are applied (NOT on search page)
    const lastQuickSearchFilterStateRef = useRef<string>('')

    useEffect(() => {
        const isOnSearchPage = pathname === '/search'
        const filterStateKey = JSON.stringify(filters)

        // Only auto-load for quick search (NOT on /search page) when filters are applied
        if (
            !isOnSearchPage &&
            hasActiveFilters(filters) &&
            hasSearched &&
            results.length > 0 &&
            results.length < 100 && // Only load if we have less than 100 results
            !isLoadingAll &&
            filterStateKey !== lastQuickSearchFilterStateRef.current
        ) {
            lastQuickSearchFilterStateRef.current = filterStateKey
            loadQuickSearchResults()
        }

        // Reset ref when filters are cleared
        if (!hasActiveFilters(filters)) {
            lastQuickSearchFilterStateRef.current = ''
        }
    }, [
        pathname,
        filters,
        hasSearched,
        results.length,
        isLoadingAll,
        hasActiveFilters,
        loadQuickSearchResults,
    ])

    // Update search query
    const updateQuery = useCallback(
        (query: string) => {
            setSearch((prev) => ({ ...prev, query }))
        },
        [setSearch]
    )

    // Load more results (pagination)
    const loadMore = useCallback(() => {
        if (!isLoading && hasSearched && query.trim()) {
            performSearch(query, currentPage + 1)
        }
    }, [isLoading, hasSearched, query, currentPage, performSearch])

    // Clear search
    const clearSearch = useCallback(() => {
        setSearch((prev) => ({
            ...prev,
            query: '',
            results: [],
            filteredResults: [],
            hasSearched: false,
            error: null,
            isLoading: false,
            currentPage: 1,
            hasAllResults: false,
            isLoadingAll: false,
            isTruncated: false,
        }))
    }, [setSearch])

    // Clear search when navigating away from search page
    // In App Router, we watch pathname changes instead of router.events
    const prevPathnameRef = useRef(pathname)
    useEffect(() => {
        // Only clear if we've navigated away from /search
        if (prevPathnameRef.current === '/search' && pathname !== '/search') {
            clearSearch()
        }
        prevPathnameRef.current = pathname
    }, [pathname, clearSearch])

    // Get search suggestions based on current search results
    const getSuggestions = useCallback(
        (queryStr: string) => {
            if (!queryStr.trim() || !filteredResults.length) return []

            const queryLower = queryStr.toLowerCase()
            return filteredResults
                .map((result) => getTitle(result))
                .filter(
                    (title) =>
                        title &&
                        title.toLowerCase().includes(queryLower) &&
                        title.toLowerCase() !== queryStr.toLowerCase()
                )
                .slice(0, 5)
        },
        [filteredResults]
    )

    return {
        // State
        query,
        results: filteredResults,
        allResults: results,
        suggestions: getSuggestions(query),
        isLoading,
        error,
        hasSearched,
        totalResults,
        filteredTotalResults: filteredResults.length,
        currentPage,
        searchHistory,
        filters,
        hasAllResults,
        isLoadingAll,
        isTruncated,

        // Actions
        updateQuery,
        performSearch,
        loadMore,
        clearSearch,
        clearResults,
        loadQuickSearchResults, // Exported for testing
        loadAllResults, // Exported for testing

        // Computed
        hasMore: !hasActiveFilters(filters) && results.length < totalResults,
        isEmpty: hasSearched && filteredResults.length === 0 && !isLoading && !isLoadingAll,
    }
}
