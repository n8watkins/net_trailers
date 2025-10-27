import { create } from 'zustand'
import { Content, getTitle } from '../typings'
import { startTransition } from 'react'
import { hydrationDebug } from '../utils/hydrationDebug'
import { debugSetter } from '../utils/debugStore'

// Toast configuration constants
export const MAX_TOASTS = 2 // Maximum 2 toasts displayed at once
export const TOAST_DURATION = 8000 // 8 seconds
export const TOAST_EXIT_DURATION = 300

// Modal types
export interface ModalContent {
    content: Content
    autoPlay: boolean
    autoPlayWithSound: boolean
}

export interface ModalState {
    isOpen: boolean
    content: ModalContent | null
}

// Toast types
export type ToastType =
    | 'success'
    | 'error'
    | 'watchlist-add'
    | 'watchlist-remove'
    | 'content-hidden'
    | 'content-shown'

export interface ToastMessage {
    id: string
    type: ToastType
    title: string
    message?: string
    timestamp: number
    onUndo?: () => void // Optional undo callback
    contentId?: number // Optional content ID for undo operations
}

// Search types
// Search filters type
export interface SearchFilters {
    genres: string[]
    contentType: 'all' | 'movie' | 'tv'
    releaseYear: string
    rating: string
    sortBy?: string
    year?: string
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
    hasAllResults: boolean
    isLoadingAll: boolean
    filters: SearchFilters
    history: string[]
    recentSearches: string[]
}

// List modal state
export interface ListModalState {
    isOpen: boolean
    content: Content | null
    mode?: 'manage' | 'create' | 'add'
}

// Auth modal state
export interface AuthModalState {
    isOpen: boolean
    mode: 'signin' | 'signup'
}

// App state interface
export interface AppState {
    // Modal state
    modal: ModalState

    // List modal state
    listModal: ListModalState

    // Auth modal state
    authModal: AuthModalState

    // Toast notifications
    toasts: ToastMessage[]

    // Global loading state
    isLoading: boolean
    loadingMessage?: string

    // Search state
    search: SearchState

    // Auth mode
    authMode: 'login' | 'register' | 'guest'

    // Demo messaging
    showDemoMessage: boolean

    // Content loading success
    contentLoadedSuccessfully: boolean
}

// App actions interface
export interface AppActions {
    // Modal actions
    openModal: (content: Content, autoPlay?: boolean, autoPlayWithSound?: boolean) => void
    closeModal: () => void
    setAutoPlay: (autoPlay: boolean) => void
    setAutoPlayWithSound: (autoPlayWithSound: boolean) => void

    // List modal actions
    openListModal: (content?: Content, mode?: 'manage' | 'create' | 'add') => void
    closeListModal: () => void
    setListModalMode: (mode: 'manage' | 'create' | 'add') => void

    // Auth modal actions
    openAuthModal: (mode?: 'signin' | 'signup') => void
    closeAuthModal: () => void
    setAuthModalMode: (mode: 'signin' | 'signup') => void

    // Toast actions
    showToast: (type: ToastType, title: string, message?: string) => void
    dismissToast: (id: string) => void

    // Loading actions
    setLoading: (loading: boolean, message?: string) => void

    // Search actions
    setSearch: (updater: (prev: SearchState) => SearchState) => void
    setSearchQuery: (query: string) => void
    setSearchResults: (results: Content[]) => void
    setSearchLoading: (loading: boolean) => void
    setSearchFilters: (filters: Partial<SearchFilters>) => void
    addToSearchHistory: (query: string) => void
    clearSearchHistory: () => void

    // Auth mode actions
    setAuthMode: (mode: 'login' | 'register' | 'guest') => void

    // Demo message actions
    setShowDemoMessage: (show: boolean) => void

    // Content loading actions
    setContentLoadedSuccessfully: (loaded: boolean) => void
}

export type AppStore = AppState & AppActions

// Counter for SSR toast IDs to prevent duplicate keys
let ssrIdCounter = 0

