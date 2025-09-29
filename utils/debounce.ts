/**
 * Debounce utility for reducing excessive function calls
 */

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
