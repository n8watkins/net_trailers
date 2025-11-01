import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/router'
import { useAppStore } from '../stores/appStore'
import type { SearchFilters } from '../stores/appStore'
import { getTitle, Content, getYear } from '../typings'
import { useChildSafety } from './useChildSafety'

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
                    const revenueA = (a as any).revenue || 0
                    const revenueB = (b as any).revenue || 0
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

export function useSearch() {
    const router = useRouter()
    const search = useAppStore((state) => state.search)
    const setSearch = useAppStore((state) => state.setSearch)
    const addToSearchHistory = useAppStore((state) => state.addToSearchHistory)
    const searchHistory = useAppStore((state) => state.search.history)
    const { isEnabled: childSafetyEnabled } = useChildSafety()
    const debouncedQuery = useDebounce(search.query, 200)
    const abortControllerRef = useRef<AbortController>()
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
            if (search.isLoadingAll || !search.hasSearched || !search.query.trim()) {
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
                const allResults = [...search.results]
                let currentPage = search.currentPage + 1

                // CRITICAL FIX: Use Math.ceil to handle fractional page counts
                // Example: 25 results / 20 = 1.25 → ceil(1.25) = 2 pages needed
                const calculatedPages = Math.max(1, Math.ceil(search.totalResults / 20))
                const targetPages = Math.min(maxPages, calculatedPages)

                // TMDB hard limit: 500 pages maximum (10,000 results)
                const TMDB_MAX_PAGE = 500
                const safeTargetPages = Math.min(targetPages, TMDB_MAX_PAGE)

                console.log('[QuickSearch] Loading additional pages:', {
                    totalResults: search.totalResults,
                    calculatedPages,
                    targetPages: safeTargetPages,
                    startPage: currentPage,
                })

                // Load up to maxPages (default 5 pages = 100 results)
                while (currentPage <= safeTargetPages && currentPage <= maxPages) {
                    const url = `/api/search?query=${encodeURIComponent(search.query.trim())}&page=${currentPage}&childSafetyMode=${childSafetyEnabled}`
                    const response = await fetch(url, {
                        signal: currentController.signal,
                    })

                    if (!response.ok) {
                        console.warn(
                            '[QuickSearch] API error at page',
                            currentPage,
                            response.statusText
                        )
                        break
                    }

                    const data = await response.json()

                    // Short-circuit if API returns no results or fewer than expected
                    if (!data.results || data.results.length === 0) {
                        console.log('[QuickSearch] No more results at page', currentPage)
                        break
                    }

                    allResults.push(...data.results)
                    currentPage++

                    // Short-circuit if we got fewer than 20 results (last page)
                    if (data.results.length < 20) {
                        console.log(
                            '[QuickSearch] Received partial page, stopping at page',
                            currentPage - 1
                        )
                        break
                    }
                }

                console.log(
                    '[QuickSearch] Loaded',
                    allResults.length,
                    'total results across',
                    currentPage - search.currentPage - 1,
                    'additional pages'
                )

                const filtered = await applyFilters(allResults, search.filters)

                setSearch((prev) => ({
                    ...prev,
                    results: allResults,
                    filteredResults: filtered,
                    isLoadingAll: false,
                    hasAllResults: allResults.length >= search.totalResults,
                    currentPage: currentPage - 1,
                }))
            } catch (error: any) {
                if (error.name !== 'AbortError') {
                    console.error('[QuickSearch] Error:', error)
                    setSearch((prev) => ({ ...prev, isLoadingAll: false }))
                }
                // AbortError is expected when cancelling requests
            }
        },
        [
            search.isLoadingAll,
            search.hasSearched,
            search.query,
            search.results,
            search.currentPage,
            search.totalResults,
            setSearch,
            childSafetyEnabled,
        ]
    )

    // Load all remaining results (for /search page)
    const loadAllResults = useCallback(async () => {
        if (
            search.hasAllResults ||
            search.isLoadingAll ||
            !search.hasSearched ||
            !search.query.trim()
        ) {
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
            const allResults = [...search.results]
            let currentPage = search.currentPage + 1

            // TMDB hard limit: 500 pages maximum (10,000 results)
            const TMDB_MAX_PAGE = 500
            const calculatedPages = Math.max(1, Math.ceil(search.totalResults / 20))
            const maxAllowedPage = Math.min(calculatedPages, TMDB_MAX_PAGE)

            console.log('[LoadAll] Loading all remaining pages:', {
                totalResults: search.totalResults,
                calculatedPages,
                maxAllowedPage,
                currentResultsCount: allResults.length,
                startPage: currentPage,
            })

            // Load all remaining pages with safety limits
            while (allResults.length < search.totalResults && currentPage <= maxAllowedPage) {
                const url = `/api/search?query=${encodeURIComponent(search.query.trim())}&page=${currentPage}&childSafetyMode=${childSafetyEnabled}`
                const response = await fetch(url, {
                    signal: currentController.signal,
                })

                if (!response.ok) {
                    console.warn('[LoadAll] API error at page', currentPage, response.statusText)
                    break
                }

                const data = await response.json()

                // Short-circuit if API returns no results
                if (!data.results || data.results.length === 0) {
                    console.log('[LoadAll] No more results at page', currentPage)
                    break
                }

                allResults.push(...data.results)
                currentPage++

                // Short-circuit if we got fewer than 20 results (last page)
                if (data.results.length < 20) {
                    console.log(
                        '[LoadAll] Received partial page, stopping at page',
                        currentPage - 1
                    )
                    break
                }
            }

            console.log(
                '[LoadAll] Loaded',
                allResults.length,
                'total results across',
                currentPage - search.currentPage - 1,
                'pages'
            )

            const filtered = await applyFilters(allResults, search.filters)

            setSearch((prev) => ({
                ...prev,
                results: allResults,
                filteredResults: filtered,
                hasAllResults: true,
                isLoadingAll: false,
                currentPage: currentPage - 1,
            }))
        } catch (error: any) {
            if (error.name !== 'AbortError') {
                console.error('[LoadAll] Error:', error)
                setSearch((prev) => ({ ...prev, isLoadingAll: false }))
            }
            // AbortError is expected when cancelling requests
        }
    }, [
        search.hasAllResults,
        search.isLoadingAll,
        search.hasSearched,
        search.query,
        search.results,
        search.currentPage,
        search.totalResults,
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
            } catch (error: any) {
                if (error.name !== 'AbortError') {
                    setSearch((prev) => ({
                        ...prev,
                        isLoading: false,
                        error: error.message || 'Search failed',
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
        } else if (trimmedQuery.length === 0 && search.hasSearched) {
            clearResults()
        }
    }, [debouncedQuery, clearResults, search.hasSearched])

    // Effect to re-fetch search results when Child Safety Mode is toggled
    useEffect(() => {
        // Only refetch if we have an active search
        if (search.hasSearched && search.query.trim().length >= 2) {
            performSearchRef.current(search.query, 1)
        }
    }, [childSafetyEnabled, search.hasSearched, search.query])

    // Store performSearch in a ref to avoid dependency issues
    const performSearchRef = useRef(performSearch)
    performSearchRef.current = performSearch

    // Update filteredResults when filters change
    useEffect(() => {
        const updateFilteredResults = async () => {
            if (search.results.length === 0) return

            const filtered = await applyFilters(search.results, search.filters)

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
    }, [search.results, search.filters, setSearch])
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
        const filterStateKey = JSON.stringify(search.filters)

        // Only trigger if filters actually changed (not just state updates)
        if (
            isOnSearchPage &&
            hasActiveFilters(search.filters) &&
            search.hasSearched &&
            search.results.length > 0 &&
            !search.hasAllResults &&
            !search.isLoadingAll &&
            filterStateKey !== lastFilterStateRef.current
        ) {
            lastFilterStateRef.current = filterStateKey
            loadAllResults()
        }

        // Reset ref when filters are cleared
        if (!hasActiveFilters(search.filters)) {
            lastFilterStateRef.current = ''
        }
    }, [router.pathname, search.filters, hasActiveFilters, loadAllResults])

    // Auto-load first 100 results for quick search when filters are applied (NOT on search page)
    const lastQuickSearchFilterStateRef = useRef<string>('')

    useEffect(() => {
        const isOnSearchPage = router.pathname === '/search'
        const filterStateKey = JSON.stringify(search.filters)

        // Only auto-load for quick search (NOT on /search page) when filters are applied
        if (
            !isOnSearchPage &&
            hasActiveFilters(search.filters) &&
            search.hasSearched &&
            search.results.length > 0 &&
            search.results.length < 100 && // Only load if we have less than 100 results
            !search.isLoadingAll &&
            filterStateKey !== lastQuickSearchFilterStateRef.current
        ) {
            lastQuickSearchFilterStateRef.current = filterStateKey
            loadQuickSearchResults()
        }

        // Reset ref when filters are cleared
        if (!hasActiveFilters(search.filters)) {
            lastQuickSearchFilterStateRef.current = ''
        }
    }, [router.pathname, search.filters, hasActiveFilters, loadQuickSearchResults])

    // Update search query
    const updateQuery = useCallback(
        (query: string) => {
            setSearch((prev) => ({ ...prev, query }))
        },
        [setSearch]
    )

    // Load more results (pagination)
    const loadMore = useCallback(() => {
        if (!search.isLoading && search.hasSearched && search.query.trim()) {
            performSearch(search.query, search.currentPage + 1)
        }
    }, [search.isLoading, search.hasSearched, search.query, search.currentPage, performSearch])

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
        (query: string) => {
            if (!query.trim() || !search.filteredResults.length) return []

            const queryLower = query.toLowerCase()
            return search.filteredResults
                .map((result) => getTitle(result))
                .filter(
                    (title) =>
                        title &&
                        title.toLowerCase().includes(queryLower) &&
                        title.toLowerCase() !== query.toLowerCase()
                )
                .slice(0, 5)
        },
        [search.filteredResults]
    )

    return {
        // State
        query: search.query,
        results: search.filteredResults,
        allResults: search.results,
        suggestions: getSuggestions(search.query),
        isLoading: search.isLoading,
        error: search.error,
        hasSearched: search.hasSearched,
        totalResults: search.totalResults,
        filteredTotalResults: search.filteredResults.length,
        currentPage: search.currentPage,
        searchHistory,
        filters: search.filters,
        hasAllResults: search.hasAllResults,
        isLoadingAll: search.isLoadingAll,

        // Actions
        updateQuery,
        performSearch,
        loadMore,
        clearSearch,
        clearResults,

        // Computed
        hasMore: !hasActiveFilters(search.filters) && search.results.length < search.totalResults,
        isEmpty:
            search.hasSearched &&
            search.filteredResults.length === 0 &&
            !search.isLoading &&
            !search.isLoadingAll,
    }
}
