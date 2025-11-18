import React from 'react'
import Toast, { ToastMessage } from './Toast'

interface ToastContainerProps {
    toasts: ToastMessage[]
    onRemoveToast: (id: string) => void
}

/**
 * Toast container component that manages positioning and layout of toast notifications
 * Positioned at the top-right with downward cascade effect
 * New toasts appear at the top, pushing existing toasts down
 * First toast translates down when second appears, then fades when third appears
 * Part of the unified toast system - replaced the old ErrorToast positioning
 */
const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemoveToast }) => {
    if (toasts.length === 0) {
        return null
    }

    return (
        <div
            className="fixed top-4 right-4 sm:right-6 md:right-8 lg:right-12 z-[100001] flex flex-col pointer-events-none w-full max-w-sm sm:max-w-md"
            aria-live="polite"
            aria-atomic="true"
            role="status"
        >
            {toasts.map((toast, index) => {
                // Calculate position: 0 = top, 1 = middle (pushed down), 2+ = fading out
                const isFirst = index === 0
                const isSecond = index === 1
                const isThirdOrMore = index >= 2

                return (
                    <div
                        key={toast.id}
                        className="pointer-events-auto transition-all duration-500 ease-out"
                        style={{
                            opacity: isThirdOrMore ? 0 : 1,
                            transform: isThirdOrMore
                                ? 'translateY(20px) scale(0.9)'
                                : isSecond
                                  ? 'translateY(0) scale(0.98)'
                                  : 'translateY(0) scale(1)',
                            marginBottom: isThirdOrMore ? '0px' : '12px',
                            height: isThirdOrMore ? '0px' : 'auto',
                            overflow: isThirdOrMore ? 'hidden' : 'visible',
                        }}
                    >
                        <Toast toast={toast} onClose={onRemoveToast} />
                    </div>
                )
            })}
        </div>
    )
}

export default ToastContainer
