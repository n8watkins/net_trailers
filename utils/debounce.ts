/**
 * Debounce utility for reducing excessive function calls
 */

import { useState, useEffect } from 'react'

/**
 * React hook that debounces a value
 *
 * Delays updating a value until after a specified delay period.
 * Useful for optimizing performance by reducing the frequency of expensive operations
 * like API calls, search queries, or complex computations.
 *
 * @template T - The type of value being debounced
 * @param value - The value to debounce
 * @param delay - The delay in milliseconds before updating the debounced value
 * @returns The debounced value that updates after the delay
 *
 * @example
 * ```tsx
 * const [searchQuery, setSearchQuery] = useState('')
 * const debouncedQuery = useDebounce(searchQuery, 300)
 *
 * useEffect(() => {
 *   // This only runs 300ms after the user stops typing
 *   if (debouncedQuery) {
 *     performSearch(debouncedQuery)
 *   }
 * }, [debouncedQuery])
 * ```
 */
export function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value)

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value)
        }, delay)

        return () => {
            clearTimeout(handler)
        }
    }, [value, delay])

    return debouncedValue
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
    let timeoutId: NodeJS.Timeout | null = null
    let lastCallTime = 0

    return (...args: Parameters<T>): Promise<ReturnType<T>> => {
        return new Promise((resolve) => {
            const now = Date.now()
            const timeSinceLastCall = now - lastCallTime

            // Clear existing timeout
            if (timeoutId) {
                clearTimeout(timeoutId)
            }

            // If enough time has passed, execute immediately
            if (timeSinceLastCall >= wait) {
                lastCallTime = now
                resolve(func(...args))
            } else {
                // Otherwise, debounce
                timeoutId = setTimeout(() => {
                    lastCallTime = Date.now()
                    resolve(func(...args))
                }, wait)
            }
        })
    }
}

/**
 * Create a debounced function with tracking
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createDebouncedFunction<T extends (...args: any[]) => any>(
    name: string,
    func: T,
    wait: number
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
    let callCount = 0
    let skippedCount = 0

    const debouncedFunc = debounce((...args: Parameters<T>) => {
        console.log(`🎯 [Debounce] Executing ${name} (skipped ${skippedCount} calls)`)
        skippedCount = 0
        return func(...args)
    }, wait)

    return (...args: Parameters<T>): Promise<ReturnType<T>> => {
        callCount++
        if (callCount > 1) {
            skippedCount++
            console.log(`⏳ [Debounce] Debouncing ${name} (call #${callCount})`)
        }
        return debouncedFunc(...args)
    }
}
