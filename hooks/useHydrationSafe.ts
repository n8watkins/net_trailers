import { useState, useEffect, startTransition } from 'react'

/**
 * Custom hook to ensure operations are only executed after React hydration completes
 * This prevents Suspense boundary hydration errors by deferring store updates
 */
export const useHydrationSafe = () => {
    const [isHydrated, setIsHydrated] = useState(false)

    useEffect(() => {
        // Mark as hydrated after the initial render cycle
        setIsHydrated(true)
    }, [])

    const safeExecute = (operation: () => void) => {
        if (isHydrated) {
            startTransition(() => {
                operation()
            })
        }
    }

    const safeExecuteAsync = async (operation: () => Promise<void>) => {
        if (isHydrated) {
            startTransition(() => {
                // Execute async operation but don't await inside transition
                operation()
            })
        }
    }

    const deferredExecute = (operation: () => void, delay: number = 0) => {
        if (isHydrated) {
            const timeoutId = setTimeout(() => {
                startTransition(() => {
                    operation()
                })
            }, delay)
            return () => clearTimeout(timeoutId)
        }
        return () => {}
    }

    return {
        isHydrated,
        safeExecute,
        safeExecuteAsync,
        deferredExecute,
    }
}
