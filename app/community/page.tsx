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
import { FORUM_CATEGORIES } from '../../utils/forumCategories'
import { ThreadCard } from '../../components/forum/ThreadCard'
import { PollCard } from '../../components/forum/PollCard'
import { CreateThreadModal } from '../../components/forum/CreateThreadModal'
import { CreatePollModal } from '../../components/forum/CreatePollModal'
import { useForumStore } from '../../stores/forumStore'
import { useSessionStore } from '../../stores/sessionStore'
import { ForumCategory } from '../../types/forum'
import { auth } from '@/firebase'
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
    MagnifyingGlassIcon,
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
    const [searchQuery, setSearchQuery] = useState('')

    const { threads, polls } = useForumStore()

    // Read tab from URL parameter
    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search)
        const tab = searchParams.get('tab') as TabType
        if (tab && ['rankings', 'forums', 'polls'].includes(tab)) {
            setActiveTab(tab)
        }
    }, [])

    const [rankingsLimit, setRankingsLimit] = useState(20)

    // Load community rankings on mount and when sort changes
    useEffect(() => {
        if (isInitialized) {
            loadCommunityRankings(rankingsLimit)
        }
    }, [isInitialized, sortBy, rankingsLimit])

    const handleLoadMoreRankings = () => {
        setRankingsLimit((prev) => prev + 20)
    }

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

            {/* Tabs Navigation */}
            <div className="mb-6">
                <div className="flex justify-center">
                    <div className="inline-flex gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
                        {[
                            {
                                id: 'rankings' as TabType,
                                label: 'Rankings',
                                icon: TrophyIcon,
                                color: 'text-yellow-500',
                                count: communityRankings.length,
                            },
                            {
                                id: 'forums' as TabType,
                                label: 'Forums',
                                icon: ChatBubbleLeftRightIcon,
                                color: 'text-blue-500',
                                count: threads.length,
                            },
                            {
                                id: 'polls' as TabType,
                                label: 'Polls',
                                icon: ChartBarIcon,
                                color: 'text-pink-500',
                                count: polls.length,
                            },
                        ].map((tab) => {
                            const Icon = tab.icon
                            const isActive = activeTab === tab.id

                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`relative px-5 py-3 rounded-md font-semibold text-sm transition-all duration-200 ${
                                        isActive
                                            ? 'bg-zinc-800 text-white'
                                            : 'text-gray-400 hover:text-gray-200 hover:bg-zinc-800/50'
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <Icon className={`w-5 h-5 ${isActive ? tab.color : ''}`} />
                                        <span>{tab.label}</span>
                                        {tab.count > 0 && (
                                            <span
                                                className={`px-2 py-0.5 text-xs rounded-full ${
                                                    isActive
                                                        ? 'bg-zinc-700 text-gray-300'
                                                        : 'bg-zinc-800 text-gray-500'
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

            {/* Global Search */}
            <div className="mb-8 max-w-2xl mx-auto">
                <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={`Search ${activeTab}...`}
                        className="w-full pl-12 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 transition-colors"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                        >
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    )}
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
                    searchQuery={searchQuery}
                    onLoadMore={handleLoadMoreRankings}
                    hasMore={communityRankings.length >= rankingsLimit}
                />
            )}

            {activeTab === 'forums' && <ForumsTab searchQuery={searchQuery} />}

            {activeTab === 'polls' && <PollsTab searchQuery={searchQuery} />}
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
    searchQuery,
    onLoadMore,
    hasMore,
}: any) {
    const [tagSearchQuery, setTagSearchQuery] = useState('')

    // Apply search filter
    const searchFilteredRankings = searchQuery
        ? filteredByMediaType.filter(
              (ranking: any) =>
                  ranking.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  ranking.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  ranking.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  ranking.contentTitles?.some((title: string) =>
                      title.toLowerCase().includes(searchQuery.toLowerCase())
                  )
          )
        : filteredByMediaType

    // Filter rankings by selected tag
    const finalFilteredRankings = filterByTag
        ? searchFilteredRankings.filter(
              (ranking: any) => ranking.tags && ranking.tags.includes(filterByTag)
          )
        : searchFilteredRankings

    // Filter tags by search query
    const filteredTags = POPULAR_TAGS.filter(
        (tag) =>
            tag.name.toLowerCase().includes(tagSearchQuery.toLowerCase()) ||
            tag.description.toLowerCase().includes(tagSearchQuery.toLowerCase())
    )

    return (
        <div className="space-y-6">
            {/* Filters Section - Top Horizontal Layout */}
            <div className="space-y-4">
                {/* Stats Bar */}
                <div className="text-sm text-gray-400 flex items-center gap-4">
                    <span>
                        Total:{' '}
                        <span className="text-white font-semibold">{communityRankings.length}</span>{' '}
                        rankings
                    </span>
                    {searchQuery && (
                        <span>
                            Found:{' '}
                            <span className="text-white font-semibold">
                                {searchFilteredRankings.length}
                            </span>{' '}
                            matches
                        </span>
                    )}
                    {filterByTag && (
                        <span>
                            In tag:{' '}
                            <span className="text-white font-semibold">
                                {finalFilteredRankings.length}
                            </span>{' '}
                            rankings
                        </span>
                    )}
                </div>

                {/* Media Type Filter Pills */}
                <div className="flex flex-wrap gap-2">
                    {[
                        { value: 'all', label: 'All' },
                        { value: 'movie', label: 'Movies' },
                        { value: 'tv', label: 'TV Shows' },
                    ].map((option) => (
                        <button
                            key={option.value}
                            onClick={() =>
                                setFilterByMediaType(option.value as typeof filterByMediaType)
                            }
                            className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                                filterByMediaType === option.value
                                    ? 'bg-yellow-500 text-black shadow-lg scale-105'
                                    : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700/80 hover:scale-105'
                            }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>

                {/* Tag Filter Section */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-400">Filter by Tag</label>
                        {filterByTag && (
                            <button
                                onClick={() => setFilterByTag(null)}
                                className="text-xs text-yellow-500 hover:text-yellow-400 transition-colors flex items-center gap-1"
                            >
                                <XMarkIcon className="w-4 h-4" />
                                Clear tag filter
                            </button>
                        )}
                    </div>

                    {/* Tag Search Input */}
                    <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={tagSearchQuery}
                            onChange={(e) => setTagSearchQuery(e.target.value)}
                            placeholder="Search tags..."
                            className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-yellow-500 transition-colors"
                        />
                        {tagSearchQuery && (
                            <button
                                onClick={() => setTagSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                            >
                                <XMarkIcon className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Popular Tags as Pills */}
                    <div className="flex flex-wrap gap-2">
                        {filteredTags.slice(0, 12).map((tag) => (
                            <button
                                key={tag.id}
                                onClick={() =>
                                    setFilterByTag(filterByTag === tag.name ? null : tag.name)
                                }
                                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
                                    filterByTag === tag.name
                                        ? 'bg-yellow-500 text-black shadow-lg scale-105'
                                        : 'bg-zinc-900 text-gray-300 hover:bg-zinc-800 border border-zinc-800 hover:scale-105'
                                }`}
                                title={tag.description}
                            >
                                <span>{tag.emoji}</span>
                                <span>{tag.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Error State */}
            {error && (
                <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
                    <p className="text-red-400">{error}</p>
                </div>
            )}

            {/* Rankings Grid */}
            {finalFilteredRankings.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                    {finalFilteredRankings.map((ranking: any) => (
                        <div
                            key={ranking.id}
                            onClick={() => handleRankingClick(ranking.id)}
                            className="cursor-pointer"
                        >
                            <div className="group relative bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 hover:border-zinc-700 transition-all duration-200 hover:shadow-xl">
                                {/* Main card */}
                                <div className="relative">
                                    {/* Header with top 3 posters */}
                                    {ranking.rankedItems && ranking.rankedItems.length > 0 && (
                                        <div className="relative h-48 bg-gradient-to-br from-zinc-800/50 to-zinc-900">
                                            <div className="absolute inset-0 flex justify-center items-center gap-2 p-4">
                                                {ranking.rankedItems
                                                    .slice(0, 3)
                                                    .map((item: any) => (
                                                        <div
                                                            key={item.content.id}
                                                            className="relative flex-1 h-full"
                                                        >
                                                            <img
                                                                src={`https://image.tmdb.org/t/p/w500${item.content.poster_path}`}
                                                                alt={
                                                                    item.content.title ||
                                                                    item.content.name
                                                                }
                                                                className="object-cover rounded-md shadow-lg w-full h-full"
                                                            />
                                                        </div>
                                                    ))}
                                            </div>
                                            <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/50 to-transparent" />
                                            {ranking.likes > 50 && (
                                                <div className="absolute top-3 right-3 px-2.5 py-1 bg-orange-500/90 backdrop-blur-sm rounded text-xs font-semibold text-white flex items-center gap-1">
                                                    <FireIcon className="w-3 h-3" />
                                                    <span>HOT</span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Content section */}
                                    <div className="p-4 space-y-3">
                                        {/* Trophy icon + title */}
                                        <div className="flex items-start gap-2">
                                            <TrophyIcon className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-1" />
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-lg font-bold text-white group-hover:text-yellow-400 transition-colors line-clamp-2">
                                                    {ranking.title}
                                                </h3>
                                            </div>
                                        </div>

                                        {/* Description - Fixed height for 2 lines */}
                                        <div className="h-10">
                                            {ranking.description && (
                                                <p className="text-sm text-gray-400 line-clamp-2">
                                                    {ranking.description}
                                                </p>
                                            )}
                                        </div>

                                        {/* Author info */}
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="text-gray-400">
                                                By {ranking.userName}
                                            </span>
                                        </div>

                                        {/* Tags */}
                                        {ranking.tags && ranking.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5">
                                                {ranking.tags.slice(0, 3).map((tag: string) => (
                                                    <span
                                                        key={tag}
                                                        className="px-2 py-1 text-xs font-medium bg-zinc-800 text-gray-300 rounded-full"
                                                    >
                                                        {tag}
                                                    </span>
                                                ))}
                                                {ranking.tags.length > 3 && (
                                                    <span className="px-2 py-1 text-xs font-medium text-gray-500">
                                                        +{ranking.tags.length - 3}
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {/* Stats & actions */}
                                        <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                                            <div className="flex items-center gap-4 text-sm text-gray-400">
                                                <div className="flex items-center gap-1">
                                                    <HeartIcon className="w-5 h-5" />
                                                    <span>{ranking.likes || 0}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <ChatBubbleLeftRightIcon className="w-5 h-5" />
                                                    <span>{ranking.commentCount || 0}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <EyeIcon className="w-5 h-5" />
                                                    <span>{ranking.views || 0}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-20 h-20 mb-4 rounded-full bg-zinc-800 flex items-center justify-center">
                        <TrophyIcon className="w-10 h-10 text-gray-600" />
                    </div>
                    <p className="text-gray-400 text-lg mb-2">
                        {searchQuery || filterByTag
                            ? 'No rankings match your filters'
                            : 'No rankings found'}
                    </p>
                    <p className="text-gray-500 text-sm">
                        {searchQuery || filterByTag
                            ? 'Try adjusting your search or filters'
                            : 'Be the first to create one!'}
                    </p>
                </div>
            )}

            {/* Load More button */}
            {hasMore && !searchQuery && !filterByTag && finalFilteredRankings.length > 0 && (
                <div className="flex justify-center mt-8">
                    <button
                        onClick={onLoadMore}
                        className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
                    >
                        <span>Load More Rankings</span>
                        <SparklesIcon className="w-5 h-5" />
                    </button>
                </div>
            )}
        </div>
    )
}

// Forums Tab Component
function ForumsTab({ searchQuery }: { searchQuery: string }) {
    const { threads, isLoadingThreads, loadThreads, createThread } = useForumStore()
    const getUserId = useSessionStore((state) => state.getUserId)
    const { isGuest } = useAuthStatus()
    const [selectedCategory, setSelectedCategory] = useState<ForumCategory | 'all'>('all')
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

    // Load threads on mount
    useEffect(() => {
        loadThreads()
    }, [loadThreads])

    const handleCreateThread = async (
        title: string,
        content: string,
        category: ForumCategory,
        tags: string[],
        images?: string[]
    ) => {
        if (isGuest) {
            alert('Please sign in to create threads')
            return
        }
        const userId = getUserId()
        if (!userId) return

        // Get user info from Firebase Auth
        const currentUser = auth.currentUser
        if (!currentUser) return

        const userName = currentUser.displayName || 'Anonymous'
        const userAvatar = currentUser.photoURL || undefined

        await createThread(userId, userName, userAvatar, title, content, category, tags, images)
        await loadThreads() // Reload threads
    }

    const handleOpenCreateModal = () => {
        if (isGuest) {
            alert('Please sign in to create threads')
            return
        }
        setIsCreateModalOpen(true)
    }

    // Apply filters
    const filteredThreads = threads
        .filter((thread) =>
            selectedCategory === 'all' ? true : thread.category === selectedCategory
        )
        .filter((thread) =>
            searchQuery
                ? thread.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  thread.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  thread.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  thread.tags?.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
                : true
        )
        .sort((a, b) => {
            const toDate = (ts: any) => (ts?.toDate ? ts.toDate() : new Date(ts))
            return toDate(b.createdAt).getTime() - toDate(a.createdAt).getTime()
        })

    return (
        <div className="space-y-6">
            {/* Filters Section - Top Horizontal Layout */}
            <div className="space-y-4">
                {/* Stats Bar */}
                <div className="text-sm text-gray-400 flex items-center gap-4 flex-wrap">
                    <span>
                        Total: <span className="text-white font-semibold">{threads.length}</span>{' '}
                        threads
                    </span>
                    {searchQuery && (
                        <span>
                            Found:{' '}
                            <span className="text-white font-semibold">
                                {filteredThreads.length}
                            </span>{' '}
                            matches
                        </span>
                    )}
                    {selectedCategory !== 'all' && (
                        <span>
                            In category:{' '}
                            <span className="text-white font-semibold">
                                {filteredThreads.length}
                            </span>{' '}
                            threads
                        </span>
                    )}
                </div>

                {/* Category Filter Pills and Create Button */}
                <div className="flex flex-wrap gap-2 items-center justify-between">
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setSelectedCategory('all')}
                            className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                                selectedCategory === 'all'
                                    ? 'bg-blue-500 text-white shadow-lg scale-105'
                                    : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700/80 hover:scale-105'
                            }`}
                        >
                            All
                        </button>
                        {FORUM_CATEGORIES.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
                                    selectedCategory === cat.id
                                        ? 'bg-blue-500 text-white shadow-lg scale-105'
                                        : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700/80 hover:scale-105'
                                }`}
                            >
                                <span>{cat.icon}</span>
                                <span>{cat.name}</span>
                            </button>
                        ))}
                    </div>

                    {/* Create thread button */}
                    <button
                        onClick={handleOpenCreateModal}
                        className={`rounded-full px-5 py-2.5 font-semibold transition-all duration-200 flex items-center gap-2 ${
                            isGuest
                                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                : 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg hover:scale-105'
                        }`}
                        disabled={isGuest}
                        title={isGuest ? 'Sign in to create threads' : 'Create a new thread'}
                    >
                        <ChatBubbleLeftRightIcon className="w-5 h-5" />
                        <span className="hidden sm:inline">New Thread</span>
                        {isGuest && <span className="text-xs">(Sign in)</span>}
                    </button>
                </div>
            </div>

            {/* Create Thread Modal */}
            <CreateThreadModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onCreate={handleCreateThread}
            />

            {/* Empty state */}
            {!isLoadingThreads && threads.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700 mb-6">
                        <ChatBubbleLeftRightIcon className="w-10 h-10 text-gray-600" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">No threads yet</h3>
                    <p className="text-gray-400 mb-6 max-w-md">
                        Be the first to start a discussion! Share your thoughts, ask questions, or
                        start a debate about your favorite movies and shows.
                    </p>
                    <button
                        onClick={handleOpenCreateModal}
                        className={`px-6 py-3 font-semibold rounded-lg transition-colors ${
                            isGuest
                                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                : 'bg-blue-500 hover:bg-blue-600 text-white'
                        }`}
                        disabled={isGuest}
                    >
                        {isGuest ? 'Sign in to Create Threads' : 'Create First Thread'}
                    </button>
                </div>
            )}

            {/* Thread list */}
            {filteredThreads.length > 0 ? (
                <div className="space-y-3">
                    {filteredThreads.map((thread) => (
                        <ThreadCard key={thread.id} thread={thread} />
                    ))}
                </div>
            ) : (
                threads.length > 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-20 h-20 mb-4 rounded-full bg-zinc-800 flex items-center justify-center">
                            <ChatBubbleLeftRightIcon className="w-10 h-10 text-gray-600" />
                        </div>
                        <p className="text-gray-400 text-lg mb-2">
                            {searchQuery ? `No threads match "${searchQuery}"` : 'No threads found'}
                        </p>
                        <p className="text-gray-500 text-sm">
                            {searchQuery
                                ? 'Try a different search term'
                                : 'Try adjusting your filters'}
                        </p>
                    </div>
                )
            )}
        </div>
    )
}

