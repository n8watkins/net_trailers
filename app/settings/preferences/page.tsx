'use client'

import React, { useState } from 'react'
import useUserData from '../../../hooks/useUserData'
import { useAuthStatus } from '../../../hooks/useAuthStatus'
import { useToast } from '../../../hooks/useToast'
import { useAppStore } from '../../../stores/appStore'
import { useAuthStore } from '../../../stores/authStore'
import { useGuestStore } from '../../../stores/guestStore'
import { toggleChildSafetyAction } from '../../../lib/actions/childSafety'
import PreferencesSection from '../../../components/settings/PreferencesSection'
import ChildSafetyPINModal from '../../../components/settings/ChildSafetyPINModal'
import InfoModal from '../../../components/modals/InfoModal'
import { useChildSafetyPINStore } from '../../../stores/childSafetyStore'

const PreferencesPage: React.FC = () => {
    const { isGuest } = useAuthStatus()
    const userData = useUserData()
    const { showSuccess, showError } = useToast()
    const { openAuthModal } = useAppStore()

    // Get direct store access for preferences updates
    const authStoreUpdatePrefs = useAuthStore((state) => state.updatePreferences)
    const guestStoreUpdatePrefs = useGuestStore((state) => state.updatePreferences)

    // Modal states
    const [showChildSafetyModal, setShowChildSafetyModal] = useState(false)

    // PIN Protection states
    const [pinModalMode, setPinModalMode] = useState<'create' | 'verify' | 'change'>('verify')
    const [showPINModal, setShowPINModal] = useState(false)
    const [pendingChildSafetyToggle, setPendingChildSafetyToggle] = useState<boolean | null>(null)

    // PIN store
    const {
        settings: pinSettings,
        loadPINSettings,
        openSetupModal,
        closeSetupModal,
        isSetupModalOpen,
    } = useChildSafetyPINStore()

    // 1) Define currentPreferences once using useMemo for stability
    const currentPreferences = React.useMemo(() => {
        return {
            childSafetyMode: userData.childSafetyMode ?? false,
            autoMute: userData.autoMute ?? true,
            defaultVolume: userData.defaultVolume ?? 50,
            improveRecommendations: userData.improveRecommendations ?? true,
            showRecommendations: userData.showRecommendations ?? false,
        }
    }, [
        userData.childSafetyMode,
        userData.autoMute,
        userData.defaultVolume,
        userData.improveRecommendations,
        userData.showRecommendations,
    ])

    // 3) Initialize with store values directly (they default to false/true/50 during SSR anyway)
    const [childSafetyMode, setChildSafetyMode] = useState<boolean>(
        () => userData.childSafetyMode ?? false
    )
    const [autoMute, setAutoMute] = useState<boolean>(() => userData.autoMute ?? true)
    const [defaultVolume, setDefaultVolume] = useState<number>(() => userData.defaultVolume ?? 50)
    const [improveRecommendations, setImproveRecommendations] = useState<boolean>(
        () => userData.improveRecommendations ?? true
    )
    const [showRecommendations, setShowRecommendations] = useState<boolean>(
        () => userData.showRecommendations ?? false
    )

    // Track original preferences to detect changes
    const [originalPreferences, setOriginalPreferences] = useState({
        childSafetyMode: userData.childSafetyMode ?? false,
        autoMute: userData.autoMute ?? true,
        defaultVolume: userData.defaultVolume ?? 50,
        improveRecommendations: userData.improveRecommendations ?? true,
        showRecommendations: userData.showRecommendations ?? false,
    })

    // Track the last preferences we loaded from the store to detect external changes
    const lastLoadedPrefsRef = React.useRef(currentPreferences)

    // Load preferences from store after mount (hydration-safe)
    // React to store changes (from hydration, Firestore sync, or other tabs)
    React.useEffect(() => {
        // Wait until session is initialized and we have real data
        if (userData.isInitializing) {
            return
        }

        // Compare current store preferences with the last ones we loaded
        const prefsChanged =
            currentPreferences.childSafetyMode !== lastLoadedPrefsRef.current.childSafetyMode ||
            currentPreferences.autoMute !== lastLoadedPrefsRef.current.autoMute ||
            currentPreferences.defaultVolume !== lastLoadedPrefsRef.current.defaultVolume ||
            currentPreferences.improveRecommendations !==
                lastLoadedPrefsRef.current.improveRecommendations

        // Only update UI state if store preferences actually changed
        // This allows user to modify UI without being overridden
        if (prefsChanged) {
            setChildSafetyMode(currentPreferences.childSafetyMode)
            setAutoMute(currentPreferences.autoMute)
            setDefaultVolume(currentPreferences.defaultVolume)
            setImproveRecommendations(currentPreferences.improveRecommendations)
            setShowRecommendations(currentPreferences.showRecommendations)
            setOriginalPreferences({
                childSafetyMode: currentPreferences.childSafetyMode,
                autoMute: currentPreferences.autoMute,
                defaultVolume: currentPreferences.defaultVolume,
                improveRecommendations: currentPreferences.improveRecommendations,
                showRecommendations: currentPreferences.showRecommendations,
            })
            // Update our tracking ref
            lastLoadedPrefsRef.current = currentPreferences
        }
    }, [currentPreferences, userData.isInitializing])

    // Load PIN settings when user session is ready
    React.useEffect(() => {
        if (!userData.isInitializing && !isGuest) {
            const userId = userData.userSession?.userId
            if (userId) {
                loadPINSettings(userId, false)
            }
        }
    }, [userData.isInitializing, isGuest, userData.userSession?.userId, loadPINSettings])

    // Check if preferences have changed
    const preferencesChanged =
        childSafetyMode !== originalPreferences.childSafetyMode ||
        autoMute !== originalPreferences.autoMute ||
        defaultVolume !== originalPreferences.defaultVolume ||
        improveRecommendations !== originalPreferences.improveRecommendations ||
        showRecommendations !== originalPreferences.showRecommendations

    // Handle saving preferences
    const handleSavePreferences = async () => {
        try {
            // Update preferences through the appropriate store
            const updatedPreferences = {
                childSafetyMode,
                autoMute,
                defaultVolume,
                improveRecommendations,
                showRecommendations,
            }

            if (isGuest) {
                // For guest, update the guest store
                // Note: Guest store blocks childSafetyMode changes (always false)
                guestStoreUpdatePrefs(updatedPreferences)
            } else {
                // For authenticated, update auth store
                await authStoreUpdatePrefs(updatedPreferences)

                // CRITICAL: Sync child safety mode to cookie for server-side rendering
                // This ensures server-rendered pages respect the user's preference
                await toggleChildSafetyAction(childSafetyMode)
            }

            // Update original preferences to reflect saved state
            setOriginalPreferences(updatedPreferences)

            showSuccess('Preferences saved successfully!')
        } catch (error) {
            console.error('❌ [Settings] Error saving preferences:', error)
            showError('Failed to save preferences')
        }
    }

    // Create stable callback references for memoized component
    const handleChildSafetyModeChange = React.useCallback(
        (checked: boolean) => {
            // CRITICAL: Block guests from changing child safety mode
            // Guests must create an account to use this feature
            if (isGuest) {
                setShowChildSafetyModal(true)
                return // Don't change local state for guests
            }

            // If toggling OFF and PIN is enabled, require verification
            if (!checked && pinSettings.hasPIN && pinSettings.enabled) {
                setPendingChildSafetyToggle(false) // Store the intended toggle
                setPinModalMode('verify')
                setShowPINModal(true)
                return // Don't change state until PIN is verified
            }

            // If toggling ON, allow without PIN
            setChildSafetyMode(checked)
        },
        [isGuest, pinSettings.hasPIN, pinSettings.enabled]
    )

    const handleAutoMuteChange = React.useCallback((checked: boolean) => {
        setAutoMute(checked)
    }, [])

    const handleDefaultVolumeChange = React.useCallback((volume: number) => {
        setDefaultVolume(volume)
    }, [])

    const handleImproveRecommendationsChange = React.useCallback((checked: boolean) => {
        setImproveRecommendations(checked)
        // If disabling recommendation tracking, also disable the recommendations row
        if (!checked) {
            setShowRecommendations(false)
        }
    }, [])

    const handleShowRecommendationsChange = React.useCallback((checked: boolean) => {
        setShowRecommendations(checked)
    }, [])

    const handleShowChildSafetyModal = React.useCallback(() => {
        setShowChildSafetyModal(true)
    }, [])

    const handleCreateAccount = () => {
        // Close any info modals before opening auth modal
        setShowChildSafetyModal(false)
        openAuthModal('signup')
    }

    // PIN Management Handlers
    const handleSetupPIN = React.useCallback(() => {
        setPinModalMode('create')
        openSetupModal()
    }, [openSetupModal])

    const handleChangePIN = React.useCallback(() => {
        setPinModalMode('change')
        setShowPINModal(true)
    }, [])

    const handleRemovePIN = React.useCallback(() => {
        setPinModalMode('verify') // Verify before removing
        setShowPINModal(true)
        // Actual removal will happen after verification in handlePINVerified
    }, [])

    const handlePINVerified = React.useCallback(() => {
        // If we had a pending Child Safety toggle, apply it now
        if (pendingChildSafetyToggle !== null) {
            setChildSafetyMode(pendingChildSafetyToggle)
            setPendingChildSafetyToggle(null)
        }
        setShowPINModal(false)
    }, [pendingChildSafetyToggle])

    const handleClosePINModal = React.useCallback(() => {
        setShowPINModal(false)
        setPendingChildSafetyToggle(null) // Clear pending toggle on cancel
    }, [])

    return (
        <>
            <PreferencesSection
                isGuest={isGuest}
                isInitializing={userData.isInitializing}
                childSafetyMode={childSafetyMode}
                autoMute={autoMute}
                defaultVolume={defaultVolume}
                improveRecommendations={improveRecommendations}
                showRecommendations={showRecommendations}
                preferencesChanged={preferencesChanged}
                hasPIN={pinSettings.hasPIN}
                pinEnabled={pinSettings.enabled}
                onChildSafetyModeChange={handleChildSafetyModeChange}
                onAutoMuteChange={handleAutoMuteChange}
                onDefaultVolumeChange={handleDefaultVolumeChange}
                onImproveRecommendationsChange={handleImproveRecommendationsChange}
                onShowRecommendationsChange={handleShowRecommendationsChange}
                onSave={handleSavePreferences}
                onShowChildSafetyModal={handleShowChildSafetyModal}
                onSetupPIN={handleSetupPIN}
                onChangePIN={handleChangePIN}
                onRemovePIN={handleRemovePIN}
            />

            {/* Child Safety Mode Modal for Guest Users */}
            <InfoModal
                isOpen={showChildSafetyModal}
                onClose={() => setShowChildSafetyModal(false)}
                onConfirm={handleCreateAccount}
                title="Create an Account to Enable Child Safety Mode"
                message="Child Safety Mode shows only family-friendly content from curated genres (Animation, Family, Kids, Comedy, Sci-Fi & Fantasy, Action & Adventure). Crime, Drama, and Horror genres are hidden. This feature is only available to users with accounts to ensure consistent content filtering across all devices."
                confirmButtonText="Create Account"
                cancelButtonText="Maybe Later"
                emoji="🔒"
            />

            {/* PIN Modals */}
            {/* Setup Modal (controlled by store) */}
            <ChildSafetyPINModal
                mode="create"
                isOpen={isSetupModalOpen}
                onClose={closeSetupModal}
            />

            {/* Verify/Change Modal (local state) */}
            {showPINModal && (
                <ChildSafetyPINModal
                    mode={pinModalMode}
                    isOpen={showPINModal}
                    onClose={handleClosePINModal}
                    onVerified={handlePINVerified}
                />
            )}
        </>
    )
}

export default PreferencesPage
