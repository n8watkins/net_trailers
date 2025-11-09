import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    HeartIcon,
    ChevronDownIcon,
    EyeIcon,
    EyeSlashIcon,
    CheckCircleIcon,
    Squares2X2Icon,
} from '@heroicons/react/24/outline'

function MyListsDropdown() {
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const pathname = usePathname()

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

    const isAnyListPath = () => {
        return pathname ? ['/watchlists', '/liked', '/hidden', '/rows'].includes(pathname) : false
    }

    const handleLinkClick = () => {
        setIsOpen(false)
    }

    return (
        <div ref={dropdownRef} className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`headerLink cursor-pointer flex items-center space-x-1 select-none ${
                    isAnyListPath() ? 'text-white hover:text-white font-semibold' : ''
                }`}
            >
                <HeartIcon className="h-4 w-4" />
                <span>My Lists</span>
                <ChevronDownIcon
                    className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-[#141414]/95 backdrop-blur-sm border border-red-500/40 rounded-xl shadow-2xl shadow-red-500/20 z-[250]">
                    <div className="py-2">
                        <Link href="/rows" onClick={handleLinkClick}>
                            <div
                                className={`w-full text-left px-4 py-3 hover:bg-white/10 transition-colors flex items-center space-x-3 ${
                                    isCurrentPath('/rows')
                                        ? 'bg-white/10 text-white font-semibold'
                                        : 'text-gray-300'
                                }`}
                            >
                                <Squares2X2Icon className="h-4 w-4" />
                                <span>My Rows</span>
                            </div>
                        </Link>

                        <Link href="/watchlists" onClick={handleLinkClick}>
                            <div
                                className={`w-full text-left px-4 py-3 hover:bg-white/10 transition-colors flex items-center space-x-3 ${
                                    isCurrentPath('/watchlists')
                                        ? 'bg-white/10 text-white font-semibold'
                                        : 'text-gray-300'
                                }`}
                            >
                                <EyeIcon className="h-4 w-4" />
                                <span>Watchlists</span>
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
                                <CheckCircleIcon className="h-4 w-4" />
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

export default MyListsDropdown
