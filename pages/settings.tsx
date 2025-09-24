import React, { useState } from 'react'
import Head from 'next/head'
import Image from 'next/image'
import { useRouter } from 'next/router'
import {
    EnvelopeIcon,
    KeyIcon,
    ArrowUpTrayIcon,
    ShareIcon,
    UserCircleIcon,
    TrashIcon,
    ChevronRightIcon,
} from '@heroicons/react/24/outline'
import useAuth from '../hooks/useAuth'
import useUserData from '../hooks/useUserData'
import AccountManagement from '../components/AccountManagement'
import Header from '../components/Header'

type SettingsSection = 'profile' | 'email' | 'password' | 'upload' | 'share' | 'account'

interface SidebarItem {
    id: SettingsSection
    title: string
    description: string
    icon: React.ComponentType<any>
    priority: 'low' | 'medium' | 'high' | 'danger'
}

const Settings: React.FC = () => {
    const [activeSection, setActiveSection] = useState<SettingsSection>('account') // Start with account management since it works for both
    const { user } = useAuth()
    const userData = useUserData()
    const router = useRouter()

    // Define all possible sidebar items
    const allSidebarItems: SidebarItem[] = [
        {
            id: 'profile',
            title: 'Profile',
            description: 'Manage your profile information',
            icon: UserCircleIcon,
            priority: 'medium',
        },
        {
            id: 'email',
            title: 'Email Settings',
            description: 'Change your email address',
            icon: EnvelopeIcon,
            priority: 'medium',
        },
        {
            id: 'password',
            title: 'Password',
            description: 'Update your password',
            icon: KeyIcon,
            priority: 'medium',
        },
        {
            id: 'upload',
            title: 'Import Data',
            description: 'Upload watchlists from other platforms',
            icon: ArrowUpTrayIcon,
            priority: 'low',
        },
        {
            id: 'share',
            title: 'Share & Export',
            description: 'Share your lists with others',
            icon: ShareIcon,
            priority: 'low',
        },
        {
            id: 'account',
            title: 'Account Management',
            description: 'Export data, clear data, or delete account',
            icon: TrashIcon,
            priority: 'danger',
        },
    ]

    // Filter sidebar items based on authentication status
    const sidebarItems = allSidebarItems.filter((item) => {
        if (userData.isGuest) {
            // For guest users, only show account management and import/export features
            return ['account', 'upload', 'share'].includes(item.id)
        }
        // For authenticated users, show all items
        return true
    })

    const getUserName = () => {
        if (user?.displayName) {
            return user.displayName.split(' ')[0]
        }
        if (user?.email) {
            return user.email.split('@')[0]
        }
        if (userData.isGuest) {
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

    // Show loading state while session is initializing
    if (userData.sessionType === 'initializing') {
        return (
            <div className="relative min-h-screen overflow-x-clip">
                <Head>
                    <title>Settings - NetTrailer</title>
                    <meta name="description" content="Manage your NetTrailer account settings" />
                </Head>
                <Header />
                <main id="content" className="relative">
                    <div className="flex items-center justify-center min-h-screen pt-20">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
                            <h1 className="text-2xl font-semibold text-white mb-4">
                                Initializing Settings...
                            </h1>
                            <p className="text-[#b3b3b3] mb-6">Setting up your session</p>
                        </div>
                    </div>
                </main>
            </div>
        )
    }

    return (
        <div className="relative min-h-screen overflow-x-clip">
            <Head>
                <title>Settings - NetTrailer</title>
                <meta name="description" content="Manage your NetTrailer account settings" />
            </Head>

            <Header />

            <main id="content" className="relative">
                {/* Settings Page Content */}
                <div className="pt-20 min-h-screen">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                        {/* Page Title */}
                        <div className="mb-8">
                            <h1 className="text-4xl font-bold text-white mb-2">Settings</h1>
                            <p className="text-[#b3b3b3]">
                                Manage your account preferences and data
                            </p>
                        </div>

                        <div className="flex flex-col lg:flex-row gap-8">
                            {/* Sidebar */}
                            <div className="lg:w-80 flex-shrink-0">
                                <div className="bg-[#141414] rounded-lg border border-[#313131]">
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
                            </div>

                            {/* Main Content */}
                            <div className="flex-1">
                                <div className="bg-[#141414] rounded-lg border border-[#313131]">
                                    {activeSection === 'profile' && (
                                        <div className="p-8">
                                            <div className="mb-6">
                                                <h2 className="text-2xl font-bold text-white mb-2">
                                                    Profile Information
                                                </h2>
                                                <p className="text-[#b3b3b3]">
                                                    {userData.isGuest
                                                        ? 'Manage your guest session information.'
                                                        : 'Manage your profile and account information.'}
                                                </p>
                                            </div>

                                            {userData.isGuest ? (
                                                // Guest user profile
                                                <div className="space-y-6">
                                                    <div className="bg-[#0a0a0a] rounded-lg border border-[#313131] p-6">
                                                        <div className="flex items-center space-x-4 mb-4">
                                                            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                                                                <span className="text-white font-bold text-xl">
                                                                    G
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <h3 className="text-xl font-semibold text-white">
                                                                    Guest User
                                                                </h3>
                                                                <p className="text-[#b3b3b3]">
                                                                    Anonymous session
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-4">
                                                            <div>
                                                                <p className="text-[#e5e5e5] font-medium">
                                                                    Session Status
                                                                </p>
                                                                <p className="text-[#b3b3b3]">
                                                                    Browsing as guest - data is
                                                                    saved locally
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[#e5e5e5] font-medium">
                                                                    Session ID
                                                                </p>
                                                                <p className="text-[#777] font-mono text-sm">
                                                                    {userData.activeSessionId ||
                                                                        'Loading...'}
                                                                </p>
                                                            </div>
                                                            <div className="pt-4 border-t border-[#313131]">
                                                                <p className="text-[#b3b3b3] text-sm mb-4">
                                                                    To access more features and sync
                                                                    your data across devices, create
                                                                    an account.
                                                                </p>
                                                                <button className="bannerButton bg-red-600 text-white hover:bg-red-700">
                                                                    Create Account
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                // Authenticated user profile
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
                                                                {user.email}
                                                            </p>
                                                            <p className="text-[#777] text-sm mt-1">
                                                                Member since{' '}
                                                                {new Date(
                                                                    user.metadata?.creationTime ||
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
                                                            value={user.displayName || ''}
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
                                                            value={user.email || ''}
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
                                            )}
                                        </div>
                                    )}

                                    {activeSection === 'email' && (
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

                                    {activeSection === 'password' && (
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

                                    {activeSection === 'upload' && (
                                        <div className="p-8">
                                            <div className="mb-6">
                                                <h2 className="text-2xl font-bold text-white mb-2">
                                                    Import Data
                                                </h2>
                                                <p className="text-[#b3b3b3]">
                                                    Import watchlists and data from other platforms.
                                                </p>
                                            </div>

                                            <div className="max-w-2xl">
                                                <div className="border-2 border-dashed border-[#313131] rounded-xl p-12 text-center hover:border-[#454545] transition-colors duration-200">
                                                    <ArrowUpTrayIcon className="w-16 h-16 text-[#b3b3b3] mx-auto mb-6" />
                                                    <h3 className="text-xl font-semibold text-white mb-2">
                                                        Upload Watchlist File
                                                    </h3>
                                                    <p className="text-[#b3b3b3] mb-6">
                                                        Support for CSV, JSON, and other formats
                                                        from Netflix, Hulu, Amazon Prime, and more.
                                                    </p>
                                                    <input
                                                        type="file"
                                                        accept=".csv,.json,.txt"
                                                        className="hidden"
                                                        id="watchlist-upload"
                                                    />
                                                    <label
                                                        htmlFor="watchlist-upload"
                                                        className="bannerButton bg-red-600 text-white hover:bg-red-700 cursor-pointer"
                                                    >
                                                        Choose Files
                                                    </label>
                                                </div>

                                                <div className="mt-8">
                                                    <h4 className="text-lg font-medium text-white mb-4">
                                                        Supported Platforms
                                                    </h4>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        {[
                                                            'Netflix',
                                                            'Amazon Prime',
                                                            'Hulu',
                                                            'Disney+',
                                                            'HBO Max',
                                                            'Custom CSV',
                                                        ].map((platform) => (
                                                            <div
                                                                key={platform}
                                                                className="flex items-center p-4 bg-[#0a0a0a] rounded-lg border border-[#313131]"
                                                            >
                                                                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                                                                <span className="text-[#e5e5e5]">
                                                                    {platform}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
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
                                                    Share your watchlists with others or export your
                                                    data.
                                                </p>
                                            </div>

                                            <div className="space-y-6">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                                                    <div className="bg-[#0a0a0a] rounded-xl p-6 border border-[#313131]">
                                                        <ArrowUpTrayIcon className="w-8 h-8 text-green-500 mb-4" />
                                                        <h3 className="text-lg font-semibold text-white mb-2">
                                                            Export Data
                                                        </h3>
                                                        <p className="text-[#b3b3b3] mb-4">
                                                            Download your data in various formats
                                                            (JSON, CSV, XML).
                                                        </p>
                                                        <button className="bannerButton bg-green-600 text-white hover:bg-green-700">
                                                            Export Data
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeSection === 'account' && (
                                        <div className="p-8">
                                            <div className="mb-6">
                                                <h2 className="text-2xl font-bold text-white mb-2">
                                                    Account Management
                                                </h2>
                                                <p className="text-[#b3b3b3]">
                                                    Manage your account data and deletion options.
                                                </p>
                                            </div>

                                            <AccountManagement />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}

export default Settings
