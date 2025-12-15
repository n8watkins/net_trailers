/**
 * Firestore Cache Health Monitoring System
 *
 * Provides health checks and safety mechanisms for Firestore offline persistence.
 * Prevents cache corruption by detecting problematic conditions before enabling persistence.
 *
 * Key Features:
 * - Pre-flight health checks before enabling persistence
 * - Corruption history tracking with error threshold
 * - Stale database detection
 * - Manual cache clearing utilities
 * - Health status dashboard data
 */

export interface CacheHealthStatus {
    errorCount: number
    lastError: string | null
    timestamp: number
    lastClearTimestamp: number | null
}

export class FirestoreCacheHealth {
    private static HEALTH_KEY = 'nettrailer_firestore_health'
    private static ERROR_THRESHOLD = 3 // Disable persistence after 3 errors
    private static STALE_DB_THRESHOLD = 7 * 24 * 60 * 60 * 1000 // 7 days

    /**
     * Check if it's safe to enable Firestore offline persistence
     * Returns false if corruption history exists or environment is unsafe
     */
    static async isSafeToEnableCache(): Promise<boolean> {
        try {
            // Check 1: Corruption history
            const health = this.getHealthStatus()
            if (health.errorCount >= this.ERROR_THRESHOLD) {
                console.warn(
                    `[CacheHealth] Error threshold reached (${health.errorCount}/${this.ERROR_THRESHOLD})`
                )
                return false
            }

            // Check 2: IndexedDB availability
            if (!('indexedDB' in window)) {
                console.warn('[CacheHealth] IndexedDB not available in this environment')
                return false
            }

            // Check 3: Check for stale databases that might cause conflicts
            const hasStaleDb = await this.checkForStaleDatabases()
            if (hasStaleDb) {
                console.warn('[CacheHealth] Stale Firestore databases detected')
                return false
            }

            // All checks passed
            return true
        } catch (error) {
            console.error('[CacheHealth] Error during health check:', error)
            return false // Fail-safe: don't enable if check itself fails
        }
    }

    /**
     * Record a cache-related error
     * Increments error count and stores error message for debugging
     */
    static recordCacheError(error: Error): void {
        try {
            const health = this.getHealthStatus()
            health.errorCount++
            health.lastError = error.message
            health.timestamp = Date.now()

            localStorage.setItem(this.HEALTH_KEY, JSON.stringify(health))

            console.error('[CacheHealth] Recorded cache error:', {
                count: health.errorCount,
                threshold: this.ERROR_THRESHOLD,
                message: error.message,
            })

            // Auto-disable if threshold reached
            if (health.errorCount >= this.ERROR_THRESHOLD) {
                console.error(
                    '[CacheHealth] ERROR THRESHOLD REACHED - Firestore persistence will be disabled on next reload'
                )
            }
        } catch (storageError) {
            console.error('[CacheHealth] Failed to record error:', storageError)
        }
    }

    /**
     * Get current health status from localStorage
     * Returns default status if no data exists
     */
    static getHealthStatus(): CacheHealthStatus {
        try {
            const stored = localStorage.getItem(this.HEALTH_KEY)
            if (!stored) {
                return this.getDefaultHealthStatus()
            }

            const parsed = JSON.parse(stored)
            return {
                errorCount: parsed.errorCount || 0,
                lastError: parsed.lastError || null,
                timestamp: parsed.timestamp || Date.now(),
                lastClearTimestamp: parsed.lastClearTimestamp || null,
            }
        } catch (error) {
            console.warn('[CacheHealth] Failed to parse health status, using defaults:', error)
            return this.getDefaultHealthStatus()
        }
    }

    /**
     * Reset health status to defaults
     * Useful after manually clearing cache or resolving corruption
     */
    static resetHealthStatus(): void {
        try {
            const defaultStatus = this.getDefaultHealthStatus()
            localStorage.setItem(this.HEALTH_KEY, JSON.stringify(defaultStatus))
            console.log('[CacheHealth] Health status reset to defaults')
        } catch (error) {
            console.error('[CacheHealth] Failed to reset health status:', error)
        }
    }

