import React, { useState, useRef, useEffect } from 'react'
import Head from 'next/head'
import Image from 'next/image'
import {
    EnvelopeIcon,
    KeyIcon,
    ShareIcon,
    UserCircleIcon,
    TrashIcon,
    ChevronRightIcon,
    ArrowDownTrayIcon,
    Cog6ToothIcon,
} from '@heroicons/react/24/outline'
import useAuth from '../hooks/useAuth'
import useUserData from '../hooks/useUserData'
import { useAuthStatus } from '../hooks/useAuthStatus'
import { exportUserDataToCSV } from '../utils/csvExport'
import { useToast } from '../hooks/useToast'
import Header from '../components/Header'
import ConfirmationModal from '../components/ConfirmationModal'
import InfoModal from '../components/InfoModal'
import { useAppStore } from '../stores/appStore'
import { useAuthStore } from '../stores/authStore'
import { useGuestStore } from '../stores/guestStore'
import { GuestModeNotification } from '../components/GuestModeNotification'
import { UpgradeAccountBanner } from '../components/UpgradeAccountBanner'

type SettingsSection = 'profile' | 'email' | 'password' | 'preferences' | 'share' | 'account'

// Memoized Preferences Controls Component - Only re-renders when props actually change
interface PreferencesControlsProps {
    childSafetyMode: boolean
    autoMute: boolean
    defaultVolume: number
    preferencesChanged: boolean
    isGuest: boolean
    onChildSafetyModeChange: (checked: boolean) => void
    onAutoMuteChange: (checked: boolean) => void
    onDefaultVolumeChange: (volume: number) => void
    onSave: () => void
    onShowChildSafetyModal: () => void
    onMarkInteracted: () => void
    onClearInteracted: () => void
    userInteractedRef: React.RefObject<boolean>
}

