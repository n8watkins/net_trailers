'use client'

/**
 * Cache Health Panel (Development Mode Only)
 *
 * Visual dashboard showing Firestore cache health status.
 * Provides manual cache clearing and health status reset.
 *
 * Only rendered in development mode for debugging purposes.
 */

import { useState, useEffect } from 'react'
import { FirestoreCacheHealth } from '@/utils/firestore/cacheHealth'
import { useDebugSettings } from './DebugControls'

export default function CacheHealthPanel() {
    const [healthInfo, setHealthInfo] = useState<any>(null)
    const [isClearing, setIsClearing] = useState(false)
    const [lastUpdate, setLastUpdate] = useState(Date.now())
    const debugSettings = useDebugSettings()

    useEffect(() => {
        if (debugSettings.showCacheHealth) {
            loadHealthInfo()
        }
    }, [lastUpdate, debugSettings.showCacheHealth])

    if (process.env.NODE_ENV !== 'development' || !debugSettings.showCacheHealth) {
        return null
    }

    const loadHealthInfo = async () => {
        const info = await FirestoreCacheHealth.getDetailedHealthInfo()
        setHealthInfo(info)
    }

    const handleClearCache = async () => {
        if (
            !confirm('This will delete all Firestore offline data. The page will reload. Continue?')
        ) {
            return
        }

        setIsClearing(true)
        try {
            const success = await FirestoreCacheHealth.clearFirestoreCache()
            if (success) {
                alert('Cache cleared successfully. Page will reload.')
                window.location.reload()
            } else {
                alert('Failed to clear cache. Check console for details.')
            }
        } catch (error) {
            console.error('Clear cache error:', error)
            alert('Error clearing cache: ' + (error instanceof Error ? error.message : 'Unknown'))
        } finally {
            setIsClearing(false)
        }
    }

    const handleResetHealth = () => {
        if (!confirm('Reset health status to defaults?')) {
            return
        }

        FirestoreCacheHealth.resetHealthStatus()
        setLastUpdate(Date.now())
    }

    if (!healthInfo) {
        return (
            <div className="fixed bottom-20 right-4 bg-gray-900 border border-gray-700 rounded-lg p-3 text-xs w-80">
                <div className="text-gray-400">Loading cache health...</div>
            </div>
        )
    }

    const { status, isSafe, indexedDBAvailable, databaseCount, databases, recommendation } =
        healthInfo

    return (
        <div className="fixed bottom-20 right-4 bg-gray-900 border border-gray-700 rounded-lg p-3 text-xs w-80 shadow-lg">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-white">🔍 Firestore Cache Health</h3>
                <button
                    onClick={() => setLastUpdate(Date.now())}
                    className="text-gray-400 hover:text-white"
                    title="Refresh"
                >
                    ↻
                </button>
            </div>

            {/* Status */}
            <div className="space-y-2 mb-3">
                <div className="flex items-center justify-between">
                    <span className="text-gray-400">Status:</span>
                    <span className={isSafe ? 'text-green-400' : 'text-red-400'}>
                        {isSafe ? '✅ SAFE' : '❌ UNSAFE'}
                    </span>
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-gray-400">IndexedDB:</span>
                    <span className={indexedDBAvailable ? 'text-green-400' : 'text-red-400'}>
                        {indexedDBAvailable ? 'Available' : 'Not Available'}
                    </span>
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-gray-400">Error Count:</span>
                    <span className={status.errorCount > 0 ? 'text-yellow-400' : 'text-gray-300'}>
                        {status.errorCount} / 3
                    </span>
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-gray-400">Databases:</span>
                    <span className="text-gray-300">{databaseCount}</span>
                </div>
            </div>

            {/* Last Error */}
            {status.lastError && (
                <div className="mb-3 p-2 bg-red-900/20 border border-red-700/30 rounded">
                    <div className="text-red-400 font-semibold mb-1">Last Error:</div>
                    <div className="text-red-300 text-xs break-words">{status.lastError}</div>
                    <div className="text-gray-400 text-xs mt-1">
                        {new Date(status.timestamp).toLocaleString()}
                    </div>
                </div>
            )}

            {/* Databases List */}
            {databases.length > 0 && (
                <details className="mb-3">
                    <summary className="text-gray-400 cursor-pointer hover:text-white">
                        Databases ({databases.length})
                    </summary>
                    <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                        {databases.map((db: string, index: number) => (
                            <div key={index} className="text-gray-300 text-xs break-all pl-2">
                                • {db}
                            </div>
                        ))}
                    </div>
                </details>
            )}

            {/* Recommendation */}
            <div className="mb-3 p-2 bg-blue-900/20 border border-blue-700/30 rounded">
                <div className="text-blue-400 font-semibold mb-1">Recommendation:</div>
                <div className="text-blue-300 text-xs">{recommendation}</div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
                <button
                    onClick={handleClearCache}
                    disabled={isClearing}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isClearing ? 'Clearing...' : 'Clear Cache'}
                </button>
                <button
                    onClick={handleResetHealth}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-3 rounded transition-colors"
                >
                    Reset Health
                </button>
            </div>

            {/* Info */}
            <div className="mt-3 text-gray-500 text-xs">
                Dev mode only • Updates on manual refresh
            </div>
        </div>
    )
}