    /**
     * Clear all Firestore IndexedDB databases
     * WARNING: This deletes all offline cached data
     */
    static async clearFirestoreCache(): Promise<boolean> {
        try {
            console.log('[CacheHealth] Clearing Firestore IndexedDB cache...')

            // Get all IndexedDB databases
            if ('databases' in indexedDB) {
                const databases = await indexedDB.databases()
                const firestoreDbs = databases.filter(
                    (db) =>
                        db.name &&
                        (db.name.startsWith('firestore/') || db.name.includes('firestore'))
                )

                console.log(`[CacheHealth] Found ${firestoreDbs.length} Firestore databases`)

                // Delete each Firestore database
                for (const db of firestoreDbs) {
                    if (db.name) {
                        const result = indexedDB.deleteDatabase(db.name)
                        await new Promise((resolve, reject) => {
                            result.onsuccess = resolve
                            result.onerror = reject
                            result.onblocked = () => {
                                console.warn(`[CacheHealth] Database ${db.name} delete blocked`)
                                resolve(null)
                            }
                        })
                        console.log(`[CacheHealth] Deleted database: ${db.name}`)
                    }
                }
            } else {
                console.warn('[CacheHealth] indexedDB.databases() not supported')
            }

            // Update health status to mark clear time
            const health = this.getHealthStatus()
            health.lastClearTimestamp = Date.now()
            health.errorCount = 0 // Reset errors after manual clear
            health.lastError = null
            localStorage.setItem(this.HEALTH_KEY, JSON.stringify(health))

            console.log('[CacheHealth] Cache cleared successfully')
            return true
        } catch (error) {
            console.error('[CacheHealth] Failed to clear cache:', error)
            return false
        }
    }

    /**
     * Check for stale Firestore databases that might cause corruption
     * Returns true if stale databases are found
     */
    private static async checkForStaleDatabases(): Promise<boolean> {
        try {
            if (!('databases' in indexedDB)) {
                return false // Can't check, assume safe
            }

            const databases = await indexedDB.databases()
            const firestoreDbs = databases.filter(
                (db) =>
                    db.name && (db.name.startsWith('firestore/') || db.name.includes('firestore'))
            )

            // Check if we have a cache clear timestamp
            const health = this.getHealthStatus()
            if (!health.lastClearTimestamp && firestoreDbs.length > 0) {
                // Old databases exist with no clear timestamp - potentially stale
                return true
            }

            return false
        } catch (error) {
            console.warn('[CacheHealth] Failed to check for stale databases:', error)
            return false // Assume safe if check fails
        }
    }

    /**
     * Get default health status
     */
    private static getDefaultHealthStatus(): CacheHealthStatus {
        return {
            errorCount: 0,
            lastError: null,
            timestamp: Date.now(),
            lastClearTimestamp: null,
        }
    }

    /**
     * Get detailed health information for debugging/dashboard
     */
    static async getDetailedHealthInfo(): Promise<{
        status: CacheHealthStatus
        isSafe: boolean
        indexedDBAvailable: boolean
        databaseCount: number
        databases: string[]
        recommendation: string
    }> {
        const status = this.getHealthStatus()
        const isSafe = await this.isSafeToEnableCache()
        const indexedDBAvailable = 'indexedDB' in window

        let databaseCount = 0
        let databases: string[] = []

        if (indexedDBAvailable && 'databases' in indexedDB) {
            try {
                const dbs = await indexedDB.databases()
                const firestoreDbs = dbs.filter(
                    (db) =>
                        db.name &&
                        (db.name.startsWith('firestore/') || db.name.includes('firestore'))
                )
                databaseCount = firestoreDbs.length
                databases = firestoreDbs.map((db) => db.name || 'unknown')
            } catch (error) {
                console.warn('[CacheHealth] Failed to enumerate databases:', error)
            }
        }

        let recommendation = ''
        if (!isSafe) {
            if (status.errorCount >= this.ERROR_THRESHOLD) {
                recommendation = 'Persistent errors detected. Clear cache and reset health status.'
            } else if (!indexedDBAvailable) {
                recommendation = 'IndexedDB not available. Persistence cannot be enabled.'
            } else if (databaseCount > 0) {
                recommendation = 'Stale databases found. Clear cache to enable persistence.'
            }
        } else {
            recommendation = 'Firestore persistence is safe to enable.'
        }

        return {
            status,
            isSafe,
            indexedDBAvailable,
            databaseCount,
            databases,
            recommendation,
        }
    }
}
