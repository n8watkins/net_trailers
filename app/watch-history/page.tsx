/**
 * Watch History Page
 *
 * Timeline view of all content the user has watched with timestamps
 */

'use client'

import { useEffect, useState } from 'react'
import SubPageLayout from '../../components/layout/SubPageLayout'
import { ClockIcon, CalendarIcon } from '@heroicons/react/24/outline'
import ContentCard from '../../components/common/ContentCard'
import EmptyState from '../../components/common/EmptyState'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import SearchBar from '../../components/common/SearchBar'
import { useWatchHistory } from '../../hooks/useWatchHistory'
import { getTitle } from '../../typings'

export default function WatchHistoryPage() {
    const [searchQuery, setSearchQuery] = useState('')
    const [filter, setFilter] = useState<'all' | 'today' | 'week' | 'month'>('all')

    useEffect(() => {
        document.title = 'Watch History - NetTrailers'
    }, [])

    // Get actual watch history from store
    const { history: watchHistory, isLoading } = useWatchHistory()

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

    const headerActions = (
        <div className="flex flex-col gap-4">
            {/* Date Filter Pills */}
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

            {/* Search Bar */}
            <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search history..."
                focusColor="purple"
                voiceInput
            />
        </div>
    )

    return (
        <SubPageLayout
            title="Watch History"
            icon={<ClockIcon />}
            iconColor="text-purple-400"
            description="Your complete viewing timeline with all watched content."
            headerActions={headerActions}
        >
            {/* Content */}
            {isLoading ? (
                <LoadingSpinner color="purple" />
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
                            <div className="flex items-center gap-3 sticky top-24 bg-gradient-to-r from-gray-900 to-transparent py-3 z-10">
                                <CalendarIcon className="w-5 h-5 text-purple-400" />
                                <h3 className="text-lg font-semibold text-white">{date}</h3>
                                <div className="flex-1 h-px bg-gradient-to-r from-gray-700 to-transparent" />
                            </div>

                            {/* Content Cards */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5 lg:gap-6 xl:gap-8">
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
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </SubPageLayout>
    )
}
