'use client'

import React, { useState } from 'react'
import useUserData from '../../../hooks/useUserData'
import { useAuthStatus } from '../../../hooks/useAuthStatus'
import { useToast } from '../../../hooks/useToast'
import { useAuthStore } from '../../../stores/authStore'
import { useGuestStore } from '../../../stores/guestStore'
import { useSessionStore } from '../../../stores/sessionStore'
import { useWatchHistoryStore } from '../../../stores/watchHistoryStore'
import RecommendationsSection from '../../../components/settings/RecommendationsSection'
import InfoModal from '../../../components/modals/InfoModal'

const RecommendationsPage: React.FC = () => {
    const { isGuest } = useAuthStatus()
    const userData = useUserData()
    const { showSuccess, showError } = useToast()

    // Get direct store access for preferences updates
    const authStoreUpdatePrefs = useAuthStore((state) => state.updatePreferences)
    const guestStoreUpdatePrefs = useGuestStore((state) => state.updatePreferences)

    // Modal states
    const [showDeleteHistoryModal, setShowDeleteHistoryModal] = useState(false)

    // Watch history store for clearing history with persistence
    const clearWatchHistoryWithPersistence = useWatchHistoryStore(
        (state) => state.clearHistoryWithPersistence
    )

    // Get session ID for watch history deletion
    const activeSessionId = useSessionStore((state) => state.activeSessionId)

    // Define currentPreferences once using useMemo for stability
    const currentPreferences = React.useMemo(() => {
        return {
            improveRecommendations: userData.improveRecommendations ?? true,
            showRecommendations: userData.showRecommendations ?? true,
            trackWatchHistory: userData.trackWatchHistory ?? true,
        }
    }, [userData.improveRecommendations, userData.showRecommendations, userData.trackWatchHistory])

    // Initialize with store values directly
    const [improveRecommendations, setImproveRecommendations] = useState<boolean>(
        () => userData.improveRecommendations ?? true
    )
    const [showRecommendations, setShowRecommendations] = useState<boolean>(
        () => userData.showRecommendations ?? true
    )
    const [trackWatchHistory, setTrackWatchHistory] = useState<boolean>(
        () => userData.trackWatchHistory ?? true
    )

    // Track the last preferences we loaded from the store to detect external changes
    const lastLoadedPrefsRef = React.useRef(currentPreferences)

    // React to store changes (from hydration, Firestore sync, or other tabs)
    React.useEffect(() => {
        // Wait until session is initialized and we have real data
        if (userData.isInitializing) {
            return
        }

        // Compare current store preferences with the last ones we loaded
        const prefsChanged =
            currentPreferences.improveRecommendations !==
                lastLoadedPrefsRef.current.improveRecommendations ||
            currentPreferences.showRecommendations !==
                lastLoadedPrefsRef.current.showRecommendations ||
            currentPreferences.trackWatchHistory !== lastLoadedPrefsRef.current.trackWatchHistory

        // Only update UI state if store preferences actually changed
        if (prefsChanged) {
            setImproveRecommendations(currentPreferences.improveRecommendations)
            setShowRecommendations(currentPreferences.showRecommendations)
            setTrackWatchHistory(currentPreferences.trackWatchHistory)
            // Update our tracking ref
            lastLoadedPrefsRef.current = currentPreferences
        }
    }, [currentPreferences, userData.isInitializing])

    // Helper function to save a single preference with auto-save
    const savePreference = React.useCallback(
        async (key: string, value: boolean, message: string) => {
            try {
                const update = { [key]: value }

                if (isGuest) {
                    guestStoreUpdatePrefs(update)
                } else {
                    await authStoreUpdatePrefs(update)
                }

                showSuccess(message)
            } catch (error) {
                console.error(`[Settings] Error saving ${key}:`, error)
                showError(`Failed to save setting`)
            }
        },
        [isGuest, guestStoreUpdatePrefs, authStoreUpdatePrefs, showSuccess, showError]
    )

    const handleImproveRecommendationsChange = React.useCallback(
        (checked: boolean) => {
            setImproveRecommendations(checked)
            // If disabling recommendation tracking, also disable the recommendations row
            if (!checked) {
                setShowRecommendations(false)
            }
            savePreference(
                'improveRecommendations',
                checked,
                checked ? 'Interaction tracking enabled' : 'Interaction tracking disabled'
            )
        },
        [savePreference]
    )

    const handleShowRecommendationsChange = React.useCallback(
        (checked: boolean) => {
            setShowRecommendations(checked)
            savePreference(
                'showRecommendations',
                checked,
                checked
                    ? 'Personalized recommendations enabled'
                    : 'Personalized recommendations disabled'
            )
        },
        [savePreference]
    )

    const handleTrackWatchHistoryChange = React.useCallback(
        (checked: boolean) => {
            // If toggling OFF, show confirmation modal to delete history
            if (!checked) {
                setShowDeleteHistoryModal(true)
                return // Don't change state until confirmed
            }
            // If toggling ON, update and save immediately
            setTrackWatchHistory(checked)
            savePreference('trackWatchHistory', checked, 'Watch history tracking enabled')
        },
        [savePreference]
    )

    const handleConfirmDeleteHistory = React.useCallback(async () => {
        if (!activeSessionId) {
            showError('No active session found')
            setShowDeleteHistoryModal(false)
            return
        }

        try {
            // Clear all watch history with persistence (Firestore or localStorage)
            const sessionType = isGuest ? 'guest' : 'authenticated'
            await clearWatchHistoryWithPersistence(sessionType, activeSessionId)

            // Disable tracking
            setTrackWatchHistory(false)
            // Close modal
            setShowDeleteHistoryModal(false)
            // Save and show toast
            savePreference(
                'trackWatchHistory',
                false,
                'Watch history deleted and tracking disabled'
            )
        } catch (error) {
            console.error('Failed to delete watch history:', error)
            showError('Failed to delete watch history')
            setShowDeleteHistoryModal(false)
        }
    }, [activeSessionId, isGuest, clearWatchHistoryWithPersistence, savePreference, showError])

    return (
        <>
            <RecommendationsSection
                isGuest={isGuest}
                isInitializing={userData.isInitializing}
                improveRecommendations={improveRecommendations}
                showRecommendations={showRecommendations}
                trackWatchHistory={trackWatchHistory}
                onImproveRecommendationsChange={handleImproveRecommendationsChange}
                onShowRecommendationsChange={handleShowRecommendationsChange}
                onTrackWatchHistoryChange={handleTrackWatchHistoryChange}
            />

            {/* Delete Watch History Confirmation Modal */}
            <InfoModal
                isOpen={showDeleteHistoryModal}
                onClose={() => setShowDeleteHistoryModal(false)}
                onConfirm={handleConfirmDeleteHistory}
                title="Delete Watch History?"
                message="Disabling watch history tracking will permanently delete all your existing watch history. This action cannot be undone. Are you sure you want to continue?"
                confirmButtonText="Delete & Disable"
                cancelButtonText="Cancel"
                emoji="🗑️"
            />
        </>
    )
}

export default RecommendationsPage
