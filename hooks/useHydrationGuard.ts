import { useState, useEffect } from 'react'

/**
 * Global hydration guard to prevent any store operations during hydration.
 * This is a more aggressive approach to prevent Suspense boundary errors.
 *
 * @internal
 * Tracks global hydration state across all component instances to ensure
 * consistent behavior during SSR/hydration phase.
 */
let globalHydrationComplete = false

/**
 * Hook to safely defer operations until React hydration is complete.
 *
 * **When to use:**
 * - You need a global hydration flag shared across all components
 * - You're experiencing Suspense boundary errors during initial render
 * - You want to block ALL store operations until hydration completes
 *
 * **How it works:**
 * 1. Returns `false` during SSR and initial client render
 * 2. Uses `requestIdleCallback` to detect when React hydration completes
 * 3. Updates global flag and component state after hydration
 * 4. Subsequent component mounts immediately see `true` via global flag
 *
 * **Performance characteristics:**
 * - Uses `requestIdleCallback` with 100ms timeout for modern browsers
 * - Falls back to 50ms setTimeout for older browsers
 * - Global state prevents redundant hydration checks across components
 *
 * @returns {boolean} `true` after React hydration completes, `false` during SSR/hydration
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const isHydrated = useHydrationGuard()
 *
 *   if (!isHydrated) {
 *     return <div>Loading...</div>
 *   }
 *
 *   // Safe to access store or perform client-only operations
 *   return <div>{store.data}</div>
 * }
 * ```
 *
 * @see {@link useClientStore} - For AppStore-specific hydration safety
 * @see {@link useHydrationSafeStore} - For any Zustand store with default values
 * @see {@link useHydrationSafe} - For wrapping operations in hydration checks
 */
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
 * Utility function to check global hydration state without triggering a component re-render.
 *
 * **When to use:**
 * - You need to check hydration state in non-React code (utils, helpers)
 * - You want to avoid unnecessary re-renders from the hook
 * - You're implementing custom hydration logic
 *
 * @returns {boolean} `true` if React hydration has completed globally, `false` otherwise
 *
 * @example
 * ```ts
 * // In a utility function
 * function myUtility() {
 *   if (!isHydrationComplete()) {
 *     console.warn('Called during hydration - operations may fail')
 *     return
 *   }
 *   // Safe to proceed
 * }
 * ```
 */
export const isHydrationComplete = () => globalHydrationComplete
