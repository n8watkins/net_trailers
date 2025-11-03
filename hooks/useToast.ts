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
    const showToast = useAppStore((state) => state.showToast)
    const dismissToast = useAppStore((state) => state.dismissToast)

    const removeToast = (id: string) => {
        dismissToast(id)
    }

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

    const showContentHidden = (title: string, message?: string, onUndo?: () => void) => {
        showToast('content-hidden', title, message, { onUndo })
    }

    const showContentShown = (title: string, message?: string) => {
        showToast('content-shown', title, message)
    }

    return {
        toasts,
        removeToast,
        showSuccess,
        showError,
        showWatchlistAdd,
        showWatchlistRemove,
        showContentHidden,
        showContentShown,
    }
}
