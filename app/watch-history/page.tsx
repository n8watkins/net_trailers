/**
 * Watch History Page
 *
 * Timeline view of all content the user has watched with timestamps
 */

'use client'

import { useEffect, useState } from 'react'
import Header from '../../components/layout/Header'
import SubHeader from '../../components/common/SubHeader'
import { ClockIcon, MagnifyingGlassIcon, CalendarIcon } from '@heroicons/react/24/outline'
import { useAppStore } from '../../stores/appStore'
import ContentCard from '../../components/common/ContentCard'
import { useSessionStore } from '../../stores/sessionStore'

// TODO: This will be replaced with actual watch history tracking
// For now showing placeholder
interface WatchHistoryItem {
    contentId: number
    watchedAt: number
    progress?: number // percentage watched
    content: any
}

export default function WatchHistoryPage() {
    const { modal } = useAppStore()
    const showModal = modal.isOpen
    const [searchQuery, setSearchQuery] = useState('')
    const [filter, setFilter] = useState<'all' | 'today' | 'week' | 'month'>('all')

    useEffect(() => {
        document.title = 'Watch History - NetTrailers'
    }, [])

    // TODO: Get actual watch history from store
    const watchHistory: WatchHistoryItem[] = []

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
              const title = item.content?.title || item.content?.name || ''
              return title.toLowerCase().includes(searchQuery.toLowerCase())
          })
        : filteredHistory

    // Group by date
    const groupedHistory = searchFilteredHistory.reduce(
        (groups, item) => {
            const date = new Date(item.watchedAt).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            })
            if (!groups[date]) {
                groups[date] = []
            }
            groups[date].push(item)
            return groups
        },
        {} as Record<string, WatchHistoryItem[]>
    )

    return (
        <div
            className={`relative min-h-screen overflow-x-clip ${showModal && `overflow-y-hidden`} bg-gradient-to-b from-black to-gray-900`}
        >
            <Header />
            <SubHeader />

            <main className="relative pb-24 px-4 sm:px-6 lg:px-8">
                <div className="max-w-[1600px] mx-auto flex flex-col space-y-6 py-8">
                    {/* Header */}
                    <div className="space-y-4">
                        <div className="flex items-center space-x-3">
                            <ClockIcon className="w-8 h-8 text-purple-400" />
                            <h1 className="text-3xl font-bold text-white md:text-4xl">
                                Watch History
                            </h1>
                        </div>

                        <p className="text-gray-400 max-w-2xl">
                            Your complete viewing timeline with all watched content.
                        </p>

                        {/* Filters and Search */}
                        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
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
                                        onClick={() => setFilter(option.value as any)}
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
                            <div className="relative w-full sm:w-64">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search history..."
                                    className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    {searchFilteredHistory.length === 0 ? (
                        <div className="text-center py-20">
                            <div className="text-6xl mb-4">🎬</div>
                            <h2 className="text-2xl font-semibold text-white mb-2">
                                {watchHistory.length === 0
                                    ? 'No watch history yet'
                                    : 'No matching content found'}
                            </h2>
                            <p className="text-gray-400">
                                {watchHistory.length === 0
                                    ? 'Start watching movies and TV shows to build your history.'
                                    : 'Try adjusting your filters or search terms.'}
                            </p>
                        </div>
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
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                                        {items.map((item) => (
                                            <div key={`${item.contentId}-${item.watchedAt}`}>
                                                <ContentCard content={item.content} />
                                                <div className="mt-2 text-xs text-gray-400">
                                                    {new Date(item.watchedAt).toLocaleTimeString(
                                                        'en-US',
                                                        {
                                                            hour: 'numeric',
                                                            minute: '2-digit',
                                                        }
                                                    )}
                                                    {item.progress && item.progress < 100 && (
                                                        <span className="ml-2 text-purple-400">
                                                            ({Math.round(item.progress)}% watched)
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
