/**
 * Community Page
 *
 * Displays public rankings from all users with filtering and sorting options
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import SubPageLayout from '../../components/layout/SubPageLayout'
import { RankingRow } from '../../components/rankings/RankingRow'
import { useRankingStore } from '../../stores/rankingStore'
import { useAuthStatus } from '../../hooks/useAuthStatus'
import NetflixLoader from '../../components/common/NetflixLoader'
import { POPULAR_TAGS } from '../../utils/popularTags'
import {
    TrophyIcon,
    UsersIcon,
    AdjustmentsHorizontalIcon,
    FunnelIcon,
    XMarkIcon,
    FireIcon,
    ClockIcon,
    HeartIcon,
    EyeIcon,
} from '@heroicons/react/24/outline'

export default function CommunityPage() {
    const router = useRouter()
    const { isInitialized } = useAuthStatus()

    const {
        communityRankings,
        isLoading,
        error,
        loadCommunityRankings,
        sortBy,
        setSortBy,
        filterByMediaType,
        setFilterByMediaType,
    } = useRankingStore()

    const [filterByTag, setFilterByTag] = useState<string | null>(null)

    // Load community rankings on mount and when sort changes
    useEffect(() => {
        if (isInitialized) {
            loadCommunityRankings(50)
        }
    }, [isInitialized, sortBy])

    const handleRankingClick = (rankingId: string) => {
        router.push(`/rankings/${rankingId}`)
    }

    // Filter rankings by media type
    const filteredByMediaType =
        filterByMediaType === 'all'
            ? communityRankings
            : communityRankings.filter((ranking) => {
                  return ranking.rankedItems.every(
                      (item) => item.content.media_type === filterByMediaType
                  )
              })

    // Group rankings by tags
    const rankingsByTag = useMemo(() => {
        const grouped: Record<string, typeof communityRankings> = {}

        // Group by tag
        filteredByMediaType.forEach((ranking) => {
            if (ranking.tags && ranking.tags.length > 0) {
                ranking.tags.forEach((tag) => {
                    if (!grouped[tag]) {
                        grouped[tag] = []
                    }
                    grouped[tag].push(ranking)
                })
            } else {
                // Rankings without tags go to "Other"
                if (!grouped['Other']) {
                    grouped['Other'] = []
                }
                grouped['Other'].push(ranking)
            }
        })

        return grouped
    }, [filteredByMediaType])

    // Get tag rows to display
    const tagRows = useMemo(() => {
        // If specific tag selected, only show that tag
        if (filterByTag) {
            return rankingsByTag[filterByTag]
                ? [{ tag: filterByTag, rankings: rankingsByTag[filterByTag] }]
                : []
        }

        // Otherwise show all tags, sorted by ranking count
        return Object.entries(rankingsByTag)
            .map(([tag, rankings]) => ({ tag, rankings }))
            .sort((a, b) => b.rankings.length - a.rankings.length)
    }, [rankingsByTag, filterByTag])

    if (!isInitialized || isLoading) {
        return (
            <SubPageLayout
                title="Community"
                icon={<UsersIcon className="w-8 h-8" />}
                iconColor="text-yellow-500"
            >
                <NetflixLoader />
            </SubPageLayout>
        )
    }

    return (
        <SubPageLayout
            title="Community"
            icon={<UsersIcon className="w-8 h-8" />}
            iconColor="text-yellow-500"
        >
            {/* Description */}
            <div className="mb-6 text-center">
                <p className="text-gray-400 max-w-2xl mx-auto">
                    Discover and explore public rankings created by the community
                </p>
            </div>

            {/* Two-column layout */}
            <div className="flex flex-col lg:flex-row gap-6">
                {/* Sidebar filters */}
                <div className="lg:w-64 flex-shrink-0">
                    <div className="sticky top-4 bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-4">
                        <div className="flex items-center gap-2 pb-3 border-b border-zinc-800">
                            <AdjustmentsHorizontalIcon className="w-5 h-5 text-yellow-500" />
                            <h3 className="font-semibold text-white">Filters</h3>
                        </div>
                        {/* Sort By - Compact */}
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-2">
                                Sort By
                            </label>
                            <div className="space-y-1">
                                {[
                                    { value: 'recent', label: 'Recent', icon: ClockIcon },
                                    { value: 'popular', label: 'Popular', icon: FireIcon },
                                    { value: 'most-liked', label: 'Most Liked', icon: HeartIcon },
                                    { value: 'most-viewed', label: 'Most Viewed', icon: EyeIcon },
                                ].map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => setSortBy(option.value as typeof sortBy)}
                                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                            sortBy === option.value
                                                ? 'bg-yellow-500 text-black'
                                                : 'bg-zinc-800 text-gray-300 hover:bg-zinc-700'
                                        }`}
                                    >
                                        <option.icon className="w-4 h-4" />
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Filter by Media Type - Compact */}
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-2">
                                Content Type
                            </label>
                            <div className="space-y-1">
                                {[
                                    { value: 'all', label: 'All' },
                                    { value: 'movie', label: 'Movies' },
                                    { value: 'tv', label: 'TV Shows' },
                                ].map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() =>
                                            setFilterByMediaType(
                                                option.value as typeof filterByMediaType
                                            )
                                        }
                                        className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                            filterByMediaType === option.value
                                                ? 'bg-yellow-500 text-black'
                                                : 'bg-zinc-800 text-gray-300 hover:bg-zinc-700'
                                        }`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Filter by Tag - Compact scrollable */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-xs font-medium text-gray-400">
                                    Filter by Tag
                                </label>
                                {filterByTag && (
                                    <button
                                        onClick={() => setFilterByTag(null)}
                                        className="text-xs text-gray-400 hover:text-white transition-colors"
                                    >
                                        <XMarkIcon className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-2">
                                {POPULAR_TAGS.slice(0, 10).map((tag) => (
                                    <button
                                        key={tag.id}
                                        onClick={() =>
                                            setFilterByTag(
                                                filterByTag === tag.name ? null : tag.name
                                            )
                                        }
                                        className={`px-2 py-1 rounded-full text-xs font-medium transition-all ${
                                            filterByTag === tag.name
                                                ? 'bg-yellow-500 text-black'
                                                : 'bg-zinc-800 text-gray-300 hover:bg-zinc-700'
                                        }`}
                                        title={tag.description}
                                    >
                                        {tag.emoji}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="pt-3 border-t border-zinc-800">
                            <div className="text-xs text-gray-500 space-y-1">
                                <div>Total: {communityRankings.length} rankings</div>
                                <div>Showing: {filteredByMediaType.length} rankings</div>
                                <div>Tags: {Object.keys(rankingsByTag).length}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main content area - Tag-based rows */}
                <div className="flex-1 min-w-0">
                    {/* Error State */}
                    {error && (
                        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-6">
                            <p className="text-red-400">{error}</p>
                        </div>
                    )}

                    {/* Tag Rows */}
                    {tagRows.length > 0 ? (
                        <div className="space-y-6">
                            {tagRows.map(({ tag, rankings }) => {
                                const tagData = POPULAR_TAGS.find((t) => t.name === tag)
                                return (
                                    <RankingRow
                                        key={tag}
                                        title={tag}
                                        emoji={tagData?.emoji}
                                        rankings={rankings}
                                        showAuthor={true}
                                        onLike={handleRankingClick}
                                    />
                                )
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-20 h-20 mb-4 rounded-full bg-zinc-800 flex items-center justify-center">
                                <TrophyIcon className="w-10 h-10 text-gray-600" />
                            </div>
                            <p className="text-gray-400 text-lg mb-2">No rankings found</p>
                            <p className="text-gray-500 text-sm">
                                Try adjusting your filters or be the first to create one!
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </SubPageLayout>
    )
}
