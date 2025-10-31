import { useAppStore } from '../stores/appStore'
import { ToastMessage } from '../components/Toast'

/**
 * Unified toast notification hook
 * Provides simple API for showing all types of toast notifications
 * Replaces the old error toast system with consistent UX across all toast types
 *
 * Usage:
 *   const { showSuccess, showError, showWatchlistAdd } = useToast()
 *   showSuccess('Operation completed', 'Optional description')
 *   showError('Something went wrong', 'Error details')
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
        addToast({ type: 'success', title, message })
    }

    const showError = (title: string, message?: string) => {
        addToast({ type: 'error', title, message })
    }

    const showWatchlistAdd = (title: string, message?: string) => {
        addToast({ type: 'watchlist-add', title, message })
    }

    const showWatchlistRemove = (title: string, message?: string) => {
        addToast({ type: 'watchlist-remove', title, message })
    }

    const showContentHidden = (title: string, message?: string, onUndo?: () => void) => {
        addToast({ type: 'content-hidden', title, message, onUndo })
    }

    const showContentShown = (title: string, message?: string) => {
        addToast({ type: 'content-shown', title, message })
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
