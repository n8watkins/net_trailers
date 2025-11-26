import React, { useState, useEffect, useRef } from 'react'
import { devLog } from '../../utils/debugLogger'
import {
    MagnifyingGlassIcon,
    Bars3Icon,
    XMarkIcon,
    HomeIcon,
    TvIcon,
    FilmIcon,
    EyeIcon,
    EyeSlashIcon,
    CheckCircleIcon,
    UserIcon,
    ClockIcon,
    HeartIcon,
    BellIcon,
    Cog6ToothIcon,
    RectangleStackIcon,
    TrophyIcon,
    UsersIcon,
    SparklesIcon,
    ArrowPathIcon,
    HandThumbUpIcon,
} from '@heroicons/react/24/outline'
import {
    UserIcon as UserIconSolid,
    ClockIcon as ClockIconSolid,
    HeartIcon as HeartIconSolid,
    BellIcon as BellIconSolid,
    Cog6ToothIcon as Cog6ToothIconSolid,
    RectangleStackIcon as RectangleStackIconSolid,
    EyeSlashIcon as EyeSlashIconSolid,
    TrophyIcon as TrophyIconSolid,
    HandThumbUpIcon as HandThumbUpIconSolid,
} from '@heroicons/react/24/solid'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import SearchBar from '../search/SearchBar'
import useAuth from '../../hooks/useAuth'
import AuthModal from '../modals/AuthModal'
import AvatarDropdown from '../auth/AvatarDropdown'
import GenresDropdown from '../content/GenresDropdown'
import ProfileDropdown from '../content/ProfileDropdown'
import { useToast } from '../../hooks/useToast'
import { useDebugSettings } from '../debug/DebugControls'
import { useModalStore } from '../../stores/modalStore'
import { ChildSafetyIndicator } from '../content/ChildSafetyIndicator'
import { GuestModeIndicator } from '../auth/GuestModeIndicator'
import { useLayoutContext } from '../../contexts/LayoutContext'
import NotificationBell from '../notifications/NotificationBell'
import NotificationPanel from '../notifications/NotificationPanel'
import { useChildSafety } from '../../hooks/useChildSafety'
import type { Content } from '../../typings'

interface HeaderProps {
    onOpenAboutModal?: () => void
    onOpenTutorial?: () => void
    onOpenKeyboardShortcuts?: () => void
}

interface NavItem {
    label: string
    href: string
    icon: React.ComponentType<{ className?: string }>
    iconSolid: React.ComponentType<{ className?: string }>
}

const subNavItems: NavItem[] = [
    {
        label: 'Profile',
        href: '/profile',
        icon: UserIcon,
        iconSolid: UserIconSolid,
    },
    {
        label: 'Watch History',
        href: '/history',
        icon: ClockIcon,
        iconSolid: ClockIconSolid,
    },
    {
        label: 'Rankings',
        href: '/rankings',
        icon: TrophyIcon,
        iconSolid: TrophyIconSolid,
    },
    {
        label: 'Collections',
        href: '/collections',
        icon: RectangleStackIcon,
        iconSolid: RectangleStackIconSolid,
    },
    {
        label: 'Liked Content',
        href: '/liked',
        icon: HeartIcon,
        iconSolid: HeartIconSolid,
    },
    {
        label: 'My Ratings',
        href: '/ratings',
        icon: HandThumbUpIcon,
        iconSolid: HandThumbUpIconSolid,
    },
    {
        label: 'Hidden Content',
        href: '/hidden',
        icon: EyeSlashIcon,
        iconSolid: EyeSlashIconSolid,
    },
    {
        label: 'Notifications',
        href: '/notifications',
        icon: BellIcon,
        iconSolid: BellIconSolid,
    },
    {
        label: 'Settings',
        href: '/settings/preferences',
        icon: Cog6ToothIcon,
        iconSolid: Cog6ToothIconSolid,
    },
]

