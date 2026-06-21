/**
 * Application Health Check System
 *
 * Comprehensive health monitoring for critical app systems.
 * Runs pre-flight checks to detect issues early.
 *
 * Key Features:
 * - Storage availability checks (localStorage, IndexedDB)
 * - Storage quota monitoring
 * - Detailed warnings and errors
 *
 * Data is served from Turso/SQLite via API routes, so there are no
 * client-side database health checks here.
 */

import { StorageQuotaManager } from './storageQuota'

export interface HealthCheckResult {
    healthy: boolean
    checks: {
        localStorage: boolean
        indexedDB: boolean
        storageQuota: boolean
    }
    warnings: string[]
    errors: string[]
    timestamp: number
}

export class AppHealthMonitor {
    /**
     * Run comprehensive health check on all critical systems
     * Returns detailed results with warnings and errors
     */
    static async runFullHealthCheck(): Promise<HealthCheckResult> {
        const result: HealthCheckResult = {
            healthy: true,
            checks: {
                localStorage: false,
                indexedDB: false,
                storageQuota: false,
            },
            warnings: [],
            errors: [],
            timestamp: Date.now(),
        }

        // Check 1: localStorage available
        try {
            const testKey = '_health_test_' + Date.now()
            localStorage.setItem(testKey, 'test')
            localStorage.removeItem(testKey)
            result.checks.localStorage = true
            console.log('[HealthCheck] localStorage available')
        } catch (error) {
            result.errors.push('localStorage not available')
            result.healthy = false
            console.error('[HealthCheck] localStorage not available:', error)
        }

        // Check 2: IndexedDB available
        result.checks.indexedDB = 'indexedDB' in window
        if (!result.checks.indexedDB) {
            result.warnings.push('IndexedDB not available')
            console.warn('[HealthCheck] IndexedDB not available')
        } else {
            console.log('[HealthCheck] IndexedDB available')
        }

        // Check 3: Storage quota
        try {
            const quota = await StorageQuotaManager.getQuotaInfo()
            result.checks.storageQuota = !quota.critical

            if (quota.warning) {
                result.warnings.push(
                    `Storage usage: ${quota.percentUsed.toFixed(1)}% (${(quota.usage / (1024 * 1024)).toFixed(2)}MB / ${(quota.quota / (1024 * 1024)).toFixed(2)}MB)`
                )
                console.warn(`[HealthCheck] Storage usage: ${quota.percentUsed.toFixed(1)}%`)
            }

            if (quota.critical) {
                result.errors.push('Storage quota critical!')
                result.healthy = false
                console.error('[HealthCheck] Storage quota critical!')
            }

            if (!quota.warning && !quota.critical) {
                console.log('[HealthCheck] Storage quota healthy')
            }
        } catch (error) {
            result.warnings.push('Storage quota check failed')
            console.warn('[HealthCheck] Quota check failed:', error)
        }

        // Summary
        const checksPassed = Object.values(result.checks).filter(Boolean).length
        const totalChecks = Object.keys(result.checks).length

        console.log(
            `[HealthCheck] ${result.healthy ? 'OK' : 'FAIL'} Health check complete: ${checksPassed}/${totalChecks} checks passed`
        )

        if (result.warnings.length > 0) {
            console.log(`[HealthCheck] ${result.warnings.length} warning(s):`, result.warnings)
        }

        if (result.errors.length > 0) {
            console.error(`[HealthCheck] ${result.errors.length} error(s):`, result.errors)
        }

        return result
    }

    /**
     * Quick health check (skips async operations)
     * Useful for synchronous checks
     */
    static runQuickHealthCheck(): {
        localStorage: boolean
        indexedDB: boolean
    } {
        const checks = {
            localStorage: false,
            indexedDB: false,
        }

        // localStorage
        try {
            const testKey = '_health_quick_' + Date.now()
            localStorage.setItem(testKey, 'test')
            localStorage.removeItem(testKey)
            checks.localStorage = true
        } catch {
            checks.localStorage = false
        }

        // IndexedDB
        checks.indexedDB = 'indexedDB' in window

        return checks
    }

    /**
     * Get health status summary string
     */
    static async getHealthSummary(): Promise<string> {
        const result = await this.runFullHealthCheck()

        if (result.healthy) {
            return 'All systems operational'
        }

        const issueCount = result.errors.length + result.warnings.length
        return `${issueCount} issue(s) detected`
    }
}
