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
} from '@heroicons/react/24/outline'
import useAuth from '../../hooks/useAuth'
import { useRouter } from 'next/router'
import useUserData from '../../hooks/useUserData'
import { exportUserDataToCSV } from '../../utils/csvExport'
import { useAuthStatus } from '../../hooks/useAuthStatus'
import { getCachedUserData } from '../../utils/authCache'

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
    const { isAuthenticated, isLoading, hasOptimisticAuth } = useAuthStatus()
    const userData = useUserData()
    const { likedMovies, hiddenMovies, defaultWatchlist } = userData
    const userSession = userData.sessionType === 'authenticated' ? userData.userSession : null
    const router = useRouter()

    // Load cached user data for optimistic UI (only on client side)
    // This is synchronous to prevent any loading flicker
    const cachedUser = hasOptimisticAuth && !user ? getCachedUserData() : null

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

    // Show loading state ONLY if we don't have cached data and auth is loading
    // If we have cached data (hasOptimisticAuth), skip loading state entirely
    if (isLoading && !hasOptimisticAuth) {
        return (
            <div className={`relative ${className}`} ref={dropdownRef}>
                {/* Avatar Button - Loading */}
                <button
                    disabled
                    className="flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full bg-gray-700 transition-colors duration-200 focus:outline-none cursor-wait"
                    aria-label="Loading user menu"
                >
                    <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                </button>
            </div>
        )
    }

    // Show guest UI if not authenticated (regardless of hasOptimisticAuth)
    // After logout, user might be null but hasOptimisticAuth could still be true briefly
    if (!isAuthenticated) {
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
                        <div className="px-5 py-6 border-b border-gray-700/50">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-gray-600 rounded-md flex items-center justify-center">
                                    <UserIcon className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <p className="text-white font-medium text-base">
                                        Guest Account
                                    </p>
                                    <p className="text-gray-400 text-sm">Browsing anonymously</p>
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
                                className="group flex items-center w-full px-5 py-4 text-base text-gray-300 hover:bg-white/10 hover:text-white transition-all duration-200"
                            >
                                <UserCircleIcon className="w-6 h-6 mr-4 group-hover:text-red-500 transition-colors duration-200" />
                                Sign In
                            </button>

                            <button
                                onClick={() => {
                                    setIsOpen(false)
                                    onOpenSignUpModal?.()
                                }}
                                className="group flex items-center w-full px-5 py-4 text-base text-gray-300 hover:bg-white/10 hover:text-white transition-all duration-200"
                            >
                                <UserCircleIcon className="w-6 h-6 mr-4 group-hover:text-red-500 transition-colors duration-200" />
                                Create Account
                            </button>

                            <div className="h-px bg-gray-700/50 mx-5 my-2"></div>

                            <button
                                onClick={handleSettingsClick}
                                className="group flex items-center justify-between w-full px-5 py-4 text-base text-gray-300 hover:bg-white/10 hover:text-white transition-all duration-200"
                            >
                                <div className="flex items-center">
                                    <CogIcon className="w-6 h-6 mr-4 group-hover:text-red-500 transition-colors duration-200" />
                                    Settings
                                </div>
                            </button>

                            {(likedMovies.length > 0 ||
                                hiddenMovies.length > 0 ||
                                defaultWatchlist.length > 0) && (
                                <button
                                    onClick={handleExportCSV}
                                    className="group flex items-center justify-between w-full px-5 py-4 text-base text-gray-300 hover:bg-white/10 hover:text-white transition-all duration-200"
                                >
                                    <div className="flex items-center">
                                        <ArrowDownTrayIcon className="w-6 h-6 mr-4 group-hover:text-red-500 transition-colors duration-200" />
                                        Export Data
                                    </div>
                                </button>
                            )}

                            <div className="h-px bg-gray-700/50 mx-5 my-2"></div>

                            <button
                                onClick={() => {
                                    setIsOpen(false)
                                    onOpenTutorial?.()
                                }}
                                className="group flex items-center justify-between w-full px-5 py-4 text-base text-gray-300 hover:bg-white/10 hover:text-white transition-all duration-200"
                            >
                                <div className="flex items-center">
                                    <AcademicCapIcon className="w-6 h-6 mr-4 group-hover:text-red-500 transition-colors duration-200" />
                                    Tutorial
                                </div>
                                <span className="text-xs text-gray-400 font-mono font-semibold">
                                    Alt+T
                                </span>
                            </button>

                            <button
                                onClick={handleAboutClick}
                                className="group flex items-center justify-between w-full px-5 py-4 text-base text-gray-300 hover:bg-white/10 hover:text-white transition-all duration-200"
                            >
                                <div className="flex items-center">
                                    <InformationCircleIcon className="w-6 h-6 mr-4 group-hover:text-red-500 transition-colors duration-200" />
                                    About NetTrailers
                                </div>
                                <span className="text-xs text-gray-400 font-mono font-semibold">
                                    Alt+I
                                </span>
                            </button>

                            <button
                                onClick={() => {
                                    setIsOpen(false)
                                    onOpenKeyboardShortcuts?.()
                                }}
                                className="group flex items-center justify-between w-full px-5 py-4 text-base text-gray-300 hover:bg-white/10 hover:text-white transition-all duration-200"
                            >
                                <div className="flex items-center">
                                    <CommandLineIcon className="w-6 h-6 mr-4 group-hover:text-red-500 transition-colors duration-200" />
                                    Keyboard Shortcuts
                                </div>
                                <span className="text-xs text-gray-400 font-mono font-semibold">
                                    ?
                                </span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        )
    }

    // Use cached data for optimistic UI, fall back to Firebase user
    const displayUser =
        user ||
        (cachedUser
            ? {
                  email: cachedUser.email,
                  displayName: cachedUser.displayName,
                  photoURL: cachedUser.photoURL,
              }
            : null)

    // Authenticated but no user data available at all (shouldn't happen with cache)
    // Only show loading if we don't have optimistic auth
    if (!displayUser && !hasOptimisticAuth) {
        return (
            <div className={`relative ${className}`} ref={dropdownRef}>
                {/* Avatar Button - Loading user details */}
                <button
                    disabled
                    className="flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full bg-red-600 transition-colors duration-200 focus:outline-none cursor-wait"
                    aria-label="Loading user details"
                >
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                </button>
            </div>
        )
    }

    // If we still don't have user data at this point, show guest UI
    if (!displayUser) {
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
                {displayUser.photoURL ? (
                    <Image
                        src={displayUser.photoURL}
                        alt="Profile"
                        width={56}
                        height={56}
                        className="w-12 h-12 md:w-14 md:h-14 rounded-full object-cover"
                    />
                ) : (
                    <span className="text-white text-base md:text-lg font-bold">
                        {getInitials(displayUser.email || 'U')}
                    </span>
                )}
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-64 sm:w-72 bg-black/95 backdrop-blur-sm border border-red-500/40 rounded-xl shadow-2xl shadow-red-500/20 z-[110] py-1 animate-fade-in-down">
                    {/* User Info Header */}
                    <div className="px-5 py-6 border-b border-gray-700/50">
                        <div className="flex items-center space-x-3">
                            <div className="flex-1 min-w-0">
                                <p className="text-white font-medium text-base truncate">
                                    {user?.displayName?.split(' ')[0] ||
                                        displayUser.displayName?.split(' ')[0] ||
                                        displayUser.email?.split('@')[0] ||
                                        'User'}
                                </p>
                                <p className="text-gray-400 text-sm truncate">
                                    {user?.email || displayUser.email}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-2">
                        <button
                            onClick={handleProfileClick}
                            className="group flex items-center w-full px-5 py-4 text-base text-gray-300 hover:bg-white/10 hover:text-white transition-all duration-200"
                        >
                            <UserCircleIcon className="w-6 h-6 mr-4 group-hover:text-red-500 transition-colors duration-200" />
                            Profile
                        </button>

                        <button
                            onClick={handleSettingsClick}
                            className="group flex items-center justify-between w-full px-5 py-4 text-base text-gray-300 hover:bg-white/10 hover:text-white transition-all duration-200"
                        >
                            <div className="flex items-center">
                                <CogIcon className="w-6 h-6 mr-4 group-hover:text-red-500 transition-colors duration-200" />
                                Settings
                            </div>
                        </button>

                        {(likedMovies.length > 0 ||
                            hiddenMovies.length > 0 ||
                            defaultWatchlist.length > 0) && (
                            <button
                                onClick={handleExportCSV}
                                className="group flex items-center justify-between w-full px-5 py-4 text-base text-gray-300 hover:bg-white/10 hover:text-white transition-all duration-200"
                            >
                                <div className="flex items-center">
                                    <ArrowDownTrayIcon className="w-6 h-6 mr-4 group-hover:text-red-500 transition-colors duration-200" />
                                    Export Data
                                </div>
                            </button>
                        )}

                        <div className="h-px bg-gray-700/50 mx-5 my-2"></div>

                        <button
                            onClick={() => {
                                setIsOpen(false)
                                onOpenTutorial?.()
                            }}
                            className="group flex items-center justify-between w-full px-5 py-4 text-base text-gray-300 hover:bg-white/10 hover:text-white transition-all duration-200"
                        >
                            <div className="flex items-center">
                                <AcademicCapIcon className="w-6 h-6 mr-4 group-hover:text-red-500 transition-colors duration-200" />
                                Tutorial
                            </div>
                            <span className="text-xs text-gray-400 font-mono font-semibold">
                                Alt+T
                            </span>
                        </button>

                        <button
                            onClick={handleAboutClick}
                            className="group flex items-center justify-between w-full px-5 py-4 text-base text-gray-300 hover:bg-white/10 hover:text-white transition-all duration-200"
                        >
                            <div className="flex items-center">
                                <InformationCircleIcon className="w-6 h-6 mr-4 group-hover:text-red-500 transition-colors duration-200" />
                                About NetTrailers
                            </div>
                            <span className="text-xs text-gray-400 font-mono font-semibold">
                                Alt+I
                            </span>
                        </button>

                        <button
                            onClick={() => {
                                setIsOpen(false)
                                onOpenKeyboardShortcuts?.()
                            }}
                            className="group flex items-center justify-between w-full px-5 py-4 text-base text-gray-300 hover:bg-white/10 hover:text-white transition-all duration-200"
                        >
                            <div className="flex items-center">
                                <CommandLineIcon className="w-6 h-6 mr-4 group-hover:text-red-500 transition-colors duration-200" />
                                Keyboard Shortcuts
                            </div>
                            <span className="text-xs text-gray-400 font-mono font-semibold">?</span>
                        </button>

                        <div className="h-px bg-gray-700/50 mx-5 my-2"></div>

                        <button
                            onClick={handleLogout}
                            className="group flex items-center w-full px-5 py-4 text-base text-gray-300 hover:bg-white/10 hover:text-white transition-all duration-200"
                        >
                            <ArrowRightOnRectangleIcon className="w-6 h-6 mr-4 group-hover:text-red-500 transition-colors duration-200" />
                            Sign Out
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default AvatarDropdown
