import React from 'react'
import Toast, { ToastMessage } from './Toast'

interface ToastContainerProps {
    toasts: ToastMessage[]
    onRemoveToast: (id: string) => void
}

/**
 * Toast container component that manages positioning and layout of toast notifications
 * Uses right-aligned positioning with responsive margins for optimal UX
 * Part of the unified toast system - replaced the old ErrorToast positioning
 */
const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemoveToast }) => {
    if (toasts.length === 0) {
        return null
    }

    return (
        <div
            className="fixed top-20 right-0 z-[100001] space-y-4 pointer-events-none max-w-[calc(100vw-2rem)] sm:max-w-[calc(100vw-4rem)] md:max-w-md lg:max-w-lg mr-12 sm:mr-16 md:mr-20 lg:mr-24 xl:mr-32"
            aria-live="polite"
            aria-atomic="true"
            role="status"
        >
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