function Header({ onOpenAboutModal, onOpenTutorial, onOpenKeyboardShortcuts }: HeaderProps = {}) {
    // Get handlers from context, fallback to props for backwards compatibility
    const layoutContext = useLayoutContext()
    const handleOpenAboutModal = onOpenAboutModal || layoutContext.onOpenAboutModal
    const handleOpenTutorial = onOpenTutorial || layoutContext.onOpenTutorial
    const handleOpenKeyboardShortcuts =
        onOpenKeyboardShortcuts || layoutContext.onOpenKeyboardShortcuts
    const [isScrolled, setIsScrolled] = useState(false)
    const [showSearch, setShowSearch] = useState(false)
    const [showMobileMenu, setShowMobileMenu] = useState(false)
    const [isSearchExpanded, setIsSearchExpanded] = useState(false)
    const [isRandomLoading, setIsRandomLoading] = useState(false)
    const { authModal, openAuthModal, closeAuthModal, openModal } = useModalStore()
    const router = useRouter()
    const pathname = usePathname()
    const { user } = useAuth()
    const { showSuccess, showError, showWatchlistAdd, showWatchlistRemove } = useToast()
    const debugSettings = useDebugSettings()
    const { isEnabled: childSafetyEnabled } = useChildSafety()

    // Lazy-loaded cache for random content (only initialized after first use)
    const randomContentCache = useRef<Content[]>([])
    const lastClickTime = useRef<number>(0)
    const isPrefetching = useRef<boolean>(false)

    // Determine if we should show sub-navigation based on current path
    const subNavPaths = [
        '/profile',
        '/history',
        '/rankings',
        '/collections',
        '/liked',
        '/ratings',
        '/hidden',
        '/notifications',
        '/settings',
    ]
    const showSubNav = subNavPaths.some((path) => pathname.startsWith(path))

    const triggerTestToasts = () => {
        // Test all toast types with realistic messages
        devLog('🧪 Testing all toast types...')

        // Success toast
        showSuccess(`Welcome back, ${user?.displayName || user?.email?.split('@')[0] || 'Guest'}!`)

        // Watchlist add (1 second delay)
        setTimeout(() => {
            showWatchlistAdd('Inception', 'Added to Watchlist')
            devLog('✅ Toast 1: Watchlist Add')
        }, 1000)

        // Error toast (2 seconds delay)
        setTimeout(() => {
            showError('Failed to load recommendations. Please try again.')
            devLog('✅ Toast 2: Error')
        }, 2000)

        // Watchlist remove (3 seconds delay)
        setTimeout(() => {
            showWatchlistRemove('The Dark Knight', 'Removed from Watchlist')
            devLog('✅ Toast 3: Watchlist Remove')
        }, 3000)

        // Another success (4 seconds delay)
        setTimeout(() => {
            showSuccess('Profile updated successfully!')
            devLog('✅ Toast 4: Success')
        }, 4000)

        // Final error to test stacking (5 seconds delay)
        setTimeout(() => {
            showError('Network connection lost. Some features may be unavailable.')
            devLog('✅ Toast 5: Network Error')
            devLog('🎉 All toast tests complete!')
        }, 5000)
    }

    // Prefetch random content pool in background (lazy initialization)
    const prefetchRandomPool = async () => {
        if (isPrefetching.current) return

        isPrefetching.current = true
        try {
            const response = await fetch(
                `/api/random-content?count=15&childSafetyMode=${childSafetyEnabled ? 'true' : 'false'}`,
                { cache: 'no-store' }
            )

            if (!response.ok) {
                devLog('Failed to prefetch random content pool')
                return
            }

            const data = await response.json()
            if (data?.items && Array.isArray(data.items)) {
                // Normalize all items
                const normalized = data.items.map((item: Content) => ({
                    ...item,
                    media_type: item.media_type === 'tv' ? 'tv' : 'movie',
                })) as Content[]

                randomContentCache.current = normalized
                devLog(`✅ Prefetched ${normalized.length} random content items`)
            }
        } catch (error) {
            devLog('Error prefetching random content:', error)
        } finally {
            isPrefetching.current = false
        }
    }

    const handleRandomContent = async (options?: { closeMenu?: boolean }) => {
        if (isRandomLoading) return

        // Rate limiting: 1 second cooldown between clicks
        const now = Date.now()
        if (now - lastClickTime.current < 1000) {
            devLog('⏱️ Surprise Me cooldown active (1s)')
            return
        }
        lastClickTime.current = now

        if (options?.closeMenu) {
            setShowMobileMenu(false)
        }

        setIsRandomLoading(true)
        try {
            // Try to serve from cache first (instant!)
            if (randomContentCache.current.length > 0) {
                const randomIndex = Math.floor(Math.random() * randomContentCache.current.length)
                const randomContent = randomContentCache.current[randomIndex]

                // Remove used item from cache
                randomContentCache.current.splice(randomIndex, 1)

                devLog(`🎲 Serving from cache (${randomContentCache.current.length} remaining)`)

                // Auto-refetch when pool depletes to 3 items
                if (randomContentCache.current.length <= 3 && !isPrefetching.current) {
                    devLog('🔄 Cache low, triggering background refetch')
                    prefetchRandomPool()
                }

                // Open modal with cached content
                openModal(randomContent, true, false)
                setIsRandomLoading(false)
                return
            }

            // Cache empty - fetch single item from API
            devLog('📡 Cache empty, fetching from API')
            const response = await fetch(
                `/api/random-content?childSafetyMode=${childSafetyEnabled ? 'true' : 'false'}`,
                { cache: 'no-store' }
            )

            if (!response.ok) {
                throw new Error(`Random content request failed: ${response.status}`)
            }

            const data = await response.json()
            const randomContent = data?.content as Content | undefined

            if (!randomContent || !randomContent.id) {
                throw new Error('Random content payload missing')
            }

            const normalizedContent = {
                ...randomContent,
                media_type: randomContent.media_type === 'tv' ? 'tv' : 'movie',
            } as Content

            openModal(normalizedContent, true, false)

            // Lazy initialization: Prefetch pool after first successful use
            if (randomContentCache.current.length === 0 && !isPrefetching.current) {
                devLog('🚀 First use detected, prefetching pool in background')
                prefetchRandomPool()
            }
        } catch (error) {
            showError('Unable to find something to watch', 'Please try again')
        } finally {
            setIsRandomLoading(false)
        }
    }

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 0) {
                setIsScrolled(true)
            } else {
                setIsScrolled(false)
            }
        }

        // Check initial scroll position on mount
        handleScroll()

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
                className={`fixed top-0 left-0 right-0 z-[200] flex flex-col transition-all duration-300 ${
                    isScrolled
                        ? 'bg-[#141414]/80 backdrop-blur-md'
                        : 'bg-gradient-to-b from-black/50 via-black/30 to-transparent'
                }`}
            >
                {/* Main Navigation Bar */}
                <div className="flex w-full items-center justify-between space-x-2 md:space-x-6 px-4 py-4">
                    <Image
                        src="/nettrailers-logo.png"
                        width={140}
                        height={70}
                        alt="NetTrailers Logo"
                        className="cursor-pointer object-contain select-none w-[100px] h-auto sm:w-[120px] md:w-[140px]"
                        priority
                        onClick={() => {
                            if (pathname === '/') {
                                // Already on home page - smooth scroll to top
                                window.scrollTo({ top: 0, behavior: 'smooth' })
                            } else {
                                // Navigate to home page
                                router.push('/')
                            }
                        }}
                    />
                    <div className="hidden lg:flex items-center space-x-8 flex-1">
                        <ul className="flex space-x-6 items-center">
                            <li
                                className={`headerLink cursor-pointer flex items-center space-x-1 select-none ${pathname === '/' ? 'text-white hover:text-white font-semibold' : ''}`}
                                onClick={() => router.push('/')}
                            >
                                <HomeIcon className="h-5 w-5 relative z-10" />
                                <span className="relative z-10">Home</span>
                            </li>
                            <li>
                                <GenresDropdown />
                            </li>
                            <li
                                className={`headerLink cursor-pointer flex items-center space-x-1 select-none group relative overflow-visible ${
                                    isRandomLoading ? 'cursor-wait' : ''
                                }`}
                                onClick={() => !isRandomLoading && handleRandomContent()}
                                title="Jump to a random movie or TV show"
                            >
                                <span className="absolute -inset-3 opacity-0 group-hover:opacity-50 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-400 via-red-300/60 via-40% to-transparent rounded-md blur-lg transition-opacity duration-400" />
                                <SparklesIcon
                                    className={`h-5 w-5 relative z-10 ${isRandomLoading ? 'animate-pulse' : ''}`}
                                />
                                <span className="relative z-10">Surprise Me!</span>
                            </li>
                            {process.env.NODE_ENV === 'development' &&
                                debugSettings.showToastTester && (
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
                            <div className="w-full max-w-96">
                                <SearchBar
                                    placeholder="Search movies and shows..."
                                    className="w-full"
                                    inputId="navbar-search-input"
                                    voiceSourceId="header-desktop-search"
                                />
                            </div>
                        </div>

                        {/* Profile Dropdown - After Search Bar */}
                        <div className="ml-4">
                            <ProfileDropdown />
                        </div>

                        {/* Community Link - After Profile */}
                        <div
                            className={`headerLink cursor-pointer flex items-center space-x-1 select-none ${
                                pathname?.startsWith('/community')
                                    ? 'text-white hover:text-white font-semibold'
                                    : ''
                            }`}
                            onClick={() => router.push('/community/rankings')}
                        >
                            <UsersIcon className="h-5 w-5 relative z-10" />
                            <span className="relative z-10">Community</span>
                        </div>

                        {/* Child Safety Indicator - After Community */}
                        <div className="flex items-center ml-4">
                            <ChildSafetyIndicator />
                        </div>
                    </div>

                    {/* Right side: Mobile menu, Avatar, Notifications */}
                    <div className="flex items-center space-x-4 text-sm font-light">
                        {/* Mobile Layout: Search + Hamburger + Avatar */}
                        <div className="lg:hidden flex items-center space-x-1">
                            {/* Mobile Search Icon */}
                            <button
                                className="min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer text-white"
                                onClick={() => setShowSearch(!showSearch)}
                                aria-label="Search"
                            >
                                <MagnifyingGlassIcon className="h-6 w-6" />
                            </button>

                            {/* Mobile Menu Toggle */}
                            <button
                                className="min-w-[44px] min-h-[44px] flex items-center justify-center"
                                onClick={() => setShowMobileMenu(!showMobileMenu)}
                                aria-label={showMobileMenu ? 'Close menu' : 'Open menu'}
                            >
                                {showMobileMenu ? (
                                    <XMarkIcon className="h-6 w-6 text-white" />
                                ) : (
                                    <Bars3Icon className="h-6 w-6 text-white" />
                                )}
                            </button>
                        </div>

                        {/* Guest Mode Indicator - Desktop only */}
                        <div className="hidden lg:block">
                            <GuestModeIndicator />
                        </div>

                        {/* Notification Bell with Panel */}
                        <div className="relative">
                            <NotificationBell />
                            <NotificationPanel />
                        </div>

                        {/* Avatar Dropdown */}
                        <AvatarDropdown
                            onOpenAuthModal={() => openAuthModal('signin')}
                            onOpenSignUpModal={() => openAuthModal('signup')}
                            onOpenAboutModal={handleOpenAboutModal}
                            onOpenTutorial={handleOpenTutorial}
                            onOpenKeyboardShortcuts={handleOpenKeyboardShortcuts}
                        />
                    </div>
                </div>

                {/* Sub-Navigation - Conditionally rendered on user pages */}
                {showSubNav && (
                    <div className="w-full border-t border-gray-800/30">
                        <nav
                            className="mx-auto max-w-7xl px-2 sm:px-4 py-2 sm:py-4"
                            aria-label="User navigation"
                        >
                            <div className="flex gap-2 sm:gap-8 justify-center sm:justify-start">
                                {subNavItems.map((item) => {
                                    // Check if current path starts with the item's href (handles nested routes like /settings/preferences)
                                    const isActive = pathname.startsWith(item.href)
                                    const Icon = isActive ? item.iconSolid : item.icon

                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            title={item.label}
                                            className={`group relative flex items-center justify-center gap-2 whitespace-nowrap border-b-2 px-2 sm:px-1 py-2 sm:py-3 text-sm font-medium transition-colors min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 ${
                                                isActive
                                                    ? 'border-red-600 text-red-600'
                                                    : 'border-transparent text-gray-400 hover:text-gray-200'
                                            }`}
                                        >
                                            <Icon
                                                className="h-5 w-5 sm:h-5 sm:w-5"
                                                aria-hidden="true"
                                            />
                                            <span className="hidden sm:inline">{item.label}</span>
                                        </Link>
                                    )
                                })}
                            </div>
                        </nav>
                    </div>
                )}

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
                            inputId="navbar-mobile-search-input"
                            voiceSourceId="header-mobile-search"
                        />
                    </div>
                </div>

                {/* Mobile Navigation Modal */}
                {showMobileMenu && (
                    <>
                        {/* Modal Backdrop - Fixed near header */}
                        <div
                            className="lg:hidden fixed inset-0 z-[105] bg-black/80 backdrop-blur-sm flex items-start justify-center pt-20 px-4"
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
                                                    pathname === '/collections'
                                                        ? 'text-white font-semibold bg-red-600/20'
                                                        : 'hover:bg-white/10'
                                                }`}
                                                onClick={() => {
                                                    router.push('/collections')
                                                    setShowMobileMenu(false)
                                                }}
                                            >
                                                <EyeIcon className="h-5 w-5" />
                                                <span>Collections</span>
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
                                        <li>
                                            <button
                                                className={`w-full text-left headerLink flex items-center space-x-3 text-base py-3 px-3 rounded-lg transition-colors select-none group relative overflow-visible ${
                                                    isRandomLoading
                                                        ? 'cursor-wait'
                                                        : 'hover:bg-white/10'
                                                }`}
                                                onClick={() =>
                                                    handleRandomContent({ closeMenu: true })
                                                }
                                                disabled={isRandomLoading}
                                            >
                                                <span className="absolute -inset-3 opacity-0 group-hover:opacity-50 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-400 via-red-300/60 via-40% to-transparent rounded-lg blur-lg transition-opacity duration-400" />
                                                <SparklesIcon
                                                    className={`h-5 w-5 relative z-10 ${isRandomLoading ? 'animate-pulse' : ''}`}
                                                />
                                                <span className="relative z-10">Surprise Me!</span>
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
