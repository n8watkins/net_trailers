import { useRecoilState } from 'recoil'
import { toastsState } from '../atoms/toastAtom'
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
    const [toasts, setToasts] = useRecoilState(toastsState)

    const addToast = (toast: Omit<ToastMessage, 'id'>) => {
        const id = Date.now().toString()
        const newToast: ToastMessage = {
            ...toast,
            id,
        }
        setToasts((prev) => {
            // Only show one toast at a time - replace existing toasts
            const newToasts = [newToast]
            return newToasts
        })
    }

    const removeToast = (id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id))
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

    const showContentHidden = (title: string, message?: string) => {
        addToast({ type: 'content-hidden', title, message })
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
