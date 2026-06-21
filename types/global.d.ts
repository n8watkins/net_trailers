/**
 * Global type declarations for window extensions
 */

declare global {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface Window {
        // Firebase tracker and sync manager globals have been removed (Firebase teardown).
    }

    /**
     * Server-side rate limiting for activity tracking
     * Tracks requests per IP to prevent spam
     */
    var activityRateLimits: Map<string, { count: number; windowStart: number }> | undefined
}

// This export is necessary to make this file a module
export {}
