import React, { useState, useEffect } from 'react'
import {
    MagnifyingGlassIcon,
    HeartIcon,
    Bars3Icon,
    XMarkIcon,
    TvIcon,
    FilmIcon,
    EyeIcon,
    EyeSlashIcon,
    CheckCircleIcon,
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useRouter } from 'next/router'
import Image from 'next/image'
import SearchBar from './SearchBar'
import useAuth from '../hooks/useAuth'
import AuthModal from './AuthModal'
import AvatarDropdown from './AvatarDropdown'
import GenresDropdown from './GenresDropdown'
import MyListsDropdown from './MyListsDropdown'
import UserSettingsModal from './UserSettingsModal'

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
    const [showAuthModal, setShowAuthModal] = useState(false)
    const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin')
    const [showSettingsModal, setShowSettingsModal] = useState(false)
    const router = useRouter()
    const { user } = useAuth()
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
                        priority
                        onClick={() => router.push('/')}
                    />
                    <div className="hidden lg:flex items-center space-x-6 flex-1">
                        <ul className="flex space-x-4 items-center">
                            <li
                                className={`headerLink cursor-pointer flex items-center space-x-1 select-none ${router.pathname === '/tv' ? 'text-white hover:text-white font-semibold' : ''}`}
                                onClick={() => router.push('/?filter=tv')}
                            >
                                <TvIcon className="h-4 w-4" />
                                <span>TV Shows</span>
                            </li>
                            <li
                                className={`headerLink cursor-pointer flex items-center space-x-1 select-none ${router.pathname === '/movies' ? 'text-white hover:text-white font-semibold' : ''}`}
                                onClick={() => router.push('/?filter=movies')}
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
                        </ul>

                        {/* Search Bar in Navigation */}
                        <div className="flex items-center search-container">
                            <div
                                className={`transition-all duration-300 ease-in-out ${
                                    isSearchExpanded ? 'w-96' : 'w-72'
                                }`}
                                onClick={() => setIsSearchExpanded(true)}
                            >
                                <SearchBar
                                    placeholder="Search movies and shows..."
                                    className="w-full"
                                    onFocus={() => setIsSearchExpanded(true)}
                                />
                            </div>
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

                    {/* Avatar Dropdown */}
                    <AvatarDropdown
                        onOpenAuthModal={() => {
                            setAuthModalMode('signin')
                            setShowAuthModal(true)
                        }}
                        onOpenSignUpModal={() => {
                            setAuthModalMode('signup')
                            setShowAuthModal(true)
                        }}
                        onOpenAboutModal={onOpenAboutModal}
                        onOpenTutorial={onOpenTutorial}
                        onOpenKeyboardShortcuts={onOpenKeyboardShortcuts}
                        onOpenSettingsModal={() => setShowSettingsModal(true)}
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
                                                    router.pathname === '/'
                                                        ? 'text-white font-semibold bg-red-600/20'
                                                        : 'hover:bg-gray-800/50'
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
                                                    router.pathname === '/tv'
                                                        ? 'text-white font-semibold bg-red-600/20'
                                                        : 'hover:bg-gray-800/50'
                                                }`}
                                                onClick={() => {
                                                    router.push('/?filter=tv')
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
                                                    router.pathname === '/movies'
                                                        ? 'text-white font-semibold bg-red-600/20'
                                                        : 'hover:bg-gray-800/50'
                                                }`}
                                                onClick={() => {
                                                    router.push('/?filter=movies')
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
                                                    router.pathname === '/watchlists'
                                                        ? 'text-white font-semibold bg-red-600/20'
                                                        : 'hover:bg-gray-800/50'
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
                                                    router.pathname === '/liked'
                                                        ? 'text-white font-semibold bg-red-600/20'
                                                        : 'hover:bg-gray-800/50'
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
                                                    router.pathname === '/hidden'
                                                        ? 'text-white font-semibold bg-red-600/20'
                                                        : 'hover:bg-gray-800/50'
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
                                                    router.pathname === '/search'
                                                        ? 'text-white font-semibold bg-red-600/20'
                                                        : 'hover:bg-gray-800/50'
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
                isOpen={showAuthModal}
                onClose={() => setShowAuthModal(false)}
                initialMode={authModalMode}
            />

            {/* User Settings Modal */}
            <UserSettingsModal
                isOpen={showSettingsModal}
                onClose={() => setShowSettingsModal(false)}
            />
        </>
    )
}

export default Header
