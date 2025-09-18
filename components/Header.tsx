import React, { useState, useEffect } from 'react'
import { MagnifyingGlassIcon, BellIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useRouter } from 'next/router'
import Image from 'next/image'
import useAuth from '../hooks/useAuth'
import SearchBar from './SearchBar'
function Header() {
    const [isScrolled, setIsScrolled] = useState(false)
    const [showSearch, setShowSearch] = useState(false)
    const { logOut } = useAuth()
    const router = useRouter()
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

    return (
        <header className={`${isScrolled && 'bg-[#141414]'}`}>
            <div className="flex w-full items-center space-x-2 md:space-x-10  ">
                <Image
                    src="https://rb.gy/ulxxee"
                    width={100}
                    height={100}
                    alt="Netflix Logo"
                    className="cursor-pointer object-contain"
                    priority
                />
                <ul className=" hidden space-x-4 md:flex  ">
                    <li
                        className={`headerLink cursor-pointer ${router.pathname === '/' ? 'text-white hover:text-white cursor-default' : ''}`}
                        onClick={() => router.push('/')}
                    >
                        Home
                    </li>
                    <li className="headerLink">TV Shows</li>
                    <li className="headerLink">Movies</li>
                    <li className="headerLink">New & Popular</li>
                    <li
                        className={`headerLink cursor-pointer ${router.pathname === '/favorites' ? 'text-white hover:text-white font-semibold' : ''}`}
                        onClick={() => router.push('/favorites')}
                    >
                        My Favorites
                    </li>
                    <li
                        className={`headerLink cursor-pointer ${router.pathname === '/search' ? 'text-white hover:text-white font-semibold' : ''}`}
                        onClick={() => router.push('/search')}
                    >
                        Search
                    </li>
                </ul>
            </div>

            {/* Search Bar - Desktop */}
            <div className="hidden md:flex flex-1 max-w-xs ml-6">
                <SearchBar
                    placeholder="Search..."
                    className="w-full"
                    onFocus={() => {
                        if (router.pathname !== '/search') {
                            router.push('/search')
                        }
                    }}
                />
            </div>

            <div className="flex items-center space-x-4 text-sm font-light">
                {/* Mobile Search Toggle */}
                <MagnifyingGlassIcon
                    className="h-6 w-6 cursor-pointer md:hidden"
                    onClick={() => {
                        setShowSearch(!showSearch)
                        if (!showSearch && router.pathname !== '/search') {
                            router.push('/search')
                        }
                    }}
                />

                {/* Desktop Search Link */}
                <MagnifyingGlassIcon
                    className="hidden md:inline h-6 w-6 cursor-pointer"
                    onClick={() => router.push('/search')}
                />

                <BellIcon className="hidden h-6 w-6 sm:inline cursor-pointer" />

                <Image
                    onClick={logOut}
                    src="https://occ-0-3997-3996.1.nflxso.net/dnm/api/v6/K6hjPJd6cR6FpVELC5Pd6ovHRSk/AAAABX5_zNxCZOEGlSGykILrWVH75fVZe_-5H9HlAXtJoNs6AK8FTjyMG-llwgLJXGA8RUwxotwOOHMh3ovdrXFpq9-J4CBmFKA.png?r=1d4"
                    alt="User Profile"
                    width={32}
                    height={32}
                    className="rounded h-8 w-8 cursor-pointer"
                />
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
        </header>
    )
}

export default Header