const PreferencesControls = React.memo<PreferencesControlsProps>(
    ({
        childSafetyMode,
        autoMute,
        defaultVolume,
        preferencesChanged,
        isGuest,
        onChildSafetyModeChange,
        onAutoMuteChange,
        onDefaultVolumeChange,
        onSave,
        onShowChildSafetyModal,
        onMarkInteracted,
        onClearInteracted,
        userInteractedRef,
    }) => {
        return (
            <div className="space-y-8">
                {/* Content & Privacy Section */}
                <div>
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                        Content & Privacy
                    </h3>
                    <div className="space-y-6 bg-[#0a0a0a] rounded-lg border border-[#313131] p-6">
                        {/* Child Safety Mode Toggle */}
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-[#e5e5e5] mb-1">
                                    Child Safety Mode
                                </label>
                                <p className="text-sm text-[#b3b3b3]">
                                    Restrict content to PG-13 and below, filter explicit material
                                </p>
                            </div>
                            <label
                                className="relative inline-flex items-center cursor-pointer ml-4"
                                onPointerDown={onMarkInteracted}
                                onPointerUp={onClearInteracted}
                                onKeyDown={(e) => {
                                    // Only mark interaction for Space/Enter keys
                                    if (e.key === ' ' || e.key === 'Enter') {
                                        onMarkInteracted()
                                    }
                                }}
                                onKeyUp={onClearInteracted}
                            >
                                <input
                                    type="checkbox"
                                    checked={childSafetyMode}
                                    onChange={(e) => {
                                        // Only react to guest modal when it's truly user-triggered
                                        if (isGuest && userInteractedRef.current) {
                                            onShowChildSafetyModal()
                                            // Do NOT flip the setting for guests
                                            return
                                        }
                                        onChildSafetyModeChange(e.target.checked)
                                    }}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Playback Settings Section */}
                <div>
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                        Playback Settings
                    </h3>
                    <div className="space-y-6 bg-[#0a0a0a] rounded-lg border border-[#313131] p-6">
                        {/* Auto-mute Toggle */}
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-[#e5e5e5] mb-1">
                                    Auto-mute Trailers
                                </label>
                                <p className="text-sm text-[#b3b3b3]">
                                    Start trailers muted when opening details
                                </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer ml-4">
                                <input
                                    type="checkbox"
                                    checked={autoMute}
                                    onChange={(e) => onAutoMuteChange(e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                            </label>
                        </div>

                        {/* Default Volume Slider */}
                        <div className="pt-4 border-t border-[#313131]">
                            <label className="block text-sm font-medium text-[#e5e5e5] mb-2">
                                Default Volume
                            </label>
                            <p className="text-sm text-[#b3b3b3] mb-3">
                                Set the initial volume level for trailers
                            </p>
                            <div className="flex items-center space-x-4">
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    step="5"
                                    value={defaultVolume}
                                    onChange={(e) =>
                                        onDefaultVolumeChange(parseInt(e.target.value))
                                    }
                                    className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-600 [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-red-600 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                                />
                                <span className="text-sm text-[#e5e5e5] min-w-[3rem] text-right">
                                    {defaultVolume}%
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end">
                    <button
                        onClick={onSave}
                        disabled={!preferencesChanged}
                        className={`px-6 py-2.5 rounded-md font-medium transition-all duration-200 focus:outline-none ${
                            preferencesChanged
                                ? 'bg-red-600 text-white hover:bg-red-700 cursor-pointer'
                                : 'bg-[#1a1a1a] text-[#666666] cursor-not-allowed border border-[#313131]'
                        }`}
                    >
                        Save Preferences
                    </button>
                </div>
            </div>
        )
    }
)

PreferencesControls.displayName = 'PreferencesControls'

interface SettingsProps {
    onOpenAboutModal?: () => void
    onOpenTutorial?: () => void
    onOpenKeyboardShortcuts?: () => void
}

interface SidebarItem {
    id: SettingsSection
    title: string
    description: string
    icon: React.ComponentType<any>
    priority: 'low' | 'medium' | 'high' | 'danger'
    guestOnly?: boolean
    authenticatedOnly?: boolean
}

const Settings: React.FC<SettingsProps> = ({
    onOpenAboutModal,
    onOpenTutorial,
    onOpenKeyboardShortcuts,
}) => {
    // Get hooks first
    const { user } = useAuth()
    const { isGuest } = useAuthStatus()
    const userData = useUserData()
    const { showSuccess, showError } = useToast()
    const { openAuthModal } = useAppStore()

    // Get direct store access for preferences updates
    const authStoreUpdatePrefs = useAuthStore((state) => state.updatePreferences)
    const guestStoreUpdatePrefs = useGuestStore((state) => state.updatePreferences)

    // Detect authentication provider
    const authProvider = React.useMemo(() => {
        if (!user || !user.providerData || user.providerData.length === 0) {
            return null
        }
        const provider = user.providerData[0]
        if (provider.providerId === 'google.com') {
            return 'google'
        } else if (provider.providerId === 'password') {
            return 'email'
        }
        return provider.providerId
    }, [user])

    const isGoogleAuth = authProvider === 'google'
    const isEmailAuth = authProvider === 'email'

    // Modal states
    const [activeSection, setActiveSection] = useState<SettingsSection>('preferences')
    const [showClearConfirm, setShowClearConfirm] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [showExportLimitedModal, setShowExportLimitedModal] = useState(false)
    const [showChildSafetyModal, setShowChildSafetyModal] = useState(false)
    const [isClearingData, setIsClearingData] = useState(false)
    const [isDeletingAccount, setIsDeletingAccount] = useState(false)

    // Profile form state
    const [displayName, setDisplayName] = useState(user?.displayName || '')
    const [isSavingProfile, setIsSavingProfile] = useState(false)

    // Email form state
    const [newEmail, setNewEmail] = useState('')
    const [emailPassword, setEmailPassword] = useState('')
    const [isUpdatingEmail, setIsUpdatingEmail] = useState(false)

    // Password form state
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)

    // Ref to store delete account redirect timeout
    const deleteAccountTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    // 1) Define currentPreferences once using useMemo for stability
    const currentPreferences = React.useMemo(() => {
        return {
            childSafetyMode: userData.childSafetyMode ?? false,
            autoMute: userData.autoMute ?? true,
            defaultVolume: userData.defaultVolume ?? 50,
        }
    }, [userData.childSafetyMode, userData.autoMute, userData.defaultVolume])

    // 3) Initialize with static defaults (SSR-safe) - hydrate from store in useEffect
    const [childSafetyMode, setChildSafetyMode] = useState<boolean>(false)
    const [autoMute, setAutoMute] = useState<boolean>(true)
    const [defaultVolume, setDefaultVolume] = useState<number>(50)

    // Track original preferences to detect changes
    const [originalPreferences, setOriginalPreferences] = useState({
        childSafetyMode: false,
        autoMute: true,
        defaultVolume: 50,
    })

    // Track if we've initialized to prevent unnecessary updates
    const hasLoadedPrefsRef = React.useRef(false)

    // 2) Track real user-initiated interaction to prevent phantom modal opens
    const userInteractedRef = React.useRef(false)

    // Mark interaction when user starts interacting (mouse or keyboard)
    const markInteracted = React.useCallback(() => {
        userInteractedRef.current = true
    }, [])

    // Clear interaction flag when gesture completes
    const clearInteracted = React.useCallback(() => {
        userInteractedRef.current = false
    }, [])

    // Initialize skeleton state based on whether data is available
    const hasInitializedRef = React.useRef(!userData.isInitializing)

    // Load preferences from store after mount (hydration-safe)
    React.useEffect(() => {
        // Only load preferences once session is initialized and real data is available
        if (!hasLoadedPrefsRef.current && !userData.isInitializing && currentPreferences) {
            setChildSafetyMode(currentPreferences.childSafetyMode)
            setAutoMute(currentPreferences.autoMute)
            setDefaultVolume(currentPreferences.defaultVolume)
            setOriginalPreferences({
                childSafetyMode: currentPreferences.childSafetyMode,
                autoMute: currentPreferences.autoMute,
                defaultVolume: currentPreferences.defaultVolume,
            })
            hasLoadedPrefsRef.current = true
        }

        // Mark as initialized if data is now available
        if (!userData.isInitializing) {
            hasInitializedRef.current = true
        }
    }, [currentPreferences, userData.isInitializing])

    // Sync displayName when user changes
    React.useEffect(() => {
        setDisplayName(user?.displayName || '')
    }, [user?.displayName])

    // Check if preferences have changed
    const preferencesChanged =
        childSafetyMode !== originalPreferences.childSafetyMode ||
        autoMute !== originalPreferences.autoMute ||
        defaultVolume !== originalPreferences.defaultVolume

    // Define all possible sidebar items
    const allSidebarItems: SidebarItem[] = [
        {
            id: 'profile',
            title: 'Profile',
            description: 'Manage your profile information',
            icon: UserCircleIcon,
            priority: 'medium',
            authenticatedOnly: true,
        },
        {
            id: 'email',
            title: 'Email Settings',
            description: 'Change your email address',
            icon: EnvelopeIcon,
            priority: 'medium',
            authenticatedOnly: true,
        },
        {
            id: 'password',
            title: 'Password',
            description: 'Update your password',
            icon: KeyIcon,
            priority: 'medium',
            authenticatedOnly: true,
        },
        {
            id: 'preferences',
            title: 'Preferences',
            description: 'Content filters and playback settings',
            icon: Cog6ToothIcon,
            priority: 'low',
        },
        {
            id: 'share',
            title: 'Share & Export',
            description: 'Share your lists or export data',
            icon: ShareIcon,
            priority: 'low',
            authenticatedOnly: true,
        },
        {
            id: 'account',
            title: 'Data Management',
            description: 'Export, clear, or manage your data',
            icon: TrashIcon,
            priority: 'danger',
        },
    ]

    // Filter sidebar items based on authentication status
    const sidebarItems = allSidebarItems.filter((item) => {
        if (isGuest && item.authenticatedOnly) return false
        if (!isGuest && item.guestOnly) return false
        return true
    })

    const getUserName = () => {
        if (user?.displayName) {
            return user.displayName.split(' ')[0]
        }
        if (user?.email) {
            return user.email.split('@')[0]
        }
        if (isGuest) {
            return 'Guest User'
        }
        return 'User'
    }

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'danger':
                return 'border-l-red-600'
            case 'high':
                return 'border-l-orange-500'
            case 'medium':
                return 'border-l-blue-500'
            default:
                return 'border-l-[#454545]'
        }
    }

    const getIconColor = (priority: string, isActive: boolean) => {
        if (isActive) return 'text-white'

        switch (priority) {
            case 'danger':
                return 'text-red-500'
            case 'high':
                return 'text-orange-500'
            case 'medium':
                return 'text-blue-500'
            default:
                return 'text-[#b3b3b3]'
        }
    }

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
        setShowChildSafetyModal(false)
        openAuthModal('signup')
    }

    const handleClearData = async () => {
        // Prevent double-submission
        if (isClearingData) return

        setIsClearingData(true)
        try {
            // clearAccountData is async for authenticated users, sync for guests
            await userData.clearAccountData()
            setShowClearConfirm(false)
            showSuccess('All data cleared successfully!')
        } catch (error) {
            console.error('Error clearing data:', error)
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

    // Profile form handlers
    const handleSaveProfile = async () => {
        if (isSavingProfile) return
        if (!user) {
            showError('No user found')
            return
        }

        // Check if display name changed
        const displayNameChanged = displayName.trim() !== (user.displayName || '')
        if (!displayNameChanged) {
            showError('No changes to save')
            return
        }

        setIsSavingProfile(true)
        try {
            const { auth } = await import('../firebase')
            const { updateProfile } = await import('firebase/auth')

            if (!auth.currentUser) {
                throw new Error('No authenticated user found')
            }

            await updateProfile(auth.currentUser, {
                displayName: displayName.trim(),
            })

            showSuccess('Profile updated successfully!')
        } catch (error: any) {
            console.error('Error updating profile:', error)
            const message = error?.message || 'Failed to update profile. Please try again.'
            showError(message)
        } finally {
            setIsSavingProfile(false)
        }
    }

    // Email form handlers
    const handleUpdateEmail = async () => {
        if (isUpdatingEmail) return
        if (!user) {
            showError('No user found')
            return
        }

        // Validation
        if (!newEmail.trim()) {
            showError('Please enter a new email address')
            return
        }
        if (!emailPassword.trim()) {
            showError('Please enter your current password to confirm')
            return
        }
        if (newEmail.trim() === user.email) {
            showError('New email must be different from current email')
            return
        }

        setIsUpdatingEmail(true)
        try {
            const { auth } = await import('../firebase')
            const { updateEmail, EmailAuthProvider, reauthenticateWithCredential } = await import(
                'firebase/auth'
            )

            if (!auth.currentUser || !auth.currentUser.email) {
                throw new Error('No authenticated user found')
            }

            // Re-authenticate user first (required for sensitive operations)
            const credential = EmailAuthProvider.credential(auth.currentUser.email, emailPassword)
            await reauthenticateWithCredential(auth.currentUser, credential)

            // Update email
            await updateEmail(auth.currentUser, newEmail.trim())

            // Clear form
            setNewEmail('')
            setEmailPassword('')
            showSuccess('Email updated successfully!')
        } catch (error: any) {
            console.error('Error updating email:', error)
            let message = 'Failed to update email. Please try again.'
            if (error.code === 'auth/wrong-password') {
                message = 'Incorrect password. Please try again.'
            } else if (error.code === 'auth/email-already-in-use') {
                message = 'This email is already in use by another account.'
            } else if (error.code === 'auth/invalid-email') {
                message = 'Invalid email address format.'
            } else if (error.code === 'auth/requires-recent-login') {
                message = 'Please sign out and sign in again before changing your email.'
            }
            showError(message)
        } finally {
            setIsUpdatingEmail(false)
        }
    }

    // Password form handlers
    const handleUpdatePassword = async () => {
        if (isUpdatingPassword) return
        if (!user) {
            showError('No user found')
            return
        }

        // Validation
        if (!currentPassword.trim()) {
            showError('Please enter your current password')
            return
        }
        if (!newPassword.trim()) {
            showError('Please enter a new password')
            return
        }
        if (newPassword.length < 6) {
            showError('New password must be at least 6 characters')
            return
        }
        if (newPassword !== confirmPassword) {
            showError('New passwords do not match')
            return
        }
        if (newPassword === currentPassword) {
            showError('New password must be different from current password')
            return
        }

        setIsUpdatingPassword(true)
        try {
            const { auth } = await import('../firebase')
            const { updatePassword, EmailAuthProvider, reauthenticateWithCredential } =
                await import('firebase/auth')

            if (!auth.currentUser || !auth.currentUser.email) {
                throw new Error('No authenticated user found')
            }

            // Re-authenticate user first (required for sensitive operations)
            const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword)
            await reauthenticateWithCredential(auth.currentUser, credential)

            // Update password
            await updatePassword(auth.currentUser, newPassword)

            // Clear form
            setCurrentPassword('')
            setNewPassword('')
            setConfirmPassword('')
            showSuccess('Password updated successfully!')
        } catch (error: any) {
            console.error('Error updating password:', error)
            let message = 'Failed to update password. Please try again.'
            if (error.code === 'auth/wrong-password') {
                message = 'Incorrect current password. Please try again.'
            } else if (error.code === 'auth/weak-password') {
                message = 'Password is too weak. Please choose a stronger password.'
            } else if (error.code === 'auth/requires-recent-login') {
                message = 'Please sign out and sign in again before changing your password.'
            }
            showError(message)
        } finally {
            setIsUpdatingPassword(false)
        }
    }

    // Handle initializing state - provide default empty data summary
    const [dataSummary, setDataSummary] = React.useState<{
        watchlistCount: number
        likedCount: number
        hiddenCount: number
        listsCount: number
        totalItems: number
        isEmpty: boolean
        accountCreated?: Date
    }>({
        watchlistCount: 0,
        likedCount: 0,
        hiddenCount: 0,
        listsCount: 0,
        totalItems: 0,
        isEmpty: true,
    })

    // Load data summary (handles both sync and async cases)
    React.useEffect(() => {
        if (userData.isInitializing) {
            setDataSummary({
                watchlistCount: 0,
                likedCount: 0,
                hiddenCount: 0,
                listsCount: 0,
                totalItems: 0,
                isEmpty: true,
            })
        } else {
            const summary = userData.getAccountDataSummary()
            // Check if it's a Promise (authenticated) or sync value (guest)
            if (summary instanceof Promise) {
                summary.then(setDataSummary)
            } else {
                setDataSummary(summary)
            }
        }
    }, [
        userData.isInitializing,
        userData.defaultWatchlist.length,
        userData.likedMovies.length,
        userData.hiddenMovies.length,
        userData.userCreatedWatchlists.length,
    ])

    // Handle saving preferences
    const handleSavePreferences = async () => {
        try {
            // Update preferences through the appropriate store
            const updatedPreferences = {
                childSafetyMode,
                autoMute,
                defaultVolume,
            }

            if (isGuest) {
                // For guest, update the guest store
                guestStoreUpdatePrefs(updatedPreferences)
            } else {
                // For authenticated, update auth store
                await authStoreUpdatePrefs(updatedPreferences)
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
    const handleChildSafetyModeChange = React.useCallback((checked: boolean) => {
        setChildSafetyMode(checked)
    }, [])

    const handleAutoMuteChange = React.useCallback((checked: boolean) => {
        setAutoMute(checked)
    }, [])

    const handleDefaultVolumeChange = React.useCallback((volume: number) => {
        setDefaultVolume(volume)
    }, [])

    const handleShowChildSafetyModal = React.useCallback(() => {
        setShowChildSafetyModal(true)
    }, [])

    return (
        <div className="relative min-h-screen overflow-x-clip">
            <Head>
                <title>Settings - NetTrailer</title>
                <meta name="description" content="Manage your NetTrailer account settings" />
            </Head>

            <Header
                onOpenAboutModal={onOpenAboutModal}
                onOpenTutorial={onOpenTutorial}
                onOpenKeyboardShortcuts={onOpenKeyboardShortcuts}
            />

            <main id="content" className="relative">
                {/* Settings Page Content */}
                <div className="pt-20 min-h-screen">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                        {/* Page Title */}
                        <div className="mb-6">
                            <h1 className="text-5xl font-bold text-white mb-3">Settings</h1>
                            <p className="text-[#b3b3b3] text-base">
                                Manage your account preferences and data
                            </p>
                        </div>

                        {/* Unified Settings Container - Renders immediately */}
                        <div className="bg-[#141414] rounded-lg border border-[#313131] overflow-hidden">
                            <div className="flex flex-col lg:flex-row">
                                {/* Sidebar */}
                                <div className="lg:w-96 flex-shrink-0 border-b lg:border-b-0 lg:border-r border-[#313131]">
                                    <nav className="p-6">
                                        <ul className="space-y-2">
                                            {sidebarItems.map((item) => {
                                                const isActive = activeSection === item.id
                                                const Icon = item.icon

                                                return (
                                                    <li key={item.id}>
                                                        <button
                                                            onClick={() =>
                                                                setActiveSection(item.id)
                                                            }
                                                            className={`w-full flex items-center p-4 rounded-lg border-l-4 transition-all duration-200 text-left ${
                                                                isActive
                                                                    ? 'bg-[#313131] border-l-red-600 shadow-lg'
                                                                    : `hover:bg-[#1a1a1a] ${getPriorityColor(item.priority)} bg-[#0a0a0a]`
                                                            }`}
                                                        >
                                                            <Icon
                                                                className={`w-6 h-6 mr-4 ${getIconColor(item.priority, isActive)}`}
                                                            />
                                                            <div className="flex-1">
                                                                <h3
                                                                    className={`font-medium ${isActive ? 'text-white' : 'text-[#e5e5e5]'}`}
                                                                >
                                                                    {item.title}
                                                                </h3>
                                                                <p className="text-[#b3b3b3] text-sm mt-1">
                                                                    {item.description}
                                                                </p>
                                                            </div>
                                                            <ChevronRightIcon
                                                                className={`w-5 h-5 ${isActive ? 'text-white' : 'text-[#b3b3b3]'}`}
                                                            />
                                                        </button>
                                                    </li>
                                                )
                                            })}
                                        </ul>
                                    </nav>
                                </div>

                                {/* Main Content */}
                                <div className="flex-1">
                                    {activeSection === 'profile' && !isGuest && (
                                        <div className="p-8">
                                            <div className="mb-6">
                                                <h2 className="text-2xl font-bold text-white mb-2">
                                                    Profile Information
                                                </h2>
                                                <p className="text-[#b3b3b3]">
                                                    Manage your profile and account information.
                                                </p>
                                            </div>

                                            <div className="space-y-6">
                                                {/* Profile Picture */}
                                                <div className="flex items-center space-x-6">
                                                    {user?.photoURL ? (
                                                        <Image
                                                            src={user.photoURL}
                                                            alt="Profile"
                                                            width={96}
                                                            height={96}
                                                            className="rounded-full object-cover border-4 border-[#313131]"
                                                        />
                                                    ) : (
                                                        <div className="w-24 h-24 bg-red-600 rounded-full flex items-center justify-center border-4 border-[#313131]">
                                                            <span className="text-white font-bold text-2xl">
                                                                {getUserName()
                                                                    .charAt(0)
                                                                    .toUpperCase()}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div>
                                                        <h3 className="text-xl font-semibold text-white">
                                                            {getUserName()}
                                                        </h3>
                                                        <p className="text-[#b3b3b3]">
                                                            {user?.email || 'No email'}
                                                        </p>
                                                        <p className="text-[#777] text-sm mt-1">
                                                            Member since{' '}
                                                            {new Date(
                                                                user?.metadata?.creationTime ||
                                                                    Date.now()
                                                            ).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Display Name */}
                                                <div>
                                                    <label className="block text-sm font-medium text-[#e5e5e5] mb-2">
                                                        Display Name
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={displayName}
                                                        onChange={(e) =>
                                                            setDisplayName(e.target.value)
                                                        }
                                                        placeholder="Enter your display name"
                                                        className="inputClass w-full max-w-md"
                                                        disabled={isSavingProfile}
                                                    />
                                                </div>

                                                {/* Email (read-only) */}
                                                <div>
                                                    <label className="block text-sm font-medium text-[#e5e5e5] mb-2">
                                                        Email Address
                                                    </label>
                                                    <input
                                                        type="email"
                                                        value={user?.email || ''}
                                                        disabled
                                                        className="inputClass w-full max-w-md opacity-50 cursor-not-allowed"
                                                    />
                                                    <div className="flex items-center gap-2 mt-2">
                                                        {isGoogleAuth && (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-900/30 border border-blue-600/40 rounded-full text-xs text-blue-300">
                                                                <svg
                                                                    className="w-3.5 h-3.5"
                                                                    fill="currentColor"
                                                                    viewBox="0 0 24 24"
                                                                >
                                                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                                                </svg>
                                                                Google Account
                                                            </span>
                                                        )}
                                                        {isEmailAuth && (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-800/60 border border-gray-600/40 rounded-full text-xs text-gray-300">
                                                                <EnvelopeIcon className="w-3.5 h-3.5" />
                                                                Email/Password
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-[#777] text-sm mt-1">
                                                        {isGoogleAuth
                                                            ? 'Managed by Google'
                                                            : 'To change your email, use the Email Settings section'}
                                                    </p>
                                                </div>

                                                <div className="pt-4">
                                                    <button
                                                        onClick={handleSaveProfile}
                                                        disabled={
                                                            isSavingProfile ||
                                                            displayName.trim() ===
                                                                (user?.displayName || '')
                                                        }
                                                        className={`bannerButton ${
                                                            isSavingProfile ||
                                                            displayName.trim() ===
                                                                (user?.displayName || '')
                                                                ? 'bg-gray-600 cursor-not-allowed opacity-50'
                                                                : 'bg-red-600 hover:bg-red-700'
                                                        } text-white flex items-center justify-center gap-2`}
                                                    >
                                                        {isSavingProfile ? (
                                                            <>
                                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                                Saving...
                                                            </>
                                                        ) : (
                                                            'Save Changes'
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeSection === 'email' && !isGuest && (
                                        <div className="p-8">
                                            <div className="mb-6">
                                                <h2 className="text-2xl font-bold text-white mb-2">
                                                    Email Settings
                                                </h2>
                                                <p className="text-[#b3b3b3]">
                                                    Update your email address for your account.
                                                </p>
                                            </div>

                                            {isGoogleAuth ? (
                                                <div className="max-w-2xl">
                                                    <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-6">
                                                        <div className="flex items-start gap-4">
                                                            <div className="flex-shrink-0">
                                                                <svg
                                                                    className="w-6 h-6 text-blue-400"
                                                                    fill="currentColor"
                                                                    viewBox="0 0 24 24"
                                                                >
                                                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                                                </svg>
                                                            </div>
                                                            <div className="flex-1">
                                                                <h3 className="text-white font-semibold mb-2">
                                                                    Signed in with Google
                                                                </h3>
                                                                <p className="text-[#b3b3b3] text-sm mb-3">
                                                                    Your email address is managed by
                                                                    Google. Changing your email
                                                                    requires updating your Google
                                                                    account.
                                                                </p>
                                                                <p className="text-[#b3b3b3] text-sm">
                                                                    To change your email, visit{' '}
                                                                    <a
                                                                        href="https://myaccount.google.com/"
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="text-blue-400 hover:text-blue-300 underline"
                                                                    >
                                                                        Google Account Settings
                                                                    </a>
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-6 max-w-md">
                                                    <div>
                                                        <label className="block text-sm font-medium text-[#e5e5e5] mb-2">
                                                            Current Email
                                                        </label>
                                                        <input
                                                            type="email"
                                                            value={user?.email || ''}
                                                            disabled
                                                            className="inputClass w-full opacity-50 cursor-not-allowed"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-medium text-[#e5e5e5] mb-2">
                                                            New Email Address
                                                        </label>
                                                        <input
                                                            type="email"
                                                            value={newEmail}
                                                            onChange={(e) =>
                                                                setNewEmail(e.target.value)
                                                            }
                                                            placeholder="Enter new email address"
                                                            className="inputClass w-full"
                                                            disabled={isUpdatingEmail}
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-medium text-[#e5e5e5] mb-2">
                                                            Confirm Password
                                                        </label>
                                                        <input
                                                            type="password"
                                                            value={emailPassword}
                                                            onChange={(e) =>
                                                                setEmailPassword(e.target.value)
                                                            }
                                                            placeholder="Enter your current password"
                                                            className="inputClass w-full"
                                                            disabled={isUpdatingEmail}
                                                        />
                                                    </div>

                                                    <div className="pt-4">
                                                        <button
                                                            onClick={handleUpdateEmail}
                                                            disabled={
                                                                isUpdatingEmail ||
                                                                !newEmail.trim() ||
                                                                !emailPassword.trim()
                                                            }
                                                            className={`bannerButton ${
                                                                isUpdatingEmail ||
                                                                !newEmail.trim() ||
                                                                !emailPassword.trim()
                                                                    ? 'bg-gray-600 cursor-not-allowed opacity-50'
                                                                    : 'bg-red-600 hover:bg-red-700'
                                                            } text-white flex items-center justify-center gap-2`}
                                                        >
                                                            {isUpdatingEmail ? (
                                                                <>
                                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                                    Updating...
                                                                </>
                                                            ) : (
                                                                'Update Email'
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {activeSection === 'password' && !isGuest && (
                                        <div className="p-8">
                                            <div className="mb-6">
                                                <h2 className="text-2xl font-bold text-white mb-2">
                                                    Password Settings
                                                </h2>
                                                <p className="text-[#b3b3b3]">
                                                    Change your account password for better
                                                    security.
                                                </p>
                                            </div>

                                            {isGoogleAuth ? (
                                                <div className="max-w-2xl">
                                                    <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-6">
                                                        <div className="flex items-start gap-4">
                                                            <div className="flex-shrink-0">
                                                                <svg
                                                                    className="w-6 h-6 text-blue-400"
                                                                    fill="currentColor"
                                                                    viewBox="0 0 24 24"
                                                                >
                                                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                                                </svg>
                                                            </div>
                                                            <div className="flex-1">
                                                                <h3 className="text-white font-semibold mb-2">
                                                                    Signed in with Google
                                                                </h3>
                                                                <p className="text-[#b3b3b3] text-sm mb-3">
                                                                    You're using Google to sign in.
                                                                    Your password is managed by
                                                                    Google and cannot be changed
                                                                    here.
                                                                </p>
                                                                <p className="text-[#b3b3b3] text-sm">
                                                                    To change your Google account
                                                                    password, visit{' '}
                                                                    <a
                                                                        href="https://myaccount.google.com/security"
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="text-blue-400 hover:text-blue-300 underline"
                                                                    >
                                                                        Google Account Security
                                                                    </a>
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-6 max-w-md">
                                                    <div>
                                                        <label className="block text-sm font-medium text-[#e5e5e5] mb-2">
                                                            Current Password
                                                        </label>
                                                        <input
                                                            type="password"
                                                            value={currentPassword}
                                                            onChange={(e) =>
                                                                setCurrentPassword(e.target.value)
                                                            }
                                                            placeholder="Enter current password"
                                                            className="inputClass w-full"
                                                            disabled={isUpdatingPassword}
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-medium text-[#e5e5e5] mb-2">
                                                            New Password
                                                        </label>
                                                        <input
                                                            type="password"
                                                            value={newPassword}
                                                            onChange={(e) =>
                                                                setNewPassword(e.target.value)
                                                            }
                                                            placeholder="Enter new password (min 6 characters)"
                                                            className="inputClass w-full"
                                                            disabled={isUpdatingPassword}
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-medium text-[#e5e5e5] mb-2">
                                                            Confirm New Password
                                                        </label>
                                                        <input
                                                            type="password"
                                                            value={confirmPassword}
                                                            onChange={(e) =>
                                                                setConfirmPassword(e.target.value)
                                                            }
                                                            placeholder="Confirm new password"
                                                            className="inputClass w-full"
                                                            disabled={isUpdatingPassword}
                                                        />
                                                    </div>

                                                    <div className="pt-4">
                                                        <button
                                                            onClick={handleUpdatePassword}
                                                            disabled={
                                                                isUpdatingPassword ||
                                                                !currentPassword.trim() ||
                                                                !newPassword.trim() ||
                                                                !confirmPassword.trim()
                                                            }
                                                            className={`bannerButton ${
                                                                isUpdatingPassword ||
                                                                !currentPassword.trim() ||
                                                                !newPassword.trim() ||
                                                                !confirmPassword.trim()
                                                                    ? 'bg-gray-600 cursor-not-allowed opacity-50'
                                                                    : 'bg-red-600 hover:bg-red-700'
                                                            } text-white flex items-center justify-center gap-2`}
                                                        >
                                                            {isUpdatingPassword ? (
                                                                <>
                                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                                    Updating...
                                                                </>
                                                            ) : (
                                                                'Update Password'
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {activeSection === 'preferences' && (
                                        <div className="p-8">
                                            {/* Upgrade Banner for Guests */}
                                            {isGuest && (
                                                <UpgradeAccountBanner
                                                    onOpenTutorial={onOpenTutorial}
                                                />
                                            )}

                                            <div className="mb-6">
                                                <h2 className="text-2xl font-bold text-white mb-2">
                                                    Preferences
                                                </h2>
                                                <p className="text-[#b3b3b3]">
                                                    Customize your content filtering and playback
                                                    experience
                                                </p>
                                            </div>

                                            {/* Only render preferences controls after data is loaded */}
                                            {!hasInitializedRef.current &&
                                            userData.isInitializing ? (
                                                <div className="space-y-8 animate-pulse">
                                                    <div>
                                                        <div className="h-6 bg-[#313131] rounded w-48 mb-4"></div>
                                                        <div className="bg-[#0a0a0a] rounded-lg border border-[#313131] p-6">
                                                            <div className="flex items-start justify-between">
                                                                <div className="flex-1">
                                                                    <div className="h-4 bg-[#313131] rounded w-40 mb-2"></div>
                                                                    <div className="h-3 bg-[#313131] rounded w-64"></div>
                                                                </div>
                                                                <div className="w-11 h-6 bg-[#313131] rounded-full ml-4"></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <PreferencesControls
                                                    childSafetyMode={childSafetyMode}
                                                    autoMute={autoMute}
                                                    defaultVolume={defaultVolume}
                                                    preferencesChanged={preferencesChanged}
                                                    isGuest={isGuest}
                                                    onChildSafetyModeChange={
                                                        handleChildSafetyModeChange
                                                    }
                                                    onAutoMuteChange={handleAutoMuteChange}
                                                    onDefaultVolumeChange={
                                                        handleDefaultVolumeChange
                                                    }
                                                    onSave={handleSavePreferences}
                                                    onShowChildSafetyModal={
                                                        handleShowChildSafetyModal
                                                    }
                                                    onMarkInteracted={markInteracted}
                                                    onClearInteracted={clearInteracted}
                                                    userInteractedRef={userInteractedRef}
                                                />
                                            )}
                                        </div>
                                    )}

                                    {activeSection === 'share' && (
                                        <div className="p-8">
                                            <div className="mb-6">
                                                <h2 className="text-2xl font-bold text-white mb-2">
                                                    Share & Export
                                                </h2>
                                                <p className="text-[#b3b3b3]">
                                                    {isGuest
                                                        ? 'Export your data to keep a backup of your watchlists and preferences.'
                                                        : 'Share your watchlists with others or export your data.'}
                                                </p>
                                            </div>

                                            <div className="space-y-6">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    {!isGuest && (
                                                        <div className="bg-[#0a0a0a] rounded-xl p-6 border border-[#313131]">
                                                            <ShareIcon className="w-8 h-8 text-blue-500 mb-4" />
                                                            <h3 className="text-lg font-semibold text-white mb-2">
                                                                Share Watchlists
                                                            </h3>
                                                            <p className="text-[#b3b3b3] mb-4">
                                                                Generate shareable links for your
                                                                watchlists and custom lists.
                                                            </p>
                                                            <button className="bannerButton bg-blue-600 text-white hover:bg-blue-700">
                                                                Manage Sharing
                                                            </button>
                                                        </div>
                                                    )}

                                                    <div
                                                        className={`bg-[#0a0a0a] rounded-xl p-6 border border-[#313131] ${isGuest ? 'md:col-span-2' : ''}`}
                                                    >
                                                        <ArrowDownTrayIcon className="w-8 h-8 text-green-500 mb-4" />
                                                        <h3 className="text-lg font-semibold text-white mb-2">
                                                            Export Data
                                                        </h3>
                                                        <p className="text-[#b3b3b3] mb-4">
                                                            Download your watchlists, liked items,
                                                            and hidden content as CSV file.
                                                        </p>

                                                        {/* Data Summary */}
                                                        <div className="mb-4 p-4 bg-[#141414] rounded-lg border border-[#313131]">
                                                            <p className="text-[#e5e5e5] text-sm mb-2">
                                                                Your data includes:
                                                            </p>
                                                            <ul className="text-[#b3b3b3] text-sm space-y-1">
                                                                <li>
                                                                    • {dataSummary.watchlistCount}{' '}
                                                                    watchlist items
                                                                </li>
                                                                <li>
                                                                    • {dataSummary.likedCount} liked
                                                                    items
                                                                </li>
                                                                <li>
                                                                    • {dataSummary.hiddenCount}{' '}
                                                                    hidden items
                                                                </li>
                                                                {!isGuest && (
                                                                    <li>
                                                                        • {dataSummary.listsCount}{' '}
                                                                        custom lists
                                                                    </li>
                                                                )}
                                                            </ul>
                                                        </div>

                                                        <button
                                                            onClick={handleExportData}
                                                            disabled={dataSummary.isEmpty}
                                                            className={`bannerButton ${
                                                                dataSummary.isEmpty
                                                                    ? 'bg-gray-600 cursor-not-allowed'
                                                                    : 'bg-green-600 hover:bg-green-700'
                                                            } text-white`}
                                                        >
                                                            {dataSummary.isEmpty
                                                                ? 'No Data to Export'
                                                                : 'Export Data (CSV)'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeSection === 'account' && (
                                        <div className="p-8">
                                            {/* Upgrade Banner for Guests */}
                                            {isGuest && (
                                                <UpgradeAccountBanner
                                                    onOpenTutorial={onOpenTutorial}
                                                />
                                            )}

                                            <div className="mb-6">
                                                <h2 className="text-2xl font-bold text-white mb-2">
                                                    Data Management
                                                </h2>
                                                <p className="text-[#b3b3b3]">
                                                    {isGuest
                                                        ? 'Export, clear, or manage your local session data.'
                                                        : 'Export, clear, or manage your account data.'}
                                                </p>
                                            </div>

                                            <div className="space-y-6">
                                                {/* Data Summary Card */}
                                                <div className="bg-[#0a0a0a] rounded-lg border border-[#313131] p-6">
                                                    <h3 className="text-lg font-semibold text-white mb-4">
                                                        {isGuest ? 'Session Data' : 'Account Data'}
                                                    </h3>
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                                        <div className="bg-[#141414] rounded-lg p-4 border border-[#313131]">
                                                            <p className="text-[#b3b3b3] text-sm">
                                                                Watchlist
                                                            </p>
                                                            <p className="text-white text-2xl font-bold mt-1">
                                                                {dataSummary.watchlistCount}
                                                            </p>
                                                        </div>
                                                        <div className="bg-[#141414] rounded-lg p-4 border border-[#313131]">
                                                            <p className="text-[#b3b3b3] text-sm">
                                                                Liked
                                                            </p>
                                                            <p className="text-white text-2xl font-bold mt-1">
                                                                {dataSummary.likedCount}
                                                            </p>
                                                        </div>
                                                        <div className="bg-[#141414] rounded-lg p-4 border border-[#313131]">
                                                            <p className="text-[#b3b3b3] text-sm">
                                                                Hidden
                                                            </p>
                                                            <p className="text-white text-2xl font-bold mt-1">
                                                                {dataSummary.hiddenCount}
                                                            </p>
                                                        </div>
                                                        {!isGuest && (
                                                            <div className="bg-[#141414] rounded-lg p-4 border border-[#313131]">
                                                                <p className="text-[#b3b3b3] text-sm">
                                                                    Lists
                                                                </p>
                                                                <p className="text-white text-2xl font-bold mt-1">
                                                                    {dataSummary.listsCount}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="space-y-3">
                                                        {/* Export Data Button */}
                                                        <button
                                                            onClick={handleExportData}
                                                            disabled={dataSummary.isEmpty}
                                                            className={`w-full text-left p-4 rounded-lg border transition-colors ${
                                                                dataSummary.isEmpty
                                                                    ? 'bg-[#141414] border-[#313131] cursor-not-allowed opacity-50'
                                                                    : 'bg-[#141414] hover:bg-[#1a1a1a] border-[#313131]'
                                                            }`}
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex-1">
                                                                    <span className="text-[#e5e5e5] font-medium flex items-center gap-2">
                                                                        <ArrowDownTrayIcon className="w-5 h-5" />
                                                                        Export Data
                                                                    </span>
                                                                    <p className="text-[#b3b3b3] text-sm mt-1">
                                                                        Download your watchlists and
                                                                        preferences as CSV
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </button>

                                                        {/* Clear Data Button */}
                                                        <button
                                                            onClick={() =>
                                                                setShowClearConfirm(true)
                                                            }
                                                            disabled={dataSummary.isEmpty}
                                                            className={`w-full text-left p-4 rounded-lg border transition-colors ${
                                                                dataSummary.isEmpty
                                                                    ? 'bg-[#141414] border-[#313131] cursor-not-allowed opacity-50'
                                                                    : 'bg-[#141414] hover:bg-orange-900/20 border-orange-600/30'
                                                            }`}
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex-1">
                                                                    <span className="text-orange-400 font-medium flex items-center gap-2">
                                                                        <TrashIcon className="w-5 h-5" />
                                                                        Clear Data
                                                                    </span>
                                                                    <p className="text-[#b3b3b3] text-sm mt-1">
                                                                        Remove all saved watchlists,
                                                                        likes, and preferences
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </button>

                                                        {/* Delete Account Button (Authenticated Only) */}
                                                        {!isGuest && (
                                                            <button
                                                                onClick={() =>
                                                                    setShowDeleteConfirm(true)
                                                                }
                                                                className="w-full text-left p-4 bg-[#141414] hover:bg-red-900/20 rounded-lg border border-red-600/30 transition-colors"
                                                            >
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex-1">
                                                                        <span className="text-red-400 font-medium flex items-center gap-2">
                                                                            <TrashIcon className="w-5 h-5" />
                                                                            Delete Account
                                                                        </span>
                                                                        <p className="text-[#b3b3b3] text-sm mt-1">
                                                                            Permanently delete your
                                                                            account and all data
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Confirmation Modals */}
            <ConfirmationModal
                isOpen={showClearConfirm}
                onClose={() => setShowClearConfirm(false)}
                onConfirm={handleClearData}
                title="Clear All Data?"
                message="This will permanently delete all your watchlists, liked items, hidden content, and preferences. This action cannot be undone."
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
                message="This will permanently delete your account, all your data, and cannot be undone. You will lose access to all your watchlists, custom lists, and preferences."
                confirmText="This action is irreversible. Your account will be deleted immediately."
                confirmButtonText="Delete My Account"
                cancelButtonText="Cancel"
                requireTyping={true}
                confirmationPhrase="delete"
                dangerLevel="danger"
                isLoading={isDeletingAccount}
            />

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

            {/* Child Safety Mode Modal for Guest Users */}
            <InfoModal
                isOpen={showChildSafetyModal}
                onClose={() => setShowChildSafetyModal(false)}
                onConfirm={handleCreateAccount}
                title="Create an Account to Enable Child Safety Mode"
                message="Child Safety Mode restricts content to PG-13 and below, filtering explicit material. This feature is only available to users with accounts to ensure consistent content restrictions across all devices."
                confirmButtonText="Create Account"
                cancelButtonText="Maybe Later"
                emoji="🔒"
            />
        </div>
    )
}

// Enable Static Site Generation for instant page loads
// The settings page structure is completely static and predictable
export const getStaticProps = async () => {
    return {
        props: {}, // No props needed - all data is loaded client-side via hooks
    }
}

export default Settings
