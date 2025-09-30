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
        const message = toast.message ? `${toast.title}: ${toast.message}` : toast.title
        showToast(toast.type, message)
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
        const toastMessage = message ? `${title}: ${message}` : title
        showToast('success', toastMessage)
    }

    const showError = (title: string, message?: string) => {
        const toastMessage = message ? `${title}: ${message}` : title
        showToast('error', toastMessage)
    }

    const showWatchlistAdd = (title: string, message?: string) => {
        const toastMessage = message ? `${title}: ${message}` : title
        showToast('watchlist-add', toastMessage)
    }

    const showWatchlistRemove = (title: string, message?: string) => {
        const toastMessage = message ? `${title}: ${message}` : title
        showToast('watchlist-remove', toastMessage)
    }

    const showContentHidden = (title: string, message?: string) => {
        const toastMessage = message ? `${title}: ${message}` : title
        showToast('content-hidden', toastMessage)
    }

    const showContentShown = (title: string, message?: string) => {
        const toastMessage = message ? `${title}: ${message}` : title
        showToast('content-shown', toastMessage)
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
