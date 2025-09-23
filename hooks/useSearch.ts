import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/router'
import { useRecoilState } from 'recoil'
import { searchState, searchHistoryState, SearchFilters } from '../atoms/searchAtom'
import { getTitle, Content, isMovie, getYear } from '../typings'

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
    console.log('🎬 Applying search filters...')

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

    console.log(
        `🎬 Filtering complete: ${filteredResults.length}/${results.length} items match filters`
    )

    // Apply sorting if specified
    if (filters.sortBy !== 'popularity.desc') {
        filteredResults.sort((a, b) => {
            switch (filters.sortBy) {
                case 'revenue.desc':
                    const revenueA = (a as any).revenue || 0
                    const revenueB = (b as any).revenue || 0
                    return revenueB - revenueA
                case 'vote_average.desc':
                    const ratingA = a.vote_average || 0
                    const ratingB = b.vote_average || 0
                    return ratingB - ratingA
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
    const [search, setSearch] = useRecoilState(searchState)
    const [searchHistory, setSearchHistory] = useRecoilState(searchHistoryState)
    const debouncedQuery = useDebounce(search.query, 300)
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

    // Load all remaining results
    const loadAllResults = useCallback(async () => {
        if (
            search.hasAllResults ||
            search.isLoadingAll ||
            !search.hasSearched ||
            !search.query.trim()
        ) {
            return
        }

        console.log('🔄 Auto-loading all results for filtering...')
        setSearch((prev) => ({ ...prev, isLoadingAll: true }))

        try {
            const allResults = [...search.results]
            let currentPage = search.currentPage + 1

            // Load all remaining pages
            while (allResults.length < search.totalResults) {
                const url = `/api/search?query=${encodeURIComponent(search.query.trim())}&page=${currentPage}`
                const response = await fetch(url)

                if (!response.ok) break

                const data = await response.json()
                if (!data.results || data.results.length === 0) break

                allResults.push(...data.results)
                currentPage++

                console.log(
                    `📥 Loaded page ${currentPage - 1}, total results: ${allResults.length}/${search.totalResults}`
                )
            }

            const filtered = await applyFilters(allResults, search.filters)

            setSearch((prev) => ({
                ...prev,
                results: allResults,
                filteredResults: filtered,
                hasAllResults: true,
                isLoadingAll: false,
                currentPage: currentPage - 1,
            }))

            console.log('✅ All results loaded and cached')
        } catch (error) {
            console.error('❌ Error loading all results:', error)
            setSearch((prev) => ({ ...prev, isLoadingAll: false }))
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
    ])

    // Search function
    const performSearch = useCallback(
        async (query: string, page = 1) => {
            const trimmedQuery = query.trim()
            console.log('🚀 performSearch called:', { query, trimmedQuery, page })

            if (!trimmedQuery) {
                console.log('❌ Empty query, clearing results')
                clearResults()
                return
            }

            // Cancel previous request
            if (abortControllerRef.current) {
                console.log('🛑 Aborting previous request')
                abortControllerRef.current.abort()
            }

            // Create new abort controller
            const currentController = new AbortController()
            abortControllerRef.current = currentController

            console.log('⏳ Setting loading state')
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
                const url = `/api/search?query=${encodeURIComponent(trimmedQuery)}&page=${page}`
                console.log('📡 Fetching:', url)

                const response = await fetch(url, {
                    signal: currentController.signal,
                })

                console.log('📥 Response status:', response.status, response.statusText)

                if (!response.ok) {
                    throw new Error(`Search failed: ${response.statusText}`)
                }

                const data = await response.json()
                console.log('📊 Search data received:', {
                    resultsCount: data.results?.length || 0,
                    totalResults: data.total_results,
                    page: data.page,
                })

                setSearch((prev) => {
                    const newResults =
                        page === 1 ? data.results || [] : [...prev.results, ...(data.results || [])]

                    console.log('📋 Setting results:', {
                        newResultsCount: newResults.length,
                        filteredResultsCount: newResults.length, // Will be updated by filter effect
                        isFirstPage: page === 1,
                        previousResultsCount: prev.results.length,
                    })

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
                    setSearchHistory((prev) => {
                        const newHistory = [
                            trimmedQuery,
                            ...prev.filter((h) => h !== trimmedQuery),
                        ].slice(0, 10)
                        console.log('📚 Updated search history:', newHistory)
                        return newHistory
                    })
                }
            } catch (error: any) {
                if (error.name !== 'AbortError') {
                    console.error('❌ Search error:', error)
                    setSearch((prev) => ({
                        ...prev,
                        isLoading: false,
                        error: error.message || 'Search failed',
                    }))
                } else {
                    console.log('🛑 Request was aborted')
                }
            }
        },
        [setSearch, setSearchHistory, clearResults]
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
                    console.log('🔄 Filter results updated:', {
                        previousCount: prev.filteredResults.length,
                        newCount: filtered.length,
                        filters: search.filters,
                    })
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

    // Auto-load all results when filters are applied
    useEffect(() => {
        // Only auto-load if:
        // 1. Filters are active
        // 2. We have search results
        // 3. We don't have all results yet
        // 4. We're not already loading all results
        if (
            hasActiveFilters(search.filters) &&
            search.hasSearched &&
            search.results.length > 0 &&
            !search.hasAllResults &&
            !search.isLoadingAll
        ) {
            console.log('🎯 Filter applied, auto-loading all results...')
            loadAllResults()
        }
    }, [
        search.filters,
        search.hasSearched,
        search.results.length,
        search.hasAllResults,
        search.isLoadingAll,
        hasActiveFilters,
        loadAllResults,
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
