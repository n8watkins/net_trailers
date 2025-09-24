import { useRecoilState } from 'recoil'
import { toastsState } from '../atoms/toastAtom'
import { ToastMessage } from '../components/Toast'

export const useToast = () => {
    const [toasts, setToasts] = useRecoilState(toastsState)

    const addToast = (toast: Omit<ToastMessage, 'id'>) => {
        console.log('🍞 addToast called with:', toast)
        const id = Date.now().toString()
        const newToast: ToastMessage = {
            ...toast,
            id,
        }
        console.log('🍞 Creating toast:', newToast)
        setToasts((prev) => {
            console.log('🍞 Previous toasts:', prev)
            // Only show one toast at a time - replace existing toasts
            const newToasts = [newToast]
            console.log('🍞 New toasts array (single toast):', newToasts)
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
