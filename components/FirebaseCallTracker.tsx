import { useState, useEffect } from 'react'
import { firebaseTracker } from '../utils/firebaseCallTracker'
import { debouncedFirebase } from '../services/debouncedFirebaseService'
import { useDebugSettings } from './DebugControls'

export default function FirebaseCallTracker() {
    const [stats, setStats] = useState<any>(null)
    const [pendingSaves, setPendingSaves] = useState<any[]>([])
    const [isExpanded, setIsExpanded] = useState(false)
    const debugSettings = useDebugSettings()

    useEffect(() => {
        const updateStats = () => {
            setStats(firebaseTracker.getStats())
            setPendingSaves(debouncedFirebase.getPendingSaves())
        }

        // Update every second
        const interval = setInterval(updateStats, 1000)
        updateStats() // Initial update

        return () => clearInterval(interval)
    }, [])

    // Only show in development and if enabled
    if (process.env.NODE_ENV !== 'development' || !debugSettings.showFirebaseTracker || !stats)
        return null

    const isExcessive = stats.callsInWindow > 10

    return (
        <div className="fixed bottom-20 right-4 z-[9998]">
            <div
                className={`bg-gray-900/95 border ${isExcessive ? 'border-red-500' : 'border-gray-700'} rounded-lg shadow-lg`}
            >
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center justify-between w-full px-4 py-2 text-left hover:bg-gray-800/50"
                >
                    <div className="flex items-center space-x-2">
                        <span className={`text-2xl ${isExcessive ? 'animate-pulse' : ''}`}>
                            {isExcessive ? '🔥' : '📊'}
                        </span>
                        <div>
                            <div className="text-sm font-medium text-white">Firebase Calls</div>
                            <div className="text-xs text-gray-400">
                                {stats.callsInWindow} in last minute
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        {pendingSaves.length > 0 && (
                            <span className="px-2 py-1 text-xs bg-yellow-600 text-white rounded">
                                {pendingSaves.length} pending
                            </span>
                        )}
                        <span className="text-gray-400">{isExpanded ? '▼' : '▶'}</span>
                    </div>
                </button>

                {isExpanded && (
                    <div className="border-t border-gray-700 px-4 py-3 space-y-3 max-h-96 overflow-y-auto">
                        {/* Summary Stats */}
                        <div className="space-y-1">
                            <div className="text-xs text-gray-400">Total Calls</div>
                            <div className="text-lg font-bold text-white">{stats.totalCalls}</div>
                        </div>

                        {/* Top Operations */}
                        {stats.topOperations.length > 0 && (
                            <div className="space-y-1">
                                <div className="text-xs text-gray-400">Top Operations</div>
                                <div className="space-y-1">
                                    {stats.topOperations.map(([op, count]: [string, number]) => (
                                        <div key={op} className="flex justify-between text-xs">
                                            <span className="text-gray-300 truncate max-w-[200px]">
                                                {op}
                                            </span>
                                            <span className="text-white font-medium">{count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Pending Saves */}
                        {pendingSaves.length > 0 && (
                            <div className="space-y-1">
                                <div className="text-xs text-gray-400">Pending Saves</div>
                                <div className="space-y-1">
                                    {pendingSaves.map((save, idx) => (
                                        <div
                                            key={idx}
                                            className="text-xs bg-yellow-900/30 rounded px-2 py-1"
                                        >
                                            <div className="flex justify-between">
                                                <span className="text-yellow-300">
                                                    {save.source}
                                                </span>
                                                <span className="text-gray-400">
                                                    {Math.round(save.age / 1000)}s ago
                                                </span>
                                            </div>
                                            <div className="text-gray-500">
                                                User: {save.userId.substring(0, 8)}...
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex space-x-2 pt-2 border-t border-gray-700">
                            <button
                                onClick={() => {
                                    firebaseTracker.printCallSummary()
                                    console.log(
                                        '📋 Pending saves:',
                                        debouncedFirebase.getPendingSaves()
                                    )
                                }}
                                className="flex-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded"
                            >
                                Log Summary
                            </button>
                            <button
                                onClick={() => {
                                    firebaseTracker.reset()
                                    setStats(firebaseTracker.getStats())
                                }}
                                className="flex-1 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded"
                            >
                                Reset
                            </button>
                        </div>

                        {/* Warning */}
                        {isExcessive && (
                            <div className="bg-red-900/30 border border-red-700 rounded p-2">
                                <div className="flex items-center space-x-2">
                                    <span className="text-red-400">⚠️</span>
                                    <div className="text-xs text-red-300">
                                        Excessive Firebase calls detected! Check console for
                                        details.
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
