import { useState, useEffect, useCallback, useRef } from 'react'
import { useRecoilState } from 'recoil'
import { searchState, searchHistoryState, SearchFilters } from '../atoms/searchAtom'
import { Content, Movie, TVShow, isMovie, isTVShow } from '../typings'
import { searchCache, cachedFetch } from '../utils/apiCache'

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
    const lastSearchQueryRef = useRef<string>('')

    // Search function
    const performSearch = useCallback(async (query: string, filters?: SearchFilters, page = 1) => {
        if (!query.trim()) {
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
        abortControllerRef.current = new AbortController()

        setSearch(prev => ({
            ...prev,
            isLoading: true,
            error: null,
            hasSearched: true,
            currentPage: page
        }))

        try {
            // Build search parameters
            const searchParams: Record<string, any> = {
                query: query.trim(),
                page: page.toString()
            }

            // Add filters if provided
            if (filters) {
                if (filters.genre.length > 0) {
                    searchParams.with_genres = filters.genre.join(',')
                }
                if (filters.yearRange[0] !== 1990 || filters.yearRange[1] !== new Date().getFullYear()) {
                    searchParams['primary_release_date.gte'] = `${filters.yearRange[0]}-01-01`
                    searchParams['primary_release_date.lte'] = `${filters.yearRange[1]}-12-31`
                }
                if (filters.ratingRange[0] !== 0 || filters.ratingRange[1] !== 10) {
                    searchParams['vote_average.gte'] = filters.ratingRange[0].toString()
                    searchParams['vote_average.lte'] = filters.ratingRange[1].toString()
                }
                searchParams.sort_by = `${filters.sortBy}.${filters.sortOrder}`
            }

            // Use cached fetch for search requests
            const data = await cachedFetch<any>('/api/search', searchCache, searchParams)

            setSearch(prev => ({
                ...prev,
                results: page === 1 ? (data.results || []) : [...prev.results, ...(data.results || [])],
                totalResults: data.total_results || 0,
                isLoading: false,
                error: null
            }))

            // Add to search history if it's a new search (page 1)
            if (page === 1 && query.trim()) {
                setSearchHistory(prev => {
                    const newHistory = [query.trim(), ...prev.filter(h => h !== query.trim())].slice(0, 10)
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
    }, [setSearch, setSearchHistory])

    // Effect to trigger search when debounced query changes
    useEffect(() => {
        const trimmedQuery = debouncedQuery.trim()

        // Prevent duplicate searches for the same query, but allow if we currently have no results
        if (trimmedQuery === lastSearchQueryRef.current && search.results.length > 0) {
            return
        }

        lastSearchQueryRef.current = trimmedQuery

        if (trimmedQuery.length >= 2) {
            performSearch(trimmedQuery, search.filters)
        } else if (trimmedQuery.length === 0 && search.hasSearched) {
            // Only clear results when query is completely empty
            setSearch(prev => ({
                ...prev,
                results: [],
                hasSearched: false,
                error: null,
                isLoading: false
            }))
        }
    }, [debouncedQuery, search.results.length])

    // Update search query
    const updateQuery = useCallback((query: string) => {
        setSearch(prev => ({ ...prev, query }))
    }, [setSearch])

    // Update filters
    const updateFilters = useCallback((filters: Partial<SearchFilters>) => {
        setSearch(prev => ({
            ...prev,
            filters: { ...prev.filters, ...filters },
            currentPage: 1 // Reset to first page when filters change
        }))
    }, [setSearch])

    // Load more results (pagination)
    const loadMore = useCallback(() => {
        if (!search.isLoading && search.hasSearched && search.query.trim()) {
            performSearch(search.query, search.filters, search.currentPage + 1)
        }
    }, [search.isLoading, search.hasSearched, search.query, search.filters, search.currentPage, performSearch])

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

    // Get search suggestions based on current query
    const getSuggestions = useCallback((query: string) => {
        if (!query.trim()) return []

        const queryLower = query.toLowerCase()
        return searchHistory
            .filter(item => item.toLowerCase().includes(queryLower) && item !== query)
            .slice(0, 5)
    }, [searchHistory])

    return {
        // State
        query: search.query,
        results: search.results,
        suggestions: getSuggestions(search.query),
        filters: search.filters,
        isLoading: search.isLoading,
        error: search.error,
        hasSearched: search.hasSearched,
        totalResults: search.totalResults,
        currentPage: search.currentPage,
        searchHistory,

        // Actions
        updateQuery,
        updateFilters,
        performSearch,
        loadMore,
        clearSearch,

        // Computed
        hasMore: search.results.length < search.totalResults,
        isEmpty: search.hasSearched && search.results.length === 0 && !search.isLoading
    }
}