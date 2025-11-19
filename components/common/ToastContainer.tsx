import React, { memo, useRef, useLayoutEffect, useState } from 'react'
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
        const toastRefs = useRef<Map<string, HTMLDivElement>>(new Map())
        const [toastHeights, setToastHeights] = useState<Map<string, number>>(new Map())

        // Measure toast heights after render
        useLayoutEffect(() => {
            const newHeights = new Map<string, number>()
            toastRefs.current.forEach((element, id) => {
                if (element) {
                    newHeights.set(id, element.offsetHeight)
                }
            })
            setToastHeights(newHeights)
        }, [toasts])

        if (toasts.length === 0) {
            return null
        }

        const GAP = 12 // 12px gap between toasts

        return (
            <div
                className="fixed top-4 right-24 sm:right-32 md:right-40 lg:right-48 z-[100001] pointer-events-none w-full max-w-sm sm:max-w-md"
                aria-live="polite"
                aria-atomic="true"
                role="status"
                style={{ minHeight: '300px' }}
            >
                {toasts.map((toast, index) => {
                    // Calculate position based on actual heights of previous toasts
                    let verticalOffset = 0
                    for (let i = 0; i < index; i++) {
                        const prevToast = toasts[i]
                        const prevHeight = toastHeights.get(prevToast.id) || 100 // Default fallback
                        verticalOffset += prevHeight + GAP
                    }

                    const isThirdOrMore = index >= 2
                    const isSecond = index === 1

                    return (
                        <div
                            key={toast.id}
                            ref={(el) => {
                                if (el) {
                                    toastRefs.current.set(toast.id, el)
                                } else {
                                    toastRefs.current.delete(toast.id)
                                }
                            }}
                            className="pointer-events-auto transition-all duration-300 ease-out absolute top-0 right-0 w-full"
                            style={{
                                opacity: isThirdOrMore ? 0 : 1,
                                transform: isThirdOrMore
                                    ? `translateY(${verticalOffset + 40}px) scale(0.95)`
                                    : `translateY(${verticalOffset}px)`,
                                zIndex: 100 - index,
                            }}
                        >
                            <Toast
                                toast={toast}
                                onClose={onRemoveToast}
                                isActive={index === toasts.length - 1}
                            />
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
