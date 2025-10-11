import React, { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import {
    UserIcon,
    UserCircleIcon,
    ArrowRightOnRectangleIcon,
    CogIcon,
    InformationCircleIcon,
    CommandLineIcon,
    AcademicCapIcon,
    ArrowDownTrayIcon,
    EnvelopeIcon,
    KeyIcon,
    ArrowUpTrayIcon,
    ShareIcon,
} from '@heroicons/react/24/outline'
import useAuth from '../hooks/useAuth'
import { useRouter } from 'next/router'
import useUserData from '../hooks/useUserData'
import { exportUserDataToCSV } from '../utils/csvExport'

interface AvatarDropdownProps {
    className?: string
    onOpenAuthModal?: () => void
    onOpenSignUpModal?: () => void
    onOpenAboutModal?: () => void
    onOpenTutorial?: () => void
    onOpenKeyboardShortcuts?: () => void
}

const AvatarDropdown: React.FC<AvatarDropdownProps> = ({
    className = '',
    onOpenAuthModal,
    onOpenSignUpModal,
    onOpenAboutModal,
    onOpenTutorial,
    onOpenKeyboardShortcuts,
}) => {
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const { user, logOut } = useAuth()
    const userData = useUserData()
    const { likedMovies, hiddenMovies, defaultWatchlist } = userData
    const userSession = userData.sessionType === 'authenticated' ? userData.userSession : null
    const router = useRouter()

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleLogout = async () => {
        await logOut()
        setIsOpen(false)
        router.push('/')
    }

    const handleProfileClick = () => {
        setIsOpen(false)
        // TODO: Navigate to profile page when implemented
    }

    const handleSettingsClick = () => {
        setIsOpen(false)
        router.push('/settings')
    }

    const handleAboutClick = () => {
        setIsOpen(false)
        onOpenAboutModal?.()
    }

    const handleExportCSV = () => {
        setIsOpen(false)
        if (userSession?.preferences) {
            exportUserDataToCSV(userSession.preferences)
        }
    }

    const getInitials = (email: string) => {
        return email.charAt(0).toUpperCase()
    }

    const getUserName = () => {
        if (user?.displayName) {
            // Extract first name from display name
            return user.displayName.split(' ')[0]
        }
        if (user?.email) {
            return user.email.split('@')[0]
        }
        return 'User'
    }

    if (!user) {
        return (
            <div className={`relative ${className}`} ref={dropdownRef}>
                {/* Avatar Button - Not Logged In */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full bg-gray-600 hover:bg-gray-500 transition-colors duration-200 focus:outline-none"
                    aria-label="User menu"
                    aria-expanded={isOpen}
                >
                    <UserIcon className="w-7 h-7 md:w-8 md:h-8 text-white" />
                </button>

                {/* Dropdown Menu - Not Logged In */}
                {isOpen && (
                    <div className="absolute right-0 mt-2 w-64 sm:w-72 bg-black/95 backdrop-blur-sm border border-red-500/40 rounded-xl shadow-2xl shadow-red-500/20 z-[110] py-1 animate-fade-in-down">
                        {/* Guest Account Status */}
                        <div className="px-5 py-4 border-b border-gray-700/50">
                            <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-gray-600 rounded-md flex items-center justify-center">
                                    <UserIcon className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <p className="text-white font-medium text-sm">Guest Account</p>
                                    <p className="text-gray-400 text-xs">Browsing anonymously</p>
                                </div>
                            </div>
                        </div>

                        {/* Menu Items */}
                        <div className="py-2">
                            <button
                                onClick={() => {
                                    setIsOpen(false)
                                    onOpenAuthModal?.()
                                }}
                                className="group flex items-center w-full px-5 py-3 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-all duration-200"
                            >
                                <UserCircleIcon className="w-5 h-5 mr-4 group-hover:text-red-500 transition-colors duration-200" />
                                Sign In
                            </button>

                            <button
                                onClick={() => {
                                    setIsOpen(false)
                                    onOpenSignUpModal?.()
                                }}
                                className="group flex items-center w-full px-5 py-3 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-all duration-200"
                            >
                                <UserCircleIcon className="w-5 h-5 mr-4 group-hover:text-red-500 transition-colors duration-200" />
                                Create Account
                            </button>

                            <div className="h-px bg-gray-700/50 mx-5 my-2"></div>

                            <button
                                onClick={handleSettingsClick}
                                className="group flex items-center w-full px-5 py-3 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-all duration-200"
                            >
                                <CogIcon className="w-5 h-5 mr-4 group-hover:text-red-500 transition-colors duration-200" />
                                Settings
                            </button>

                            <button
                                onClick={() => {
                                    setIsOpen(false)
                                    onOpenTutorial?.()
                                }}
                                className="group flex items-center w-full px-5 py-3 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-all duration-200"
                            >
                                <AcademicCapIcon className="w-5 h-5 mr-4 group-hover:text-red-500 transition-colors duration-200" />
                                Tutorial
                            </button>

                            {(likedMovies.length > 0 ||
                                hiddenMovies.length > 0 ||
                                defaultWatchlist.length > 0) && (
                                <button
                                    onClick={handleExportCSV}
                                    className="group flex items-center w-full px-5 py-3 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-all duration-200"
                                >
                                    <ArrowDownTrayIcon className="w-5 h-5 mr-4 group-hover:text-red-500 transition-colors duration-200" />
                                    Export Data
                                </button>
                            )}

                            <button
                                onClick={handleAboutClick}
                                className="group flex items-center w-full px-5 py-3 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-all duration-200"
                            >
                                <InformationCircleIcon className="w-5 h-5 mr-4 group-hover:text-red-500 transition-colors duration-200" />
                                About NetTrailers
                            </button>

                            <button
                                onClick={() => {
                                    setIsOpen(false)
                                    onOpenKeyboardShortcuts?.()
                                }}
                                className="group flex items-center w-full px-5 py-3 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-all duration-200"
                            >
                                <CommandLineIcon className="w-5 h-5 mr-4 group-hover:text-red-500 transition-colors duration-200" />
                                Keyboard Shortcuts
                            </button>
                        </div>
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            {/* Avatar Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full bg-red-600 hover:bg-red-700 transition-colors duration-200 focus:outline-none"
                aria-label="Profile menu"
                aria-expanded={isOpen}
            >
                {user.photoURL ? (
                    <Image
                        src={user.photoURL}
                        alt="Profile"
                        width={56}
                        height={56}
                        className="w-12 h-12 md:w-14 md:h-14 rounded-full object-cover"
                    />
                ) : (
                    <span className="text-white text-base md:text-lg font-bold">
                        {getInitials(user.email || 'U')}
                    </span>
                )}
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-64 sm:w-72 bg-black/95 backdrop-blur-sm border border-red-500/40 rounded-xl shadow-2xl shadow-red-500/20 z-[110] py-1 animate-fade-in-down">
                    {/* User Info Header */}
                    <div className="px-5 py-4 border-b border-gray-700/50">
                        <div className="flex items-center space-x-3">
                            <div className="flex-1 min-w-0">
                                <p className="text-white font-medium text-sm truncate">
                                    {getUserName()}
                                </p>
                                <p className="text-gray-400 text-xs truncate">{user.email}</p>
                            </div>
                        </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-2">
                        <button
                            onClick={handleProfileClick}
                            className="group flex items-center w-full px-5 py-3 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-all duration-200"
                        >
                            <UserCircleIcon className="w-5 h-5 mr-4 group-hover:text-red-500 transition-colors duration-200" />
                            Profile
                        </button>

                        <button
                            onClick={handleSettingsClick}
                            className="group flex items-center w-full px-5 py-3 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-all duration-200"
                        >
                            <CogIcon className="w-5 h-5 mr-4 group-hover:text-red-500 transition-colors duration-200" />
                            Settings
                        </button>

                        <div className="h-px bg-gray-700/50 mx-5 my-2"></div>

                        <button
                            onClick={() => {
                                setIsOpen(false)
                                onOpenTutorial?.()
                            }}
                            className="group flex items-center w-full px-5 py-3 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-all duration-200"
                        >
                            <AcademicCapIcon className="w-5 h-5 mr-4 group-hover:text-red-500 transition-colors duration-200" />
                            Tutorial
                        </button>

                        {(likedMovies.length > 0 ||
                            hiddenMovies.length > 0 ||
                            defaultWatchlist.length > 0) && (
                            <button
                                onClick={handleExportCSV}
                                className="group flex items-center w-full px-5 py-3 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-all duration-200"
                            >
                                <ArrowDownTrayIcon className="w-5 h-5 mr-4 group-hover:text-red-500 transition-colors duration-200" />
                                Export Data
                            </button>
                        )}

                        <button
                            onClick={handleAboutClick}
                            className="group flex items-center w-full px-5 py-3 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-all duration-200"
                        >
                            <InformationCircleIcon className="w-5 h-5 mr-4 group-hover:text-red-500 transition-colors duration-200" />
                            About NetTrailers
                        </button>

                        <button
                            onClick={() => {
                                setIsOpen(false)
                                onOpenKeyboardShortcuts?.()
                            }}
                            className="group flex items-center w-full px-5 py-3 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-all duration-200"
                        >
                            <CommandLineIcon className="w-5 h-5 mr-4 group-hover:text-red-500 transition-colors duration-200" />
                            Keyboard Shortcuts
                        </button>

                        <div className="h-px bg-gray-700/50 mx-5 my-2"></div>

                        <button
                            onClick={handleLogout}
                            className="group flex items-center w-full px-5 py-3 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-all duration-200"
                        >
                            <ArrowRightOnRectangleIcon className="w-5 h-5 mr-4 group-hover:text-red-500 transition-colors duration-200" />
                            Sign Out
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default AvatarDropdown
