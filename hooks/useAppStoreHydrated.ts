import { useState, useEffect } from 'react'
import { useAppStore, AppStore } from '../stores/appStore'

/**
 * Default state values that match server-side rendering
 * These values must be the same as the initial state in appStore.ts
 */
const defaultState: AppStore = {
    // Modal state
    modal: {
        isOpen: false,
        content: null,
    },

    // List modal state
    listModal: {
        isOpen: false,
        content: null,
        mode: undefined,
    },

    // Auth modal state
    authModal: {
        isOpen: false,
        mode: 'signin',
    },

    // Toast notifications
    toasts: [],

    // Global loading state
    isLoading: false,
    loadingMessage: undefined,

    // Search state
    search: {
        query: '',
        results: [],
        filteredResults: [],
        isLoading: false,
        error: null,
        hasSearched: false,
        totalResults: 0,
        currentPage: 1,
        hasAllResults: false,
        isLoadingAll: false,
        isTruncated: false,
        filters: {
            genres: [],
            contentType: 'all',
            releaseYear: 'all',
            rating: 'all',
            sortBy: 'popularity.desc',
            year: 'all',
        },
        history: [],
        recentSearches: [],
    },

    // Auth mode
    authMode: 'login',
    showDemoMessage: true,
    contentLoadedSuccessfully: false,

    // Actions - return no-op functions during SSR
    openModal: () => {},
    closeModal: () => {},
    setAutoPlay: () => {},
    setAutoPlayWithSound: () => {},
    openListModal: () => {},
    closeListModal: () => {},
    setListModalMode: () => {},
    showToast: () => {},
    dismissToast: () => {},
    setLoading: () => {},
    setSearch: () => {},
    setSearchQuery: () => {},
    setSearchResults: () => {},
    setSearchLoading: () => {},
    setSearchFilters: () => {},
    addToSearchHistory: () => {},
    clearSearchHistory: () => {},
    setAuthMode: () => {},
    setShowDemoMessage: () => {},
    setContentLoadedSuccessfully: () => {},
    openAuthModal: () => {},
    closeAuthModal: () => {},
    setAuthModalMode: () => {},
}

/**
 * Hydration-safe wrapper for useAppStore
 * Returns default values during SSR and actual store values after hydration
 */
export function useAppStoreHydrated<T = AppStore>(selector?: (state: AppStore) => T): T {
    const [isHydrated, setIsHydrated] = useState(false)

    // Always call the store hook to satisfy React's rules
    // We pass a selector that returns the whole state if no selector is provided
    const storeValue = useAppStore((state) => {
        if (selector) {
            return selector(state)
        }
        return state as unknown as T
    })

    useEffect(() => {
        setIsHydrated(true)
    }, [])

    // During SSR and initial hydration, return default values
    if (!isHydrated) {
        if (selector) {
            return selector(defaultState)
        }
        return defaultState as T
    }

    // After hydration, return the actual store value
    return storeValue
}
