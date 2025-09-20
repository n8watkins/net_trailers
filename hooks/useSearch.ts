import { useState, useEffect, useCallback, useRef } from 'react'
import { useRecoilState } from 'recoil'
import { searchState, searchHistoryState } from '../atoms/searchAtom'
import { getTitle } from '../typings'

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

export function useSearch() {
    const [search, setSearch] = useRecoilState(searchState)
    const [searchHistory, setSearchHistory] = useRecoilState(searchHistoryState)
    const debouncedQuery = useDebounce(search.query, 300)
    const abortControllerRef = useRef<AbortController>()
    const lastQueryRef = useRef<string>('')

    // Search function
    const performSearch = useCallback(async (query: string, page = 1) => {
        const trimmedQuery = query.trim()
        console.log('🚀 performSearch called:', { query, trimmedQuery, page })

        if (!trimmedQuery) {
            console.log('❌ Empty query, clearing results')
            setSearch(prev => ({
                ...prev,
                results: [],
                isLoading: false,
                hasSearched: false,
                error: null
            }))
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
        setSearch(prev => ({
            ...prev,
            isLoading: true,
            error: null,
            hasSearched: true,
            currentPage: page
        }))

        try {
            const url = `/api/search?query=${encodeURIComponent(trimmedQuery)}&page=${page}`
            console.log('📡 Fetching:', url)

            const response = await fetch(url, {
                signal: currentController.signal
            })

            console.log('📥 Response status:', response.status, response.statusText)

            if (!response.ok) {
                throw new Error(`Search failed: ${response.statusText}`)
            }

            const data = await response.json()
            console.log('📊 Search data received:', {
                resultsCount: data.results?.length || 0,
                totalResults: data.total_results,
                page: data.page
            })

            setSearch(prev => {
                const newResults = page === 1 ? (data.results || []) : [...prev.results, ...(data.results || [])]
                console.log('📋 Setting results:', {
                    newResultsCount: newResults.length,
                    isFirstPage: page === 1,
                    previousResultsCount: prev.results.length
                })

                return {
                    ...prev,
                    results: newResults,
                    totalResults: data.total_results || 0,
                    isLoading: false,
                    error: null
                }
            })

            // Add to search history if it's a new search (page 1)
            if (page === 1) {
                setSearchHistory(prev => {
                    const newHistory = [trimmedQuery, ...prev.filter(h => h !== trimmedQuery)].slice(0, 10)
                    console.log('📚 Updated search history:', newHistory)
                    return newHistory
                })
            }

        } catch (error: any) {
            if (error.name !== 'AbortError') {
                console.error('❌ Search error:', error)
                setSearch(prev => ({
                    ...prev,
                    isLoading: false,
                    error: error.message || 'Search failed'
                }))
            } else {
                console.log('🛑 Request was aborted')
            }
        }
    }, [setSearch, setSearchHistory])

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
            setSearch(prev => ({
                ...prev,
                results: [],
                hasSearched: false,
                error: null,
                isLoading: false
            }))
        }

        async function performSearchInternal(query: string, page = 1) {
            const trimmedQuery = query.trim()

            if (!trimmedQuery) {
                setSearch(prev => ({
                    ...prev,
                    results: [],
                    isLoading: false,
                    hasSearched: false,
                    error: null
                }))
                return
            }

            // Cancel previous request
            if (abortControllerRef.current) {
                abortControllerRef.current.abort()
            }

            // Create new abort controller
            const currentController = new AbortController()
            abortControllerRef.current = currentController

            setSearch(prev => ({
                ...prev,
                isLoading: true,
                error: null,
                hasSearched: true,
                currentPage: page
            }))

            try {
                const url = `/api/search?query=${encodeURIComponent(trimmedQuery)}&page=${page}`

                const response = await fetch(url, {
                    signal: currentController.signal
                })

                if (!response.ok) {
                    throw new Error(`Search failed: ${response.statusText}`)
                }

                const data = await response.json()

                setSearch(prev => {
                    const newResults = page === 1 ? (data.results || []) : [...prev.results, ...(data.results || [])]

                    return {
                        ...prev,
                        results: newResults,
                        totalResults: data.total_results || 0,
                        isLoading: false,
                        error: null
                    }
                })

                // Add to search history if it's a new search (page 1)
                if (page === 1) {
                    setSearchHistory(prev => {
                        const newHistory = [trimmedQuery, ...prev.filter(h => h !== trimmedQuery)].slice(0, 10)
                        return newHistory
                    })
                }

            } catch (error: any) {
                if (error.name !== 'AbortError') {
                    setSearch(prev => ({
                        ...prev,
                        isLoading: false,
                        error: error.message || 'Search failed'
                    }))
                }
            }
        }
    }, [debouncedQuery])

    // Update search query
    const updateQuery = useCallback((query: string) => {
        setSearch(prev => ({ ...prev, query }))
    }, [setSearch])

    // Load more results (pagination)
    const loadMore = useCallback(() => {
        if (!search.isLoading && search.hasSearched && search.query.trim()) {
            performSearch(search.query, search.currentPage + 1)
        }
    }, [search.isLoading, search.hasSearched, search.query, search.currentPage, performSearch])

    // Clear search
    const clearSearch = useCallback(() => {
        setSearch(prev => ({
            ...prev,
            query: '',
            results: [],
            hasSearched: false,
            error: null,
            isLoading: false,
            currentPage: 1
        }))
    }, [setSearch])

    // Get search suggestions based on current search results
    const getSuggestions = useCallback((query: string) => {
        if (!query.trim() || !search.results.length) return []

        const queryLower = query.toLowerCase()
        return search.results
            .map(result => getTitle(result))
            .filter(title => title && title.toLowerCase().includes(queryLower) && title.toLowerCase() !== query.toLowerCase())
            .slice(0, 5)
    }, [search.results])

    return {
        // State
        query: search.query,
        results: search.results,
        suggestions: getSuggestions(search.query),
        isLoading: search.isLoading,
        error: search.error,
        hasSearched: search.hasSearched,
        totalResults: search.totalResults,
        currentPage: search.currentPage,
        searchHistory,

        // Actions
        updateQuery,
        performSearch,
        loadMore,
        clearSearch,

        // Computed
        hasMore: search.results.length < search.totalResults,
        isEmpty: search.hasSearched && search.results.length === 0 && !search.isLoading
    }
}