import { create } from 'zustand'
import { Content, getTitle } from '../typings'
import { startTransition } from 'react'

// Toast configuration constants
export const MAX_TOASTS = 2 // Maximum 2 toasts displayed at once
export const TOAST_DURATION = 3000 // 3 seconds
export const TOAST_EXIT_DURATION = 500 // 500ms fade-out animation

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

    authMode: 'login',
    showDemoMessage: true,
    contentLoadedSuccessfully: false,

    // Modal actions
    /**
     * Open the content modal with video player
     *
     * @param content - The movie or TV show to display
     * @param autoPlay - Whether to start playing the trailer automatically (default: false)
     * @param autoPlayWithSound - Whether to play with sound initially (default: false)
     *
     * @example
     * ```tsx
     * const { openModal } = useAppStore()
     *
     * // Open modal with autoplay muted (More Info button)
     * openModal(movie, true, false)
     *
     * // Open modal with autoplay and sound (Play button)
     * openModal(movie, true, true)
     * ```
     */
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

    /**
     * Close the content modal
     *
     * @example
     * ```tsx
     * const { closeModal } = useAppStore()
     * closeModal()
     * ```
     */
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
    /**
     * Show a toast notification
     *
     * Displays a toast message with auto-dismiss after 3 seconds.
     * Maximum of 2 toasts shown at once - oldest dismissed when limit reached.
     *
     * @param type - Type of toast (success, error, watchlist-add, etc.)
     * @param title - Main toast message
     * @param message - Optional secondary message
     *
     * @example
     * ```tsx
     * const { showToast } = useAppStore()
     *
     * // Show success toast
     * showToast('success', 'Saved successfully')
     *
     * // Show error with details
     * showToast('error', 'Failed to save', 'Please try again')
     * ```
     */
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
