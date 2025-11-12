/**
 * Rankings Dashboard Page
 *
 * Displays user's created rankings with filtering and sorting options
 * Allows creating new rankings and managing existing ones
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import SubPageLayout from '../../components/layout/SubPageLayout'
import { RankingGrid } from '../../components/rankings/RankingGrid'
import { useRankingStore } from '../../stores/rankingStore'
import { useSessionStore } from '../../stores/sessionStore'
import { useAuthStatus } from '../../hooks/useAuthStatus'
import { GuestModeNotification } from '../../components/auth/GuestModeNotification'
import NetflixLoader from '../../components/common/NetflixLoader'
import { Ranking, RankingComment } from '../../types/rankings'
import { getUserComments } from '../../utils/firestore/rankingComments'
import { getUserLikedRankings } from '../../utils/firestore/rankings'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import {
    TrophyIcon,
    PlusIcon,
    AdjustmentsHorizontalIcon,
    FunnelIcon,
    UsersIcon,
    ChatBubbleLeftIcon,
    HeartIcon,
} from '@heroicons/react/24/outline'

export default function RankingsPage() {
    const router = useRouter()
    const getUserId = useSessionStore((state) => state.getUserId)
    const userId = getUserId()
    const { isGuest, isInitialized } = useAuthStatus()

    const {
        rankings,
        isLoading,
        error,
        loadUserRankings,
        sortBy,
        setSortBy,
        filterByMediaType,
        setFilterByMediaType,
    } = useRankingStore()

    const [showFilters, setShowFilters] = useState(false)
    const [activeTab, setActiveTab] = useState<'rankings' | 'comments' | 'liked'>('rankings')
    const [userComments, setUserComments] = useState<RankingComment[]>([])
    const [likedRankings, setLikedRankings] = useState<Ranking[]>([])
    const [isLoadingComments, setIsLoadingComments] = useState(false)
    const [isLoadingLiked, setIsLoadingLiked] = useState(false)

    // Load rankings on mount
    useEffect(() => {
        if (isInitialized && userId) {
            loadUserRankings(userId)
        }
    }, [isInitialized, userId])

    // Load comments when comments tab is active
    useEffect(() => {
        if (activeTab === 'comments' && userId && !isGuest) {
            setIsLoadingComments(true)
            getUserComments(userId)
                .then((result) => setUserComments(result.data))
                .catch(console.error)
                .finally(() => setIsLoadingComments(false))
        }
    }, [activeTab, userId, isGuest])

    // Load liked rankings when liked tab is active
    useEffect(() => {
        if (activeTab === 'liked' && userId && !isGuest) {
            setIsLoadingLiked(true)
            getUserLikedRankings(userId)
                .then((result) => setLikedRankings(result.data))
                .catch(console.error)
                .finally(() => setIsLoadingLiked(false))
        }
    }, [activeTab, userId, isGuest])

    const handleCreateNew = () => {
        router.push('/rankings/new')
    }

    const handleRankingClick = (rankingId: string) => {
        router.push(`/rankings/${rankingId}`)
    }

    // Filter rankings by media type
    const filteredRankings =
        filterByMediaType === 'all'
            ? rankings
            : rankings.filter((ranking) => {
                  // Check if all items in ranking match the filter
                  return ranking.rankedItems.every(
                      (item) => item.content.media_type === filterByMediaType
                  )
              })

    if (!isInitialized || isLoading) {
        return (
            <SubPageLayout
                title="My Rankings"
                icon={<TrophyIcon className="w-8 h-8" />}
                iconColor="text-yellow-500"
            >
                <NetflixLoader />
            </SubPageLayout>
        )
    }

    return (
        <SubPageLayout
            title="My Rankings"
            icon={<TrophyIcon className="w-8 h-8" />}
            iconColor="text-yellow-500"
            headerActions={
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                    >
                        <AdjustmentsHorizontalIcon className="w-5 h-5" />
                        <span className="hidden sm:inline">Filters</span>
                    </button>
                    <button
                        onClick={handleCreateNew}
                        className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-medium rounded-lg transition-colors"
                    >
                        <PlusIcon className="w-5 h-5" />
                        <span>Create Ranking</span>
                    </button>
                </div>
            }
        >
            {/* Guest Mode Notification */}
            {isGuest && (
                <div className="mb-6">
                    <GuestModeNotification />
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-zinc-800">
                <button
                    onClick={() => setActiveTab('rankings')}
                    className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 ${
                        activeTab === 'rankings'
                            ? 'border-yellow-500 text-yellow-500'
                            : 'border-transparent text-gray-400 hover:text-white'
                    }`}
                >
                    <TrophyIcon className="w-5 h-5" />
                    <span>Your Rankings</span>
                    {rankings.length > 0 && (
                        <span className="ml-1 text-sm text-gray-500">({rankings.length})</span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('comments')}
                    className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 ${
                        activeTab === 'comments'
                            ? 'border-yellow-500 text-yellow-500'
                            : 'border-transparent text-gray-400 hover:text-white'
                    }`}
                >
                    <ChatBubbleLeftIcon className="w-5 h-5" />
                    <span>Your Comments</span>
                    {userComments.length > 0 && (
                        <span className="ml-1 text-sm text-gray-500">({userComments.length})</span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('liked')}
                    className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 ${
                        activeTab === 'liked'
                            ? 'border-yellow-500 text-yellow-500'
                            : 'border-transparent text-gray-400 hover:text-white'
                    }`}
                >
                    <HeartIcon className="w-5 h-5" />
                    <span>Liked Rankings</span>
                    {likedRankings.length > 0 && (
                        <span className="ml-1 text-sm text-gray-500">({likedRankings.length})</span>
                    )}
                </button>
            </div>

            {/* Rankings Tab */}
            {activeTab === 'rankings' && (
                <>
                    {/* Filters Panel */}
                    {showFilters && (
                        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-6 space-y-4">
                            {/* Sort By */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Sort By
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        { value: 'recent', label: 'Most Recent' },
                                        { value: 'popular', label: 'Most Popular' },
                                        { value: 'liked', label: 'Most Liked' },
                                    ].map((option) => (
                                        <button
                                            key={option.value}
                                            onClick={() => setSortBy(option.value as typeof sortBy)}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                                sortBy === option.value
                                                    ? 'bg-yellow-500 text-black'
                                                    : 'bg-zinc-800 text-gray-300 hover:bg-zinc-700'
                                            }`}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Filter by Media Type */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Content Type
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        { value: 'all', label: 'All' },
                                        { value: 'movie', label: 'Movies Only' },
                                        { value: 'tv', label: 'TV Shows Only' },
                                    ].map((option) => (
                                        <button
                                            key={option.value}
                                            onClick={() =>
                                                setFilterByMediaType(
                                                    option.value as typeof filterByMediaType
                                                )
                                            }
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
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
                        </div>
                    )}

                    {/* Error State */}
                    {error && (
                        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-6">
                            <p className="text-red-400">{error}</p>
                        </div>
                    )}

                    {/* Rankings Grid */}
                    <RankingGrid
                        rankings={filteredRankings}
                        isLoading={isLoading}
                        emptyMessage={
                            isGuest
                                ? 'Sign in to create your first ranking!'
                                : 'No rankings yet. Create your first ranking to get started!'
                        }
                        showAuthor={false}
                        onLike={handleRankingClick}
                    />

                    {/* Stats Footer */}
                    {!isLoading && rankings.length > 0 && (
                        <div className="mt-8 flex items-center justify-center gap-8 text-sm text-gray-400">
                            <div className="flex items-center gap-2">
                                <TrophyIcon className="w-5 h-5 text-yellow-500" />
                                <span>
                                    {rankings.length}{' '}
                                    {rankings.length === 1 ? 'ranking' : 'rankings'}
                                </span>
                            </div>
                            {filteredRankings.length !== rankings.length && (
                                <div className="flex items-center gap-2">
                                    <FunnelIcon className="w-5 h-5 text-gray-500" />
                                    <span>
                                        Showing {filteredRankings.length} of {rankings.length}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* Comments Tab */}
            {activeTab === 'comments' && (
                <div className="space-y-4">
                    {isLoadingComments ? (
                        <NetflixLoader />
                    ) : userComments.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <ChatBubbleLeftIcon className="w-16 h-16 mx-auto mb-4 text-gray-700" />
                            <p>No comments yet. Start commenting on rankings!</p>
                        </div>
                    ) : (
                        userComments.map((comment) => (
                            <Link
                                key={comment.id}
                                href={`/rankings/${comment.rankingId}`}
                                className="block bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-colors"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-sm text-gray-500">
                                        {formatDistanceToNow(comment.createdAt, {
                                            addSuffix: true,
                                        })}
                                    </span>
                                    <div className="flex items-center gap-4 text-sm text-gray-500">
                                        <div className="flex items-center gap-1">
                                            <HeartIcon className="w-4 h-4" />
                                            <span>{comment.likes}</span>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-white">{comment.text}</p>
                                <div className="mt-2 text-sm text-gray-400">
                                    On: <span className="text-yellow-500">View Ranking →</span>
                                </div>
                            </Link>
                        ))
                    )}
                </div>
            )}

            {/* Liked Rankings Tab */}
            {activeTab === 'liked' && (
                <>
                    {isLoadingLiked ? (
                        <NetflixLoader />
                    ) : (
                        <RankingGrid
                            rankings={likedRankings}
                            isLoading={isLoadingLiked}
                            emptyMessage="No liked rankings yet. Start liking rankings you enjoy!"
                            showAuthor={true}
                            onLike={handleRankingClick}
                        />
                    )}
                </>
            )}
        </SubPageLayout>
    )
}
