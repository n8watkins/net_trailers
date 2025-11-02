import React, { useState, useEffect } from 'react'
import {
    TrashIcon,
    DocumentArrowDownIcon,
    ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import useUserData from '../../hooks/useUserData'
import { createErrorHandler } from '../../utils/errorHandler'
import { useToast } from '../../hooks/useToast'

interface DataSummary {
    watchlistCount: number
    likedCount: number
    hiddenCount: number
    listsCount: number
    totalItems: number
    isEmpty: boolean
    accountCreated?: Date
}

export default function AccountManagement() {
    const userData = useUserData()
    const { showSuccess, showError } = useToast()
    const errorHandler = createErrorHandler(showError)

    const [dataSummary, setDataSummary] = useState<DataSummary | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [showClearConfirm, setShowClearConfirm] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [confirmText, setConfirmText] = useState('')

    // Load data summary on mount
    useEffect(() => {
        const loadDataSummary = async () => {
            try {
                setIsLoading(true)
                let summary: DataSummary

                if (userData.sessionType === 'initializing') {
                    // During initialization, create empty summary
                    summary = {
                        watchlistCount: 0,
                        likedCount: 0,
                        hiddenCount: 0,
                        listsCount: 0,
                        totalItems: 0,
                        isEmpty: true,
                    }
                } else if (userData.sessionType === 'authenticated') {
                    // Authenticated returns Promise<DataSummary>
                    summary = await userData.getAccountDataSummary()
                } else if (userData.sessionType === 'guest') {
                    // Guest returns DataSummary synchronously
                    summary = userData.getAccountDataSummary()
                } else {
                    // Fallback empty summary
                    summary = {
                        watchlistCount: 0,
                        likedCount: 0,
                        hiddenCount: 0,
                        listsCount: 0,
                        totalItems: 0,
                        isEmpty: true,
                    }
                }
                setDataSummary(summary)
            } catch (error) {
                console.error('Failed to load data summary:', error)
                errorHandler.handleApiError(error as Error, 'load account data')
                // Set empty summary on error
                setDataSummary({
                    watchlistCount: 0,
                    likedCount: 0,
                    hiddenCount: 0,
                    listsCount: 0,
                    totalItems: 0,
                    isEmpty: true,
                })
            } finally {
                setIsLoading(false)
            }
        }

        loadDataSummary()
    }, [userData.sessionType, userData.activeSessionId, errorHandler, userData])

    // Handle clear account data
    const handleClearData = async () => {
        if (!showClearConfirm) {
            setShowClearConfirm(true)
            return
        }

        try {
            setIsLoading(true)

            if (userData.sessionType === 'authenticated') {
                await userData.clearAccountData()
            } else if (userData.sessionType === 'guest') {
                userData.clearAccountData()
            }

            showSuccess('Account data cleared successfully')
            setShowClearConfirm(false)

            // Reload summary
            if (userData.sessionType === 'authenticated') {
                setDataSummary(await userData.getAccountDataSummary())
            } else if (userData.sessionType === 'guest') {
                setDataSummary(userData.getAccountDataSummary())
            } else {
                // Fallback empty summary for initializing state
                setDataSummary({
                    watchlistCount: 0,
                    likedCount: 0,
                    hiddenCount: 0,
                    listsCount: 0,
                    totalItems: 0,
                    isEmpty: true,
                })
            }
        } catch (error) {
            console.error('Failed to clear account data:', error)
            errorHandler.handleApiError(error as Error, 'clear account data')
        } finally {
            setIsLoading(false)
        }
    }

    // Handle export data
    const handleExportData = async () => {
        try {
            setIsLoading(true)

            let exportData
            let sessionLabel = 'unknown'

            if (userData.sessionType === 'authenticated') {
                exportData = await userData.exportAccountData()
                sessionLabel = 'user'
            } else if (userData.sessionType === 'guest') {
                exportData = userData.exportAccountData()
                sessionLabel = 'guest'
            } else {
                // Can't export during initialization
                return
            }

            // Create and download file
            const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                type: 'application/json',
            })
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `nettrailer-data-${sessionLabel}-${new Date().toISOString().split('T')[0]}.json`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)

            showSuccess('Account data exported successfully')
        } catch (error) {
            console.error('Failed to export account data:', error)
            errorHandler.handleApiError(error as Error, 'export account data')
        } finally {
            setIsLoading(false)
        }
    }

    // Handle delete account (authenticated users only)
    const handleDeleteAccount = async () => {
        if (userData.sessionType !== 'authenticated') return

        if (!showDeleteConfirm) {
            setShowDeleteConfirm(true)
            return
        }

        if (confirmText !== 'DELETE MY ACCOUNT') {
            errorHandler.addError('validation', 'Please type "DELETE MY ACCOUNT" to confirm')
            return
        }

        try {
            setIsLoading(true)
            await userData.deleteAccount()
            showSuccess('Account deleted successfully')
            // Note: User should be redirected or signed out after this
        } catch (error) {
            console.error('Failed to delete account:', error)
            errorHandler.handleApiError(error as Error, 'delete account')
        } finally {
            setIsLoading(false)
        }
    }

    if (isLoading) {
        return (
            <div className="p-6 bg-[#141414] rounded-lg">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
                    <p className="text-gray-400">
                        {userData.sessionType === 'initializing'
                            ? 'Initializing session...'
                            : 'Loading account data...'}
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="p-6 bg-[#141414] rounded-lg">
            <h2 className="text-2xl font-semibold text-white mb-6">Account Management</h2>

            {/* Account Type Banner */}
            <div className="mb-6 p-4 rounded-lg border border-gray-700 bg-[#1a1a1a]">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-medium text-white">
                            {userData.sessionType === 'initializing'
                                ? '🔄 Initializing...'
                                : userData.isAuthenticated
                                  ? '🔐 Authenticated Account'
                                  : '🎭 Guest Session'}
                        </h3>
                        <p className="text-gray-400 text-sm">
                            {userData.sessionType === 'initializing'
                                ? 'Setting up your session'
                                : userData.isAuthenticated
                                  ? 'Your data is synced to the cloud'
                                  : 'Your data is stored locally on this device'}
                        </p>
                    </div>
                    <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                        ID:{' '}
                        {userData.activeSessionId
                            ? `${userData.activeSessionId.substring(0, 8)}...`
                            : 'N/A'}
                    </span>
                </div>
            </div>

            {/* Data Summary */}
            {dataSummary && (
                <div className="mb-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    <div className="p-3 bg-[#1a1a1a] rounded-lg border border-gray-700">
                        <div className="text-2xl font-bold text-red-600">
                            {dataSummary.watchlistCount}
                        </div>
                        <div className="text-sm text-gray-400">Watchlist Items</div>
                    </div>
                    <div className="p-3 bg-[#1a1a1a] rounded-lg border border-gray-700">
                        <div className="text-2xl font-bold text-green-600">
                            {dataSummary.likedCount}
                        </div>
                        <div className="text-sm text-gray-400">Liked</div>
                    </div>
                    <div className="p-3 bg-[#1a1a1a] rounded-lg border border-gray-700">
                        <div className="text-2xl font-bold text-red-600">
                            {dataSummary.hiddenCount}
                        </div>
                        <div className="text-sm text-gray-400">Hidden</div>
                    </div>
                    <div className="p-3 bg-[#1a1a1a] rounded-lg border border-gray-700">
                        <div className="text-2xl font-bold text-blue-600">
                            {dataSummary.listsCount}
                        </div>
                        <div className="text-sm text-gray-400">Custom Lists</div>
                    </div>
                    <div className="p-3 bg-[#1a1a1a] rounded-lg border border-gray-700">
                        <div className="text-2xl font-bold text-yellow-600">
                            {dataSummary.totalItems}
                        </div>
                        <div className="text-sm text-gray-400">Total Items</div>
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="space-y-4">
                {/* Export Data */}
                <button
                    onClick={handleExportData}
                    disabled={isLoading || userData.sessionType === 'initializing'}
                    className="w-full flex items-center justify-center gap-2 p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                >
                    <DocumentArrowDownIcon className="w-5 h-5" />
                    {userData.sessionType === 'initializing' ? 'Initializing...' : 'Export My Data'}
                </button>

                {/* Clear Account Data */}
                {dataSummary && !dataSummary.isEmpty && (
                    <>
                        <button
                            onClick={handleClearData}
                            disabled={isLoading || userData.sessionType === 'initializing'}
                            className="w-full flex items-center justify-center gap-2 p-3 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                        >
                            <TrashIcon className="w-5 h-5" />
                            Clear All My Data
                        </button>

                        {/* Clear Confirmation */}
                        {showClearConfirm && (
                            <div className="p-6 bg-[#141414] border border-yellow-600/50 rounded-xl shadow-lg">
                                <div className="flex items-center gap-3 mb-4">
                                    <ExclamationTriangleIcon className="w-6 h-6 text-yellow-500" />
                                    <h4 className="text-xl font-semibold text-yellow-500">
                                        Confirm Clear Data
                                    </h4>
                                </div>
                                <p className="text-gray-300 mb-4">This will permanently remove:</p>
                                <ul className="list-disc list-inside text-sm text-gray-400 mb-6 space-y-1">
                                    <li>{dataSummary.watchlistCount} watchlist items</li>
                                    <li>{dataSummary.likedCount} liked items</li>
                                    <li>{dataSummary.hiddenCount} hidden items</li>
                                    <li>{dataSummary.listsCount} custom lists</li>
                                </ul>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowClearConfirm(false)}
                                        className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors duration-200"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleClearData}
                                        className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-md transition-colors duration-200"
                                    >
                                        Yes, Clear Data
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Delete Account (Authenticated Users Only) */}
                {userData.sessionType === 'authenticated' && (
                    <>
                        <button
                            onClick={handleDeleteAccount}
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-2 p-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                        >
                            <TrashIcon className="w-5 h-5" />
                            Delete Account Permanently
                        </button>

                        {/* Delete Confirmation */}
                        {showDeleteConfirm && (
                            <div className="p-6 bg-[#141414] border border-red-600/50 rounded-xl shadow-lg">
                                <div className="flex items-center gap-3 mb-4">
                                    <ExclamationTriangleIcon className="w-6 h-6 text-red-500" />
                                    <h4 className="text-xl font-semibold text-red-500">
                                        ⚠️ DANGER ZONE
                                    </h4>
                                </div>
                                <p className="text-gray-300 mb-4">
                                    This will permanently delete your account and ALL associated
                                    data. This action <strong>cannot be undone</strong>.
                                </p>
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-gray-400 mb-2">
                                        Type &quot;DELETE MY ACCOUNT&quot; to confirm:
                                    </label>
                                    <input
                                        type="text"
                                        value={confirmText}
                                        onChange={(e) => setConfirmText(e.target.value)}
                                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                        placeholder="DELETE MY ACCOUNT"
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => {
                                            setShowDeleteConfirm(false)
                                            setConfirmText('')
                                        }}
                                        className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors duration-200"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleDeleteAccount}
                                        disabled={confirmText !== 'DELETE MY ACCOUNT'}
                                        className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-md transition-colors duration-200"
                                    >
                                        Delete Account
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Empty State */}
            {dataSummary?.isEmpty && (
                <div className="mt-6 p-4 bg-[#1a1a1a] border border-gray-700 rounded-lg text-center">
                    <p className="text-gray-400">Your account currently has no data to manage.</p>
                </div>
            )}
        </div>
    )
}
