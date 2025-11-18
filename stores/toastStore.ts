import { create } from 'zustand'
import { devLog } from '../utils/debugLogger'

// Toast configuration constants
export const MAX_TOASTS = 2 // Maximum 2 toasts displayed at once
export const TOAST_DURATION = 3000 // 3 seconds
export const TOAST_EXIT_DURATION = 500 // 500ms fade-out animation

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

// Toast store state interface
export interface ToastStoreState {
    toasts: ToastMessage[]
}

// Toast store actions interface
export interface ToastStoreActions {
    showToast: (
        type: ToastType,
        title: string,
        message?: string,
        options?: { onUndo?: () => void; contentId?: number }
    ) => void
    dismissToast: (id: string) => void
}

export type ToastStore = ToastStoreState & ToastStoreActions

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

export const useToastStore = create<ToastStore>((set, get) => ({
    // Initial state
    toasts: [],

    /**
     * Show a toast notification
     *
     * Displays a toast message with auto-dismiss after 3 seconds.
     * Maximum of 2 toasts shown at once - oldest dismissed when limit reached.
     *
     * @param type - Type of toast (success, error, watchlist-add, etc.)
     * @param title - Main toast message
     * @param message - Optional secondary message
     * @param options - Optional undo callback and content ID
     *
     * @example
     * ```tsx
     * const { showToast } = useToastStore()
     *
     * // Show success toast
     * showToast('success', 'Saved successfully')
     *
     * // Show error with details
     * showToast('error', 'Failed to save', 'Please try again')
     *
     * // Show toast with undo
     * showToast('watchlist-add', 'Added to watchlist', undefined, {
     *   onUndo: () => removeFromWatchlist(contentId),
     *   contentId: contentId
     * })
     * ```
     */
    showToast: (
        type: ToastType,
        title: string,
        message?: string,
        options?: { onUndo?: () => void; contentId?: number }
    ) => {
        const toast: ToastMessage = {
            id: generateToastId(),
            type,
            title,
            message,
            timestamp: typeof window !== 'undefined' ? Date.now() : 0,
            onUndo: options?.onUndo,
            contentId: options?.contentId,
        }

        // Add the new toast at the beginning (top)
        // Don't remove old toasts immediately - let them fade out via CSS
        set((state) => ({
            toasts: [toast, ...state.toasts],
        }))

        // After animation time, actually remove toasts beyond MAX_TOASTS
        setTimeout(() => {
            set((state) => ({
                toasts: state.toasts.slice(0, MAX_TOASTS),
            }))
        }, 600) // Wait for fade animation to complete (500ms transition + 100ms buffer)

        // Note: Auto-dismiss is handled by Toast component for proper cleanup
        if (process.env.NODE_ENV === 'development') {
            devLog('🍞 [ToastStore] Toast shown:', { type, title, message })
        }
    },

    dismissToast: (id: string) => {
        set((state) => ({
            toasts: state.toasts.filter((toast) => toast.id !== id),
        }))
    },
}))
