'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import useUserData from '../../../hooks/useUserData'
import { useToast } from '../../../hooks/useToast'
import { useAppStore } from '../../../stores/appStore'
import ShareSection from '../../../components/settings/ShareSection'
import PendingValues from '../../../components/settings/PendingValues'
import { useSettingsVisitor } from '../_components/settingsVisitor'
import { useSettingsDataReady } from '../_components/useSettingsDataReady'
import InfoModal from '../../../components/modals/InfoModal'
import { exportUserDataToCSV } from '../../../utils/csvExport'
import { useWatchHistory } from '../../../hooks/useWatchHistory'

const SharePage: React.FC = () => {
    const router = useRouter()
    const isGuest = !useSettingsVisitor().signedIn
    const dataReady = useSettingsDataReady()
    const [summaryReady, setSummaryReady] = useState(false)
    const userData = useUserData()
    const { totalWatched } = useWatchHistory()
    const { showSuccess, showError } = useToast()
    const { openAuthModal } = useAppStore()

    const [showExportLimitedModal, setShowExportLimitedModal] = useState(false)

    // Redirect guests to preferences
    React.useEffect(() => {
        if (isGuest) {
            router.replace('/settings/preferences')
        }
    }, [isGuest, router])

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
            if (!dataReady) {
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
                setSummaryReady(true)
            }
        }
        loadSummary()
        // userData itself changes every render; the counts below are what matter
    }, [
        dataReady,
        userData.defaultWatchlist.length,
        userData.likedMovies.length,
        userData.hiddenMovies.length,
        userData.userCreatedWatchlists.length,
        totalWatched, // Add watch history as dependency
    ])

    const handleExportData = () => {
        // Show limitation modal for guest users
        if (isGuest) {
            setShowExportLimitedModal(true)
            return
        }

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

    const handleCreateAccount = () => {
        // Close any info modals before opening auth modal
        setShowExportLimitedModal(false)
        openAuthModal('signup')
    }

    if (isGuest) {
        return null // Will redirect
    }

    return (
        <>
            <PendingValues pending={!summaryReady}>
                <ShareSection
                    isGuest={isGuest}
                    dataSummary={dataSummary}
                    onExportData={handleExportData}
                />
            </PendingValues>

            {/* Export Limited Modal for Guest Users */}
            <InfoModal
                isOpen={showExportLimitedModal}
                onClose={() => setShowExportLimitedModal(false)}
                onConfirm={handleCreateAccount}
                title="Create an Account to Continue"
                message="CSV export is only available to users with accounts. Create an account to unlock data export and sync your content across all devices."
                confirmButtonText="Create Account"
                cancelButtonText="Maybe Later"
                emoji="🔐"
            />
        </>
    )
}

export default SharePage
