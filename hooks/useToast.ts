import { useAppStore } from '../stores/appStore'
import { ToastMessage } from '../components/common/Toast'

/**
 * Unified toast notification hook
 *
 * Provides a simple API for showing all types of toast notifications.
 * Replaces the old error toast system with consistent UX across all toast types.
 * Toast messages auto-dismiss after 3 seconds with a maximum of 2 toasts displayed at once.
 *
 * @returns Object containing toast state and notification functions
 *
 * @example
 * ```tsx
 * const { showSuccess, showError, showWatchlistAdd } = useToast()
 *
 * // Show success notification
 * showSuccess('Operation completed', 'Optional description')
 *
 * // Show error notification
 * showError('Something went wrong', 'Error details')
 *
 * // Show watchlist notifications
 * showWatchlistAdd('Added to Watchlist')
 * showWatchlistRemove('Removed from Watchlist')
 *
 * // Show content hidden with undo callback
 * showContentHidden('Content hidden', 'Undo?', () => {
 *   // Undo logic here
 * })
 * ```
 */
export const useToast = () => {
    const toasts = useAppStore((state) => state.toasts)
    const dismissToast = useAppStore((state) => state.dismissToast)

    const setToasts = (updater: ((prev: ToastMessage[]) => ToastMessage[]) | ToastMessage[]) => {
        if (typeof updater === 'function') {
            const currentToasts = useAppStore.getState().toasts
            const newToasts = updater(currentToasts)
            useAppStore.setState({ toasts: newToasts })
        } else {
            useAppStore.setState({ toasts: updater })
        }
    }

    const addToast = (toast: Omit<ToastMessage, 'id'>) => {
        const id = Date.now().toString()
        const newToast: ToastMessage = {
            ...toast,
            id,
        }
        setToasts((prev) => {
            // Append new toast (max limit enforced by appStore)
            return [...prev, newToast]
        })
    }

    const removeToast = (id: string) => {
        dismissToast(id)
    }

    const showSuccess = (title: string, message?: string) => {
        addToast({ type: 'success', title, message, timestamp: Date.now() })
    }

    const showError = (title: string, message?: string) => {
        addToast({ type: 'error', title, message, timestamp: Date.now() })
    }

    const showWatchlistAdd = (title: string, message?: string) => {
        addToast({ type: 'watchlist-add', title, message, timestamp: Date.now() })
    }

    const showWatchlistRemove = (title: string, message?: string) => {
        addToast({ type: 'watchlist-remove', title, message, timestamp: Date.now() })
    }

    const showContentHidden = (title: string, message?: string, onUndo?: () => void) => {
        addToast({ type: 'content-hidden', title, message, onUndo, timestamp: Date.now() })
    }

    const showContentShown = (title: string, message?: string) => {
        addToast({ type: 'content-shown', title, message, timestamp: Date.now() })
    }

    return {
        toasts,
        addToast,
        removeToast,
        showSuccess,
        showError,
        showWatchlistAdd,
        showWatchlistRemove,
        showContentHidden,
        showContentShown,
    }
}
