import React, { useState } from 'react'
import Head from 'next/head'
import Image from 'next/image'
import { useRouter } from 'next/router'
import {
    XMarkIcon,
    EnvelopeIcon,
    KeyIcon,
    ArrowUpTrayIcon,
    ShareIcon,
    UserCircleIcon,
    TrashIcon,
    ChevronRightIcon,
    CogIcon,
} from '@heroicons/react/24/outline'
import useAuth from '../hooks/useAuth'
import AccountManagement from '../components/AccountManagement'

type SettingsSection = 'profile' | 'email' | 'password' | 'upload' | 'share' | 'account'

interface SidebarItem {
    id: SettingsSection
    title: string
    description: string
    icon: React.ComponentType<any>
    priority: 'low' | 'medium' | 'high' | 'danger'
}

const Settings: React.FC = () => {
    const [activeSection, setActiveSection] = useState<SettingsSection>('profile')
    const { user } = useAuth()
    const router = useRouter()

    const sidebarItems: SidebarItem[] = [
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

    const getUserName = () => {
        if (user?.displayName) {
            return user.displayName.split(' ')[0]
        }
        if (user?.email) {
            return user.email.split('@')[0]
        }
        return 'User'
    }

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'danger':
                return 'border-l-red-500 bg-red-500/5'
            case 'high':
                return 'border-l-orange-500 bg-orange-500/5'
            case 'medium':
                return 'border-l-blue-500 bg-blue-500/5'
            default:
                return 'border-l-gray-500 bg-gray-500/5'
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
                return 'text-gray-400'
        }
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-[#141414] flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-semibold text-white mb-4">Sign In Required</h1>
                    <p className="text-gray-400 mb-6">
                        You need to be signed in to access settings.
                    </p>
                    <button
                        onClick={() => router.push('/')}
                        className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-200"
                    >
                        Go Home
                    </button>
                </div>
            </div>
        )
    }

    return (
        <>
            <Head>
                <title>Settings - NetTrailer</title>
                <meta name="description" content="Manage your NetTrailer account settings" />
            </Head>

            <div className="min-h-screen bg-[#141414]">
                {/* Header */}
                <div className="bg-[#1a1a1a] border-b border-gray-800">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between h-16">
                            <div className="flex items-center space-x-4">
                                <button
                                    onClick={() => router.back()}
                                    className="text-gray-400 hover:text-white transition-colors duration-200"
                                >
                                    <XMarkIcon className="w-6 h-6" />
                                </button>
                                <div className="flex items-center space-x-3">
                                    <CogIcon className="w-8 h-8 text-red-500" />
                                    <div>
                                        <h1 className="text-2xl font-bold text-white">Settings</h1>
                                        <p className="text-gray-400 text-sm">
                                            Manage your account preferences
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* User info in header */}
                            <div className="flex items-center space-x-3">
                                <UserCircleIcon className="w-8 h-8 text-gray-400" />
                                <div className="text-right">
                                    <p className="text-white font-medium">{getUserName()}</p>
                                    <p className="text-gray-400 text-sm">{user?.email}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="flex gap-8">
                        {/* Sidebar */}
                        <div className="w-80 flex-shrink-0">
                            <div className="bg-[#1a1a1a] rounded-xl border border-gray-800">
                                <div className="p-6 border-b border-gray-800">
                                    <h2 className="text-lg font-semibold text-white">Settings</h2>
                                    <p className="text-gray-400 text-sm mt-1">
                                        Choose what you&apos;d like to manage
                                    </p>
                                </div>

                                <nav className="p-4">
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
                                                                ? 'bg-red-600/20 border-l-red-500 shadow-lg'
                                                                : `hover:bg-gray-800/50 ${getPriorityColor(item.priority)}`
                                                        }`}
                                                    >
                                                        <Icon
                                                            className={`w-6 h-6 mr-4 ${getIconColor(item.priority, isActive)}`}
                                                        />
                                                        <div className="flex-1">
                                                            <h3
                                                                className={`font-medium ${isActive ? 'text-white' : 'text-gray-200'}`}
                                                            >
                                                                {item.title}
                                                            </h3>
                                                            <p className="text-gray-400 text-sm mt-1">
                                                                {item.description}
                                                            </p>
                                                        </div>
                                                        <ChevronRightIcon
                                                            className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-500'}`}
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
                            <div className="bg-[#1a1a1a] rounded-xl border border-gray-800">
                                {activeSection === 'profile' && (
                                    <div className="p-8">
                                        <div className="mb-6">
                                            <h2 className="text-2xl font-bold text-white mb-2">
                                                Profile Information
                                            </h2>
                                            <p className="text-gray-400">
                                                Manage your profile and account information.
                                            </p>
                                        </div>

                                        <div className="space-y-6">
                                            {/* Profile Picture */}
                                            <div className="flex items-center space-x-6">
                                                {user.photoURL ? (
                                                    <Image
                                                        src={user.photoURL}
                                                        alt="Profile"
                                                        width={96}
                                                        height={96}
                                                        className="rounded-full object-cover border-4 border-gray-700"
                                                    />
                                                ) : (
                                                    <div className="w-24 h-24 bg-red-600 rounded-full flex items-center justify-center border-4 border-gray-700">
                                                        <span className="text-white font-bold text-2xl">
                                                            {getUserName().charAt(0).toUpperCase()}
                                                        </span>
                                                    </div>
                                                )}
                                                <div>
                                                    <h3 className="text-xl font-semibold text-white">
                                                        {getUserName()}
                                                    </h3>
                                                    <p className="text-gray-400">{user.email}</p>
                                                    <p className="text-gray-500 text-sm mt-1">
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
                                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                                    Display Name
                                                </label>
                                                <input
                                                    type="text"
                                                    value={user.displayName || ''}
                                                    placeholder="Enter your display name"
                                                    className="w-full max-w-md px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                                />
                                            </div>

                                            {/* Email (read-only) */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                                    Email Address
                                                </label>
                                                <input
                                                    type="email"
                                                    value={user.email || ''}
                                                    disabled
                                                    className="w-full max-w-md px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-gray-400 cursor-not-allowed"
                                                />
                                                <p className="text-gray-500 text-sm mt-1">
                                                    To change your email, use the Email Settings
                                                    section
                                                </p>
                                            </div>

                                            <div className="pt-4">
                                                <button className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 font-medium">
                                                    Save Changes
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeSection === 'email' && (
                                    <div className="p-8">
                                        <div className="mb-6">
                                            <h2 className="text-2xl font-bold text-white mb-2">
                                                Email Settings
                                            </h2>
                                            <p className="text-gray-400">
                                                Update your email address for your account.
                                            </p>
                                        </div>

                                        <div className="space-y-6 max-w-md">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                                    Current Email
                                                </label>
                                                <input
                                                    type="email"
                                                    value={user?.email || ''}
                                                    disabled
                                                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-gray-400 cursor-not-allowed"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                                    New Email Address
                                                </label>
                                                <input
                                                    type="email"
                                                    placeholder="Enter new email address"
                                                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                                    Confirm Password
                                                </label>
                                                <input
                                                    type="password"
                                                    placeholder="Enter your current password"
                                                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                                />
                                            </div>

                                            <div className="pt-4">
                                                <button className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 font-medium">
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
                                            <p className="text-gray-400">
                                                Change your account password for better security.
                                            </p>
                                        </div>

                                        <div className="space-y-6 max-w-md">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                                    Current Password
                                                </label>
                                                <input
                                                    type="password"
                                                    placeholder="Enter current password"
                                                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                                    New Password
                                                </label>
                                                <input
                                                    type="password"
                                                    placeholder="Enter new password"
                                                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                                    Confirm New Password
                                                </label>
                                                <input
                                                    type="password"
                                                    placeholder="Confirm new password"
                                                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                                />
                                            </div>

                                            <div className="pt-4">
                                                <button className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 font-medium">
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
                                            <p className="text-gray-400">
                                                Import watchlists and data from other platforms.
                                            </p>
                                        </div>

                                        <div className="max-w-2xl">
                                            <div className="border-2 border-dashed border-gray-600 rounded-xl p-12 text-center hover:border-gray-500 transition-colors duration-200">
                                                <ArrowUpTrayIcon className="w-16 h-16 text-gray-400 mx-auto mb-6" />
                                                <h3 className="text-xl font-semibold text-white mb-2">
                                                    Upload Watchlist File
                                                </h3>
                                                <p className="text-gray-400 mb-6">
                                                    Support for CSV, JSON, and other formats from
                                                    Netflix, Hulu, Amazon Prime, and more.
                                                </p>
                                                <input
                                                    type="file"
                                                    accept=".csv,.json,.txt"
                                                    className="hidden"
                                                    id="watchlist-upload"
                                                />
                                                <label
                                                    htmlFor="watchlist-upload"
                                                    className="inline-flex items-center px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 cursor-pointer font-medium"
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
                                                            className="flex items-center p-4 bg-gray-800/50 rounded-lg"
                                                        >
                                                            <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                                                            <span className="text-gray-300">
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
                                            <p className="text-gray-400">
                                                Share your watchlists with others or export your
                                                data.
                                            </p>
                                        </div>

                                        <div className="space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                                                    <ShareIcon className="w-8 h-8 text-blue-500 mb-4" />
                                                    <h3 className="text-lg font-semibold text-white mb-2">
                                                        Share Watchlists
                                                    </h3>
                                                    <p className="text-gray-400 mb-4">
                                                        Generate shareable links for your watchlists
                                                        and custom lists.
                                                    </p>
                                                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200">
                                                        Manage Sharing
                                                    </button>
                                                </div>

                                                <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                                                    <ArrowUpTrayIcon className="w-8 h-8 text-green-500 mb-4" />
                                                    <h3 className="text-lg font-semibold text-white mb-2">
                                                        Export Data
                                                    </h3>
                                                    <p className="text-gray-400 mb-4">
                                                        Download your data in various formats (JSON,
                                                        CSV, XML).
                                                    </p>
                                                    <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200">
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
                                            <p className="text-gray-400">
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
        </>
    )
}

export default Settings
