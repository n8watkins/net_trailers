import { useState, useEffect } from 'react'

/**
 * Global hydration guard to prevent any store operations during hydration
 * This is a more aggressive approach to prevent Suspense boundary errors
 */
let globalHydrationComplete = false

export const useHydrationGuard = () => {
    const [isHydrated, setIsHydrated] = useState(globalHydrationComplete)

    useEffect(() => {
        // Use requestIdleCallback to ensure React has finished hydration
        // This prevents Suspense boundary errors during initial render
        const markHydrated = () => {
            globalHydrationComplete = true
            setIsHydrated(true)
        }

        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
            // Wait for browser idle time to ensure hydration is complete
            const handle = window.requestIdleCallback(markHydrated, { timeout: 100 })
            return () => window.cancelIdleCallback(handle)
        } else {
            // Fallback with a small delay for older browsers
            const timer = setTimeout(markHydrated, 50)
            return () => clearTimeout(timer)
        }
    }, [])

    return isHydrated
}

/**
 * Check if hydration is complete globally
 */
export const isHydrationComplete = () => globalHydrationComplete
