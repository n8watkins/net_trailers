import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/router'
import { useSearchStore } from '../stores/searchStore'
import type { SearchFilters } from '../stores/searchStore'
import { getTitle, Content, getYear, isMovie } from '../typings'
import { useChildSafety } from './useChildSafety'
import { guestLog, guestError } from '../utils/debugLogger'

// Custom debounce hook
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value)

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value)
        }, delay)

        return () => {
            clearTimeout(handler)
        }
    }, [value, delay])

    return debouncedValue
}

// Filter content based on search filters
async function applyFilters(results: Content[], filters: SearchFilters): Promise<Content[]> {
    // Apply filters to all results
    const filteredResults = results.filter((item) => {
        // Content Type Filter
        if (filters.contentType !== 'all') {
            if (filters.contentType === 'movie' && item.media_type !== 'movie') return false
            if (filters.contentType === 'tv' && item.media_type !== 'tv') return false
        }

        // Rating Filter
        if (filters.rating !== 'all') {
            const rating = item.vote_average || 0
            switch (filters.rating) {
                case '7.0+':
                    if (rating < 7.0) return false
                    break
                case '8.0+':
                    if (rating < 8.0) return false
                    break
                case '9.0+':
                    if (rating < 9.0) return false
                    break
            }
        }

        // Year Filter
        if (filters.year !== 'all') {
            const year = getYear(item)
            if (year) {
                const yearNum = parseInt(year)
                switch (filters.year) {
                    case '2020s':
                        if (yearNum < 2020 || yearNum > 2029) return false
                        break
                    case '2010s':
                        if (yearNum < 2010 || yearNum > 2019) return false
                        break
                    case '2000s':
                        if (yearNum < 2000 || yearNum > 2009) return false
                        break
                    case '1990s':
                        if (yearNum < 1990 || yearNum > 1999) return false
                        break
                }
            }
        }

        return true
    })

    // Apply sorting if specified
    if (filters.sortBy !== 'popularity.desc') {
        filteredResults.sort((a, b) => {
            switch (filters.sortBy) {
                case 'revenue.desc': {
                    // Only movies have revenue; TV shows default to 0
                    const revenueA = isMovie(a) ? a.revenue || 0 : 0
                    const revenueB = isMovie(b) ? b.revenue || 0 : 0
                    return revenueB - revenueA
                }
                case 'vote_average.desc': {
                    const ratingA = a.vote_average || 0
                    const ratingB = b.vote_average || 0
                    return ratingB - ratingA
                }
                default:
                    // Default is popularity.desc which should already be sorted by TMDB
                    return 0
            }
        })
    }

    return filteredResults
}

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
    const router = useRouter()
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
    const debouncedQuery = useDebounce(query, 200)
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

    // Check if any filters are active
    const hasActiveFilters = useCallback((filters: SearchFilters) => {
        return Object.entries(filters).some(([key, value]) => {
            if (key === 'sortBy') return value !== 'popularity.desc'
            return value !== 'all'
        })
    }, [])

    // Load first N pages for quick search filtering (lighter than loading all)
    const loadQuickSearchResults = useCallback(
        async (maxPages: number = 5) => {
            if (isLoadingAll || !hasSearched || !query.trim()) {
                return
            }

            setSearch((prev) => ({ ...prev, isLoadingAll: true }))

            // Cancel previous quick-search request
            if (abortControllerRef.current) {
                abortControllerRef.current.abort()
            }

            const currentController = new AbortController()
            abortControllerRef.current = currentController

            try {
                const allResults = [...results]
                let currentPageNum = currentPage + 1
                let wasTruncated = false

                // CRITICAL FIX: Use Math.ceil to handle fractional page counts
                // Example: 25 results / 20 = 1.25 → ceil(1.25) = 2 pages needed
                const calculatedPages = Math.max(1, Math.ceil(totalResults / 20))
                const targetPages = Math.min(maxPages, calculatedPages)

                // TMDB hard limit: 500 pages maximum (10,000 results)
                const TMDB_MAX_PAGE = 500
                const safeTargetPages = Math.min(targetPages, TMDB_MAX_PAGE)

                guestLog('[QuickSearch] Loading additional pages:', {
                    totalResults,
                    calculatedPages,
                    targetPages: safeTargetPages,
                    startPage: currentPageNum,
                })

                // Load up to maxPages (default 5 pages = 100 results)
                while (currentPageNum <= safeTargetPages && currentPageNum <= maxPages) {
                    const url = `/api/search?query=${encodeURIComponent(query.trim())}&page=${currentPageNum}&childSafetyMode=${childSafetyEnabled}`
                    const response = await fetch(url, {
                        signal: currentController.signal,
                    })

                    if (!response.ok) {
                        guestError(
                            '[QuickSearch] API error at page',
                            currentPageNum,
                            response.statusText
                        )
                        wasTruncated = true
                        break
                    }

                    const data = await response.json()

                    // Short-circuit if API returns no results or fewer than expected
                    if (!data.results || data.results.length === 0) {
                        guestLog('[QuickSearch] No more results at page', currentPageNum)
                        break
                    }

                    allResults.push(...data.results)
                    currentPageNum++

                    // Short-circuit if we got fewer than 20 results (last page)
                    if (data.results.length < 20) {
                        guestLog(
                            '[QuickSearch] Received partial page, stopping at page',
                            currentPageNum - 1
                        )
                        break
                    }
                }

                // Check if we stopped early due to maxPages limit
                if (currentPageNum > maxPages && allResults.length < totalResults) {
                    wasTruncated = true
                    guestLog('[QuickSearch] Truncated: Reached maxPages limit')
                }

                guestLog(
                    '[QuickSearch] Loaded',
                    allResults.length,
                    'total results across',
                    currentPageNum - currentPage - 1,
                    'additional pages',
                    wasTruncated ? '(TRUNCATED)' : ''
                )

                const filtered = await applyFilters(allResults, filters)

                setSearch((prev) => ({
                    ...prev,
                    results: allResults,
                    filteredResults: filtered,
                    isLoadingAll: false,
                    hasAllResults: allResults.length >= totalResults,
                    isTruncated: wasTruncated,
                    currentPage: currentPageNum - 1,
                }))
            } catch (error) {
                if ((error as { name?: string }).name !== 'AbortError') {
                    guestError('[QuickSearch] Error:', error)
                    setSearch((prev) => ({
                        ...prev,
                        isLoadingAll: false,
                        isTruncated: true,
                    }))
                } else {
                    // AbortError is expected when cancelling requests
                    setSearch((prev) => ({
                        ...prev,
                        isLoadingAll: false,
                        isTruncated: true,
                    }))
                }
            }
        },
        [
            isLoadingAll,
            hasSearched,
            query,
            results,
            currentPage,
            totalResults,
            filters,
            setSearch,
            childSafetyEnabled,
        ]
    )

    // Load all remaining results (for /search page)
    const loadAllResults = useCallback(async () => {
        if (hasAllResults || isLoadingAll || !hasSearched || !query.trim()) {
            return
        }

        setSearch((prev) => ({ ...prev, isLoadingAll: true }))

        // Cancel previous load-all request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
        }

        const currentController = new AbortController()
        abortControllerRef.current = currentController

        try {
            const allResults = [...results]
            let currentPageNum = currentPage + 1
            let wasTruncated = false

            // TMDB hard limit: 500 pages maximum (10,000 results)
            const TMDB_MAX_PAGE = 500
            const calculatedPages = Math.max(1, Math.ceil(totalResults / 20))
            const maxAllowedPage = Math.min(calculatedPages, TMDB_MAX_PAGE)

            guestLog('[LoadAll] Loading all remaining pages:', {
                totalResults,
                calculatedPages,
                maxAllowedPage,
                currentResultsCount: allResults.length,
                startPage: currentPageNum,
            })

            // Load all remaining pages with safety limits
            while (allResults.length < totalResults && currentPageNum <= maxAllowedPage) {
                const url = `/api/search?query=${encodeURIComponent(query.trim())}&page=${currentPageNum}&childSafetyMode=${childSafetyEnabled}`
                const response = await fetch(url, {
                    signal: currentController.signal,
                })

                if (!response.ok) {
                    guestError('[LoadAll] API error at page', currentPageNum, response.statusText)
                    wasTruncated = true
                    break
                }

                const data = await response.json()

                // Short-circuit if API returns no results
                if (!data.results || data.results.length === 0) {
                    guestLog('[LoadAll] No more results at page', currentPageNum)
                    break
                }

                allResults.push(...data.results)
                currentPageNum++

                // Short-circuit if we got fewer than 20 results (last page)
                if (data.results.length < 20) {
                    guestLog(
                        '[LoadAll] Received partial page, stopping at page',
                        currentPageNum - 1
                    )
                    break
                }
            }

            // Check if we hit the TMDB page limit
            if (currentPageNum > TMDB_MAX_PAGE && allResults.length < totalResults) {
                wasTruncated = true
                guestLog('[LoadAll] Truncated: Hit TMDB 500-page limit')
            }

            guestLog(
                '[LoadAll] Loaded',
                allResults.length,
                'total results across',
                currentPageNum - currentPage - 1,
                'pages',
                wasTruncated ? '(TRUNCATED)' : ''
            )

            const filtered = await applyFilters(allResults, filters)

            setSearch((prev) => ({
                ...prev,
                results: allResults,
                filteredResults: filtered,
                hasAllResults: allResults.length >= totalResults,
                isTruncated: wasTruncated,
                isLoadingAll: false,
                currentPage: currentPageNum - 1,
            }))
        } catch (error) {
            if ((error as { name?: string }).name !== 'AbortError') {
                guestError('[LoadAll] Error:', error)
                setSearch((prev) => ({
                    ...prev,
                    isLoadingAll: false,
                    isTruncated: true,
                }))
            } else {
                // AbortError is expected when cancelling requests
                setSearch((prev) => ({
                    ...prev,
                    isLoadingAll: false,
                    isTruncated: true,
                }))
            }
        }
    }, [
        hasAllResults,
        isLoadingAll,
        hasSearched,
        query,
        results,
        currentPage,
        totalResults,
        filters,
        setSearch,
        childSafetyEnabled,
    ])

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

    // Update filteredResults when filters change
    useEffect(() => {
        const updateFilteredResults = async () => {
            if (results.length === 0) return

            const filtered = await applyFilters(results, filters)

            setSearch((prev) => {
                // Only update if results have actually changed
                if (JSON.stringify(prev.filteredResults) !== JSON.stringify(filtered)) {
                    return {
                        ...prev,
                        filteredResults: filtered,
                    }
                }
                return prev
            })
        }

        updateFilteredResults()
    }, [results, filters, setSearch])
    // Note: setSearch is stable from Zustand, safe to include

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
        const isOnSearchPage = router.pathname === '/search'

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
        router.pathname,
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
        const isOnSearchPage = router.pathname === '/search'
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
        router.pathname,
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
    useEffect(() => {
        const handleRouteChange = (url: string) => {
            // Clear search if navigating to any page other than search
            if (!url.startsWith('/search')) {
                clearSearch()
            }
        }

        router.events.on('routeChangeStart', handleRouteChange)
        return () => {
            router.events.off('routeChangeStart', handleRouteChange)
        }
    }, [router.events, clearSearch])

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
