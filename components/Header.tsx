import React, { useState, useEffect } from 'react'
import { MagnifyingGlassIcon, HeartIcon, Bars3Icon, XMarkIcon, TvIcon, FilmIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useRouter } from 'next/router'
import Image from 'next/image'
import SearchBar from './SearchBar'
import useAuth from '../hooks/useAuth'
import GenresDropdown from './GenresDropdown'
import AuthModal from './AuthModal'
import AvatarDropdown from './AvatarDropdown'
function Header() {
    const [isScrolled, setIsScrolled] = useState(false)
    const [showSearch, setShowSearch] = useState(false)
    const [showMobileMenu, setShowMobileMenu] = useState(false)
    const [isSearchExpanded, setIsSearchExpanded] = useState(false)
    const [showAuthModal, setShowAuthModal] = useState(false)
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
        <header className={`${isScrolled && 'bg-[#141414]'}`}>
            <div className="flex w-full items-center space-x-2 md:space-x-6">
                <Image
                    src="https://rb.gy/ulxxee"
                    width={100}
                    height={100}
                    alt="Netflix Logo"
                    className="cursor-pointer object-contain"
                    priority
                    unoptimized
                    onClick={() => router.push('/')}
                />
                <div className="hidden md:flex items-center space-x-6 flex-1">
                    <ul className="flex space-x-4">
                        <li
                            className={`headerLink cursor-pointer flex items-center space-x-1 ${router.pathname === '/tv' ? 'text-white hover:text-white font-semibold' : ''}`}
                            onClick={() => router.push('/?filter=tv')}
                        >
                            <TvIcon className="h-4 w-4" />
                            <span>TV Shows</span>
                        </li>
                        <li
                            className={`headerLink cursor-pointer flex items-center space-x-1 ${router.pathname === '/movies' ? 'text-white hover:text-white font-semibold' : ''}`}
                            onClick={() => router.push('/?filter=movies')}
                        >
                            <FilmIcon className="h-4 w-4" />
                            <span>Movies</span>
                        </li>
                        <li>
                            <GenresDropdown />
                        </li>
                        <li
                            className={`headerLink cursor-pointer flex items-center space-x-1 ${router.pathname === '/favorites' ? 'text-white hover:text-white font-semibold' : ''}`}
                            onClick={() => router.push('/favorites')}
                        >
                            <HeartIcon className="h-4 w-4" />
                            <span>My Favorites</span>
                        </li>
                    </ul>

                    {/* Search Bar in Navigation */}
                    <div className="flex items-center search-container">
                        <div
                            className={`transition-all duration-300 ease-in-out ${
                                isSearchExpanded ? 'w-64' : 'w-48'
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
                {/* Mobile Menu Toggle */}
                <button
                    className="md:hidden h-6 w-6"
                    onClick={() => setShowMobileMenu(!showMobileMenu)}
                >
                    {showMobileMenu ? (
                        <XMarkIcon className="h-6 w-6 text-white" />
                    ) : (
                        <Bars3Icon className="h-6 w-6 text-white" />
                    )}
                </button>

                {/* Mobile Search Icon */}
                <MagnifyingGlassIcon
                    className="md:hidden h-6 w-6 cursor-pointer"
                    onClick={() => setShowSearch(!showSearch)}
                />

                {/* Avatar Dropdown */}
                <AvatarDropdown onOpenAuthModal={() => setShowAuthModal(true)} />
            </div>

            {/* Mobile Search Bar */}
            {showSearch && (
                <div className="md:hidden absolute top-full left-0 right-0 z-50 bg-black/95 backdrop-blur-sm border-t border-gray-600/50 p-4">
                    <SearchBar
                        placeholder="Search movies and TV shows..."
                        className="w-full"
                        onBlur={() => setShowSearch(false)}
                    />
                </div>
            )}

            {/* Mobile Navigation Menu */}
            {showMobileMenu && (
                <div className="md:hidden absolute top-full left-0 right-0 z-50 bg-black/95 backdrop-blur-sm border-t border-gray-600/50">
                    <nav className="px-4 py-6">
                        <ul className="space-y-4">
                            <li>
                                <button
                                    className={`w-full text-left headerLink flex items-center space-x-2 text-lg ${router.pathname === '/tv' ? 'text-white font-semibold' : ''}`}
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
                                    className={`w-full text-left headerLink flex items-center space-x-2 text-lg ${router.pathname === '/movies' ? 'text-white font-semibold' : ''}`}
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
                                    className={`w-full text-left headerLink flex items-center space-x-2 text-lg ${router.pathname === '/favorites' ? 'text-white font-semibold' : ''}`}
                                    onClick={() => {
                                        router.push('/favorites')
                                        setShowMobileMenu(false)
                                    }}
                                >
                                    <HeartIcon className="h-5 w-5" />
                                    <span>My Favorites</span>
                                </button>
                            </li>
                        </ul>
                    </nav>
                </div>
            )}

            {/* Auth Modal */}
            <AuthModal
                isOpen={showAuthModal}
                onClose={() => setShowAuthModal(false)}
            />
        </header>
    )
}

export default Header
