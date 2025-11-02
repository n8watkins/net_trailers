/**
 * Debounced Firebase Service
 * Prevents excessive writes to Firestore by batching and debouncing saves
 */

import { AuthStorageService, AuthPreferences } from './authStorageService'
import { firebaseTracker } from '../utils/firebaseCallTracker'
import { firebaseLog, firebaseWarn, authError } from '../utils/debugLogger'

interface PendingSave {
    userId: string
    preferences: AuthPreferences
    timestamp: number
    source: string
}

class DebouncedFirebaseService {
    private pendingSaves = new Map<string, PendingSave>()
    private saveTimeouts = new Map<string, NodeJS.Timeout>()
    private readonly DEBOUNCE_DELAY = 2000 // 2 seconds
    private readonly MIN_SAVE_INTERVAL = 1000 // Minimum 1 second between saves
    private lastSaveTime = new Map<string, number>()

    /**
     * Queue a save operation with debouncing
     */
    queueSave(userId: string, preferences: AuthPreferences, source: string = 'unknown') {
        // Track the request
        firebaseTracker.track('queueSave', `DebouncedFirebase-${source}`, userId, {
            watchlistCount: preferences.defaultWatchlist?.length || 0,
            likedCount: preferences.likedMovies?.length || 0,
            hiddenCount: preferences.hiddenMovies?.length || 0,
        })

        // Cancel any pending save for this user
        const existingTimeout = this.saveTimeouts.get(userId)
        if (existingTimeout) {
            clearTimeout(existingTimeout)
            firebaseLog(`⏸️ [DebouncedFirebase] Cancelled pending save for ${userId}`)
        }

        // Store the latest data
        this.pendingSaves.set(userId, {
            userId,
            preferences,
            timestamp: Date.now(),
            source,
        })

        // Calculate delay based on last save time
        const lastSave = this.lastSaveTime.get(userId) || 0
        const timeSinceLastSave = Date.now() - lastSave
        const delay = Math.max(this.DEBOUNCE_DELAY, this.MIN_SAVE_INTERVAL - timeSinceLastSave)

        firebaseLog(
            `⏳ [DebouncedFirebase] Queued save for ${userId} from ${source}, will execute in ${delay}ms`
        )

        // Schedule the save
        const timeout = setTimeout(() => {
            this.executeSave(userId)
        }, delay)

        this.saveTimeouts.set(userId, timeout)
    }

    /**
     * Execute a pending save
     */
    private async executeSave(userId: string) {
        const pendingSave = this.pendingSaves.get(userId)
        if (!pendingSave) {
            firebaseWarn(`⚠️ [DebouncedFirebase] No pending save found for ${userId}`)
            return
        }

        try {
            firebaseLog(
                `💾 [DebouncedFirebase] Executing save for ${userId} from ${pendingSave.source}`
            )
            firebaseTracker.track('executeSave', `DebouncedFirebase-${pendingSave.source}`, userId)

            await AuthStorageService.saveUserData(userId, pendingSave.preferences)

            // Update last save time
            this.lastSaveTime.set(userId, Date.now())

            // Clean up
            this.pendingSaves.delete(userId)
            this.saveTimeouts.delete(userId)

            firebaseLog(`✅ [DebouncedFirebase] Successfully saved for ${userId}`)
        } catch (error) {
            authError(`❌ [DebouncedFirebase] Failed to save for ${userId}:`, error)

            // Retry once after a delay
            setTimeout(() => {
                firebaseLog(`🔄 [DebouncedFirebase] Retrying save for ${userId}`)
                this.queueSave(userId, pendingSave.preferences, `${pendingSave.source}-retry`)
            }, 5000)
        }
    }

    /**
     * Force immediate save (bypass debouncing)
     */
    async forceSave(userId: string, preferences: AuthPreferences, source: string = 'forced') {
        // Cancel any pending debounced save
        const existingTimeout = this.saveTimeouts.get(userId)
        if (existingTimeout) {
            clearTimeout(existingTimeout)
            this.saveTimeouts.delete(userId)
            this.pendingSaves.delete(userId)
        }

        firebaseLog(`⚡ [DebouncedFirebase] Force save for ${userId} from ${source}`)
        firebaseTracker.track('forceSave', `DebouncedFirebase-${source}`, userId)

        await AuthStorageService.saveUserData(userId, preferences)
        this.lastSaveTime.set(userId, Date.now())
    }

    /**
     * Cancel all pending saves
     */
    cancelAll() {
        this.saveTimeouts.forEach((timeout) => clearTimeout(timeout))
        this.saveTimeouts.clear()
        this.pendingSaves.clear()
        firebaseLog('🛑 [DebouncedFirebase] Cancelled all pending saves')
    }

    /**
     * Get pending save info for debugging
     */
    getPendingSaves() {
        return Array.from(this.pendingSaves.entries()).map(([userId, save]) => ({
            userId,
            source: save.source,
            age: Date.now() - save.timestamp,
            dataSize: JSON.stringify(save.preferences).length,
        }))
    }
}

// Singleton instance
export const debouncedFirebase = new DebouncedFirebaseService()

// Attach to window for debugging
if (typeof window !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).debouncedFirebase = debouncedFirebase
}
