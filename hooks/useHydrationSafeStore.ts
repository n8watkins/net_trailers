import { useEffect, useState } from 'react'
import { useHydrationDebug } from '../utils/hydrationDebug'

/**
 * Universal hydration-safe store access hook
 * Prevents hydration mismatches by deferring store access until after hydration
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
 * Simplified version that doesn't require a selector
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
