/**
 * Suppress the "[HMR] connected" log from Next.js development server
 * This log comes from Next.js internals and is not configurable via next.config.js
 */
export function suppressHMRLog() {
    if (typeof window === 'undefined' || process.env.NODE_ENV !== 'development') {
        return
    }

    // Override console.log to filter out HMR connected messages
    const originalLog = console.log
    console.log = function (...args: any[]) {
        // Check if this is the HMR connected message
        const message = args[0]
        if (
            typeof message === 'string' &&
            (message.includes('[HMR] connected') || message.includes('HMR connected'))
        ) {
            // Silently ignore this log
            return
        }

        // Pass through all other logs
        originalLog.apply(console, args)
    }
}
