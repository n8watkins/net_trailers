/**
 * Storage Quota Management System
 *
 * Monitors and manages localStorage/IndexedDB quota usage.
 * Provides automatic cleanup and quota warnings.
 *
 * Key Features:
 * - Real-time quota monitoring
 * - Automatic cleanup on quota exceeded
 * - Safe storage operations with fallback
 * - Storage breakdown by key
 */

export interface StorageQuotaInfo {
    usage: number
    quota: number
    percentUsed: number
    warning: boolean
    critical: boolean
}

export class StorageQuotaManager {
    private static WARNING_THRESHOLD = 80 // Warn at 80%
    private static CRITICAL_THRESHOLD = 95 // Critical at 95%

    /**
     * Get current storage quota information
     * Uses Storage API if available, falls back to manual calculation
     */
    static async getQuotaInfo(): Promise<StorageQuotaInfo> {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            try {
                const estimate = await navigator.storage.estimate()
                const usage = estimate.usage || 0
                const quota = estimate.quota || 5 * 1024 * 1024 // Default 5MB
                const percentUsed = (usage / quota) * 100

                return {
                    usage,
                    quota,
                    percentUsed,
                    warning: percentUsed >= this.WARNING_THRESHOLD,
                    critical: percentUsed >= this.CRITICAL_THRESHOLD,
                }
            } catch (error) {
                console.warn('[StorageQuota] Failed to estimate storage:', error)
            }
        }

        // Fallback: estimate localStorage size manually
        const localStorageSize = this.estimateLocalStorageSize()
        const quota = 5 * 1024 * 1024 // 5MB typical browser limit
        const percentUsed = (localStorageSize / quota) * 100

