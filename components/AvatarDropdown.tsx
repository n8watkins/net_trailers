import React, { useState, useRef, useEffect } from 'react'
import { UserIcon, UserCircleIcon, ArrowRightOnRectangleIcon, CogIcon, InformationCircleIcon } from '@heroicons/react/24/outline'
import useAuth from '../hooks/useAuth'
import { useRouter } from 'next/router'
import AboutModal from './AboutModal'

interface AvatarDropdownProps {
    className?: string
    onOpenAuthModal?: () => void
}

const AvatarDropdown: React.FC<AvatarDropdownProps> = ({ className = '', onOpenAuthModal }) => {
    const [isOpen, setIsOpen] = useState(false)
    const [showAboutModal, setShowAboutModal] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const { user, logOut } = useAuth()
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
        // TODO: Navigate to settings page when implemented
    }

    const handleAboutClick = () => {
        setIsOpen(false)
        setShowAboutModal(true)
    }

    const getInitials = (email: string) => {
        return email.charAt(0).toUpperCase()
    }

    const getUserName = () => {
        if (user?.displayName) {
            return user.displayName
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
                    className="flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full bg-gray-600 hover:bg-gray-500 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                    aria-label="User menu"
                    aria-expanded={isOpen}
                >
                    <UserIcon className="w-7 h-7 md:w-8 md:h-8 text-white" />
                </button>

                {/* Dropdown Menu - Not Logged In */}
                {isOpen && (
                    <div className="absolute right-0 mt-2 w-64 sm:w-72 bg-[#181818] border border-gray-600/50 rounded-lg shadow-xl z-50 py-2">
                        {/* Guest Account Status */}
                        <div className="px-4 py-3 border-b border-gray-600/50">
                            <div className="flex items-center space-x-2 mb-2">
                                <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                                    <UserIcon className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <p className="text-white font-medium text-sm">Guest Account</p>
                                    <p className="text-gray-400 text-xs">Browsing anonymously</p>
                                </div>
                            </div>
                        </div>

                        {/* Menu Items */}
                        <div className="py-1">
                            <button
                                onClick={() => {
                                    setIsOpen(false)
                                    onOpenAuthModal?.()
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700/50 hover:text-white transition-colors"
                            >
                                <UserCircleIcon className="w-4 h-4 mr-3" />
                                Sign In
                            </button>

                            <button
                                onClick={() => {
                                    setIsOpen(false)
                                    onOpenAuthModal?.()
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700/50 hover:text-white transition-colors"
                            >
                                <UserCircleIcon className="w-4 h-4 mr-3" />
                                Register
                            </button>

                            <hr className="my-1 border-gray-600/50" />

                            <button
                                onClick={handleAboutClick}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700/50 hover:text-white transition-colors"
                            >
                                <InformationCircleIcon className="w-4 h-4 mr-3" />
                                About NetTrailer
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
                className="flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full bg-red-600 hover:bg-red-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                aria-label="Profile menu"
                aria-expanded={isOpen}
            >
                {user.photoURL ? (
                    <img
                        src={user.photoURL}
                        alt="Profile"
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
                <div className="absolute right-0 mt-2 w-64 sm:w-72 bg-[#181818] border border-gray-600/50 rounded-lg shadow-xl z-50 py-2">
                    {/* User Info Header */}
                    <div className="px-4 py-3 border-b border-gray-600/50">
                        <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                                {user.photoURL ? (
                                    <img
                                        src={user.photoURL}
                                        alt="Profile"
                                        className="w-10 h-10 rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
                                        <span className="text-white font-bold">
                                            {getInitials(user.email || 'U')}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-white font-medium text-sm truncate">
                                    {getUserName()}
                                </p>
                                <p className="text-gray-400 text-xs truncate">
                                    {user.email}
                                </p>
                            </div>
                        </div>

                    </div>

                    {/* Menu Items */}
                    <div className="py-1">
                        <button
                            onClick={handleProfileClick}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700/50 hover:text-white transition-colors"
                        >
                            <UserCircleIcon className="w-4 h-4 mr-3" />
                            Profile
                        </button>

                        <button
                            onClick={handleSettingsClick}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700/50 hover:text-white transition-colors"
                        >
                            <CogIcon className="w-4 h-4 mr-3" />
                            Settings
                        </button>

                        <hr className="my-1 border-gray-600/50" />

                        <button
                            onClick={handleAboutClick}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700/50 hover:text-white transition-colors"
                        >
                            <InformationCircleIcon className="w-4 h-4 mr-3" />
                            About NetTrailer
                        </button>

                        <hr className="my-1 border-gray-600/50" />

                        <button
                            onClick={handleLogout}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700/50 hover:text-white transition-colors"
                        >
                            <ArrowRightOnRectangleIcon className="w-4 h-4 mr-3" />
                            Sign Out
                        </button>
                    </div>
                </div>
            )}

            {/* About Modal */}
            <AboutModal
                isOpen={showAboutModal}
                onClose={() => setShowAboutModal(false)}
            />
        </div>
    )
}

export default AvatarDropdown