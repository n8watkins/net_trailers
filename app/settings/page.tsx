'use client'

import React, { useState, useRef, useEffect } from 'react'
import {
    EnvelopeIcon,
    KeyIcon,
    ShareIcon,
    UserCircleIcon,
    TrashIcon,
    ChevronRightIcon,
    ArrowDownTrayIcon,
    Cog6ToothIcon,
    BellIcon,
} from '@heroicons/react/24/outline'
import useAuth from '../../hooks/useAuth'
import useUserData from '../../hooks/useUserData'
import { useAuthStatus } from '../../hooks/useAuthStatus'
import { exportUserDataToCSV } from '../../utils/csvExport'
import { useToast } from '../../hooks/useToast'
import SubPageLayout from '../../components/layout/SubPageLayout'
import ConfirmationModal from '../../components/modals/ConfirmationModal'
import InfoModal from '../../components/modals/InfoModal'
import { useAppStore } from '../../stores/appStore'
import { useAuthStore } from '../../stores/authStore'
import { useGuestStore } from '../../stores/guestStore'
import { toggleChildSafetyAction } from '../../lib/actions/childSafety'
import ProfileSection from '../../components/settings/ProfileSection'
import EmailSection from '../../components/settings/EmailSection'
import PasswordSection from '../../components/settings/PasswordSection'
import PreferencesSection from '../../components/settings/PreferencesSection'
import ShareSection from '../../components/settings/ShareSection'
import AccountSection from '../../components/settings/AccountSection'
import NotificationsSection from '../../components/settings/NotificationsSection'
import ChildSafetyPINModal from '../../components/settings/ChildSafetyPINModal'
import { useChildSafetyPINStore } from '../../stores/childSafetyStore'
import { DEFAULT_NOTIFICATION_PREFERENCES } from '../../types/notifications'

type SettingsSection =
    | 'profile'
    | 'email'
    | 'password'
    | 'preferences'
    | 'notifications'
    | 'share'
    | 'account'

interface SidebarItem {
    id: SettingsSection
    title: string
    description: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    icon: React.ComponentType<any>
    priority: 'low' | 'medium' | 'high' | 'danger'
    guestOnly?: boolean
    authenticatedOnly?: boolean
}

