import { useCallback, useEffect, useRef } from 'react'
import type { Content } from '../../typings'
import { getYear, isMovie } from '../../typings'
import type { SearchFilters } from '../../stores/searchStore'

/**
 * Apply search filters to content results
 *
 * Filters content by:
 * - Content type (movie/tv)
 * - Rating (7.0+, 8.0+, 9.0+)
 * - Year (2020s, 2010s, 2000s, 1990s)
 * - Sort by (popularity, revenue, rating)
 *
 * @param results - Array of content to filter
 * @param filters - Filter configuration object
 * @returns Filtered and sorted content array
 */
export async function applyFilters(results: Content[], filters: SearchFilters): Promise<Content[]> {
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
 * Hook for managing search filter application
 *
 * Handles:
 * - Applying filters to search results
 * - Detecting active filters
 * - Auto-updating filtered results when filters change
 *
 * @param results - Raw search results
 * @param filters - Current filter state
 * @param onFilteredResultsChange - Callback when filtered results update
 * @returns Object with hasActiveFilters checker and filtered results
 */
export function useSearchFilters(
    results: Content[],
    filters: SearchFilters,
    onFilteredResultsChange: (filtered: Content[]) => void
) {
    const lastFilteredRef = useRef<string>('')

    // Check if any filters are active
    const hasActiveFilters = useCallback((filters: SearchFilters) => {
        return Object.entries(filters).some(([key, value]) => {
            if (key === 'sortBy') return value !== 'popularity.desc'
            if (key === 'genres') return Array.isArray(value) && value.length > 0
            return value !== 'all'
        })
    }, [])

    // Update filtered results when filters or results change
    useEffect(() => {
        const updateFilteredResults = async () => {
            if (results.length === 0) return

            const filtered = await applyFilters(results, filters)
            const filteredKey = JSON.stringify(filtered)

            // Only update if results have actually changed
            if (filteredKey !== lastFilteredRef.current) {
                lastFilteredRef.current = filteredKey
                onFilteredResultsChange(filtered)
            }
        }

        updateFilteredResults()
    }, [results, filters, onFilteredResultsChange])

    return {
        hasActiveFilters,
        applyFilters,
    }
}
