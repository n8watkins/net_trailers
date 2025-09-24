import React, { useState } from 'react'
import {
    XMarkIcon,
    EnvelopeIcon,
    KeyIcon,
    ArrowUpTrayIcon,
    ShareIcon,
    UserCircleIcon,
    CogIcon,
} from '@heroicons/react/24/outline'
import useAuth from '../hooks/useAuth'

interface UserSettingsModalProps {
    isOpen: boolean
    onClose: () => void
}

const UserSettingsModal: React.FC<UserSettingsModalProps> = ({ isOpen, onClose }) => {
    const [activeSection, setActiveSection] = useState<
        'main' | 'email' | 'password' | 'upload' | 'share'
    >('main')
    const { user } = useAuth()

    if (!isOpen) return null

    const handleSectionChange = (section: typeof activeSection) => {
        setActiveSection(section)
    }

    const handleBackToMain = () => {
        setActiveSection('main')
    }

    const getUserName = () => {
        if (user?.displayName) {
            return user.displayName.split(' ')[0]
        }
        if (user?.email) {
            return user.email.split('@')[0]
        }
        return 'User'
    }

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
            <div className="bg-[#141414] border border-gray-600/50 rounded-xl w-full max-w-md mx-auto shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-600/50">
                    <div className="flex items-center space-x-3">
                        <CogIcon className="w-6 h-6 text-red-500" />
                        <h2 className="text-xl font-semibold text-white">
                            {activeSection === 'main'
                                ? 'User Settings'
                                : activeSection === 'email'
                                  ? 'Change Email'
                                  : activeSection === 'password'
                                    ? 'Reset Password'
                                    : activeSection === 'upload'
                                      ? 'Upload Watchlists'
                                      : 'Share Watchlists'}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors duration-200"
                    >
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {activeSection === 'main' && (
                        <div className="space-y-4">
                            {/* User Info */}
                            <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
                                <div className="flex items-center space-x-3">
                                    <UserCircleIcon className="w-10 h-10 text-gray-400" />
                                    <div>
                                        <p className="text-white font-medium">{getUserName()}</p>
                                        <p className="text-gray-400 text-sm">{user?.email}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Settings Options */}
                            <div className="space-y-2">
                                <button
                                    onClick={() => handleSectionChange('email')}
                                    className="w-full flex items-center p-4 text-left hover:bg-gray-800/50 rounded-lg transition-colors duration-200 group"
                                >
                                    <EnvelopeIcon className="w-5 h-5 text-gray-400 group-hover:text-red-500 mr-4" />
                                    <div>
                                        <p className="text-white font-medium">Change Email</p>
                                        <p className="text-gray-400 text-sm">
                                            Update your email address
                                        </p>
                                    </div>
                                </button>

                                <button
                                    onClick={() => handleSectionChange('password')}
                                    className="w-full flex items-center p-4 text-left hover:bg-gray-800/50 rounded-lg transition-colors duration-200 group"
                                >
                                    <KeyIcon className="w-5 h-5 text-gray-400 group-hover:text-red-500 mr-4" />
                                    <div>
                                        <p className="text-white font-medium">Reset Password</p>
                                        <p className="text-gray-400 text-sm">
                                            Change your account password
                                        </p>
                                    </div>
                                </button>

                                <button
                                    onClick={() => handleSectionChange('upload')}
                                    className="w-full flex items-center p-4 text-left hover:bg-gray-800/50 rounded-lg transition-colors duration-200 group"
                                >
                                    <ArrowUpTrayIcon className="w-5 h-5 text-gray-400 group-hover:text-red-500 mr-4" />
                                    <div>
                                        <p className="text-white font-medium">Upload Watchlists</p>
                                        <p className="text-gray-400 text-sm">
                                            Import watchlists from other users
                                        </p>
                                    </div>
                                </button>

                                <button
                                    onClick={() => handleSectionChange('share')}
                                    className="w-full flex items-center p-4 text-left hover:bg-gray-800/50 rounded-lg transition-colors duration-200 group"
                                >
                                    <ShareIcon className="w-5 h-5 text-gray-400 group-hover:text-red-500 mr-4" />
                                    <div>
                                        <p className="text-white font-medium">Share Watchlists</p>
                                        <p className="text-gray-400 text-sm">
                                            Share your watchlists with others
                                        </p>
                                    </div>
                                </button>
                            </div>
                        </div>
                    )}

                    {activeSection === 'email' && (
                        <div className="space-y-6">
                            <p className="text-gray-300">
                                Update your email address for your account.
                            </p>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Current Email
                                    </label>
                                    <input
                                        type="email"
                                        value={user?.email || ''}
                                        disabled
                                        className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-md text-gray-400 cursor-not-allowed"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        New Email
                                    </label>
                                    <input
                                        type="email"
                                        placeholder="Enter new email address"
                                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                    />
                                </div>
                            </div>

                            <div className="flex space-x-3">
                                <button
                                    onClick={handleBackToMain}
                                    className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors duration-200"
                                >
                                    Back
                                </button>
                                <button className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-200">
                                    Update Email
                                </button>
                            </div>
                        </div>
                    )}

                    {activeSection === 'password' && (
                        <div className="space-y-6">
                            <p className="text-gray-300">Change your account password.</p>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Current Password
                                    </label>
                                    <input
                                        type="password"
                                        placeholder="Enter current password"
                                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        New Password
                                    </label>
                                    <input
                                        type="password"
                                        placeholder="Enter new password"
                                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Confirm New Password
                                    </label>
                                    <input
                                        type="password"
                                        placeholder="Confirm new password"
                                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                    />
                                </div>
                            </div>

                            <div className="flex space-x-3">
                                <button
                                    onClick={handleBackToMain}
                                    className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors duration-200"
                                >
                                    Back
                                </button>
                                <button className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-200">
                                    Update Password
                                </button>
                            </div>
                        </div>
                    )}

                    {activeSection === 'upload' && (
                        <div className="space-y-6">
                            <p className="text-gray-300">
                                Import watchlists shared by other users.
                            </p>

                            <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center">
                                <ArrowUpTrayIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                <p className="text-white font-medium mb-2">Upload Watchlist File</p>
                                <p className="text-gray-400 text-sm mb-4">
                                    Support for CSV, JSON, and other formats
                                </p>
                                <input
                                    type="file"
                                    accept=".csv,.json"
                                    className="hidden"
                                    id="watchlist-upload"
                                />
                                <label
                                    htmlFor="watchlist-upload"
                                    className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-200 cursor-pointer"
                                >
                                    Choose File
                                </label>
                            </div>

                            <div className="flex space-x-3">
                                <button
                                    onClick={handleBackToMain}
                                    className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors duration-200"
                                >
                                    Back
                                </button>
                            </div>
                        </div>
                    )}

                    {activeSection === 'share' && (
                        <div className="space-y-6">
                            <p className="text-gray-300">Share your watchlists with other users.</p>

                            <div className="space-y-4">
                                <div className="bg-gray-800/50 rounded-lg p-4">
                                    <h3 className="text-white font-medium mb-2">My Watchlist</h3>
                                    <p className="text-gray-400 text-sm mb-3">
                                        Share your main watchlist
                                    </p>
                                    <button className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors duration-200">
                                        Generate Share Link
                                    </button>
                                </div>

                                <div className="bg-gray-800/50 rounded-lg p-4">
                                    <h3 className="text-white font-medium mb-2">Custom Lists</h3>
                                    <p className="text-gray-400 text-sm mb-3">
                                        Share your custom watchlists
                                    </p>
                                    <button className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors duration-200">
                                        Manage Sharing
                                    </button>
                                </div>
                            </div>

                            <div className="flex space-x-3">
                                <button
                                    onClick={handleBackToMain}
                                    className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors duration-200"
                                >
                                    Back
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default UserSettingsModal
