import { useState, useEffect } from 'react'
import { firebaseTracker } from '../../utils/firebaseCallTracker'
import { debouncedFirebase } from '../../services/debouncedFirebaseService'
import { useDebugSettings } from '../debug/DebugControls'
import { XMarkIcon } from '@heroicons/react/24/solid'

export default function FirebaseCallTracker() {
    const [stats, setStats] = useState<any>(null)
    const [pendingSaves, setPendingSaves] = useState<any[]>([])
    const [isOpen, setIsOpen] = useState(false)
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
        <>
            {/* Floating Toggle Button */}
            <button
                onClick={() => setIsOpen(true)}
                className={`fixed bottom-20 right-4 z-[9998] p-3 rounded-lg shadow-lg transition-all ${
                    isExcessive
                        ? 'bg-red-600/90 hover:bg-red-700/90 border border-red-500'
                        : 'bg-gray-800/90 hover:bg-gray-700/90 border border-gray-700'
                }`}
            >
                <div className="flex items-center space-x-2">
                    <span className={`text-xl ${isExcessive ? 'animate-pulse' : ''}`}>
                        {isExcessive ? '🔥' : '📊'}
                    </span>
                    <div className="text-left">
                        <div className="text-xs font-medium text-white">Firebase</div>
                        <div className="text-xs text-gray-300">
                            {stats.callsInWindow}
                            {pendingSaves.length > 0 && ` (${pendingSaves.length})`}
                        </div>
                    </div>
                </div>
            </button>

            {/* Modal */}
            {isOpen && (
                <div className="fixed inset-0 z-[55000] flex items-center justify-center">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Modal Content */}
                    <div className="relative bg-[#141414] rounded-lg shadow-2xl max-w-md w-full mx-4 max-h-[80vh] overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-700">
                            <div className="flex items-center space-x-3">
                                <span className="text-2xl">{isExcessive ? '🔥' : '📊'}</span>
                                <h2 className="text-xl font-semibold text-white">
                                    Firebase Usage Statistics
                                </h2>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 hover:bg-gray-700 rounded-full transition-colors"
                            >
                                <XMarkIcon className="w-5 h-5 text-white" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                            {/* Warning Banner */}
                            {isExcessive && (
                                <div className="bg-red-900/30 border border-red-700 rounded-lg p-3">
                                    <div className="flex items-center space-x-2">
                                        <span className="text-red-400 text-lg">⚠️</span>
                                        <div className="text-sm text-red-300">
                                            Excessive Firebase calls detected! Check console for
                                            details.
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Summary Stats */}
                            <div className="bg-gray-800/50 rounded-lg p-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-xs text-gray-400 mb-1">
                                            Total Calls
                                        </div>
                                        <div className="text-2xl font-bold text-white">
                                            {stats.totalCalls}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-400 mb-1">
                                            Last Minute
                                        </div>
                                        <div
                                            className={`text-2xl font-bold ${isExcessive ? 'text-red-400' : 'text-white'}`}
                                        >
                                            {stats.callsInWindow}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Top Operations */}
                            {stats.topOperations.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-300 mb-2">
                                        Top Operations
                                    </h3>
                                    <div className="space-y-2">
                                        {stats.topOperations.map(
                                            ([op, count]: [string, number]) => (
                                                <div
                                                    key={op}
                                                    className="flex items-center justify-between bg-gray-800/50 rounded-lg p-3"
                                                >
                                                    <span className="text-sm text-gray-300 truncate flex-1 mr-3">
                                                        {op}
                                                    </span>
                                                    <span className="text-sm font-semibold text-white">
                                                        {count}
                                                    </span>
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Pending Saves */}
                            {pendingSaves.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-300 mb-2">
                                        Pending Saves ({pendingSaves.length})
                                    </h3>
                                    <div className="space-y-2">
                                        {pendingSaves.map((save, idx) => (
                                            <div
                                                key={idx}
                                                className="bg-yellow-900/30 border border-yellow-700/30 rounded-lg p-3"
                                            >
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-sm font-medium text-yellow-300">
                                                        {save.source}
                                                    </span>
                                                    <span className="text-xs text-gray-400">
                                                        {Math.round(save.age / 1000)}s ago
                                                    </span>
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    User: {save.userId.substring(0, 8)}...
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer Actions */}
                        <div className="border-t border-gray-700 p-4">
                            <div className="flex space-x-3">
                                <button
                                    onClick={() => {
                                        firebaseTracker.printCallSummary()
                                        console.log(
                                            '📋 Pending saves:',
                                            debouncedFirebase.getPendingSaves()
                                        )
                                    }}
                                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                                >
                                    Log Summary
                                </button>
                                <button
                                    onClick={() => {
                                        firebaseTracker.reset()
                                        setStats(firebaseTracker.getStats())
                                    }}
                                    className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
                                >
                                    Reset Stats
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
