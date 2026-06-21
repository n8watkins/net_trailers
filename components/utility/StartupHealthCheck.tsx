'use client'

/**
 * Startup Health Check Component (Development Mode Only)
 *
 * Runs comprehensive health checks on app startup.
 * Displays results in a small widget in the bottom-left corner.
 *
 * Only visible in development mode for debugging.
 */

import { useEffect, useState } from 'react'
import { AppHealthMonitor, HealthCheckResult } from '@/utils/healthCheck'
import { useDebugSettings } from '@/components/debug/DebugControls'

export default function StartupHealthCheck() {
    const [healthResult, setHealthResult] = useState<HealthCheckResult | null>(null)
    const [isExpanded, setIsExpanded] = useState(false)
    const debugSettings = useDebugSettings()

    useEffect(() => {
        if (process.env.NODE_ENV !== 'development' || !debugSettings.showStartupHealth) return

        AppHealthMonitor.runFullHealthCheck().then((result) => {
            setHealthResult(result)
            console.log('🏥 Startup Health Check:', result)
            if (!result.healthy) setIsExpanded(true)
        })
    }, [debugSettings.showStartupHealth])

    if (process.env.NODE_ENV !== 'development' || !debugSettings.showStartupHealth) {
        return null
    }

    if (!healthResult) {
        return (
            <div className="fixed bottom-4 left-4 bg-gray-900 border border-gray-700 rounded-lg p-3 text-xs w-64">
                <div className="text-gray-400">Running health checks...</div>
            </div>
        )
    }

    const { healthy, checks, warnings, errors } = healthResult

    return (
        <div className="fixed bottom-4 left-4 bg-gray-900 border border-gray-700 rounded-lg text-xs w-64 shadow-lg">
            {/* Header - Always visible */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full p-3 text-left hover:bg-gray-800 transition-colors"
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-lg">{healthy ? '✅' : '⚠️'}</span>
                        <span className="font-bold text-white">Startup Health</span>
                    </div>
                    <span className="text-gray-400">{isExpanded ? '▼' : '▶'}</span>
                </div>
                {!isExpanded && (
                    <div className={healthy ? 'text-green-400' : 'text-yellow-400'}>
                        {healthy
                            ? 'All systems operational'
                            : `${errors.length} error(s), ${warnings.length} warning(s)`}
                    </div>
                )}
            </button>

            {/* Expanded Details */}
            {isExpanded && (
                <div className="border-t border-gray-700 p-3 space-y-3">
                    {/* Checks */}
                    <div>
                        <div className="font-semibold text-white mb-2">System Checks:</div>
                        <div className="space-y-1">
                            <CheckItem label="localStorage" passed={checks.localStorage} />
                            <CheckItem label="IndexedDB" passed={checks.indexedDB} />
                            <CheckItem label="Storage Quota" passed={checks.storageQuota} />
                        </div>
                    </div>

                    {/* Errors */}
                    {errors.length > 0 && (
                        <div>
                            <div className="font-semibold text-red-400 mb-1">Errors:</div>
                            <div className="space-y-1">
                                {errors.map((error, index) => (
                                    <div key={index} className="text-red-300 pl-2">
                                        ❌ {error}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Warnings */}
                    {warnings.length > 0 && (
                        <div>
                            <div className="font-semibold text-yellow-400 mb-1">Warnings:</div>
                            <div className="space-y-1">
                                {warnings.map((warning, index) => (
                                    <div key={index} className="text-yellow-300 pl-2">
                                        ⚠️ {warning}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Timestamp */}
                    <div className="text-gray-500 text-xs pt-2 border-t border-gray-700">
                        Checked: {new Date(healthResult.timestamp).toLocaleTimeString()}
                    </div>
                </div>
            )}
        </div>
    )
}

function CheckItem({ label, passed }: { label: string; passed: boolean }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-gray-300">{label}</span>
            <span className={passed ? 'text-green-400' : 'text-red-400'}>{passed ? '✓' : '✗'}</span>
        </div>
    )
}
