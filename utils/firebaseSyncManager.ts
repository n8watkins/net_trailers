/**
 * Firebase Sync Manager - Singleton to prevent duplicate sync operations
 * This prevents the 500+ duplicate calls issue
 */

import { firebaseTracker } from './firebaseCallTracker'
import { authLog } from './debugLogger'

interface SyncOperation<T = unknown> {
    userId: string
    timestamp: number
    status: 'pending' | 'completed' | 'failed'
    promise?: Promise<T>
}

export class FirebaseSyncManager {
    private activeSyncs = new Map<string, SyncOperation<unknown>>()
    private completedSyncs = new Map<string, number>() // userId -> last completion time
    private readonly MIN_SYNC_INTERVAL = 5000 // 5 seconds minimum between syncs
    private readonly SYNC_TIMEOUT = 10000 // 10 second timeout for sync operations

    /**
     * Check if a sync is needed for the user
     */
    needsSync(userId: string): boolean {
        // Check if there's an active sync
        const activeSync = this.activeSyncs.get(userId)
        if (activeSync && activeSync.status === 'pending') {
            const age = Date.now() - activeSync.timestamp
            if (age < this.SYNC_TIMEOUT) {
                authLog(`⏭️ [SyncManager] Sync already in progress for ${userId} (${age}ms old)`)
                return false
            }
            // Timeout reached, clear the stuck sync
            console.warn(`⚠️ [SyncManager] Clearing stuck sync for ${userId} (${age}ms old)`)
            this.activeSyncs.delete(userId)
        }

        // Check if we synced recently
        const lastSync = this.completedSyncs.get(userId)
        if (lastSync) {
            const timeSinceLastSync = Date.now() - lastSync
            if (timeSinceLastSync < this.MIN_SYNC_INTERVAL) {
                authLog(`⏭️ [SyncManager] Recently synced ${userId} (${timeSinceLastSync}ms ago)`)
                return false
            }
        }

        return true
    }

    /**
     * Execute a sync operation with deduplication
     */
    async executeSync<T>(
        userId: string,
        syncFunction: () => Promise<T>,
        source: string = 'unknown'
    ): Promise<T | null> {
        // Check if sync is needed
        if (!this.needsSync(userId)) {
            // Return existing sync promise if available
            const activeSync = this.activeSyncs.get(userId)
            if (activeSync?.promise) {
                authLog(`♻️ [SyncManager] Reusing existing sync promise for ${userId}`)
                firebaseTracker.track('syncReused', `SyncManager-${source}`, userId)
                return activeSync.promise as Promise<T>
            }
            return null
        }

        // Create new sync operation
        authLog(`🔄 [SyncManager] Starting sync for ${userId} from ${source}`)
        firebaseTracker.track('syncStarted', `SyncManager-${source}`, userId)

        const syncOp: SyncOperation<T> = {
            userId,
            timestamp: Date.now(),
            status: 'pending',
        }

        // Execute the sync with timeout
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Sync timeout')), this.SYNC_TIMEOUT)
        })

        const syncPromise = Promise.race([syncFunction(), timeoutPromise])
            .then((result) => {
                // Mark as completed
                this.completedSyncs.set(userId, Date.now())
                this.activeSyncs.delete(userId)
                authLog(`✅ [SyncManager] Sync completed for ${userId}`)
                firebaseTracker.track('syncCompleted', `SyncManager-${source}`, userId)
                return result
            })
            .catch((error) => {
                // Mark as failed
                this.activeSyncs.delete(userId)
                console.error(`❌ [SyncManager] Sync failed for ${userId}:`, error)
                firebaseTracker.track('syncFailed', `SyncManager-${source}`, userId)
                throw error
            })

        // Store the promise for reuse
        syncOp.promise = syncPromise
        this.activeSyncs.set(userId, syncOp)

        return syncPromise
    }

    /**
     * Clear all sync state for a user
     */
    clearUserSync(userId: string) {
        this.activeSyncs.delete(userId)
        this.completedSyncs.delete(userId)
        authLog(`🧹 [SyncManager] Cleared sync state for ${userId}`)
    }

    /**
     * Get sync statistics for debugging
     */
    getStats() {
        const now = Date.now()
        return {
            activeSyncs: Array.from(this.activeSyncs.entries()).map(([userId, op]) => ({
                userId: userId.substring(0, 8) + '...',
                status: op.status,
                age: now - op.timestamp,
            })),
            completedSyncs: Array.from(this.completedSyncs.entries()).map(([userId, time]) => ({
                userId: userId.substring(0, 8) + '...',
                age: now - time,
            })),
        }
    }

    /**
     * Reset all state (for debugging)
     */
    reset() {
        this.activeSyncs.clear()
        this.completedSyncs.clear()
        authLog('🔄 [SyncManager] Reset all sync state')
    }
}

// Singleton instance
export const syncManager = new FirebaseSyncManager()

// Attach to window for debugging
if (typeof window !== 'undefined') {
    window.syncManager = syncManager
}
