import React, { useState, useEffect } from 'react'
import {
    MagnifyingGlassIcon,
    Bars3Icon,
    XMarkIcon,
    TvIcon,
    FilmIcon,
    EyeIcon,
    EyeSlashIcon,
    CheckCircleIcon,
} from '@heroicons/react/24/outline'
import { useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'
import SearchBar from '../search/SearchBar'
import useAuth from '../../hooks/useAuth'
import AuthModal from '../modals/AuthModal'
import AvatarDropdown from '../auth/AvatarDropdown'
import GenresDropdown from '../content/GenresDropdown'
import MyListsDropdown from '../content/MyListsDropdown'
import { useToast } from '../../hooks/useToast'
import { useDebugSettings } from '../debug/DebugControls'
import { useAppStore } from '../../stores/appStore'
import { ChildSafetyIndicator } from '../content/ChildSafetyIndicator'
import { GuestModeIndicator } from '../auth/GuestModeIndicator'

interface HeaderProps {
    onOpenAboutModal?: () => void
    onOpenTutorial?: () => void
    onOpenKeyboardShortcuts?: () => void
}

function Header({ onOpenAboutModal, onOpenTutorial, onOpenKeyboardShortcuts }: HeaderProps = {}) {
    const [isScrolled, setIsScrolled] = useState(false)
    const [showSearch, setShowSearch] = useState(false)
    const [showMobileMenu, setShowMobileMenu] = useState(false)
    const [isSearchExpanded, setIsSearchExpanded] = useState(false)
    const { authModal, openAuthModal, closeAuthModal } = useAppStore()
    const router = useRouter()
    const pathname = usePathname()
    const { user } = useAuth()
    const { showSuccess, showError, showWatchlistAdd, showWatchlistRemove } = useToast()
    const debugSettings = useDebugSettings()

    const triggerTestToasts = () => {
        // Test all toast types with realistic messages
        console.log('🧪 Testing all toast types...')

        // Success toast
        showSuccess(`Welcome back, ${user?.displayName || user?.email?.split('@')[0] || 'Guest'}!`)

        // Watchlist add (1 second delay)
        setTimeout(() => {
            showWatchlistAdd('Inception', 'Added to Watchlist')
            console.log('✅ Toast 1: Watchlist Add')
        }, 1000)

        // Error toast (2 seconds delay)
        setTimeout(() => {
            showError('Failed to load recommendations. Please try again.')
            console.log('✅ Toast 2: Error')
        }, 2000)

        // Watchlist remove (3 seconds delay)
        setTimeout(() => {
            showWatchlistRemove('The Dark Knight', 'Removed from Watchlist')
            console.log('✅ Toast 3: Watchlist Remove')
        }, 3000)

        // Another success (4 seconds delay)
        setTimeout(() => {
            showSuccess('Profile updated successfully!')
            console.log('✅ Toast 4: Success')
        }, 4000)

        // Final error to test stacking (5 seconds delay)
        setTimeout(() => {
            showError('Network connection lost. Some features may be unavailable.')
            console.log('✅ Toast 5: Network Error')
            console.log('🎉 All toast tests complete!')
        }, 5000)
    }
    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 0) {
                setIsScrolled(true)
            } else {
                setIsScrolled(false)
            }
        }

        window.addEventListener('scroll', handleScroll)

        return () => {
            window.removeEventListener('scroll', handleScroll)
        }
    }, [])

    // Close search when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Element
            if (!target.closest('.search-container') && isSearchExpanded) {
                setIsSearchExpanded(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [isSearchExpanded])

    return (
        <>
            <header
                className={`fixed top-0 left-0 right-0 z-[200] transition-all duration-300 ${isScrolled ? 'bg-[#141414]/95 backdrop-blur-sm' : 'bg-gradient-to-b from-black/50 to-transparent'}`}
            >
                <div className="flex w-full items-center space-x-2 md:space-x-6 px-4 py-4">
                    <Image
                        src="/nettrailers-logo.png"
                        width={140}
                        height={70}
                        alt="NetTrailers Logo"
                        className="cursor-pointer object-contain select-none"
                        style={{ width: 'auto', height: 'auto' }}
                        priority
                        onClick={() => router.push('/')}
                    />
                    <div className="hidden lg:flex items-center space-x-6 flex-1">
                        <ul className="flex space-x-4 items-center">
                            <li
                                className={`headerLink cursor-pointer flex items-center space-x-1 select-none ${pathname === '/tv' ? 'text-white hover:text-white font-semibold' : ''}`}
                                onClick={() => router.push('/tv')}
                            >
                                <TvIcon className="h-4 w-4" />
                                <span>TV Shows</span>
                            </li>
                            <li
                                className={`headerLink cursor-pointer flex items-center space-x-1 select-none ${pathname === '/movies' ? 'text-white hover:text-white font-semibold' : ''}`}
                                onClick={() => router.push('/movies')}
                            >
                                <FilmIcon className="h-4 w-4" />
                                <span>Movies</span>
                            </li>
                            <li>
                                <GenresDropdown />
                            </li>
                            <li>
                                <MyListsDropdown />
                            </li>
                            {process.env.NODE_ENV === 'development' &&
                                debugSettings.showToastDebug && (
                                    <li>
                                        <button
                                            onClick={triggerTestToasts}
                                            className="headerLink cursor-pointer flex items-center space-x-1 select-none bg-green-600/20 hover:bg-green-600/30 px-3 py-1 rounded-md border border-green-500/30 transition-all"
                                            title="Test all toast notification types (success, error, watchlist add/remove)"
                                        >
                                            <span className="text-green-400">🧪</span>
                                            <span className="text-xs font-medium text-green-400">
                                                Test Toasts
                                            </span>
                                        </button>
                                    </li>
                                )}
                        </ul>

                        {/* Search Bar in Navigation */}
                        <div className="flex items-center search-container">
                            <div className="w-96">
                                <SearchBar
                                    placeholder="Search movies and shows..."
                                    className="w-full"
                                />
                            </div>
                        </div>

                        {/* Child Safety Indicator - After Search Bar */}
                        <div className="flex items-center ml-4">
                            <ChildSafetyIndicator />
                        </div>
                    </div>
                </div>

                <div className="flex items-center space-x-4 text-sm font-light">
                    {/* Mobile Layout: Search + Hamburger + Avatar */}
                    <div className="lg:hidden flex items-center space-x-3">
                        {/* Mobile Search Icon */}
                        <MagnifyingGlassIcon
                            className="h-6 w-6 cursor-pointer text-white"
                            onClick={() => setShowSearch(!showSearch)}
                        />

                        {/* Mobile Menu Toggle */}
                        <button
                            className="h-6 w-6"
                            onClick={() => setShowMobileMenu(!showMobileMenu)}
                        >
                            {showMobileMenu ? (
                                <XMarkIcon className="h-6 w-6 text-white" />
                            ) : (
                                <Bars3Icon className="h-6 w-6 text-white" />
                            )}
                        </button>
                    </div>

                    {/* Guest Mode Indicator - Hidden on mobile */}
                    <div className="hidden lg:block">
                        <GuestModeIndicator />
                    </div>

                    {/* Avatar Dropdown */}
                    <AvatarDropdown
                        onOpenAuthModal={() => openAuthModal('signin')}
                        onOpenSignUpModal={() => openAuthModal('signup')}
                        onOpenAboutModal={onOpenAboutModal}
                        onOpenTutorial={onOpenTutorial}
                        onOpenKeyboardShortcuts={onOpenKeyboardShortcuts}
                    />
                </div>

                {/* Mobile Search Bar with Slide Animation */}
                <div
                    className={`lg:hidden absolute top-full left-0 right-0 z-[110] bg-black/95 backdrop-blur-sm border-t border-gray-600/50 transition-all duration-300 ease-in-out ${
                        showSearch
                            ? 'transform translate-y-0 opacity-100 visible'
                            : 'transform -translate-y-full opacity-0 invisible'
                    }`}
                >
                    <div className="p-4">
                        <SearchBar
                            placeholder="Search movies and TV shows..."
                            className="w-full"
                            onBlur={() => setShowSearch(false)}
                        />
                    </div>
                </div>

                {/* Mobile Navigation Modal */}
                {showMobileMenu && (
                    <>
                        {/* Modal Backdrop */}
                        <div
                            className="lg:hidden fixed inset-0 z-[105] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                            onClick={() => setShowMobileMenu(false)}
                        >
                            {/* Modal Content */}
                            <div
                                className="bg-[#0a0a0a] border border-gray-600/50 rounded-xl w-full max-w-sm mx-auto transform transition-all duration-300 ease-in-out scale-100 opacity-100"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Navigation Items */}
                                <nav className="p-6">
                                    <ul className="space-y-4">
                                        <li>
                                            <button
                                                className={`w-full text-left headerLink flex items-center space-x-3 text-base py-3 px-3 rounded-lg transition-colors select-none ${
                                                    pathname === '/'
                                                        ? 'text-white font-semibold bg-red-600/20'
                                                        : 'hover:bg-white/10'
                                                }`}
                                                onClick={() => {
                                                    router.push('/')
                                                    setShowMobileMenu(false)
                                                }}
                                            >
                                                <svg
                                                    className="h-5 w-5"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                                                    />
                                                </svg>
                                                <span>Home</span>
                                            </button>
                                        </li>
                                        <li>
                                            <button
                                                className={`w-full text-left headerLink flex items-center space-x-3 text-base py-3 px-3 rounded-lg transition-colors select-none ${
                                                    pathname === '/tv'
                                                        ? 'text-white font-semibold bg-red-600/20'
                                                        : 'hover:bg-white/10'
                                                }`}
                                                onClick={() => {
                                                    router.push('/tv')
                                                    setShowMobileMenu(false)
                                                }}
                                            >
                                                <TvIcon className="h-5 w-5" />
                                                <span>TV Shows</span>
                                            </button>
                                        </li>
                                        <li>
                                            <button
                                                className={`w-full text-left headerLink flex items-center space-x-3 text-base py-3 px-3 rounded-lg transition-colors select-none ${
                                                    pathname === '/movies'
                                                        ? 'text-white font-semibold bg-red-600/20'
                                                        : 'hover:bg-white/10'
                                                }`}
                                                onClick={() => {
                                                    router.push('/movies')
                                                    setShowMobileMenu(false)
                                                }}
                                            >
                                                <FilmIcon className="h-5 w-5" />
                                                <span>Movies</span>
                                            </button>
                                        </li>
                                        <li>
                                            <button
                                                className={`w-full text-left headerLink flex items-center space-x-3 text-base py-3 px-3 rounded-lg transition-colors select-none ${
                                                    pathname === '/watchlists'
                                                        ? 'text-white font-semibold bg-red-600/20'
                                                        : 'hover:bg-white/10'
                                                }`}
                                                onClick={() => {
                                                    router.push('/watchlists')
                                                    setShowMobileMenu(false)
                                                }}
                                            >
                                                <EyeIcon className="h-5 w-5" />
                                                <span>Watchlists</span>
                                            </button>
                                        </li>
                                        <li>
                                            <button
                                                className={`w-full text-left headerLink flex items-center space-x-3 text-base py-3 px-3 rounded-lg transition-colors select-none ${
                                                    pathname === '/liked'
                                                        ? 'text-white font-semibold bg-red-600/20'
                                                        : 'hover:bg-white/10'
                                                }`}
                                                onClick={() => {
                                                    router.push('/liked')
                                                    setShowMobileMenu(false)
                                                }}
                                            >
                                                <CheckCircleIcon className="h-5 w-5" />
                                                <span>Liked Content</span>
                                            </button>
                                        </li>
                                        <li>
                                            <button
                                                className={`w-full text-left headerLink flex items-center space-x-3 text-base py-3 px-3 rounded-lg transition-colors select-none ${
                                                    pathname === '/hidden'
                                                        ? 'text-white font-semibold bg-red-600/20'
                                                        : 'hover:bg-white/10'
                                                }`}
                                                onClick={() => {
                                                    router.push('/hidden')
                                                    setShowMobileMenu(false)
                                                }}
                                            >
                                                <EyeSlashIcon className="h-5 w-5" />
                                                <span>Hidden Content</span>
                                            </button>
                                        </li>
                                        <li>
                                            <button
                                                className={`w-full text-left headerLink flex items-center space-x-3 text-base py-3 px-3 rounded-lg transition-colors select-none ${
                                                    pathname === '/search'
                                                        ? 'text-white font-semibold bg-red-600/20'
                                                        : 'hover:bg-white/10'
                                                }`}
                                                onClick={() => {
                                                    router.push('/search')
                                                    setShowMobileMenu(false)
                                                }}
                                            >
                                                <MagnifyingGlassIcon className="h-5 w-5" />
                                                <span>Search</span>
                                            </button>
                                        </li>
                                    </ul>
                                </nav>
                            </div>
                        </div>
                    </>
                )}
            </header>

            {/* Auth Modal - Moved outside header to fix positioning */}
            <AuthModal
                isOpen={authModal.isOpen}
                onClose={closeAuthModal}
                initialMode={authModal.mode}
            />
        </>
    )
}

export default Header
