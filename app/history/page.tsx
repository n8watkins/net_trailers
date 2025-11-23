/**
 * Watch History Page
 *
 * Timeline view of all content the user has watched with timestamps
 */

'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import SubPageLayout from '../../components/layout/SubPageLayout'
import { ClockIcon, CalendarIcon } from '@heroicons/react/24/outline'
import { Cog6ToothIcon, ChevronDownIcon, TrashIcon } from '@heroicons/react/24/solid'
import ContentCard from '../../components/common/ContentCard'
import ContentGridSpacer from '../../components/common/ContentGridSpacer'
import EmptyState from '../../components/common/EmptyState'
import NetflixLoader from '../../components/common/NetflixLoader'
import SearchBar from '../../components/common/SearchBar'
import { useWatchHistory } from '../../hooks/useWatchHistory'
import { getTitle } from '../../typings'
import { useSessionStore } from '../../stores/sessionStore'
import { GuestModeNotification } from '../../components/auth/GuestModeNotification'
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

    const titleActions = (
        <div className="relative" ref={manageDropdownRef}>
            <button
                type="button"
                onClick={() => setShowManageDropdown(!showManageDropdown)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-white transition-colors cursor-pointer"
            >
                <Cog6ToothIcon className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">Manage</span>
                <ChevronDownIcon
                    className={`w-4 h-4 flex-shrink-0 transition-transform ${
                        showManageDropdown ? 'rotate-180' : ''
                    }`}
                />
            </button>

            {/* Dropdown Menu */}
            {showManageDropdown && (
                <div className="absolute top-full mt-2 right-0 bg-[#1a1a1a] border border-gray-700 rounded-lg shadow-xl z-50 min-w-[200px] overflow-hidden">
                    <button
                        type="button"
                        onClick={() => {
                            router.push('/settings')
                            setShowManageDropdown(false)
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-gray-800 transition-colors"
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
                        className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-gray-800 transition-colors"
                    >
                        <TrashIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        <span>Clear Data</span>
                    </button>
                </div>
            )}
        </div>
    )

    // Don't show filters/search when tracking is disabled and no history exists
    const showFiltersAndSearch = !(watchHistory.length === 0 && !trackWatchHistory)

    const headerActions = !isLoading ? (
        <div className="space-y-4">
            {/* Guest Mode Notification */}
            {isInitialized && isGuest && <GuestModeNotification align="left" />}

            {/* Tracking Disabled Banner - only show when there IS history but tracking is off */}
            {isInitialized && !trackWatchHistory && watchHistory.length > 0 && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-amber-600/10 border border-amber-600/30">
                    <span className="text-amber-500 text-sm">
                        Watch history tracking is currently disabled. New content you view
                        won&apos;t be added to your history.
                    </span>
                    <Link
                        href="/settings/preferences"
                        className="text-amber-500 hover:text-amber-400 text-sm font-medium underline underline-offset-2 whitespace-nowrap"
                    >
                        Enable in Settings
                    </Link>
                </div>
            )}

            {/* Date Filter Pills - only show when there's content to filter */}
            {showFiltersAndSearch && (
                <div className="flex flex-wrap gap-2">
                    {[
                        { value: 'all', label: 'All Time' },
                        { value: 'today', label: 'Today' },
                        { value: 'week', label: 'This Week' },
                        { value: 'month', label: 'This Month' },
                    ].map((option) => (
                        <button
                            key={option.value}
                            onClick={() =>
                                setFilter(option.value as 'all' | 'today' | 'week' | 'month')
                            }
                            className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                                filter === option.value
                                    ? 'bg-purple-600 text-white shadow-lg scale-105'
                                    : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700/80 hover:scale-105'
                            }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            )}

            {/* Search Bar - only show when there's content to search */}
            {showFiltersAndSearch && (
                <SearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search history..."
                    focusColor="purple"
                    voiceInput
                />
            )}
        </div>
    ) : undefined

    return (
        <SubPageLayout
            title="Watch History"
            icon={<ClockIcon />}
            iconColor="text-purple-400"
            description="Your complete viewing timeline with all watched content."
            titleActions={titleActions}
            headerActions={headerActions}
        >
            {/* Content */}
            {isLoading ? (
                <NetflixLoader message="Loading your watch history..." inline />
            ) : watchHistory.length === 0 && !trackWatchHistory ? (
                // Watch history tracking is disabled - show prominent centered message
                <EmptyState
                    emoji="🚫"
                    title="Watch History Disabled"
                    description="Watch history tracking is currently disabled. New content you view won't be added to your history."
                    action={
                        <Link
                            href="/settings/preferences"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-lg transition-colors"
                        >
                            <Cog6ToothIcon className="w-5 h-5" />
                            Enable in Settings
                        </Link>
                    }
                />
            ) : searchFilteredHistory.length === 0 ? (
                <EmptyState
                    emoji="🎬"
                    title={
                        watchHistory.length === 0
                            ? 'No watch history yet'
                            : 'No matching content found'
                    }
                    description={
                        watchHistory.length === 0
                            ? 'Start watching movies and TV shows to build your history.'
                            : 'Try adjusting your filters or search terms.'
                    }
                />
            ) : (
                <div className="space-y-8">
                    {/* Timeline View - Grouped by Date */}
                    {Object.entries(groupedHistory).map(([date, items]) => (
                        <div key={date} className="space-y-4">
                            {/* Date Header */}
                            <div className="flex items-center gap-3 sticky top-24 bg-gradient-to-r from-black to-transparent py-3 z-10">
                                <CalendarIcon className="w-5 h-5 text-purple-400" />
                                <h3 className="text-lg font-semibold text-white">{date}</h3>
                                <div className="flex-1 h-px bg-gradient-to-r from-gray-700 to-transparent" />
                            </div>

                            {/* Content Cards */}
                            <div className="flex flex-wrap justify-between gap-x-6 sm:gap-x-8 md:gap-x-10 lg:gap-x-12 gap-y-3 sm:gap-y-4 md:gap-y-5 [&>*]:flex-none">
                                {items.map((item) => (
                                    <div key={`${item.contentId}-${item.watchedAt}`}>
                                        <ContentCard content={item.content} />
                                        <div className="mt-2 text-xs text-gray-400">
                                            {new Date(item.watchedAt).toLocaleTimeString('en-US', {
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
        </SubPageLayout>
    )
}
