import { useState, useEffect, startTransition } from 'react'

/**
 * Hook that provides hydration-safe operation wrappers using React transitions.
 *
 * **When to use:**
 * - You need to wrap operations/callbacks that should only run after hydration
 * - You want operations wrapped in React's `startTransition` for better UX
 * - You need delayed execution capabilities
 * - You're preventing Suspense boundary errors from state updates
 *
 * **How it works:**
 * 1. Tracks hydration state (false during SSR/hydration, true after mount)
 * 2. Provides wrapper functions that check hydration before executing
 * 3. All operations automatically wrapped in `startTransition` for non-blocking updates
 * 4. Operations called before hydration are silently ignored
 *
 * **Performance characteristics:**
 * - Component-level hydration tracking (not global)
 * - Uses React 18's `startTransition` for smoother UX
 * - No overhead for blocked operations (simply return early)
 *
 * @returns {{
 *   isHydrated: boolean,
 *   safeExecute: function,
 *   safeExecuteAsync: function,
 *   deferredExecute: function
 * }} Object with hydration state and safe execution wrappers
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isHydrated, safeExecute, deferredExecute } = useHydrationSafe()
 *   const openModal = useAppStore((state) => state.openModal)
 *
 *   const handleClick = () => {
 *     // Won't execute until hydration completes
 *     safeExecute(() => {
 *       openModal(content, true)
 *     })
 *   }
 *
 *   const handleDelayedAction = () => {
 *     // Execute after 500ms delay, only if hydrated
 *     deferredExecute(() => {
 *       console.log('Delayed action')
 *     }, 500)
 *   }
 *
 *   return (
 *     <div>
 *       <button onClick={handleClick} disabled={!isHydrated}>
 *         Open Modal
 *       </button>
 *     </div>
 *   )
 * }
 * ```
 *
 * @example
 * ```tsx
 * // With async operations
 * function DataFetcher() {
 *   const { safeExecuteAsync } = useHydrationSafe()
 *
 *   const fetchData = async () => {
 *     safeExecuteAsync(async () => {
 *       const data = await api.getData()
 *       updateStore(data)
 *     })
 *   }
 *
 *   return <button onClick={fetchData}>Fetch</button>
 * }
 * ```
 *
 * @see {@link useHydrationGuard} - For simple boolean hydration flag
 * @see {@link useClientStore} - For AppStore access with hydration safety
 * @see {@link useHydrationSafeStore} - For any Zustand store with defaults
 * @see {@link useHydrationSafe} - Different hook in useHydrationSafeStore.ts for state management
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
