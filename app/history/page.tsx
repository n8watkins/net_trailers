/**
 * Watch History Page
 *
 * Timeline view of all content the user has watched with timestamps
 */

'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import SubPageLayout from '../../components/layout/SubPageLayout'
import { ClockIcon, CalendarIcon, XMarkIcon } from '@heroicons/react/24/outline'
import {
    Cog6ToothIcon,
    ChevronDownIcon,
    TrashIcon,
    MagnifyingGlassIcon,
} from '@heroicons/react/24/solid'
import ContentCard from '../../components/common/ContentCard'
import ContentGridSpacer from '../../components/common/ContentGridSpacer'
import NetflixLoader from '../../components/common/NetflixLoader'
import { useWatchHistory } from '../../hooks/useWatchHistory'
import { getTitle } from '../../typings'
import { useSessionStore } from '../../stores/sessionStore'
import { useAuthStatus } from '../../hooks/useAuthStatus'
import useUserData from '../../hooks/useUserData'
import Link from 'next/link'

export default function WatchHistoryPage() {
    const router = useRouter()
    const [searchQuery, setSearchQuery] = useState('')
    const [filter, setFilter] = useState<'all' | 'today' | 'week' | 'month'>('all')
    const [showManageDropdown, setShowManageDropdown] = useState(false)
    const manageDropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        document.title = 'Watch History - NetTrailers'
    }, [])

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                manageDropdownRef.current &&
                !manageDropdownRef.current.contains(event.target as Node)
            ) {
                setShowManageDropdown(false)
            }
        }

        if (showManageDropdown) {
            document.addEventListener('mousedown', handleClickOutside)
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [showManageDropdown])

    // Get actual watch history from store
    const { history: watchHistory, isLoading: isLoadingHistory } = useWatchHistory()
    const isInitialized = useSessionStore((state) => state.isInitialized)
    const { isGuest } = useAuthStatus()
    const { trackWatchHistory } = useUserData()

    // Show loading state while initializing or loading history
    const isLoading = !isInitialized || isLoadingHistory

    // Filter by date
    const filteredHistory = watchHistory.filter((item) => {
        const now = Date.now()
        const dayMs = 24 * 60 * 60 * 1000

        switch (filter) {
            case 'today':
                return now - item.watchedAt < dayMs
            case 'week':
                return now - item.watchedAt < 7 * dayMs
            case 'month':
                return now - item.watchedAt < 30 * dayMs
            default:
                return true
        }
    })

    // Apply search filter
    const searchFilteredHistory = searchQuery.trim()
        ? filteredHistory.filter((item) => {
              const title = getTitle(item.content)
              return title.toLowerCase().includes(searchQuery.toLowerCase())
          })
        : filteredHistory

    // Group by date - format changes based on filter
    const groupedHistory = searchFilteredHistory.reduce(
        (groups, item) => {
            let date: string
            const itemDate = new Date(item.watchedAt)

            // Format date based on current filter
            switch (filter) {
                case 'today':
                    // Show just the time for today
                    date = 'Today'
                    break
                case 'week':
                    // Show weekday for this week
                    date = itemDate.toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                    })
                    break
                case 'month':
                    // Show week grouping for this month
                    date = itemDate.toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                    })
                    break
                default:
                    // Show full date for all time
                    date = itemDate.toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                    })
            }

            if (!groups[date]) {
                groups[date] = []
            }
            groups[date].push(item)
            return groups
        },
        {} as Record<string, typeof searchFilteredHistory>
    )

    // Don't show filters/search when tracking is disabled and no history exists
    const showFiltersAndSearch = !(watchHistory.length === 0 && !trackWatchHistory)

    return (
        <SubPageLayout hideHeader>
            <div className="relative -mt-20 -mx-6 sm:-mx-8 lg:-mx-12">
                {/* Atmospheric Background */}
                <div className="fixed inset-0 pointer-events-none">
                    <div className="absolute inset-0 bg-black" />
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[800px] bg-gradient-radial from-purple-900/20 via-transparent to-transparent opacity-50" />
                    <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black opacity-60" />
                </div>

                {/* Content Container */}
                <div className="relative z-10">
                    {/* Cinematic Hero Header */}
                    <div className="relative overflow-hidden pt-4">
                        {/* Animated Background Gradients */}
                        <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-900/80 to-black" />
                        <div
                            className="absolute inset-0 bg-gradient-to-t from-purple-900/20 via-violet-900/10 to-black/50 animate-pulse"
                            style={{ animationDuration: '4s' }}
                        />
                        <div className="absolute inset-0 bg-gradient-radial from-purple-500/10 via-purple-900/5 to-transparent" />

                        {/* Soft edge vignetting for subtle blending */}
                        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/80" />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/60" />

                        {/* Hero Content */}
                        <div className="relative z-10 flex flex-col items-center justify-start px-6 pt-8 pb-6">
                            {/* Clock Icon with glow */}
                            <div className="relative mb-4">
                                <div className="absolute inset-0 bg-purple-500/30 blur-2xl scale-150" />
                                <ClockIcon className="relative w-16 h-16 text-purple-400 drop-shadow-[0_0_20px_rgba(168,85,247,0.5)]" />
                            </div>

                            {/* Title */}
                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-2 text-center tracking-tight">
                                <span className="bg-gradient-to-r from-purple-200 via-violet-100 to-purple-200 bg-clip-text text-transparent drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">
                                    Watch History
                                </span>
                            </h1>

                            {/* Subtitle */}
                            <p className="text-base sm:text-lg text-gray-300 mb-6 text-center max-w-2xl">
                                Your complete viewing timeline with all watched content.
                            </p>

                            {/* Tracking Disabled Banner */}
                            {isInitialized && !trackWatchHistory && watchHistory.length > 0 && (
                                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-600/10 border border-amber-600/30 mb-5 max-w-2xl">
                                    <span className="text-amber-500 text-sm">
                                        Watch history tracking is currently disabled.
                                    </span>
                                    <Link
                                        href="/settings/preferences"
                                        className="text-amber-500 hover:text-amber-400 text-sm font-medium underline underline-offset-2 whitespace-nowrap"
                                    >
                                        Enable in Settings
                                    </Link>
                                </div>
                            )}

                            {/* Filter Row - Pills on left, Manage on right */}
                            {showFiltersAndSearch && (
                                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between w-full max-w-3xl mb-5 px-4">
                                    {/* Date Filter Pills */}
                                    <div className="flex gap-2 items-center flex-wrap justify-center sm:justify-start">
                                        {[
                                            { value: 'all', label: 'All Time' },
                                            { value: 'today', label: 'Today' },
                                            { value: 'week', label: 'This Week' },
                                            { value: 'month', label: 'This Month' },
                                        ].map((option) => {
                                            const isSelected = filter === option.value

                                            return (
                                                <button
                                                    key={option.value}
                                                    onClick={() =>
                                                        setFilter(
                                                            option.value as
                                                                | 'all'
                                                                | 'today'
                                                                | 'week'
                                                                | 'month'
                                                        )
                                                    }
                                                    className={`group relative rounded-full px-5 py-2.5 text-sm font-bold transition-all duration-300 backdrop-blur-md border ${
                                                        isSelected
                                                            ? 'bg-purple-500/90 text-white border-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.3)] scale-105'
                                                            : 'bg-zinc-900/40 text-gray-300 border-zinc-700/50 hover:bg-zinc-800/60 hover:border-zinc-600 hover:scale-105 hover:shadow-[0_0_8px_rgba(255,255,255,0.08)]'
                                                    }`}
                                                >
                                                    <span className="relative z-10">
                                                        {option.label}
                                                    </span>
                                                    {isSelected && (
                                                        <div className="absolute inset-0 rounded-full bg-purple-500 blur-md opacity-15 animate-pulse" />
                                                    )}
                                                </button>
                                            )
                                        })}
                                    </div>

                                    {/* Manage dropdown */}
                                    <div className="relative" ref={manageDropdownRef}>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowManageDropdown(!showManageDropdown)
                                            }
                                            className="group relative rounded-full px-5 py-2.5 text-sm font-bold transition-all duration-300 backdrop-blur-md border flex items-center gap-2 bg-zinc-900/40 text-gray-300 border-zinc-700/50 hover:bg-zinc-800/60 hover:border-zinc-600 hover:scale-105 hover:shadow-[0_0_8px_rgba(255,255,255,0.08)]"
                                        >
                                            <Cog6ToothIcon className="w-4 h-4 text-gray-400" />
                                            <span>Manage</span>
                                            <ChevronDownIcon
                                                className={`w-4 h-4 transition-transform ${
                                                    showManageDropdown ? 'rotate-180' : ''
                                                }`}
                                            />
                                        </button>

                                        {/* Dropdown Menu */}
                                        {showManageDropdown && (
                                            <div className="absolute top-full mt-2 right-0 bg-zinc-900/95 backdrop-blur-lg border border-zinc-700/50 rounded-xl shadow-2xl z-50 min-w-[200px] overflow-hidden">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        router.push('/settings/preferences')
                                                        setShowManageDropdown(false)
                                                    }}
                                                    className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-zinc-800/80 transition-colors"
                                                >
                                                    <Cog6ToothIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                                    <span>Settings</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        router.push('/settings/account')
                                                        setShowManageDropdown(false)
                                                    }}
                                                    className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-zinc-800/80 transition-colors"
                                                >
                                                    <TrashIcon className="w-5 h-5 text-red-400 flex-shrink-0" />
                                                    <span>Clear Data</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Enhanced Search Bar */}
                            {showFiltersAndSearch && (
                                <div className="w-full max-w-3xl relative">
                                    <div className="relative group">
                                        <MagnifyingGlassIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400 z-10 transition-colors group-focus-within:text-purple-400" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search your history..."
                                            className="w-full pl-14 pr-14 py-4 bg-zinc-900/40 backdrop-blur-lg border border-zinc-800/50 rounded-2xl text-white text-lg placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:shadow-[0_0_25px_rgba(168,85,247,0.3)] transition-all duration-300 hover:bg-zinc-900/60 hover:border-zinc-700"
                                        />
                                        {searchQuery && (
                                            <button
                                                onClick={() => setSearchQuery('')}
                                                className="absolute right-5 top-1/2 -translate-y-1/2 z-10 text-gray-400 hover:text-white transition-colors"
                                            >
                                                <XMarkIcon className="w-6 h-6" />
                                            </button>
                                        )}

                                        {/* Glowing border effect on focus */}
                                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500 to-violet-500 opacity-0 group-focus-within:opacity-20 blur-xl transition-opacity duration-300 -z-10" />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="px-6 sm:px-8 lg:px-12 py-8 space-y-6">
                        {/* Loading state */}
                        {isLoading && (
                            <div className="py-16">
                                <NetflixLoader
                                    inline={true}
                                    message="Loading your watch history..."
                                />
                            </div>
                        )}

                        {/* Watch history disabled state */}
                        {!isLoading && watchHistory.length === 0 && !trackWatchHistory && (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="relative mb-6">
                                    <div className="absolute inset-0 bg-purple-500/20 blur-2xl scale-150" />
                                    <div className="relative w-24 h-24 rounded-full bg-zinc-900/60 backdrop-blur-lg flex items-center justify-center border-2 border-zinc-800/50">
                                        <span className="text-5xl">🚫</span>
                                    </div>
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-3">
                                    Watch History Disabled
                                </h3>
                                <p className="text-gray-400 mb-8 max-w-md text-lg">
                                    Watch history tracking is currently disabled. New content you
                                    view won&apos;t be added to your history.
                                </p>
                                <Link
                                    href="/settings/preferences"
                                    className="group relative px-8 py-4 font-bold rounded-xl transition-all duration-300 bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white shadow-[0_0_30px_rgba(168,85,247,0.4)] hover:shadow-[0_0_40px_rgba(168,85,247,0.6)] scale-100 hover:scale-105 inline-flex items-center gap-2"
                                >
                                    <Cog6ToothIcon className="w-5 h-5" />
                                    Enable in Settings
                                </Link>
                            </div>
                        )}

                        {/* Empty state */}
                        {!isLoading &&
                            (trackWatchHistory || watchHistory.length > 0) &&
                            searchFilteredHistory.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-20 text-center">
                                    <div className="relative mb-6">
                                        <div className="absolute inset-0 bg-purple-500/20 blur-2xl scale-150" />
                                        <div className="relative w-24 h-24 rounded-full bg-zinc-900/60 backdrop-blur-lg flex items-center justify-center border-2 border-zinc-800/50">
                                            <ClockIcon className="w-12 h-12 text-purple-500" />
                                        </div>
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mb-3">
                                        {watchHistory.length === 0
                                            ? 'No watch history yet'
                                            : 'No matching content found'}
                                    </h3>
                                    <p className="text-gray-400 mb-8 max-w-md text-lg">
                                        {watchHistory.length === 0
                                            ? 'Start watching movies and TV shows to build your history.'
                                            : 'Try adjusting your filters or search terms.'}
                                    </p>
                                </div>
                            )}

                        {/* Timeline View - Grouped by Date */}
                        {!isLoading && searchFilteredHistory.length > 0 && (
                            <div className="space-y-8">
                                {Object.entries(groupedHistory).map(([date, items]) => (
                                    <div key={date} className="space-y-4">
                                        {/* Date Header */}
                                        <div className="flex items-center gap-3 sticky top-24 bg-gradient-to-r from-black to-transparent py-3 z-10">
                                            <CalendarIcon className="w-5 h-5 text-purple-400" />
                                            <h3 className="text-lg font-semibold text-white">
                                                {date}
                                            </h3>
                                            <div className="flex-1 h-px bg-gradient-to-r from-gray-700 to-transparent" />
                                        </div>

                                        {/* Content Cards */}
                                        <div className="flex flex-wrap justify-between gap-x-6 sm:gap-x-8 md:gap-x-10 lg:gap-x-12 gap-y-3 sm:gap-y-4 md:gap-y-5 [&>*]:flex-none">
                                            {items.map((item, index) => (
                                                <div
                                                    key={`${item.contentId}-${item.watchedAt}`}
                                                    className="animate-fadeInUp"
                                                    style={{
                                                        animationDelay: `${Math.min(index * 50, 500)}ms`,
                                                        animationFillMode: 'both',
                                                    }}
                                                >
                                                    <ContentCard content={item.content} />
                                                    <div className="mt-2 text-xs text-gray-400">
                                                        {new Date(
                                                            item.watchedAt
                                                        ).toLocaleTimeString('en-US', {
                                                            hour: 'numeric',
                                                            minute: '2-digit',
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                            <ContentGridSpacer />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Add keyframe animation for fade-in */}
                <style jsx>{`
                    @keyframes fadeInUp {
                        from {
                            opacity: 0;
                            transform: translateY(20px);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0);
                        }
                    }

                    :global(.animate-fadeInUp) {
                        animation: fadeInUp 0.5s ease-out;
                    }
                `}</style>
            </div>
        </SubPageLayout>
    )
}
