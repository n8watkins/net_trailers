import React from 'react'
import Toast, { ToastMessage } from './Toast'

interface ToastContainerProps {
    toasts: ToastMessage[]
    onRemoveToast: (id: string) => void
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemoveToast }) => {
    if (toasts.length === 0) return null

    return (
        <div className="fixed top-4 right-4 sm:right-8 md:right-12 lg:right-16 xl:right-20 z-[9999] space-y-4 pointer-events-none max-w-[calc(100vw-2rem)] sm:max-w-[calc(100vw-4rem)] md:max-w-md lg:max-w-lg">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className="transform transition-all duration-300 ease-in-out pointer-events-auto"
                >
                    <Toast toast={toast} onClose={onRemoveToast} />
                </div>
            ))}
        </div>
    )
}

export default ToastContainer
