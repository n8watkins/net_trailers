/**
 * Community Page - Reimagined with Tabs
 *
 * Features:
 * - Rankings Tab: Public rankings from all users
 * - Forums Tab: Discussion threads and community conversations
 * - Polls Tab: Community polls and voting
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
    ChatBubbleLeftRightIcon,
    ChartBarIcon,
    SparklesIcon,
} from '@heroicons/react/24/outline'

type TabType = 'rankings' | 'forums' | 'polls'

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

    const [activeTab, setActiveTab] = useState<TabType>('rankings')
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
            title="Community Hub"
            icon={<UsersIcon className="w-8 h-8" />}
            iconColor="text-yellow-500"
        >
            {/* Description */}
            <div className="mb-6 text-center">
                <p className="text-gray-300 max-w-2xl mx-auto text-lg">
                    Connect, discuss, and share your passion for movies and TV shows
                </p>
            </div>

            {/* Tabs Navigation - Bold & Vibrant */}
            <div className="mb-8">
                <div className="flex justify-center">
                    <div className="inline-flex gap-2 bg-zinc-900/80 backdrop-blur-sm p-2 rounded-2xl border-2 border-zinc-800 shadow-lg">
                        {[
                            {
                                id: 'rankings' as TabType,
                                label: 'Rankings',
                                icon: TrophyIcon,
                                gradient: 'from-yellow-500 to-orange-500',
                                count: communityRankings.length,
                            },
                            {
                                id: 'forums' as TabType,
                                label: 'Forums',
                                icon: ChatBubbleLeftRightIcon,
                                gradient: 'from-blue-500 to-purple-500',
                                count: 0, // TODO: Get from forum store
                            },
                            {
                                id: 'polls' as TabType,
                                label: 'Polls',
                                icon: ChartBarIcon,
                                gradient: 'from-pink-500 to-red-500',
                                count: 0, // TODO: Get from forum store
                            },
                        ].map((tab) => {
                            const Icon = tab.icon
                            const isActive = activeTab === tab.id

                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`relative group px-6 py-4 rounded-xl font-bold text-sm transition-all duration-300 ${
                                        isActive
                                            ? 'text-white shadow-2xl scale-105'
                                            : 'text-gray-400 hover:text-gray-200 hover:bg-zinc-800/50'
                                    }`}
                                >
                                    {/* Active background gradient */}
                                    {isActive && (
                                        <>
                                            <div
                                                className={`absolute inset-0 bg-gradient-to-r ${tab.gradient} rounded-xl opacity-100`}
                                            />
                                            {/* Glow effect */}
                                            <div
                                                className={`absolute -inset-1 bg-gradient-to-r ${tab.gradient} rounded-xl blur-xl opacity-50 animate-pulse`}
                                            />
                                        </>
                                    )}

                                    {/* Content */}
                                    <div className="relative flex items-center gap-2">
                                        <Icon
                                            className={`w-5 h-5 ${isActive ? 'drop-shadow-lg' : ''}`}
                                        />
                                        <span className="font-black">{tab.label}</span>
                                        {tab.count > 0 && (
                                            <span
                                                className={`px-2 py-0.5 text-xs rounded-full ${
                                                    isActive
                                                        ? 'bg-white/20 text-white'
                                                        : 'bg-zinc-800 text-gray-400'
                                                }`}
                                            >
                                                {tab.count}
                                            </span>
                                        )}
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'rankings' && (
                <RankingsTab
                    communityRankings={communityRankings}
                    isLoading={isLoading}
                    error={error}
                    sortBy={sortBy}
                    setSortBy={setSortBy}
                    filterByMediaType={filterByMediaType}
                    setFilterByMediaType={setFilterByMediaType}
                    filterByTag={filterByTag}
                    setFilterByTag={setFilterByTag}
                    filteredByMediaType={filteredByMediaType}
                    rankingsByTag={rankingsByTag}
                    tagRows={tagRows}
                    handleRankingClick={handleRankingClick}
                />
            )}

            {activeTab === 'forums' && <ForumsTab />}

            {activeTab === 'polls' && <PollsTab />}
        </SubPageLayout>
    )
}

// Rankings Tab Component
function RankingsTab({
    communityRankings,
    isLoading,
    error,
    sortBy,
    setSortBy,
    filterByMediaType,
    setFilterByMediaType,
    filterByTag,
    setFilterByTag,
    filteredByMediaType,
    rankingsByTag,
    tagRows,
    handleRankingClick,
}: any) {
    return (
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
                                        setFilterByTag(filterByTag === tag.name ? null : tag.name)
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
    )
}

