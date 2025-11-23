import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
    ChevronDownIcon,
    UserIcon,
    ClockIcon,
    HeartIcon,
    RectangleStackIcon,
    TrophyIcon,
    EyeSlashIcon,
} from '@heroicons/react/24/outline'

function ProfileDropdown() {
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)
    const pathname = usePathname()
    const router = useRouter()

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const isCurrentPath = (path: string) => {
        return pathname === path
    }

    const isAnyProfilePath = () => {
        return pathname
            ? [
                  '/profile',
                  '/watch-history',
                  '/collections',
                  '/rankings',
                  '/liked',
                  '/hidden',
              ].includes(pathname)
            : false
    }

    const handleMouseEnter = () => {
        // Clear any pending close timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
        }
        // Add delay before opening dropdown
        timeoutRef.current = setTimeout(() => {
            setIsOpen(true)
        }, 300) // Delay before opening
    }

    const handleMouseLeave = () => {
        // Clear any pending open timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
        }
        // Add delay before closing dropdown
        timeoutRef.current = setTimeout(() => {
            setIsOpen(false)
        }, 300) // Delay before closing
    }

    const handleLinkClick = () => {
        setIsOpen(false)
    }

    const handleProfileClick = (e: React.MouseEvent) => {
        // Navigate to profile on click
        router.push('/profile')
    }

    return (
        <div
            ref={dropdownRef}
            className="relative"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <button
                onClick={handleProfileClick}
                className={`headerLink cursor-pointer flex items-center space-x-1 select-none ${
                    isAnyProfilePath() ? 'text-white hover:text-white font-semibold' : ''
                }`}
            >
                <UserIcon className="h-5 w-5" />
                <span>My Profile</span>
                <ChevronDownIcon
                    className={`h-5 w-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-[min(75vw,208px)] sm:w-52 bg-black border border-red-500/40 rounded-xl shadow-2xl shadow-red-500/20 z-[250]">
                    <div className="py-2">
                        <Link href="/watch-history" onClick={handleLinkClick}>
                            <div
                                className={`w-full text-left px-4 py-3 hover:bg-white/10 transition-colors flex items-center space-x-3 ${
                                    isCurrentPath('/watch-history')
                                        ? 'bg-white/10 text-white font-semibold'
                                        : 'text-gray-300'
                                }`}
                            >
                                <ClockIcon className="h-4 w-4" />
                                <span>Watch History</span>
                            </div>
                        </Link>

                        <Link href="/collections" onClick={handleLinkClick}>
                            <div
                                className={`w-full text-left px-4 py-3 hover:bg-white/10 transition-colors flex items-center space-x-3 ${
                                    isCurrentPath('/collections')
                                        ? 'bg-white/10 text-white font-semibold'
                                        : 'text-gray-300'
                                }`}
                            >
                                <RectangleStackIcon className="h-4 w-4" />
                                <span>My Collections</span>
                            </div>
                        </Link>

                        <Link href="/rankings" onClick={handleLinkClick}>
                            <div
                                className={`w-full text-left px-4 py-3 hover:bg-white/10 transition-colors flex items-center space-x-3 ${
                                    isCurrentPath('/rankings')
                                        ? 'bg-white/10 text-white font-semibold'
                                        : 'text-gray-300'
                                }`}
                            >
                                <TrophyIcon className="h-4 w-4" />
                                <span>My Rankings</span>
                            </div>
                        </Link>

                        <Link href="/liked" onClick={handleLinkClick}>
                            <div
                                className={`w-full text-left px-4 py-3 hover:bg-white/10 transition-colors flex items-center space-x-3 ${
                                    isCurrentPath('/liked')
                                        ? 'bg-white/10 text-white font-semibold'
                                        : 'text-gray-300'
                                }`}
                            >
                                <HeartIcon className="h-4 w-4" />
                                <span>Liked Content</span>
                            </div>
                        </Link>

                        <Link href="/hidden" onClick={handleLinkClick}>
                            <div
                                className={`w-full text-left px-4 py-3 hover:bg-white/10 transition-colors flex items-center space-x-3 ${
                                    isCurrentPath('/hidden')
                                        ? 'bg-white/10 text-white font-semibold'
                                        : 'text-gray-300'
                                }`}
                            >
                                <EyeSlashIcon className="h-4 w-4" />
                                <span>Hidden Content</span>
                            </div>
                        </Link>
                    </div>
                </div>
            )}
        </div>
    )
}

export default ProfileDropdown
