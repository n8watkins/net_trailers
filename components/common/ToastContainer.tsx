import React, { memo, useCallback } from 'react'
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
 *
 * Memoized to prevent re-renders from parent components
 */
const ToastContainer: React.FC<ToastContainerProps> = memo(
    ({ toasts, onRemoveToast }) => {
        if (toasts.length === 0) {
            return null
        }

        // Use a larger fixed height that accommodates most toasts
        // This ensures consistent spacing without overlap
        const TOAST_HEIGHT = 120 // Increased from 110 to prevent overlap

        return (
            <div
                className="fixed top-4 right-4 sm:right-6 md:right-8 lg:right-12 z-[100001] pointer-events-none w-full max-w-sm sm:max-w-md"
                aria-live="polite"
                aria-atomic="true"
                role="status"
                style={{ minHeight: '300px' }}
            >
                {toasts.map((toast, index) => {
                    // Calculate position: 0 = top, 1 = second (pushed down), 2+ = fading out
                    const isFirst = index === 0
                    const isSecond = index === 1
                    const isThirdOrMore = index >= 2

                    // Calculate vertical offset - each toast gets its own row
                    const verticalOffset = index * TOAST_HEIGHT

                    return (
                        <div
                            key={toast.id}
                            className="pointer-events-auto transition-all duration-500 ease-out absolute top-0 right-0 w-full"
                            style={{
                                opacity: isThirdOrMore ? 0 : 1,
                                transform: isThirdOrMore
                                    ? `translateY(${verticalOffset + 40}px) scale(0.95)`
                                    : `translateY(${verticalOffset}px) scale(${isSecond ? 0.98 : 1})`,
                                zIndex: 100 - index,
                            }}
                        >
                            <Toast toast={toast} onClose={onRemoveToast} />
                        </div>
                    )
                })}
            </div>
        )
    },
    (prevProps, nextProps) => {
        // Custom comparison: only re-render if toast IDs or count changed
        if (prevProps.toasts.length !== nextProps.toasts.length) return false
        if (prevProps.toasts.length === 0 && nextProps.toasts.length === 0) return true

        // Check if toast IDs are the same
        const prevIds = prevProps.toasts.map((t) => t.id).join(',')
        const nextIds = nextProps.toasts.map((t) => t.id).join(',')

        return prevIds === nextIds
    }
)

ToastContainer.displayName = 'ToastContainer'

export default ToastContainer
