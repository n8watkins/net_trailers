import { useRecoilState } from 'recoil'
import { toastsState } from '../atoms/toastAtom'
import { ToastMessage } from '../components/Toast'

export const useToast = () => {
    const [toasts, setToasts] = useRecoilState(toastsState)

    const addToast = (toast: Omit<ToastMessage, 'id'>) => {
        const id = Date.now().toString()
        const newToast: ToastMessage = {
            ...toast,
            id,
        }
        setToasts([newToast])
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
