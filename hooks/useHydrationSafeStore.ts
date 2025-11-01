import { useEffect, useState } from 'react'
import { useHydrationDebug } from '../utils/hydrationDebug'

/**
 * Universal hydration-safe hook for accessing ANY Zustand store with default values.
 *
 * **When to use:**
 * - You need to access ANY Zustand store (not just AppStore)
 * - You want automatic subscription to store changes after hydration
 * - You need debugging capabilities via hydrationDebug
 * - You require precise control over default values during hydration
 *
 * **How it works:**
 * 1. Returns `defaultValue` during SSR and initial hydration
 * 2. After hydration completes, subscribes to store and returns live value
 * 3. Automatically updates when store value changes
 * 4. Logs hydration events if debug mode enabled
 *
 * **Performance characteristics:**
 * - Component-level hydration tracking (not global)
 * - Manual subscription management for fine-grained control
 * - Debug logging overhead (disable in production via hydrationDebug)
 *
 * @template T - The store state type
 * @template R - The selected value type
 * @param {function} store - The Zustand store hook (e.g., useAppStore, useSessionStore)
 * @param {function} selector - Function to extract value from store state
 * @param {R} defaultValue - Value to return during SSR/hydration
 * @param {string} [componentName] - Optional component name for debug logging
 * @returns {R} Default value during hydration, then live store value
 *
 * @example
 * ```tsx
 * import { useSessionStore } from '../stores/sessionStore'
 *
 * function UserProfile() {
 *   const userId = useHydrationSafeStore(
 *     useSessionStore,
 *     (state) => state.userId,
 *     null, // default during hydration
 *     'UserProfile'
 *   )
 *
 *   if (!userId) return <div>Not logged in</div>
 *   return <div>User ID: {userId}</div>
 * }
 * ```
 *
 * @see {@link useClientStore} - Simpler version for AppStore only
 * @see {@link useHydrationGuard} - For global hydration flag
 * @see {@link useHydrationSafe} - For wrapping operations in hydration checks
 */
export function useHydrationSafeStore<T, R>(
    store: (selector: (state: T) => R) => R,
    selector: (state: T) => R,
    defaultValue: R,
    componentName?: string
): R {
    const debug = useHydrationDebug(componentName || 'UnknownComponent')
    const [isHydrated, setIsHydrated] = useState(false)
    const [value, setValue] = useState<R>(defaultValue)

    // Track hydration state
    useEffect(() => {
        debug.logEffect('Hydration state change')
        setIsHydrated(true)
    }, [])

    // Subscribe to store after hydration
    useEffect(() => {
        if (!isHydrated) return

        debug.logStoreAccess({ phase: 'subscribing', isHydrated })

        // Get initial value from store
        const storeValue = store(selector)
        setValue(storeValue)

        // Subscribe to store changes
        const unsubscribe = (store as any).subscribe(
            (state: T) => selector(state),
            (newValue: R) => {
                debug.logStateChange({ newValue, isHydrated })
                setValue(newValue)
            }
        )

        return unsubscribe
    }, [isHydrated, store, selector])

    // Return default value during SSR and initial hydration
    if (!isHydrated) {
        debug.logRender({ phase: 'pre-hydration', value: defaultValue })
        return defaultValue
    }

    debug.logRender({ phase: 'post-hydration', value })
    return value
}

/**
 * Simplified hydration-safe state hook that doesn't require a Zustand store.
 *
 * **When to use:**
 * - You need hydration-safe local component state (not store state)
 * - You want to prevent state updates during hydration
 * - You need to know when hydration completes
 *
 * **How it works:**
 * 1. Tracks hydration state and local value
 * 2. Blocks state updates until hydration completes
 * 3. Returns current value, hydration status, and safe setter
 * 4. Logs warnings if updates attempted before hydration
 *
 * **Performance characteristics:**
 * - Component-level state (not global)
 * - Debug logging overhead
 * - Minimal - just useState + useEffect
 *
 * @template T - The state value type
 * @param {T} initialValue - Initial value for the state
 * @param {string} [componentName] - Optional component name for debug logging
 * @returns {[T, boolean, function]} Tuple of [value, isHydrated, safeSetValue]
 *
 * @example
 * ```tsx
 * function Counter() {
 *   const [count, isHydrated, setCount] = useHydrationSafe(0, 'Counter')
 *
 *   return (
 *     <div>
 *       <p>Count: {count}</p>
 *       <p>Hydrated: {isHydrated ? 'Yes' : 'No'}</p>
 *       <button onClick={() => setCount(count + 1)}>
 *         Increment (blocked until hydrated)
 *       </button>
 *     </div>
 *   )
 * }
 * ```
 *
 * @see {@link useHydrationSafeStore} - For Zustand store access with defaults
 * @see {@link useHydrationSafe} - Different hook in useHydrationSafe.ts for operation wrapping
 */
export function useHydrationSafe<T>(
    initialValue: T,
    componentName?: string
): [T, boolean, (value: T) => void] {
    const debug = useHydrationDebug(componentName || 'UnknownComponent')
    const [isHydrated, setIsHydrated] = useState(false)
    const [value, setValue] = useState<T>(initialValue)

    useEffect(() => {
        debug.logEffect('Hydration complete')
        setIsHydrated(true)
    }, [])

    const safeSetValue = (newValue: T) => {
        if (isHydrated) {
            debug.logStateChange({ newValue, isHydrated })
            setValue(newValue)
        } else {
            debug.logStateChange({
                warning: 'Attempted to set value before hydration',
                newValue,
                isHydrated,
            })
        }
    }

    return [value, isHydrated, safeSetValue]
}
