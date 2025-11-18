/**
 * Global type declarations for window extensions
 * This file extends the Window interface to provide type safety for debug globals
 */

import type { FirebaseCallTracker } from '../utils/firebaseCallTracker'
import type { FirebaseSyncManager } from '../utils/firebaseSyncManager'

declare global {
    interface Window {
        /**
         * Firebase call tracker for debugging - monitors Firebase API calls
         * Available in browser console: window.firebaseTracker
         */
        firebaseTracker?: FirebaseCallTracker

        /**
         * Firebase sync manager for debugging - manages sync deduplication
         * Available in browser console: window.syncManager
         */
        syncManager?: FirebaseSyncManager
    }

    /**
     * Server-side rate limiting for activity tracking
     * Tracks requests per IP to prevent spam
     */
    var activityRateLimits: Map<string, { count: number; windowStart: number }> | undefined
}

// This export is necessary to make this file a module
export {}
