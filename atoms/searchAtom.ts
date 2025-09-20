import { atom } from 'recoil'
import { Content } from '../typings'

export interface SearchState {
    query: string
    results: Content[]
    isLoading: boolean
    error: string | null
    hasSearched: boolean
    totalResults: number
    currentPage: number
}

export const searchState = atom<SearchState>({
    key: 'searchState_v3',
    default: {
        query: '',
        results: [],
        isLoading: false,
        error: null,
        hasSearched: false,
        totalResults: 0,
        currentPage: 1
    }
})

// Search history atom
export const searchHistoryState = atom<string[]>({
    key: 'searchHistoryState_v2',
    default: [],
    effects: [
        ({ setSelf, onSet }) => {
            // Load from localStorage on initialization
            if (typeof window !== 'undefined') {
                const saved = localStorage.getItem('nettrailer-search-history')
                if (saved) {
                    try {
                        setSelf(JSON.parse(saved))
                    } catch (error) {
                        console.error('Failed to parse search history:', error)
                    }
                }
            }

            // Save to localStorage whenever it changes
            onSet((newValue) => {
                if (typeof window !== 'undefined') {
                    localStorage.setItem('nettrailer-search-history', JSON.stringify(newValue))
                }
            })
        }
    ]
})

// Recent searches atom (different from history - shows quick suggestions)
export const recentSearchesState = atom<string[]>({
    key: 'recentSearchesState_v2',
    default: []
})