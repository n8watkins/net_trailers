import { useCallback } from 'react'
import { useToastStore } from '../stores/toastStore'

/**
 * Unified toast notification hook
 *
 * Provides a simple API for showing all types of toast notifications.
 * Replaces the old error toast system with consistent UX across all toast types.
 * Toast messages auto-dismiss after 3 seconds with a maximum of 2 toasts displayed at once.
 *
 * Now reads directly from toastStore to avoid re-render issues from appStore updates.
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
    const showToast = useToastStore((state) => state.showToast)
    const dismissToast = useToastStore((state) => state.dismissToast)

    const removeToast = useCallback(
        (id: string) => {
            dismissToast(id)
        },
        [dismissToast]
    )

    const showSuccess = useCallback(
        (title: string, message?: string) => {
            showToast('success', title, message)
        },
        [showToast]
    )

    const showError = useCallback(
        (title: string, message?: string) => {
            showToast('error', title, message)
        },
        [showToast]
    )

    const showWatchlistAdd = useCallback(
        (title: string, message?: string) => {
            showToast('watchlist-add', title, message)
        },
        [showToast]
    )

    const showWatchlistRemove = useCallback(
        (title: string, message?: string) => {
            showToast('watchlist-remove', title, message)
        },
        [showToast]
    )

    const showContentHidden = useCallback(
        (title: string, message?: string, onUndo?: () => void) => {
            showToast('content-hidden', title, message, { onUndo })
        },
        [showToast]
    )

    const showContentShown = useCallback(
        (title: string, message?: string) => {
            showToast('content-shown', title, message)
        },
        [showToast]
    )

    return {
        removeToast,
        showSuccess,
        showError,
        showWatchlistAdd,
        showWatchlistRemove,
        showContentHidden,
        showContentShown,
    }
}
