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

            {/* Global Search */}
            <div className="mb-6 max-w-2xl mx-auto">
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

            {/* Tabs Navigation */}
            <div className="mb-8">
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

    // Group search results by tags
    const searchRankingsByTag = useMemo(() => {
        const grouped: Record<string, typeof communityRankings> = {}

        searchFilteredRankings.forEach((ranking: any) => {
            if (ranking.tags && ranking.tags.length > 0) {
                ranking.tags.forEach((tag: string) => {
                    if (!grouped[tag]) {
                        grouped[tag] = []
                    }
                    grouped[tag].push(ranking)
                })
            } else {
                if (!grouped['Other']) {
                    grouped['Other'] = []
                }
                grouped['Other'].push(ranking)
            }
        })

        return grouped
    }, [searchFilteredRankings])

    // Get tag rows for search results
    const searchTagRows = useMemo(() => {
        if (filterByTag) {
            return searchRankingsByTag[filterByTag]
                ? [{ tag: filterByTag, rankings: searchRankingsByTag[filterByTag] }]
                : []
        }

        return Object.entries(searchRankingsByTag)
            .map(([tag, rankings]) => ({ tag, rankings }))
            .sort((a, b) => b.rankings.length - a.rankings.length)
    }, [searchRankingsByTag, filterByTag])

    const displayTagRows = searchQuery ? searchTagRows : tagRows
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
                        <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900">
                            {POPULAR_TAGS.slice(0, 15).map((tag) => (
                                <button
                                    key={tag.id}
                                    onClick={() =>
                                        setFilterByTag(filterByTag === tag.name ? null : tag.name)
                                    }
                                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all text-left flex items-center gap-2 ${
                                        filterByTag === tag.name
                                            ? 'bg-yellow-500 text-black'
                                            : 'bg-zinc-800 text-gray-300 hover:bg-zinc-700'
                                    }`}
                                    title={tag.description}
                                >
                                    <span className="text-base">{tag.emoji}</span>
                                    <span className="flex-1 truncate">{tag.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="pt-3 border-t border-zinc-800">
                        <div className="text-xs text-gray-500 space-y-1">
                            <div>Total: {communityRankings.length} rankings</div>
                            {searchQuery ? (
                                <div>Found: {searchFilteredRankings.length} matches</div>
                            ) : (
                                <div>Showing: {filteredByMediaType.length} rankings</div>
                            )}
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
                {displayTagRows.length > 0 ? (
                    <div className="space-y-6">
                        {displayTagRows.map(({ tag, rankings }) => {
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
                        <p className="text-gray-400 text-lg mb-2">
                            {searchQuery
                                ? `No rankings match "${searchQuery}"`
                                : 'No rankings found'}
                        </p>
                        <p className="text-gray-500 text-sm">
                            {searchQuery
                                ? 'Try a different search term'
                                : 'Try adjusting your filters or be the first to create one!'}
                        </p>
                    </div>
                )}

                {/* Load More button */}
                {hasMore && !searchQuery && displayTagRows.length > 0 && (
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
    const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'most-replied'>('recent')

    // Load threads on mount
    useEffect(() => {
        loadThreads()
    }, [loadThreads])

    const handleCreateThread = async (
        title: string,
        content: string,
        category: ForumCategory,
        tags: string[]
    ) => {
        if (isGuest) {
            alert('Please sign in to create threads')
            return
        }
        const userId = getUserId()
        await createThread(userId, title, content, category, tags)
        await loadThreads() // Reload threads
    }

    const handleOpenCreateModal = () => {
        if (isGuest) {
            alert('Please sign in to create threads')
            return
        }
        setIsCreateModalOpen(true)
    }

    return (
        <div className="space-y-6">
            {/* Sort controls */}
            <div className="flex flex-wrap gap-2 items-center bg-zinc-900 border border-zinc-800 rounded-lg p-3">
                <span className="text-sm text-gray-400">Sort by:</span>
                {[
                    { value: 'recent' as const, label: 'Recent' },
                    { value: 'popular' as const, label: 'Popular' },
                    { value: 'most-replied' as const, label: 'Most Replied' },
                ].map((option) => (
                    <button
                        key={option.value}
                        onClick={() => setSortBy(option.value)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            sortBy === option.value
                                ? 'bg-blue-500 text-white'
                                : 'bg-zinc-800 text-gray-400 hover:text-white hover:bg-zinc-700'
                        }`}
                    >
                        {option.label}
                    </button>
                ))}
            </div>

            {/* Header with filters and create button */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                {/* Category filter */}
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setSelectedCategory('all')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            selectedCategory === 'all'
                                ? 'bg-blue-500 text-white'
                                : 'bg-zinc-900 text-gray-400 hover:text-white hover:bg-zinc-800 border border-zinc-800'
                        }`}
                    >
                        All
                    </button>
                    {FORUM_CATEGORIES.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                selectedCategory === cat.id
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-zinc-900 text-gray-400 hover:text-white hover:bg-zinc-800 border border-zinc-800'
                            }`}
                        >
                            {cat.icon} {cat.name}
                        </button>
                    ))}
                </div>

                {/* Create thread button */}
                <button
                    onClick={handleOpenCreateModal}
                    className={`px-5 py-2.5 font-semibold rounded-lg transition-colors flex items-center gap-2 ${
                        isGuest
                            ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                            : 'bg-blue-500 hover:bg-blue-600 text-white'
                    }`}
                    disabled={isGuest}
                    title={isGuest ? 'Sign in to create threads' : 'Create a new thread'}
                >
                    <ChatBubbleLeftRightIcon className="w-5 h-5" />
                    New Thread {isGuest && '(Sign in required)'}
                </button>
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
            {threads.length > 0 &&
                (() => {
                    const filteredThreads = threads
                        .filter((thread) =>
                            selectedCategory === 'all' ? true : thread.category === selectedCategory
                        )
                        .filter((thread) =>
                            searchQuery
                                ? thread.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                  thread.content
                                      .toLowerCase()
                                      .includes(searchQuery.toLowerCase()) ||
                                  thread.userName
                                      .toLowerCase()
                                      .includes(searchQuery.toLowerCase()) ||
                                  thread.tags?.some((tag) =>
                                      tag.toLowerCase().includes(searchQuery.toLowerCase())
                                  )
                                : true
                        )
                        .sort((a, b) => {
                            const toDate = (ts: any) => (ts?.toDate ? ts.toDate() : new Date(ts))
                            switch (sortBy) {
                                case 'popular':
                                    return b.likes - a.likes
                                case 'most-replied':
                                    return b.replyCount - a.replyCount
                                case 'recent':
                                default:
                                    return (
                                        toDate(b.createdAt).getTime() -
                                        toDate(a.createdAt).getTime()
                                    )
                            }
                        })

                    return filteredThreads.length > 0 ? (
                        <div className="space-y-3">
                            {filteredThreads.map((thread) => (
                                <ThreadCard key={thread.id} thread={thread} />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-20 h-20 mb-4 rounded-full bg-zinc-800 flex items-center justify-center">
                                <ChatBubbleLeftRightIcon className="w-10 h-10 text-gray-600" />
                            </div>
                            <p className="text-gray-400 text-lg mb-2">
                                {searchQuery
                                    ? `No threads match "${searchQuery}"`
                                    : 'No threads found'}
                            </p>
                            <p className="text-gray-500 text-sm">
                                {searchQuery
                                    ? 'Try a different search term'
                                    : 'Try adjusting your filters'}
                            </p>
                        </div>
                    )
                })()}
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
    const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'most-voted'>('recent')

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
        await createPoll(
            userId,
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
        try {
            await voteOnPoll(userId, pollId, optionIds)
            // Update local state to show vote immediately
            setUserVotes((prev) => ({ ...prev, [pollId]: optionIds }))
            await loadPolls() // Reload to get updated counts
        } catch (error) {
            console.error('Failed to vote:', error)
        }
    }

    return (
        <div className="space-y-6">
            {/* Sort controls */}
            <div className="flex flex-wrap gap-2 items-center bg-zinc-900 border border-zinc-800 rounded-lg p-3">
                <span className="text-sm text-gray-400">Sort by:</span>
                {[
                    { value: 'recent' as const, label: 'Recent' },
                    { value: 'popular' as const, label: 'Popular' },
                    { value: 'most-voted' as const, label: 'Most Voted' },
                ].map((option) => (
                    <button
                        key={option.value}
                        onClick={() => setSortBy(option.value)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            sortBy === option.value
                                ? 'bg-pink-500 text-white'
                                : 'bg-zinc-800 text-gray-400 hover:text-white hover:bg-zinc-700'
                        }`}
                    >
                        {option.label}
                    </button>
                ))}
            </div>

            {/* Header with filters and create button */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                {/* Category filter */}
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setSelectedCategory('all')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            selectedCategory === 'all'
                                ? 'bg-pink-500 text-white'
                                : 'bg-zinc-900 text-gray-400 hover:text-white hover:bg-zinc-800 border border-zinc-800'
                        }`}
                    >
                        All
                    </button>
                    {FORUM_CATEGORIES.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                selectedCategory === cat.id
                                    ? 'bg-pink-500 text-white'
                                    : 'bg-zinc-900 text-gray-400 hover:text-white hover:bg-zinc-800 border border-zinc-800'
                            }`}
                        >
                            {cat.icon} {cat.name}
                        </button>
                    ))}
                </div>

                {/* Create poll button */}
                <button
                    onClick={handleOpenCreateModal}
                    className={`px-5 py-2.5 font-semibold rounded-lg transition-colors flex items-center gap-2 ${
                        isGuest
                            ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                            : 'bg-pink-500 hover:bg-pink-600 text-white'
                    }`}
                    disabled={isGuest}
                    title={isGuest ? 'Sign in to create polls' : 'Create a new poll'}
                >
                    <ChartBarIcon className="w-5 h-5" />
                    New Poll {isGuest && '(Sign in required)'}
                </button>
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
            {polls.length > 0 &&
                (() => {
                    const filteredPolls = polls
                        .filter((poll) =>
                            selectedCategory === 'all' ? true : poll.category === selectedCategory
                        )
                        .filter((poll) =>
                            searchQuery
                                ? poll.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                  poll.description
                                      ?.toLowerCase()
                                      .includes(searchQuery.toLowerCase()) ||
                                  poll.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                  poll.options.some((opt) =>
                                      opt.text.toLowerCase().includes(searchQuery.toLowerCase())
                                  ) ||
                                  poll.tags?.some((tag) =>
                                      tag.toLowerCase().includes(searchQuery.toLowerCase())
                                  )
                                : true
                        )
                        .sort((a, b) => {
                            const toDate = (ts: any) => (ts?.toDate ? ts.toDate() : new Date(ts))
                            switch (sortBy) {
                                case 'most-voted':
                                    return b.totalVotes - a.totalVotes
                                case 'popular':
                                    return b.totalVotes - a.totalVotes
                                case 'recent':
                                default:
                                    return (
                                        toDate(b.createdAt).getTime() -
                                        toDate(a.createdAt).getTime()
                                    )
                            }
                        })

                    return filteredPolls.length > 0 ? (
                        <div className="space-y-4">
                            {filteredPolls.map((poll) => (
                                <PollCard
                                    key={poll.id}
                                    poll={poll}
                                    userVote={userVotes[poll.id] || []}
                                    onVote={
                                        isGuest
                                            ? undefined
                                            : (optionIds) => handleVote(poll.id, optionIds)
                                    }
                                />
                            ))}
                        </div>
                    ) : (
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
                })()}
        </div>
    )
}