const generateToastId = (): string => {
    // Generate counter-based IDs during SSR to prevent duplicates
    // Client-side uses timestamp + random for uniqueness
    if (typeof window === 'undefined') {
        return `ssr_toast_${ssrIdCounter++}`
    }
    return `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Helper to load search history from localStorage
const loadSearchHistory = (): string[] => {
    if (typeof window === 'undefined') return []
    try {
        const saved = localStorage.getItem('nettrailer-search-history')
        if (saved) {
            return JSON.parse(saved)
        }
    } catch (error) {
        console.error('Failed to load search history:', error)
    }
    return []
}

// Helper to save search history to localStorage
const saveSearchHistory = (history: string[]) => {
    if (typeof window === 'undefined') return
    try {
        localStorage.setItem('nettrailer-search-history', JSON.stringify(history))
    } catch (error) {
        console.error('Failed to save search history:', error)
    }
}

export const useAppStore = create<AppStore>((set, get) => ({
    // Initial state
    modal: {
        isOpen: false,
        content: null,
    },

    listModal: {
        isOpen: false,
        content: null,
        mode: undefined,
    },

    authModal: {
        isOpen: false,
        mode: 'signin',
    },

    toasts: [],

    isLoading: false,
    loadingMessage: undefined,

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
        filters: {
            genres: [],
            contentType: 'all',
            releaseYear: 'all',
            rating: 'all',
            sortBy: 'popularity.desc',
            year: 'all',
        },
        history: loadSearchHistory(),
        recentSearches: [],
    },

    authMode: 'login',
    showDemoMessage: true,
    contentLoadedSuccessfully: false,

    // Modal actions
    openModal: (content: Content, autoPlay = false, autoPlayWithSound = false) => {
        startTransition(() => {
            set({
                modal: {
                    isOpen: true,
                    content: {
                        content,
                        autoPlay,
                        autoPlayWithSound,
                    },
                },
            })
            console.log('🎬 [AppStore] Modal opened:', getTitle(content))
        })
    },

    closeModal: () => {
        startTransition(() => {
            set({
                modal: {
                    isOpen: false,
                    content: null,
                },
            })
            console.log('❌ [AppStore] Modal closed')
        })
    },

    setAutoPlay: (autoPlay: boolean) => {
        const state = get()
        if (state.modal.content) {
            set({
                modal: {
                    ...state.modal,
                    content: {
                        ...state.modal.content,
                        autoPlay,
                    },
                },
            })
        }
    },

    setAutoPlayWithSound: (autoPlayWithSound: boolean) => {
        const state = get()
        if (state.modal.content) {
            set({
                modal: {
                    ...state.modal,
                    content: {
                        ...state.modal.content,
                        autoPlayWithSound,
                    },
                },
            })
        }
    },

    // List modal actions
    openListModal: (content?: Content, mode?: 'manage' | 'create' | 'add') => {
        startTransition(() => {
            set({
                listModal: {
                    isOpen: true,
                    content: content || null,
                    mode: mode || 'add',
                },
            })
            console.log('📋 [AppStore] List modal opened:', {
                contentTitle: content ? getTitle(content) : 'No content',
                mode: mode || 'add',
            })
        })
    },

    closeListModal: () => {
        startTransition(() => {
            set({
                listModal: {
                    isOpen: false,
                    content: null,
                    mode: undefined,
                },
            })
            console.log('❌ [AppStore] List modal closed')
        })
    },

    setListModalMode: (mode: 'manage' | 'create' | 'add') => {
        set((state) => ({
            listModal: {
                ...state.listModal,
                mode,
            },
        }))
    },

    // Auth modal actions
    openAuthModal: (mode: 'signin' | 'signup' = 'signin') => {
        startTransition(() => {
            set({
                authModal: {
                    isOpen: true,
                    mode,
                },
            })
            console.log('✅ [AppStore] Auth modal opened:', mode)
        })
    },

    closeAuthModal: () => {
        startTransition(() => {
            set({
                authModal: {
                    isOpen: false,
                    mode: 'signin',
                },
            })
            console.log('❌ [AppStore] Auth modal closed')
        })
    },

    setAuthModalMode: (mode: 'signin' | 'signup') => {
        set((state) => ({
            authModal: {
                ...state.authModal,
                mode,
            },
        }))
    },

    // Toast actions
    showToast: (type: ToastType, title: string, message?: string) => {
        const toast: ToastMessage = {
            id: generateToastId(),
            type,
            title,
            message,
            timestamp: typeof window !== 'undefined' ? Date.now() : 0,
        }

        // If we're at max capacity, dismiss the oldest toast to make room
        const currentToasts = get().toasts
        if (currentToasts.length >= MAX_TOASTS && currentToasts.length > 0) {
            const oldestToast = currentToasts[0]
            // Dismiss the oldest toast - this will trigger its exit animation
            get().dismissToast(oldestToast.id)
        }

        // Add the new toast after a brief delay to allow exit animation
        setTimeout(() => {
            set((state) => ({
                toasts: [...state.toasts, toast].slice(-MAX_TOASTS),
            }))
        }, 50) // Small delay for smooth transition

        // Note: Auto-dismiss is handled by Toast component for proper cleanup
        if (process.env.NODE_ENV === 'development') {
            console.log('🍞 [AppStore] Toast shown:', { type, title, message })
        }
    },

    dismissToast: (id: string) => {
        set((state) => ({
            toasts: state.toasts.filter((toast) => toast.id !== id),
        }))
    },

    // Loading actions
    setLoading: (loading: boolean, message?: string) => {
        startTransition(() => {
            set({
                isLoading: loading,
                loadingMessage: message,
            })
        })
    },

    // Search actions
    setSearch: (updater: (prev: SearchState) => SearchState) => {
        set((state) => ({
            search: updater(state.search),
        }))
    },

    setSearchQuery: (query: string) => {
        set((state) => ({
            search: {
                ...state.search,
                query,
            },
        }))
    },

    setSearchResults: (results: Content[]) => {
        set((state) => ({
            search: {
                ...state.search,
                results,
            },
        }))
    },

    setSearchLoading: (loading: boolean) => {
        set((state) => ({
            search: {
                ...state.search,
                isLoading: loading,
            },
        }))
    },

    setSearchFilters: (filters: Partial<SearchFilters>) => {
        set((state) => ({
            search: {
                ...state.search,
                filters: {
                    ...state.search.filters,
                    ...filters,
                },
            },
        }))
    },

    addToSearchHistory: (query: string) => {
        const state = get()
        const trimmedQuery = query.trim()

        if (trimmedQuery && !state.search.history.includes(trimmedQuery)) {
            const newHistory = [trimmedQuery, ...state.search.history].slice(0, 10) // Keep last 10
            const newRecent = [
                trimmedQuery,
                ...state.search.recentSearches.filter((q) => q !== trimmedQuery),
            ].slice(0, 5) // Keep last 5

            // Persist to localStorage
            saveSearchHistory(newHistory)

            set((state) => ({
                search: {
                    ...state.search,
                    history: newHistory,
                    recentSearches: newRecent,
                },
            }))
        }
    },

    clearSearchHistory: () => {
        // Clear from localStorage
        saveSearchHistory([])

        set((state) => ({
            search: {
                ...state.search,
                history: [],
                recentSearches: [],
            },
        }))
    },

    // Auth mode actions
    setAuthMode: (mode: 'login' | 'register' | 'guest') => {
        set({ authMode: mode })
    },

    // Demo message actions
    setShowDemoMessage: (show: boolean) => {
        set({ showDemoMessage: show })
    },

    // Content loading actions
    setContentLoadedSuccessfully: (loaded: boolean) => {
        set({ contentLoadedSuccessfully: loaded })
    },
}))
