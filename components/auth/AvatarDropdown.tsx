import React, { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import {
    UserCircleIcon,
    ArrowRightOnRectangleIcon,
    CogIcon,
    InformationCircleIcon,
    CommandLineIcon,
    AcademicCapIcon,
    HandRaisedIcon,
    ChevronDownIcon,
} from '@heroicons/react/24/outline'
import useAuth from '../../hooks/useAuth'
import { useRouter } from 'next/navigation'
import useUserData from '../../hooks/useUserData'
import { useAuthStatus } from '../../hooks/useAuthStatus'
import { getCachedUserData } from '../../utils/authCache'

interface AvatarDropdownProps {
    className?: string
    onOpenAuthModal?: () => void
    onOpenSignUpModal?: () => void
    onOpenAboutModal?: () => void
    onOpenTutorial?: () => void
    onOpenKeyboardShortcuts?: () => void
    onOpenWelcome?: () => void
}

const AvatarDropdown: React.FC<AvatarDropdownProps> = ({
    className = '',
    onOpenAuthModal,
    onOpenSignUpModal,
    onOpenAboutModal,
    onOpenTutorial,
    onOpenKeyboardShortcuts,
    onOpenWelcome,
}) => {
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const { user, loading: authLoading, logOut } = useAuth()
    const { hasOptimisticAuth } = useAuthStatus()
    // Decide from the session itself, not the session store: a page that hands over
    // the session it read on the server (SeedSession) knows it before the first
    // paint, while the store only settles after its own effects have run.
    const isLoading = authLoading && !hasOptimisticAuth
    const isAuthenticated = Boolean(user) || (authLoading && hasOptimisticAuth)
    const userData = useUserData()
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
        router.push('/profile')
    }

    const handleSettingsClick = () => {
        setIsOpen(false)
        router.push('/settings/preferences')
    }

    const handleAboutClick = () => {
        setIsOpen(false)
        onOpenAboutModal?.()
    }

    const getInitials = (email: string) => {
        return email.charAt(0).toUpperCase()
    }

    // Only while the session is still being read (a page the edge cache served the
    // same to everyone): a quiet placeholder of the avatar's size, not a spinner
    if (isLoading) {
        return (
            <div className={`relative ${className}`} ref={dropdownRef}>
                <div
                    data-testid="account-placeholder"
                    aria-hidden="true"
                    className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-white/10"
                />
            </div>
        )
    }

    // Show guest UI if not authenticated (regardless of hasOptimisticAuth)
    // After logout, user might be null but hasOptimisticAuth could still be true briefly
    if (!isAuthenticated) {
        return (
            <div className={`relative ${className}`} ref={dropdownRef}>
                {/* One guest control. Phones and tablets: a round button that opens the
                    guest menu (Sign In is its first item). Desktop: a single pill, "Sign in"
                    on the left and the same menu on the right. The tour points at the
                    menu button by its label (constants/tourSteps.ts), so keep it. */}
                <div className="flex items-center lg:h-10 lg:rounded-full lg:bg-brand-500 lg:shadow-lg">
                    <button
                        type="button"
                        onClick={() => {
                            setIsOpen(false)
                            onOpenAuthModal?.()
                        }}
                        className="hidden lg:flex h-full items-center whitespace-nowrap rounded-l-full pl-4 pr-3 text-sm font-semibold text-white transition-colors hover:bg-brand-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70"
                    >
                        Sign in
                    </button>
                    <span aria-hidden="true" className="hidden lg:block h-5 w-px bg-white/30" />
                    <button
                        type="button"
                        onClick={() => setIsOpen(!isOpen)}
                        className="flex items-center justify-center w-10 h-10 md:w-11 md:h-11 rounded-full bg-gray-600 hover:bg-gray-500 hover:scale-105 hover:shadow-[0_0_15px_rgba(255,255,255,0.6)] focus:shadow-[0_0_15px_rgba(255,255,255,0.6)] transition-all duration-300 lg:h-full lg:w-auto lg:gap-0.5 lg:rounded-l-none lg:rounded-r-full lg:bg-transparent lg:pl-2 lg:pr-3 lg:hover:bg-brand-400 lg:hover:scale-100 lg:hover:shadow-none lg:focus:shadow-none focus:outline-none lg:focus-visible:ring-2 lg:focus-visible:ring-inset lg:focus-visible:ring-white/70"
                        aria-label="User menu"
                        aria-expanded={isOpen}
                    >
                        <UserCircleIcon className="w-6 h-6 md:w-7 md:h-7 lg:w-5 lg:h-5 text-white" />
                        <ChevronDownIcon
                            aria-hidden="true"
                            className={`hidden lg:block w-3.5 h-3.5 text-white transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                        />
                    </button>
                </div>

                {/* Dropdown Menu - Not Logged In */}
                {isOpen && (
                    <div className="absolute right-0 mt-6 w-[80vw] xs:w-64 sm:w-72 max-w-[288px] bg-[#0f0f0f]/95 backdrop-blur-sm border border-brand-400/40 rounded-xl shadow-2xl shadow-brand-400/20 z-[110] py-1 animate-fade-in-down">
                        {/* Guest Account Status */}
                        <div className="px-5 py-6 border-b border-gray-700/50">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-gray-600 rounded-md flex items-center justify-center">
                                    <UserCircleIcon className="w-5 h-5 text-white" />
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
                                <UserCircleIcon className="w-6 h-6 mr-4 group-hover:text-brand-300 transition-colors duration-200" />
                                Sign In
                            </button>

                            <button
                                onClick={() => {
                                    setIsOpen(false)
                                    onOpenSignUpModal?.()
                                }}
                                className="group flex items-center w-full px-5 py-4 text-base text-gray-300 hover:bg-white/10 hover:text-white transition-all duration-200"
                            >
                                <UserCircleIcon className="w-6 h-6 mr-4 group-hover:text-brand-300 transition-colors duration-200" />
                                Create Account
                            </button>

                            <div className="h-px bg-gray-700/50 mx-5 my-2"></div>

                            <button
                                onClick={handleSettingsClick}
                                className="group flex items-center justify-between w-full px-5 py-4 text-base text-gray-300 hover:bg-white/10 hover:text-white transition-all duration-200"
                            >
                                <div className="flex items-center">
                                    <CogIcon className="w-6 h-6 mr-4 group-hover:text-brand-300 transition-colors duration-200" />
                                    Settings
                                </div>
                            </button>

                            <div className="h-px bg-gray-700/50 mx-5 my-2"></div>

                            {onOpenWelcome && (
                                <button
                                    onClick={() => {
                                        setIsOpen(false)
                                        onOpenWelcome()
                                    }}
                                    className="group flex items-center justify-between w-full px-5 py-4 text-base text-gray-300 hover:bg-white/10 hover:text-white transition-all duration-200"
                                >
                                    <div className="flex items-center">
                                        <HandRaisedIcon className="w-6 h-6 mr-4 group-hover:text-brand-300 transition-colors duration-200" />
                                        Welcome
                                    </div>
                                </button>
                            )}

                            <button
                                onClick={() => {
                                    setIsOpen(false)
                                    onOpenTutorial?.()
                                }}
                                className="group flex items-center justify-between w-full px-5 py-4 text-base text-gray-300 hover:bg-white/10 hover:text-white transition-all duration-200"
                            >
                                <div className="flex items-center">
                                    <AcademicCapIcon className="w-6 h-6 mr-4 group-hover:text-brand-300 transition-colors duration-200" />
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
                                    <InformationCircleIcon className="w-6 h-6 mr-4 group-hover:text-brand-300 transition-colors duration-200" />
                                    About this project
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
                                    <CommandLineIcon className="w-6 h-6 mr-4 group-hover:text-brand-300 transition-colors duration-200" />
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

    // The session's user, or the cached one while a known session is confirmed
    const displayUser =
        user ||
        (cachedUser
            ? {
                  email: cachedUser.email,
                  displayName: cachedUser.displayName,
                  photoURL: cachedUser.photoURL,
              }
            : null)

    // If we still don't have user data at this point, show guest UI
    if (!displayUser) {
        return (
            <div className={`relative ${className}`} ref={dropdownRef}>
                {/* Avatar Button - Not Logged In */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center justify-center w-10 h-10 md:w-11 md:h-11 rounded-full bg-gray-600 hover:bg-gray-500 hover:scale-105 hover:shadow-[0_0_15px_rgba(255,255,255,0.6)] transition-all duration-300"
                    aria-label="User menu"
                    aria-expanded={isOpen}
                >
                    <UserCircleIcon className="w-6 h-6 md:w-7 md:h-7 text-white" />
                </button>
            </div>
        )
    }

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            {/* Avatar Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                data-tour="avatar-button"
                className="flex items-center justify-center w-10 h-10 md:w-11 md:h-11 rounded-full bg-brand-500 hover:bg-brand-600 hover:scale-105 hover:shadow-[0_0_15px_rgba(255,255,255,0.6)] focus:shadow-[0_0_15px_rgba(255,255,255,0.6)] transition-all duration-300"
                aria-label="Profile menu"
                aria-expanded={isOpen}
            >
                {displayUser.photoURL ? (
                    <Image
                        src={displayUser.photoURL}
                        alt="Profile"
                        width={44}
                        height={44}
                        className="w-10 h-10 md:w-11 md:h-11 rounded-full object-cover"
                    />
                ) : (
                    <span className="text-white text-sm md:text-base font-bold">
                        {getInitials(displayUser.email || 'U')}
                    </span>
                )}
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute right-0 mt-6 w-[80vw] xs:w-64 sm:w-72 max-w-[288px] bg-[#0f0f0f]/95 backdrop-blur-sm border border-brand-400/40 rounded-xl shadow-2xl shadow-brand-400/20 z-[110] py-1 animate-fade-in-down">
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
                            <UserCircleIcon className="w-6 h-6 mr-4 group-hover:text-brand-300 transition-colors duration-200" />
                            Profile
                        </button>

                        <button
                            onClick={handleSettingsClick}
                            className="group flex items-center justify-between w-full px-5 py-4 text-base text-gray-300 hover:bg-white/10 hover:text-white transition-all duration-200"
                        >
                            <div className="flex items-center">
                                <CogIcon className="w-6 h-6 mr-4 group-hover:text-brand-300 transition-colors duration-200" />
                                Settings
                            </div>
                        </button>

                        <div className="h-px bg-gray-700/50 mx-5 my-2"></div>

                        {onOpenWelcome && (
                            <button
                                onClick={() => {
                                    setIsOpen(false)
                                    onOpenWelcome()
                                }}
                                className="group flex items-center justify-between w-full px-5 py-4 text-base text-gray-300 hover:bg-white/10 hover:text-white transition-all duration-200"
                            >
                                <div className="flex items-center">
                                    <HandRaisedIcon className="w-6 h-6 mr-4 group-hover:text-brand-300 transition-colors duration-200" />
                                    Welcome
                                </div>
                            </button>
                        )}

                        <button
                            onClick={() => {
                                setIsOpen(false)
                                onOpenTutorial?.()
                            }}
                            className="group flex items-center justify-between w-full px-5 py-4 text-base text-gray-300 hover:bg-white/10 hover:text-white transition-all duration-200"
                        >
                            <div className="flex items-center">
                                <AcademicCapIcon className="w-6 h-6 mr-4 group-hover:text-brand-300 transition-colors duration-200" />
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
                                <InformationCircleIcon className="w-6 h-6 mr-4 group-hover:text-brand-300 transition-colors duration-200" />
                                About this project
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
                                <CommandLineIcon className="w-6 h-6 mr-4 group-hover:text-brand-300 transition-colors duration-200" />
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
