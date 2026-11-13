/**
 * Watch History Page
 *
 * Timeline view of all content the user has watched with timestamps
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import SubPageLayout from '../../components/layout/SubPageLayout'
import PageHeader from '../../components/layout/PageHeader'
import PageEmptyState, { emptyStateActionClass } from '../../components/layout/PageEmptyState'
import { FilterPills, ListSearchInput, ManageMenu } from '../../components/layout/PageToolbar'
import { ClockIcon, CalendarIcon } from '@heroicons/react/24/outline'
import { Cog6ToothIcon, TrashIcon } from '@heroicons/react/24/solid'
import ContentCard from '../../components/common/ContentCard'
import ContentGridSpacer from '../../components/common/ContentGridSpacer'
import PageLoader from '../../components/common/PageLoader'
import { useWatchHistory } from '../../hooks/useWatchHistory'
import { getTitle } from '../../typings'
import { useSessionStore } from '../../stores/sessionStore'
import useUserData from '../../hooks/useUserData'
import Link from '@/components/common/Link'

export default function WatchHistoryPage() {
    const router = useRouter()
    const [searchQuery, setSearchQuery] = useState('')
    const [filter, setFilter] = useState<'all' | 'today' | 'week' | 'month'>('all')

    useEffect(() => {
        document.title = 'Watch History - NetTrailers'
    }, [])

    // Get actual watch history from store
    const { history: watchHistory, isLoading: isLoadingHistory } = useWatchHistory()
    const isInitialized = useSessionStore((state) => state.isInitialized)
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

    // Group by calendar date (not relative dates like "Today")
    const groupedHistory = searchFilteredHistory.reduce(
        (groups, item) => {
            const itemDate = new Date(item.watchedAt)

            // Always use actual calendar date format
            const date = itemDate.toLocaleDateString('en-US', {
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
        {} as Record<string, typeof searchFilteredHistory>
    )

    // Search, filters and Manage only appear once there is history to work with
    const hasHistory = watchHistory.length > 0

    return (
        <SubPageLayout hideHeader>
            <div className="space-y-6">
                <PageHeader
                    title="Watch History"
                    icon={<ClockIcon />}
                    actions={
                        hasHistory && (
                            <ManageMenu
                                items={[
                                    {
                                        label: 'Settings',
                                        icon: Cog6ToothIcon,
                                        onSelect: () => router.push('/settings/preferences'),
                                    },
                                    {
                                        label: 'Clear data',
                                        icon: TrashIcon,
                                        danger: true,
                                        onSelect: () => router.push('/settings/account'),
                                    },
                                ]}
                            />
                        )
                    }
                >
                    {isInitialized && !trackWatchHistory && hasHistory && (
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-amber-600/30 bg-amber-600/10 px-4 py-3 text-sm">
                            <span className="text-amber-500">
                                Watch history tracking is turned off.
                            </span>
                            <Link
                                href="/settings/preferences"
                                className="font-medium text-amber-500 underline underline-offset-2 hover:text-amber-400"
                            >
                                Turn it on in Settings
                            </Link>
                        </div>
                    )}
                    {hasHistory && (
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <FilterPills<'all' | 'today' | 'week' | 'month'>
                                label="Watched"
                                value={filter}
                                onChange={setFilter}
                                options={[
                                    { value: 'all', label: 'All time' },
                                    { value: 'today', label: 'Today' },
                                    { value: 'week', label: 'This week' },
                                    { value: 'month', label: 'This month' },
                                ]}
                            />
                            <ListSearchInput
                                value={searchQuery}
                                onChange={setSearchQuery}
                                placeholder="Search your history..."
                                voiceSourceId="history-search"
                            />
                        </div>
                    )}
                </PageHeader>

                {isLoading && (
                    <div className="py-16">
                        <PageLoader inline={true} message="Loading your watch history..." />
                    </div>
                )}

                {!isLoading && !hasHistory && !trackWatchHistory && (
                    <PageEmptyState
                        icon={<ClockIcon />}
                        title="Watch history is off"
                        description="Titles you watch are not being recorded."
                        action={
                            <Link href="/settings/preferences" className={emptyStateActionClass}>
                                Turn it on in Settings
                            </Link>
                        }
                    />
                )}

                {!isLoading && !hasHistory && trackWatchHistory && (
                    <PageEmptyState
                        icon={<ClockIcon />}
                        title="No watch history yet"
                        description="Play a trailer and the title shows up here."
                        action={
                            <Link href="/#trending" className={emptyStateActionClass}>
                                Find something to watch
                            </Link>
                        }
                    />
                )}

                {!isLoading && hasHistory && searchFilteredHistory.length === 0 && (
                    <p className="py-12 text-center text-gray-400">
                        Nothing matches. Try another time range or search.
                    </p>
                )}

                {!isLoading && searchFilteredHistory.length > 0 && (
                    <div className="space-y-8">
                        {Object.entries(groupedHistory).map(([date, items]) => (
                            <div key={date} className="space-y-4">
                                <div className="flex items-center gap-3 py-2">
                                    <CalendarIcon className="h-5 w-5 text-amber-400" />
                                    <h2 className="text-lg font-semibold text-white">{date}</h2>
                                    <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-sm text-gray-400">
                                        {items.length}
                                    </span>
                                    <div className="h-px flex-1 bg-gradient-to-r from-gray-700 to-transparent" />
                                </div>
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
                                        </div>
                                    ))}
                                    <ContentGridSpacer />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

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
