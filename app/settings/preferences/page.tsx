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
        }
    }, [userData.childSafetyMode, userData.autoMute, userData.defaultVolume])

    // Initialize with store values directly (they default to false/true/50 during SSR anyway)
    const [childSafetyMode, setChildSafetyMode] = useState<boolean>(
        () => userData.childSafetyMode ?? false
    )
    const [autoMute, setAutoMute] = useState<boolean>(() => userData.autoMute ?? true)
    const [defaultVolume, setDefaultVolume] = useState<number>(() => userData.defaultVolume ?? 50)

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
            currentPreferences.defaultVolume !== lastLoadedPrefsRef.current.defaultVolume

        // Only update UI state if store preferences actually changed
        // This allows user to modify UI without being overridden
        if (prefsChanged) {
            setChildSafetyMode(currentPreferences.childSafetyMode)
            setAutoMute(currentPreferences.autoMute)
            setDefaultVolume(currentPreferences.defaultVolume)
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

    // Helper function to save a single preference with auto-save
    const savePreference = React.useCallback(
        async (key: string, value: boolean | number, message: string) => {
            try {
                const update = { [key]: value }

                if (isGuest) {
                    guestStoreUpdatePrefs(update)
                } else {
                    await authStoreUpdatePrefs(update)

                    // Sync child safety mode to cookie for server-side rendering
                    if (key === 'childSafetyMode') {
                        await toggleChildSafetyAction(value as boolean)
                    }
                }

                showSuccess(message)
            } catch (error) {
                console.error(`❌ [Settings] Error saving ${key}:`, error)
                showError(`Failed to save setting`)
            }
        },
        [isGuest, guestStoreUpdatePrefs, authStoreUpdatePrefs, showSuccess, showError]
    )

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

            // Update state and auto-save
            setChildSafetyMode(checked)
            savePreference(
                'childSafetyMode',
                checked,
                checked ? 'Child Safety Mode enabled' : 'Child Safety Mode disabled'
            )
        },
        [isGuest, pinSettings.hasPIN, pinSettings.enabled, savePreference]
    )

    const handleAutoMuteChange = React.useCallback(
        (checked: boolean) => {
            setAutoMute(checked)
            savePreference(
                'autoMute',
                checked,
                checked ? 'Auto-mute trailers enabled' : 'Auto-mute trailers disabled'
            )
        },
        [savePreference]
    )

    // Debounce ref for volume slider
    const volumeTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

    const handleDefaultVolumeChange = React.useCallback(
        (volume: number) => {
            setDefaultVolume(volume)

            // Debounce the save for volume slider to avoid too many saves
            if (volumeTimeoutRef.current) {
                clearTimeout(volumeTimeoutRef.current)
            }
            volumeTimeoutRef.current = setTimeout(() => {
                savePreference('defaultVolume', volume, `Default volume set to ${volume}%`)
            }, 500)
        },
        [savePreference]
    )

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
            savePreference(
                'childSafetyMode',
                pendingChildSafetyToggle,
                pendingChildSafetyToggle
                    ? 'Child Safety Mode enabled'
                    : 'Child Safety Mode disabled'
            )
            setPendingChildSafetyToggle(null)
        }
        setShowPINModal(false)
    }, [pendingChildSafetyToggle, savePreference])

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
                hasPIN={pinSettings.hasPIN}
                pinEnabled={pinSettings.enabled}
                onChildSafetyModeChange={handleChildSafetyModeChange}
                onAutoMuteChange={handleAutoMuteChange}
                onDefaultVolumeChange={handleDefaultVolumeChange}
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
