/**
 * Search state atoms - re-exported from compat layer
 * These are backed by Zustand stores, not Recoil
 *
 * Note: SearchFilters interface kept here for type exports
 */
import { Content } from '../typings'

export interface SearchFilters {
    contentType: 'all' | 'movie' | 'tv'
    rating: 'all' | '7.0+' | '8.0+' | '9.0+'
    year: 'all' | string
    sortBy:
        | 'popularity.desc'
        | 'vote_average.desc'
        | 'release_date.desc'
        | 'release_date.asc'
        | 'revenue.desc'
        | 'vote_count.desc'
}

export interface SearchState {
    query: string
    results: Content[]
    filteredResults: Content[]
    isLoading: boolean
    error: string | null
    hasSearched: boolean
    totalResults: number
    currentPage: number
    filters: SearchFilters
    hasAllResults: boolean
    isLoadingAll: boolean
}

export { searchState, searchHistoryState, recentSearchesState } from './compat'
