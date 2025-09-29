import { useEffect, useState } from 'react'
import { useAppStore, AppStore } from '../stores/appStore'

/**
 * Client-only store hook that safely handles SSR/hydration
 * This hook ensures we only access the Zustand store on the client side
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
