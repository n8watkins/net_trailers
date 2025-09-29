import { startTransition } from 'react'

/**
 * Debug wrapper for state setters that logs early hydration updates
 */
export function debugSetter<T>(name: string, realSet: (arg: T) => void, forceWrap = false) {
    // Check if we're during hydration
    const isHydrating = () => {
        if (typeof window === 'undefined') {
            return true // SSR - definitely hydrating
        }

        // Check if document body exists (indicates hydration is mostly complete)
        if (!document.body) {
            return true // Still hydrating
        }

        // Check if React has marked hydration as complete
        const rootElement = document.getElementById('__next')
        if (rootElement && rootElement.dataset.hydrated !== 'true') {
            return true // Custom marker - still hydrating
        }

        return false // Hydration complete
    }

    return (arg: T) => {
        if (isHydrating()) {
            // Log early update attempt
            console.warn(
                `[EARLY HYDRATION UPDATE] ${name}`,
                '\nValue:',
                arg,
                '\nStack:',
                new Error().stack?.split('\n').slice(2, 7).join('\n')
            )

            // For debugging - optionally block the update
            if (process.env.NODE_ENV === 'development' && !forceWrap) {
                console.error(`BLOCKED: Early hydration update to ${name}`)
                return // Block the update during development
            }
        }

        // Wrap in startTransition for safety
        startTransition(() => {
            realSet(arg)
        })
    }
}

/**
 * Mark hydration as complete
 */
export function markHydrationComplete() {
    if (typeof window !== 'undefined') {
        const rootElement = document.getElementById('__next')
        if (rootElement) {
            rootElement.dataset.hydrated = 'true'
            console.log('[HYDRATION] Marked as complete')
        }
    }
}

/**
 * Create a hydration-aware state setter
 */
export function createHydrationSafeSetter<T>(
    name: string,
    setter: (arg: T) => void,
    options: {
        allowDuringHydration?: boolean
        queueUpdates?: boolean
    } = {}
) {
    const updateQueue: T[] = []
    let hydrationComplete = false

    // Check hydration status periodically
    if (typeof window !== 'undefined') {
        const checkHydration = setInterval(() => {
            const rootElement = document.getElementById('__next')
            if (rootElement?.dataset.hydrated === 'true') {
                hydrationComplete = true

                // Flush queued updates
                if (options.queueUpdates && updateQueue.length > 0) {
                    console.log(
                        `[HYDRATION] Flushing ${updateQueue.length} queued updates for ${name}`
                    )
                    updateQueue.forEach((update) => {
                        startTransition(() => setter(update))
                    })
                    updateQueue.length = 0
                }

                clearInterval(checkHydration)
            }
        }, 100)

        // Timeout after 5 seconds
        setTimeout(() => {
            clearInterval(checkHydration)
            hydrationComplete = true
        }, 5000)
    }

    return (arg: T) => {
        if (!hydrationComplete && typeof window !== 'undefined') {
            console.warn(`[HYDRATION WARNING] Update attempted for ${name} during hydration`)

            if (options.queueUpdates) {
                console.log(`[HYDRATION] Queueing update for ${name}`)
                updateQueue.push(arg)
                return
            }

            if (!options.allowDuringHydration) {
                console.error(`[HYDRATION] Blocked update for ${name}`)
                return
            }
        }

        startTransition(() => setter(arg))
    }
}
