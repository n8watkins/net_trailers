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
function applyFilters(results: Content[], filters: SearchFilters): Content[] {
    return results.filter((item) => {
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

        // Duration Filter (movies only)
        if (filters.duration !== 'all' && isMovie(item)) {
            const runtime = item.runtime || 0
            switch (filters.duration) {
                case 'short':
                    if (runtime >= 90 || runtime === 0) return false
                    break
                case 'medium':
                    if (runtime < 90 || runtime > 150) return false
                    break
                case 'long':
                    if (runtime <= 150) return false
                    break
            }
        }

        return true
    })
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
        }))
    }, [setSearch])

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
                    const filtered = applyFilters(newResults, prev.filters)
                    console.log('📋 Setting results:', {
                        newResultsCount: newResults.length,
                        filteredResultsCount: filtered.length,
                        isFirstPage: page === 1,
                        previousResultsCount: prev.results.length,
                    })

                    return {
                        ...prev,
                        results: newResults,
                        filteredResults: filtered,
                        totalResults: data.total_results || 0,
                        isLoading: false,
                        error: null,
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
            // Call performSearch directly without dependency issues
            performSearchInternal(trimmedQuery)
        } else if (trimmedQuery.length === 0 && search.hasSearched) {
            clearResults()
        }

        async function performSearchInternal(query: string, page = 1) {
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
            }))

            try {
                const url = `/api/search?query=${encodeURIComponent(trimmedQuery)}&page=${page}`

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
                    const filtered = applyFilters(newResults, prev.filters)

                    return {
                        ...prev,
                        results: newResults,
                        filteredResults: filtered,
                        totalResults: data.total_results || 0,
                        isLoading: false,
                        error: null,
                    }
                })

                // Add to search history if it's a new search (page 1)
                if (page === 1) {
                    setSearchHistory((prev) => {
                        const newHistory = [
                            trimmedQuery,
                            ...prev.filter((h) => h !== trimmedQuery),
                        ].slice(0, 10)
                        return newHistory
                    })
                }
            } catch (error: any) {
                if (error.name !== 'AbortError') {
                    setSearch((prev) => ({
                        ...prev,
                        isLoading: false,
                        error: error.message || 'Search failed',
                    }))
                }
            }
        }
    }, [debouncedQuery, clearResults])

    // Compute filtered results using useMemo to prevent infinite loops
    const filteredResults = useMemo(() => {
        if (search.results.length === 0) return []
        return applyFilters(search.results, search.filters)
    }, [search.results, search.filters])

    // Update filteredResults in state when computed value changes
    useEffect(() => {
        setSearch((prev) => {
            if (prev.filteredResults !== filteredResults) {
                return {
                    ...prev,
                    filteredResults,
                }
            }
            return prev
        })
    }, [filteredResults, setSearch])

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
            if (!query.trim() || !filteredResults.length) return []

            const queryLower = query.toLowerCase()
            return filteredResults
                .map((result) => getTitle(result))
                .filter(
                    (title) =>
                        title &&
                        title.toLowerCase().includes(queryLower) &&
                        title.toLowerCase() !== query.toLowerCase()
                )
                .slice(0, 5)
        },
        [filteredResults]
    )

    return {
        // State
        query: search.query,
        results: filteredResults,
        allResults: search.results,
        suggestions: getSuggestions(search.query),
        isLoading: search.isLoading,
        error: search.error,
        hasSearched: search.hasSearched,
        totalResults: search.totalResults,
        filteredTotalResults: filteredResults.length,
        currentPage: search.currentPage,
        searchHistory,
        filters: search.filters,

        // Actions
        updateQuery,
        performSearch,
        loadMore,
        clearSearch,
        clearResults,

        // Computed
        hasMore: search.results.length < search.totalResults,
        isEmpty: search.hasSearched && filteredResults.length === 0 && !search.isLoading,
    }
}