// Polls Tab Component
function PollsTab({ searchQuery }: { searchQuery: string }) {
    const { polls, isLoadingPolls, loadPolls, createPoll, voteOnPoll } = useForumStore()
    const getUserId = useSessionStore((state) => state.getUserId)
    const { isGuest } = useAuthStatus()
    const [selectedCategory, setSelectedCategory] = useState<ForumCategory | 'all'>('all')
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [userVotes, setUserVotes] = useState<Record<string, string[]>>({})

    // Load polls on mount
    useEffect(() => {
        loadPolls()
    }, [loadPolls])

    const handleCreatePoll = async (
        question: string,
        options: string[],
        category: ForumCategory,
        description?: string,
        isMultipleChoice?: boolean,
        expiresInDays?: number
    ) => {
        if (isGuest) {
            alert('Please sign in to create polls')
            return
        }
        const userId = getUserId()
        if (!userId) return

        // Get user info from Firebase Auth
        const currentUser = auth.currentUser
        if (!currentUser) return

        const userName = currentUser.displayName || 'Anonymous'
        const userAvatar = currentUser.photoURL || undefined

        await createPoll(
            userId,
            userName,
            userAvatar,
            question,
            options,
            category,
            description,
            isMultipleChoice,
            expiresInDays
        )
        await loadPolls() // Reload polls
    }

    const handleOpenCreateModal = () => {
        if (isGuest) {
            alert('Please sign in to create polls')
            return
        }
        setIsCreateModalOpen(true)
    }

    const handleVote = async (pollId: string, optionIds: string[]) => {
        if (isGuest) {
            alert('Please sign in to vote on polls')
            return
        }
        const userId = getUserId()
        if (!userId) return
        try {
            await voteOnPoll(userId, pollId, optionIds)
            // Update local state to show vote immediately
            setUserVotes((prev) => ({ ...prev, [pollId]: optionIds }))
            await loadPolls() // Reload to get updated counts
        } catch (error) {
            console.error('Failed to vote:', error)
        }
    }

    // Apply filters
    const filteredPolls = polls
        .filter((poll) => (selectedCategory === 'all' ? true : poll.category === selectedCategory))
        .filter((poll) =>
            searchQuery
                ? poll.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  poll.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  poll.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  poll.options.some((opt) =>
                      opt.text.toLowerCase().includes(searchQuery.toLowerCase())
                  ) ||
                  poll.tags?.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
                : true
        )
        .sort((a, b) => {
            const toDate = (ts: any) => (ts?.toDate ? ts.toDate() : new Date(ts))
            return toDate(b.createdAt).getTime() - toDate(a.createdAt).getTime()
        })

    return (
        <div className="space-y-6">
            {/* Filters Section - Top Horizontal Layout */}
            <div className="space-y-4">
                {/* Stats Bar */}
                <div className="text-sm text-gray-400 flex items-center gap-4 flex-wrap">
                    <span>
                        Total: <span className="text-white font-semibold">{polls.length}</span>{' '}
                        polls
                    </span>
                    {searchQuery && (
                        <span>
                            Found:{' '}
                            <span className="text-white font-semibold">{filteredPolls.length}</span>{' '}
                            matches
                        </span>
                    )}
                    {selectedCategory !== 'all' && (
                        <span>
                            In category:{' '}
                            <span className="text-white font-semibold">{filteredPolls.length}</span>{' '}
                            polls
                        </span>
                    )}
                </div>

                {/* Category Filter Pills and Create Button */}
                <div className="flex flex-wrap gap-2 items-center justify-between">
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setSelectedCategory('all')}
                            className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                                selectedCategory === 'all'
                                    ? 'bg-pink-500 text-white shadow-lg scale-105'
                                    : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700/80 hover:scale-105'
                            }`}
                        >
                            All
                        </button>
                        {FORUM_CATEGORIES.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
                                    selectedCategory === cat.id
                                        ? 'bg-pink-500 text-white shadow-lg scale-105'
                                        : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700/80 hover:scale-105'
                                }`}
                            >
                                <span>{cat.icon}</span>
                                <span>{cat.name}</span>
                            </button>
                        ))}
                    </div>

                    {/* Create poll button */}
                    <button
                        onClick={handleOpenCreateModal}
                        className={`rounded-full px-5 py-2.5 font-semibold transition-all duration-200 flex items-center gap-2 ${
                            isGuest
                                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                : 'bg-pink-500 hover:bg-pink-600 text-white shadow-lg hover:scale-105'
                        }`}
                        disabled={isGuest}
                        title={isGuest ? 'Sign in to create polls' : 'Create a new poll'}
                    >
                        <ChartBarIcon className="w-5 h-5" />
                        <span className="hidden sm:inline">New Poll</span>
                        {isGuest && <span className="text-xs">(Sign in)</span>}
                    </button>
                </div>
            </div>

            {/* Create Poll Modal */}
            <CreatePollModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onCreate={handleCreatePoll}
            />

            {/* Empty state */}
            {!isLoadingPolls && polls.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700 mb-6">
                        <ChartBarIcon className="w-10 h-10 text-gray-600" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">No polls yet</h3>
                    <p className="text-gray-400 mb-6 max-w-md">
                        Be the first to create a poll! Ask the community what they think about hot
                        topics, favorite shows, or anything else.
                    </p>
                    <button
                        onClick={handleOpenCreateModal}
                        className={`px-6 py-3 font-semibold rounded-lg transition-colors ${
                            isGuest
                                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                : 'bg-pink-500 hover:bg-pink-600 text-white'
                        }`}
                        disabled={isGuest}
                    >
                        {isGuest ? 'Sign in to Create Polls' : 'Create First Poll'}
                    </button>
                </div>
            )}

            {/* Poll list */}
            {filteredPolls.length > 0 ? (
                <div className="space-y-4">
                    {filteredPolls.map((poll) => (
                        <PollCard
                            key={poll.id}
                            poll={poll}
                            userVote={userVotes[poll.id] || []}
                            onVote={
                                isGuest ? undefined : (optionIds) => handleVote(poll.id, optionIds)
                            }
                        />
                    ))}
                </div>
            ) : (
                polls.length > 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-20 h-20 mb-4 rounded-full bg-zinc-800 flex items-center justify-center">
                            <ChartBarIcon className="w-10 h-10 text-gray-600" />
                        </div>
                        <p className="text-gray-400 text-lg mb-2">
                            {searchQuery ? `No polls match "${searchQuery}"` : 'No polls found'}
                        </p>
                        <p className="text-gray-500 text-sm">
                            {searchQuery
                                ? 'Try a different search term'
                                : 'Try adjusting your filters'}
                        </p>
                    </div>
                )
            )}
        </div>
    )
}
