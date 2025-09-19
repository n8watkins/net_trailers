import { useRecoilState } from 'recoil'
import { toastsState } from '../atoms/toastAtom'
import { ToastMessage } from '../components/Toast'

export const useToast = () => {
    const [toasts, setToasts] = useRecoilState(toastsState)

    const addToast = (toast: Omit<ToastMessage, 'id'>) => {
        const id = Date.now().toString()
        const newToast: ToastMessage = {
            ...toast,
            id
        }
        setToasts(prev => [...prev, newToast])
    }

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(toast => toast.id !== id))
    }

    const showSuccess = (title: string, message?: string) => {
        addToast({ type: 'success', title, message })
    }

    const showError = (title: string, message?: string) => {
        addToast({ type: 'error', title, message })
    }

    return {
        toasts,
        addToast,
        removeToast,
        showSuccess,
        showError
    }
}