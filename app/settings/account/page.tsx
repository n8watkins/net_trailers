'use client'

import React, { useState, useRef, useEffect } from 'react'
import useUserData from '../../../hooks/useUserData'
import { useAuthStatus } from '../../../hooks/useAuthStatus'
import { useToast } from '../../../hooks/useToast'
import AccountSection from '../../../components/settings/AccountSection'
import ConfirmationModal from '../../../components/modals/ConfirmationModal'
import { exportUserDataToCSV } from '../../../utils/csvExport'
import { useWatchHistory } from '../../../hooks/useWatchHistory'

const AccountPage: React.FC = () => {
    const { isGuest } = useAuthStatus()
    const userData = useUserData()
    const { totalWatched } = useWatchHistory()
    const { showSuccess, showError } = useToast()

    const [showClearConfirm, setShowClearConfirm] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [isClearingData, setIsClearingData] = useState(false)
    const [isDeletingAccount, setIsDeletingAccount] = useState(false)

    // Ref to store delete account redirect timeout
    const deleteAccountTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    // Handle initializing state - provide default empty data summary
    const [dataSummary, setDataSummary] = React.useState<{
        watchlistCount: number
        likedCount: number
        hiddenCount: number
        listsCount: number
        watchHistoryCount: number
        totalItems: number
        isEmpty: boolean
        accountCreated?: Date
    }>({
        watchlistCount: 0,
        likedCount: 0,
        hiddenCount: 0,
        listsCount: 0,
        watchHistoryCount: 0,
        totalItems: 0,
        isEmpty: true,
    })

    // Load data summary (handles both sync and async cases)
    React.useEffect(() => {
        const loadSummary = async () => {
            if (userData.isInitializing) {
                setDataSummary({
                    watchlistCount: 0,
                    likedCount: 0,
                    hiddenCount: 0,
                    listsCount: 0,
                    watchHistoryCount: 0,
                    totalItems: 0,
                    isEmpty: true,
                })
            } else {
                // getAccountDataSummary is now async for both auth and guest
                const summary = await userData.getAccountDataSummary()
                // Override watchHistoryCount with the value from useWatchHistory hook
                // and recalculate totalItems and isEmpty
                const watchHistoryCount = totalWatched
                const totalItems =
                    summary.watchlistCount +
                    summary.likedCount +
                    summary.hiddenCount +
                    watchHistoryCount +
                    summary.listsCount
                const isEmpty =
                    summary.watchlistCount === 0 &&
                    summary.likedCount === 0 &&
                    summary.hiddenCount === 0 &&
                    watchHistoryCount === 0 &&
                    summary.listsCount === 0

                setDataSummary({
                    ...summary,
                    watchHistoryCount,
                    totalItems,
                    isEmpty,
                })
            }
        }
        loadSummary()
    }, [
        userData.isInitializing,
        userData.defaultWatchlist.length,
        userData.likedMovies.length,
        userData.hiddenMovies.length,
        userData.userCreatedWatchlists.length,
        totalWatched, // Add watch history as dependency
    ])

    const handleExportData = () => {
        try {
            if (
                !userData.isInitializing &&
                userData.userSession?.preferences &&
                'autoMute' in userData.userSession.preferences
            ) {
                exportUserDataToCSV(userData.userSession.preferences)
                showSuccess('Data exported successfully!')
            } else {
                showError('No data available to export')
            }
        } catch (error) {
            console.error('Error exporting data:', error)
            showError('Failed to export data')
        }
    }

    const handleClearData = async () => {
        // Prevent double-submission
        if (isClearingData) return

        console.log('[Settings] 🗑️ handleClearData called')
        console.log('[Settings] Session type:', userData.sessionType)
        console.log('[Settings] clearAccountData function:', typeof userData.clearAccountData)

        setIsClearingData(true)
        try {
            // clearAccountData is async for authenticated users, sync for guests
            console.log('[Settings] Calling userData.clearAccountData()...')
            await userData.clearAccountData()
            console.log('[Settings] ✅ clearAccountData completed')
            setShowClearConfirm(false)
            showSuccess('All data cleared successfully!')
        } catch (error) {
            console.error('[Settings] ❌ Error clearing data:', error)
            showError('Failed to clear data. Please try again.')
        } finally {
            setIsClearingData(false)
        }
    }

    const handleDeleteAccount = async () => {
        // Prevent double-submission
        if (isDeletingAccount) return

        // Guard: Only allow authenticated users
        if (isGuest || userData.sessionType !== 'authenticated' || !('deleteAccount' in userData)) {
            showError('Only authenticated users can delete their account')
            return
        }

        setIsDeletingAccount(true)
        try {
            await userData.deleteAccount()
            setShowDeleteConfirm(false)
            showSuccess('Account deleted successfully. Redirecting...')

            // Redirect to home page after a brief delay
            deleteAccountTimeoutRef.current = setTimeout(() => {
                window.location.href = '/'
            }, 2000)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            console.error('Error deleting account:', error)
            const message = error?.message || 'Failed to delete account. Please try again.'
            showError(message)
        } finally {
            setIsDeletingAccount(false)
        }
    }

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (deleteAccountTimeoutRef.current) {
                clearTimeout(deleteAccountTimeoutRef.current)
            }
        }
    }, [])

    return (
        <>
            <AccountSection
                isGuest={isGuest}
                dataSummary={dataSummary}
                onExportData={handleExportData}
                onShowClearConfirm={() => setShowClearConfirm(true)}
                onShowDeleteConfirm={() => setShowDeleteConfirm(true)}
            />

            {/* Confirmation Modals */}
            <ConfirmationModal
                isOpen={showClearConfirm}
                onClose={() => setShowClearConfirm(false)}
                onConfirm={handleClearData}
                title="Clear All Data?"
                message="This will permanently delete all your collections, watch history, ratings, and preferences. This action cannot be undone."
                confirmText={`You currently have ${dataSummary.totalItems} items that will be deleted.`}
                confirmButtonText="Clear All Data"
                cancelButtonText="Cancel"
                requireTyping={true}
                confirmationPhrase="clear"
                dangerLevel="warning"
                isLoading={isClearingData}
            />

            <ConfirmationModal
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleDeleteAccount}
                title="Delete Account?"
                message="This will permanently delete your account, all your data, and cannot be undone. You will lose access to all your collections, watch history, ratings, and preferences."
                confirmText="This action is irreversible. Your account will be deleted immediately."
                confirmButtonText="Delete My Account"
                cancelButtonText="Cancel"
                requireTyping={true}
                confirmationPhrase="delete"
                dangerLevel="danger"
                isLoading={isDeletingAccount}
            />
        </>
    )
}

export default AccountPage
