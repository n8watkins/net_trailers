import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    ChevronDownIcon,
    EyeIcon,
    HandThumbUpIcon,
    RectangleStackIcon,
    TrophyIcon,
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
        return pathname
            ? ['/collections', '/rankings', '/liked', '/hidden'].includes(pathname)
            : false
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
                <RectangleStackIcon className="h-5 w-5" />
                <span>My Stuff</span>
                <ChevronDownIcon
                    className={`h-5 w-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-[min(70vw,192px)] sm:w-48 bg-[#0f0f0f]/95 backdrop-blur-sm border border-red-500/40 rounded-xl shadow-2xl shadow-red-500/20 z-[250]">
                    <div className="py-2">
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

                        <Link href="/ratings" onClick={handleLinkClick}>
                            <div
                                className={`w-full text-left px-4 py-3 hover:bg-white/10 transition-colors flex items-center space-x-3 ${
                                    isCurrentPath('/ratings')
                                        ? 'bg-white/10 text-white font-semibold'
                                        : 'text-gray-300'
                                }`}
                            >
                                <HandThumbUpIcon className="h-4 w-4" />
                                <span>My Ratings</span>
                            </div>
                        </Link>
                    </div>
                </div>
            )}
        </div>
    )
}

export default MyListsDropdown
