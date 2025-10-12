import React, { useState } from 'react'
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
import { useRecoilState } from 'recoil'
import { authModalState } from '../atoms/authModalAtom'
import { useAuthStore } from '../stores/authStore'
import { useGuestStore } from '../stores/guestStore'
import { GuestModeNotification } from '../components/GuestModeNotification'

type SettingsSection = 'profile' | 'email' | 'password' | 'preferences' | 'share' | 'account'

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
    const [activeSection, setActiveSection] = useState<SettingsSection>('preferences')
    const [showClearConfirm, setShowClearConfirm] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [showExportLimitedModal, setShowExportLimitedModal] = useState(false)

    // Preferences state
    const [childSafetyMode, setChildSafetyMode] = useState(false)
    const [autoMute, setAutoMute] = useState(true)
    const [defaultVolume, setDefaultVolume] = useState(50)

    // Track original preferences to detect changes
    const [originalPreferences, setOriginalPreferences] = useState({
        childSafetyMode: false,
        autoMute: true,
        defaultVolume: 50,
    })

    // Check if preferences have changed
    const preferencesChanged =
        childSafetyMode !== originalPreferences.childSafetyMode ||
        autoMute !== originalPreferences.autoMute ||
        defaultVolume !== originalPreferences.defaultVolume

    const { user } = useAuth()
    const { isGuest } = useAuthStatus()
    const userData = useUserData()
    const { showSuccess, showError } = useToast()
    const [authModal, setAuthModal] = useRecoilState(authModalState)

    // Get direct store access for preferences updates
    const authStoreUpdatePrefs = useAuthStore((state) => state.updatePreferences)
    const guestStoreUpdatePrefs = useGuestStore((state) => state.updatePreferences)

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
            if (userData.userSession?.preferences) {
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
        setAuthModal({ isOpen: true, mode: 'signup' })
    }

    const handleClearData = () => {
        try {
            userData.clearAccountData()
            setShowClearConfirm(false)
            showSuccess('All data cleared successfully!')
        } catch (error) {
            console.error('Error clearing data:', error)
            showError('Failed to clear data')
        }
    }

    const handleDeleteAccount = async () => {
        try {
            if (!isGuest && userData.deleteAccount) {
                await userData.deleteAccount()
                setShowDeleteConfirm(false)
                showSuccess('Account deleted successfully')
            }
        } catch (error) {
            console.error('Error deleting account:', error)
            showError('Failed to delete account')
        }
    }

    // Handle initializing state - provide default empty data summary
    const dataSummary = userData.isInitializing
        ? {
              watchlistCount: 0,
              likedCount: 0,
              hiddenCount: 0,
              listsCount: 0,
              totalItems: 0,
              isEmpty: true,
          }
        : userData.getAccountDataSummary()

    // Load preferences from store whenever they change
    React.useEffect(() => {
        if (!userData.isInitializing && userData.userSession?.preferences) {
            const prefs = userData.userSession.preferences
            const loadedPrefs = {
                childSafetyMode: prefs.childSafetyMode ?? false,
                autoMute: prefs.autoMute ?? true,
                defaultVolume: prefs.defaultVolume ?? 50,
            }
            setChildSafetyMode(loadedPrefs.childSafetyMode)
            setAutoMute(loadedPrefs.autoMute)
            setDefaultVolume(loadedPrefs.defaultVolume)
            setOriginalPreferences(loadedPrefs)
            console.log('📖 [Settings] Loaded preferences from store:', loadedPrefs)
        }
    }, [
        userData.isInitializing,
        userData.userSession?.preferences?.childSafetyMode,
        userData.userSession?.preferences?.autoMute,
        userData.userSession?.preferences?.defaultVolume,
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
            console.log('✅ [Settings] Preferences saved:', updatedPreferences)
        } catch (error) {
            console.error('❌ [Settings] Error saving preferences:', error)
            showError('Failed to save preferences')
        }
    }

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

                        {/* Loading State */}
                        {userData.isInitializing ? (
                            <div className="flex items-center justify-center min-h-[60vh]">
                                <div className="text-center">
                                    <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-red-600 border-r-transparent"></div>
                                    <p className="text-[#b3b3b3] mt-4">Loading settings...</p>
                                </div>
                            </div>
                        ) : (
                            // Unified Settings Container
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
                                                            value={user?.displayName || ''}
                                                            placeholder="Enter your display name"
                                                            className="inputClass w-full max-w-md"
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
                                                        <p className="text-[#777] text-sm mt-1">
                                                            To change your email, use the Email
                                                            Settings section
                                                        </p>
                                                    </div>

                                                    <div className="pt-4">
                                                        <button className="bannerButton bg-red-600 text-white hover:bg-red-700">
                                                            Save Changes
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
                                                            placeholder="Enter new email address"
                                                            className="inputClass w-full"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-medium text-[#e5e5e5] mb-2">
                                                            Confirm Password
                                                        </label>
                                                        <input
                                                            type="password"
                                                            placeholder="Enter your current password"
                                                            className="inputClass w-full"
                                                        />
                                                    </div>

                                                    <div className="pt-4">
                                                        <button className="bannerButton bg-red-600 text-white hover:bg-red-700">
                                                            Update Email
                                                        </button>
                                                    </div>
                                                </div>
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

                                                <div className="space-y-6 max-w-md">
                                                    <div>
                                                        <label className="block text-sm font-medium text-[#e5e5e5] mb-2">
                                                            Current Password
                                                        </label>
                                                        <input
                                                            type="password"
                                                            placeholder="Enter current password"
                                                            className="inputClass w-full"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-medium text-[#e5e5e5] mb-2">
                                                            New Password
                                                        </label>
                                                        <input
                                                            type="password"
                                                            placeholder="Enter new password"
                                                            className="inputClass w-full"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-medium text-[#e5e5e5] mb-2">
                                                            Confirm New Password
                                                        </label>
                                                        <input
                                                            type="password"
                                                            placeholder="Confirm new password"
                                                            className="inputClass w-full"
                                                        />
                                                    </div>

                                                    <div className="pt-4">
                                                        <button className="bannerButton bg-red-600 text-white hover:bg-red-700">
                                                            Update Password
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {activeSection === 'preferences' && (
                                            <div className="p-8">
                                                {/* Guest Mode Notification */}
                                                {isGuest && (
                                                    <div className="mb-6">
                                                        <GuestModeNotification
                                                            onOpenTutorial={onOpenTutorial}
                                                        />
                                                    </div>
                                                )}

                                                <div className="mb-6">
                                                    <h2 className="text-2xl font-bold text-white mb-2">
                                                        Preferences
                                                    </h2>
                                                    <p className="text-[#b3b3b3]">
                                                        Customize your content filtering and
                                                        playback experience
                                                    </p>
                                                </div>

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
                                                                        Restrict content to PG-13
                                                                        and below, filter explicit
                                                                        material
                                                                    </p>
                                                                </div>
                                                                <label className="relative inline-flex items-center cursor-pointer ml-4">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={childSafetyMode}
                                                                        onChange={(e) =>
                                                                            setChildSafetyMode(
                                                                                e.target.checked
                                                                            )
                                                                        }
                                                                        className="sr-only peer"
                                                                    />
                                                                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-red-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
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
                                                                        Start trailers muted when
                                                                        opening details
                                                                    </p>
                                                                </div>
                                                                <label className="relative inline-flex items-center cursor-pointer ml-4">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={autoMute}
                                                                        onChange={(e) =>
                                                                            setAutoMute(
                                                                                e.target.checked
                                                                            )
                                                                        }
                                                                        className="sr-only peer"
                                                                    />
                                                                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-red-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                                                                </label>
                                                            </div>

                                                            {/* Default Volume Slider */}
                                                            <div className="pt-4 border-t border-[#313131]">
                                                                <label className="block text-sm font-medium text-[#e5e5e5] mb-2">
                                                                    Default Volume
                                                                </label>
                                                                <p className="text-sm text-[#b3b3b3] mb-3">
                                                                    Set the initial volume level for
                                                                    trailers
                                                                </p>
                                                                <div className="flex items-center space-x-4">
                                                                    <input
                                                                        type="range"
                                                                        min="0"
                                                                        max="100"
                                                                        value={defaultVolume}
                                                                        onChange={(e) =>
                                                                            setDefaultVolume(
                                                                                parseInt(
                                                                                    e.target.value
                                                                                )
                                                                            )
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
                                                            onClick={handleSavePreferences}
                                                            disabled={!preferencesChanged}
                                                            className={`px-6 py-2.5 rounded-md font-medium transition-all duration-200 ${
                                                                preferencesChanged
                                                                    ? 'bg-red-600 text-white hover:bg-red-700 cursor-pointer'
                                                                    : 'bg-[#1a1a1a] text-[#666666] cursor-not-allowed border border-[#313131]'
                                                            }`}
                                                        >
                                                            Save Preferences
                                                        </button>
                                                    </div>
                                                </div>
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
                                                                    Generate shareable links for
                                                                    your watchlists and custom
                                                                    lists.
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
                                                                Download your watchlists, liked
                                                                items, and hidden content as CSV
                                                                file.
                                                            </p>

                                                            {/* Data Summary */}
                                                            <div className="mb-4 p-4 bg-[#141414] rounded-lg border border-[#313131]">
                                                                <p className="text-[#e5e5e5] text-sm mb-2">
                                                                    Your data includes:
                                                                </p>
                                                                <ul className="text-[#b3b3b3] text-sm space-y-1">
                                                                    <li>
                                                                        •{' '}
                                                                        {dataSummary.watchlistCount}{' '}
                                                                        watchlist items
                                                                    </li>
                                                                    <li>
                                                                        • {dataSummary.likedCount}{' '}
                                                                        liked items
                                                                    </li>
                                                                    <li>
                                                                        • {dataSummary.hiddenCount}{' '}
                                                                        hidden items
                                                                    </li>
                                                                    {!isGuest && (
                                                                        <li>
                                                                            •{' '}
                                                                            {dataSummary.listsCount}{' '}
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
                                                {/* Guest Mode Notification */}
                                                {isGuest && (
                                                    <div className="mb-6">
                                                        <GuestModeNotification
                                                            onOpenTutorial={onOpenTutorial}
                                                        />
                                                    </div>
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
                                                            {isGuest
                                                                ? 'Session Data'
                                                                : 'Account Data'}
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
                                                                            Download your watchlists
                                                                            and preferences as CSV
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
                                                                            Remove all saved
                                                                            watchlists, likes, and
                                                                            preferences
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
                                                                                Permanently delete
                                                                                your account and all
                                                                                data
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Guest Mode Upgrade Prompt */}
                                                    {isGuest && (
                                                        <div className="bg-[#0a0a0a] rounded-lg border border-blue-600/30 p-6">
                                                            <h3 className="text-lg font-semibold text-white mb-2">
                                                                Upgrade to Full Account
                                                            </h3>
                                                            <p className="text-[#b3b3b3] mb-4">
                                                                Create an account to sync your data
                                                                across devices and unlock additional
                                                                features like custom lists.
                                                            </p>
                                                            <button
                                                                onClick={handleCreateAccount}
                                                                className="bannerButton bg-red-600 text-white hover:bg-red-700"
                                                            >
                                                                Create Account
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
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
        </div>
    )
}

export default Settings