const Settings: React.FC = () => {
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
            improveRecommendations: userData.improveRecommendations ?? true,
            showRecommendations: userData.showRecommendations ?? false,
            notifications:
                userData.userSession?.preferences?.notifications ??
                DEFAULT_NOTIFICATION_PREFERENCES,
        }
    }, [
        userData.childSafetyMode,
        userData.autoMute,
        userData.defaultVolume,
        userData.improveRecommendations,
        userData.showRecommendations,
        userData.userSession?.preferences?.notifications,
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
    const [notifications, setNotifications] = useState(
        () => userData.userSession?.preferences?.notifications ?? DEFAULT_NOTIFICATION_PREFERENCES
    )

    // Track original preferences to detect changes
    const [originalPreferences, setOriginalPreferences] = useState({
        childSafetyMode: userData.childSafetyMode ?? false,
        autoMute: userData.autoMute ?? true,
        defaultVolume: userData.defaultVolume ?? 50,
        improveRecommendations: userData.improveRecommendations ?? true,
        showRecommendations: userData.showRecommendations ?? false,
        notifications:
            userData.userSession?.preferences?.notifications ?? DEFAULT_NOTIFICATION_PREFERENCES,
    })

    // Initialize skeleton state based on whether data is available
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
                lastLoadedPrefsRef.current.improveRecommendations ||
            JSON.stringify(currentPreferences.notifications) !==
                JSON.stringify(lastLoadedPrefsRef.current.notifications)

        // Only update UI state if store preferences actually changed
        // This allows user to modify UI without being overridden
        if (prefsChanged) {
            setChildSafetyMode(currentPreferences.childSafetyMode)
            setAutoMute(currentPreferences.autoMute)
            setDefaultVolume(currentPreferences.defaultVolume)
            setImproveRecommendations(currentPreferences.improveRecommendations)
            setNotifications(currentPreferences.notifications)
            setOriginalPreferences({
                childSafetyMode: currentPreferences.childSafetyMode,
                autoMute: currentPreferences.autoMute,
                defaultVolume: currentPreferences.defaultVolume,
                improveRecommendations: currentPreferences.improveRecommendations,
                notifications: currentPreferences.notifications,
            })
            // Update our tracking ref
            lastLoadedPrefsRef.current = currentPreferences
        }
    }, [currentPreferences, userData.isInitializing])

    // Sync displayName when user changes
    React.useEffect(() => {
        setDisplayName(user?.displayName || '')
    }, [user?.displayName])

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

    // Check if notifications have changed
    const notificationsChanged =
        JSON.stringify(notifications) !== JSON.stringify(originalPreferences.notifications)

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
            id: 'notifications',
            title: 'Notifications',
            description: 'Manage notification preferences',
            icon: BellIcon,
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
            const { auth } = await import('../../firebase')
            const { updateProfile } = await import('firebase/auth')

            if (!auth.currentUser) {
                throw new Error('No authenticated user found')
            }

            await updateProfile(auth.currentUser, {
                displayName: displayName.trim(),
            })

            showSuccess('Profile updated successfully!')
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
            const { auth } = await import('../../firebase')
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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
            const { auth } = await import('../../firebase')
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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
                improveRecommendations,
                showRecommendations,
                notifications,
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

    // Notifications handlers
    const handleNotificationsChange = React.useCallback(
        (changes: Partial<typeof notifications>) => {
            setNotifications((prev) => ({ ...prev, ...changes }))
        },
        []
    )

    const handleSaveNotifications = React.useCallback(async () => {
        await handleSavePreferences()
    }, [handleSavePreferences])

    return (
        <SubPageLayout
            title="Settings"
            icon={<Cog6ToothIcon />}
            iconColor="text-gray-400"
            description="Manage your account preferences and data"
        >
            {/* Unified Settings Container */}
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
                                                onClick={() => setActiveSection(item.id)}
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
                            <ProfileSection
                                user={user}
                                isGoogleAuth={isGoogleAuth}
                                isEmailAuth={isEmailAuth}
                                displayName={displayName}
                                setDisplayName={setDisplayName}
                                isSavingProfile={isSavingProfile}
                                onSaveProfile={handleSaveProfile}
                            />
                        )}

                        {activeSection === 'email' && !isGuest && (
                            <EmailSection
                                user={user}
                                isGoogleAuth={isGoogleAuth}
                                newEmail={newEmail}
                                setNewEmail={setNewEmail}
                                emailPassword={emailPassword}
                                setEmailPassword={setEmailPassword}
                                isUpdatingEmail={isUpdatingEmail}
                                onUpdateEmail={handleUpdateEmail}
                            />
                        )}

                        {activeSection === 'password' && !isGuest && (
                            <PasswordSection
                                user={user}
                                isGoogleAuth={isGoogleAuth}
                                currentPassword={currentPassword}
                                setCurrentPassword={setCurrentPassword}
                                newPassword={newPassword}
                                setNewPassword={setNewPassword}
                                confirmPassword={confirmPassword}
                                setConfirmPassword={setConfirmPassword}
                                isUpdatingPassword={isUpdatingPassword}
                                onUpdatePassword={handleUpdatePassword}
                            />
                        )}

                        {activeSection === 'preferences' && (
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
                        )}

                        {activeSection === 'notifications' && (
                            <NotificationsSection
                                notifications={notifications}
                                notificationsChanged={notificationsChanged}
                                onNotificationsChange={handleNotificationsChange}
                                onSave={handleSaveNotifications}
                            />
                        )}

                        {activeSection === 'share' && (
                            <ShareSection
                                isGuest={isGuest}
                                dataSummary={dataSummary}
                                onExportData={handleExportData}
                            />
                        )}

                        {activeSection === 'account' && (
                            <AccountSection
                                isGuest={isGuest}
                                dataSummary={dataSummary}
                                onExportData={handleExportData}
                                onShowClearConfirm={() => setShowClearConfirm(true)}
                                onShowDeleteConfirm={() => setShowDeleteConfirm(true)}
                            />
                        )}
                    </div>
                </div>
            </div>

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
        </SubPageLayout>
    )
}

export default Settings
