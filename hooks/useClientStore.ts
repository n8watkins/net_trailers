import { useEffect, useState } from 'react'
import { useAppStore, AppStore } from '../stores/appStore'

/**
 * Client-only hook for safely accessing AppStore during SSR/hydration.
 *
 * **When to use:**
 * - You're accessing the AppStore specifically (not other Zustand stores)
 * - You want a simple solution with optional fallback values
 * - You need SSR-safe store access without complex setup
 *
 * **How it works:**
 * 1. Always calls `useAppStore()` to satisfy React's rules of hooks
 * 2. Returns `fallback` or `undefined` during SSR and hydration
 * 3. Returns actual store value after component mounts on client
 * 4. Component-level hydration tracking (not global)
 *
 * **Performance characteristics:**
 * - Simple useState/useEffect pattern with minimal overhead
 * - No global state - each component tracks its own hydration
 * - Store subscription starts immediately, but value hidden until mounted
 *
 * @template T - The type of the selected store value (defaults to full AppStore)
 * @param {function} [selector] - Optional selector function to extract specific store slice
 * @param {T} [fallback] - Optional fallback value to return during SSR/hydration
 * @returns {T | undefined} Store value after mount, fallback/undefined during SSR/hydration
 *
 * @example
 * ```tsx
 * // Without selector (full store)
 * function MyComponent() {
 *   const store = useClientStore()
 *   if (!store) return <div>Loading...</div>
 *   return <div>{store.modal.isOpen ? 'Open' : 'Closed'}</div>
 * }
 *
 * // With selector and fallback
 * function MyComponent() {
 *   const isOpen = useClientStore(
 *     (state) => state.modal.isOpen,
 *     false // fallback during hydration
 *   )
 *   return <div>{isOpen ? 'Open' : 'Closed'}</div>
 * }
 * ```
 *
 * @see {@link useHydrationGuard} - For global hydration flag
 * @see {@link useHydrationSafeStore} - For any Zustand store (not just AppStore)
 * @see {@link useHydrationSafe} - For wrapping operations in hydration checks
 */
export function useClientStore<T = AppStore>(
    selector?: (state: AppStore) => T,
    fallback?: T
): T | undefined {
    const [mounted, setMounted] = useState(false)

    // Mark as mounted after hydration
    useEffect(() => {
        setMounted(true)
    }, [])

    // Always call the hook to satisfy React's rules
    // Use any as a temporary type to satisfy both cases
    const storeValue = useAppStore(selector as any) as T

    // Return fallback or undefined during SSR/hydration
    if (!mounted) {
        return fallback
    }

    // Return the actual store value after mount
    return storeValue
}