// Forums Tab Component (Placeholder)
function ForumsTab() {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="relative mb-8">
                {/* Glowing background */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 blur-3xl rounded-full" />
                {/* Icon */}
                <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-blue-900/50 via-purple-900/50 to-pink-900/50 flex items-center justify-center border-2 border-blue-500/30 shadow-2xl">
                    <ChatBubbleLeftRightIcon className="w-16 h-16 text-blue-400" />
                    <SparklesIcon className="absolute top-2 right-2 w-6 h-6 text-yellow-400 animate-pulse" />
                </div>
            </div>

            <h3 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 mb-4">
                Forums Coming Soon!
            </h3>
            <p className="text-gray-300 text-lg mb-2 max-w-xl">
                Get ready for vibrant community discussions
            </p>
            <p className="text-gray-400 mb-8 max-w-md">
                Create threads, share theories, discuss your favorite movies and shows, and connect
                with fellow fans
            </p>

            {/* Feature preview cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl w-full">
                {[
                    {
                        title: 'Discussion Threads',
                        desc: 'Start conversations about anything',
                        icon: ChatBubbleLeftRightIcon,
                        color: 'from-blue-500/20 to-cyan-500/20',
                    },
                    {
                        title: 'Categories',
                        desc: 'Movies, TV, recommendations & more',
                        icon: FireIcon,
                        color: 'from-purple-500/20 to-pink-500/20',
                    },
                    {
                        title: 'Trending Topics',
                        desc: 'See what the community is talking about',
                        icon: TrophyIcon,
                        color: 'from-orange-500/20 to-red-500/20',
                    },
                ].map((feature) => {
                    const Icon = feature.icon
                    return (
                        <div
                            key={feature.title}
                            className={`p-6 rounded-xl bg-gradient-to-br ${feature.color} border border-white/10 backdrop-blur-sm`}
                        >
                            <Icon className="w-8 h-8 text-white mb-3 mx-auto" />
                            <h4 className="text-white font-bold mb-2">{feature.title}</h4>
                            <p className="text-gray-300 text-sm">{feature.desc}</p>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

// Polls Tab Component (Placeholder)
function PollsTab() {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="relative mb-8">
                {/* Glowing background */}
                <div className="absolute inset-0 bg-gradient-to-r from-pink-500/20 via-red-500/20 to-orange-500/20 blur-3xl rounded-full" />
                {/* Icon */}
                <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-pink-900/50 via-red-900/50 to-orange-900/50 flex items-center justify-center border-2 border-pink-500/30 shadow-2xl">
                    <ChartBarIcon className="w-16 h-16 text-pink-400" />
                    <SparklesIcon className="absolute top-2 right-2 w-6 h-6 text-yellow-400 animate-pulse" />
                </div>
            </div>

            <h3 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-red-400 to-orange-400 mb-4">
                Polls Coming Soon!
            </h3>
            <p className="text-gray-300 text-lg mb-2 max-w-xl">
                Let your voice be heard in community decisions
            </p>
            <p className="text-gray-400 mb-8 max-w-md">
                Vote on hot topics, create your own polls, and see what the community thinks about
                the latest releases
            </p>

            {/* Feature preview cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl w-full">
                {[
                    {
                        title: 'Community Polls',
                        desc: 'Vote on popular topics',
                        icon: ChartBarIcon,
                        color: 'from-pink-500/20 to-red-500/20',
                    },
                    {
                        title: 'Create Polls',
                        desc: 'Ask the community anything',
                        icon: SparklesIcon,
                        color: 'from-red-500/20 to-orange-500/20',
                    },
                    {
                        title: 'Real-time Results',
                        desc: 'Watch votes come in live',
                        icon: FireIcon,
                        color: 'from-orange-500/20 to-yellow-500/20',
                    },
                ].map((feature) => {
                    const Icon = feature.icon
                    return (
                        <div
                            key={feature.title}
                            className={`p-6 rounded-xl bg-gradient-to-br ${feature.color} border border-white/10 backdrop-blur-sm`}
                        >
                            <Icon className="w-8 h-8 text-white mb-3 mx-auto" />
                            <h4 className="text-white font-bold mb-2">{feature.title}</h4>
                            <p className="text-gray-300 text-sm">{feature.desc}</p>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