        return {
            usage: localStorageSize,
            quota,
            percentUsed,
            warning: percentUsed >= this.WARNING_THRESHOLD,
            critical: percentUsed >= this.CRITICAL_THRESHOLD,
        }
    }

    /**
     * Estimate localStorage size in bytes
     * Counts all keys and values, accounting for UTF-16 encoding
     */
    static estimateLocalStorageSize(): number {
        let total = 0
        try {
            for (const key in localStorage) {
                if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
                    const value = localStorage[key]
                    // UTF-16 encoding: 2 bytes per character
                    total += (key.length + value.length) * 2
                }
            }
        } catch (error) {
            console.warn('[StorageQuota] Error estimating localStorage size:', error)
        }
        return total
    }

    /**
     * Get storage breakdown by key prefix
     * Useful for identifying storage hogs
     */
    static getStorageBreakdown(): Record<string, number> {
        const breakdown: Record<string, number> = {}

        try {
            for (const key in localStorage) {
                if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
                    const value = localStorage[key]
                    const size = (key.length + value.length) * 2

                    // Group by prefix (before first _)
                    const prefix = key.split('_')[0] || 'other'
                    breakdown[prefix] = (breakdown[prefix] || 0) + size
                }
            }
        } catch (error) {
            console.warn('[StorageQuota] Error calculating breakdown:', error)
        }

        return breakdown
    }

    /**
     * Clean up old/expired data from localStorage
     * Returns bytes cleaned
     */
    static cleanupOldData(): number {
        let cleaned = 0

        try {
            const beforeSize = this.estimateLocalStorageSize()

            // Clean up old v1 guest data (should be migrated to v2 by now)
            for (const key in localStorage) {
                if (
                    Object.prototype.hasOwnProperty.call(localStorage, key) &&
                    key.startsWith('nettrailer_guest_data_') &&
                    !key.includes('_v2_')
                ) {
                    const size = (key.length + localStorage[key].length) * 2
                    localStorage.removeItem(key)
                    cleaned += size
                    console.log(`[StorageQuota] Removed old v1 data: ${key}`)
                }
            }

            // Clean up expired skipped content (14-day TTL)
            this.cleanupExpiredSkips()

            // Clean up stale auth cache (24+ hours old)
            this.cleanupStaleAuthCache()

            const afterSize = this.estimateLocalStorageSize()
            cleaned = beforeSize - afterSize

            if (cleaned > 0) {
                console.log(`[StorageQuota] Cleaned ${(cleaned / 1024).toFixed(2)}KB of old data`)
            }
        } catch (error) {
            console.error('[StorageQuota] Cleanup failed:', error)
        }

        return cleaned
    }

    /**
     * Clean up expired skipped content (14-day TTL)
     */
    private static cleanupExpiredSkips(): void {
        try {
            const guestKeys = Object.keys(localStorage).filter(
                (key) =>
                    key.startsWith('nettrailer_guest_data_v2_') ||
                    key.startsWith('nettrailer_guest_data_')
            )

            for (const key of guestKeys) {
                try {
                    const data = JSON.parse(localStorage[key])
                    if (data.skippedContent && Array.isArray(data.skippedContent)) {
                        const now = Date.now()
                        const TTL = 14 * 24 * 60 * 60 * 1000 // 14 days

                        const cleaned = data.skippedContent.filter(
                            (item: { timestamp?: number }) => {
                                const age = now - (item.timestamp || 0)
                                return age < TTL
                            }
                        )

                        if (cleaned.length !== data.skippedContent.length) {
                            data.skippedContent = cleaned
                            localStorage.setItem(key, JSON.stringify(data))
                            console.log(
                                `[StorageQuota] Cleaned ${data.skippedContent.length - cleaned.length} expired skips from ${key}`
                            )
                        }
                    }
                } catch (parseError) {
                    console.warn(`[StorageQuota] Failed to parse ${key}:`, parseError)
                }
            }
        } catch (error) {
            console.warn('[StorageQuota] Failed to cleanup expired skips:', error)
        }
    }

    /**
     * Clean up stale auth cache (24+ hours old)
     */
    private static cleanupStaleAuthCache(): void {
        try {
            const authCacheKey = 'nettrailer_auth_cache'
            const cached = localStorage.getItem(authCacheKey)

            if (cached) {
                const data = JSON.parse(cached)
                const age = Date.now() - (data.timestamp || 0)
                const TTL = 24 * 60 * 60 * 1000 // 24 hours

                if (age > TTL) {
                    localStorage.removeItem(authCacheKey)
                    console.log('[StorageQuota] Removed stale auth cache')
                }
            }
        } catch (error) {
            console.warn('[StorageQuota] Failed to cleanup auth cache:', error)
        }
    }

    /**
     * Safe localStorage.setItem with automatic cleanup on quota exceeded
     * Returns true if successful, false if quota exceeded even after cleanup
     */
    static safeSetItem(key: string, value: string): boolean {
        try {
            localStorage.setItem(key, value)
            return true
        } catch (error: unknown) {
            if (
                error instanceof Error &&
                (error.name === 'QuotaExceededError' ||
                    ('code' in error && (error as { code: number }).code === 22))
            ) {
                console.warn('[StorageQuota] Quota exceeded, attempting cleanup...')

                const cleaned = this.cleanupOldData()

                if (cleaned > 0) {
                    // Retry after cleanup
                    try {
                        localStorage.setItem(key, value)
                        console.log('[StorageQuota] Successfully stored after cleanup')
                        return true
                    } catch (_retryError) {
                        console.error('[StorageQuota] Still quota exceeded after cleanup')
                        return false
                    }
                } else {
                    console.error('[StorageQuota] No data to clean up, quota still exceeded')
                    return false
                }
            }

            // Other errors
            console.error('[StorageQuota] Failed to set item:', error)
            return false
        }
    }

    /**
     * Check if storage is healthy (not near quota limit)
     */
    static async isStorageHealthy(): Promise<boolean> {
        const info = await this.getQuotaInfo()
        return !info.critical
    }

    /**
     * Get formatted storage info for display
     */
    static async getFormattedInfo(): Promise<string> {
        const info = await this.getQuotaInfo()
        const usageMB = (info.usage / (1024 * 1024)).toFixed(2)
        const quotaMB = (info.quota / (1024 * 1024)).toFixed(2)

        return `${usageMB}MB / ${quotaMB}MB (${info.percentUsed.toFixed(1)}%)`
    }
}
