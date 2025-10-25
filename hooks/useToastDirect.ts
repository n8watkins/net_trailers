/**
 * useToastDirect - Direct Zustand hook for toast notifications
 * This will eventually replace the Recoil-based useToast hook
 */

import { useAppStore, ToastType } from '../stores/appStore'

export interface ToastMessageInput {
    type: ToastType
    title: string
    message?: string
}

/**
 * Unified toast notification hook using Zustand
 * Provides simple API for showing all types of toast notifications
 *
 * Usage:
 *   const { showSuccess, showError, showWatchlistAdd } = useToastDirect()
 *   showSuccess('Operation completed', 'Optional description')
 *   showError('Something went wrong', 'Error details')
 */
export function useToastDirect() {
    const { toasts, showToast, dismissToast } = useAppStore()

    // Helper to show toast with title and optional message
    const addToast = (toast: ToastMessageInput) => {
        showToast(toast.type, toast.title, toast.message)
    }

    // Remove a specific toast
    const removeToast = (id: string) => {
        dismissToast(id)
    }

    // Clear all toasts
    const clearToasts = () => {
        toasts.forEach((toast) => dismissToast(toast.id))
    }

    // Convenience methods for each toast type
    const showSuccess = (title: string, message?: string) => {
        showToast('success', title, message)
    }

    const showError = (title: string, message?: string) => {
        showToast('error', title, message)
    }

    const showWatchlistAdd = (title: string, message?: string) => {
        showToast('watchlist-add', title, message)
    }

    const showWatchlistRemove = (title: string, message?: string) => {
        showToast('watchlist-remove', title, message)
    }

    const showContentHidden = (title: string, message?: string) => {
        showToast('content-hidden', title, message)
    }

    const showContentShown = (title: string, message?: string) => {
        showToast('content-shown', title, message)
    }

    return {
        // State
        toasts,

        // Core actions
        addToast,
        removeToast,
        clearToasts,

        // Convenience methods (matching existing API)
        showSuccess,
        showError,
        showWatchlistAdd,
        showWatchlistRemove,
        showContentHidden,
        showContentShown,

        // Additional helpers
        hasToasts: toasts.length > 0,
        latestToast: toasts[toasts.length - 1] || null,
    }
}

// Export type for components that need it
export type UseToastDirectReturn = ReturnType<typeof useToastDirect>
