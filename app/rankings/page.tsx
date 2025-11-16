/**
 * Rankings Dashboard Page
 *
 * Displays user's created rankings, comments, and liked rankings
 * Tab-based layout with search functionality
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
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
import { TrophyIcon, PlusIcon, ChatBubbleLeftIcon, HeartIcon } from '@heroicons/react/24/outline'
import SearchBar from '../../components/common/SearchBar'

export default function RankingsPage() {
    const router = useRouter()
    const getUserId = useSessionStore((state) => state.getUserId)
    const userId = getUserId()
    const { isGuest, isInitialized } = useAuthStatus()

    const { rankings, isLoading, error, loadUserRankings } = useRankingStore()

    const [activeTab, setActiveTab] = useState<'rankings' | 'comments' | 'liked'>('rankings')
    const [userComments, setUserComments] = useState<RankingComment[]>([])
    const [likedRankings, setLikedRankings] = useState<Ranking[]>([])
    const [isLoadingComments, setIsLoadingComments] = useState(false)
    const [isLoadingLiked, setIsLoadingLiked] = useState(false)

    // Search states
    const [rankingsSearch, setRankingsSearch] = useState('')
    const [commentsSearch, setCommentsSearch] = useState('')
    const [likedSearch, setLikedSearch] = useState('')

    // Load all data on mount
    useEffect(() => {
        if (isInitialized && userId) {
            // Load user rankings
            loadUserRankings(userId)

            // Load comments and liked rankings for authenticated users
            if (!isGuest) {
                // Load comments
                setIsLoadingComments(true)
                getUserComments(userId)
                    .then((result) => setUserComments(result.data))
                    .catch(console.error)
                    .finally(() => setIsLoadingComments(false))

                // Load liked rankings
                setIsLoadingLiked(true)
                getUserLikedRankings(userId)
                    .then((result) => setLikedRankings(result.data))
                    .catch(console.error)
                    .finally(() => setIsLoadingLiked(false))
            }
        }
    }, [isInitialized, userId, isGuest, loadUserRankings])

    const handleCreateNew = () => {
        if (isGuest) {
            alert('Please sign in to create rankings')
            return
        }
        router.push('/rankings/new')
    }

    const handleRankingClick = (rankingId: string) => {
        router.push(`/rankings/${rankingId}`)
    }

    // Filter rankings by search
    const filteredRankings = useMemo(() => {
        if (!rankingsSearch.trim()) return rankings

        const searchLower = rankingsSearch.toLowerCase()
        return rankings.filter(
            (ranking) =>
                ranking.title.toLowerCase().includes(searchLower) ||
                ranking.description?.toLowerCase().includes(searchLower) ||
                ranking.rankedItems.some((item) => {
                    const title = 'title' in item.content ? item.content.title : item.content.name
                    return title?.toLowerCase().includes(searchLower)
                })
        )
    }, [rankings, rankingsSearch])

    // Filter comments by search
    const filteredComments = useMemo(() => {
        if (!commentsSearch.trim()) return userComments

        const searchLower = commentsSearch.toLowerCase()
        return userComments.filter((comment) => comment.text.toLowerCase().includes(searchLower))
    }, [userComments, commentsSearch])

    // Filter liked rankings by search
    const filteredLikedRankings = useMemo(() => {
        if (!likedSearch.trim()) return likedRankings

        const searchLower = likedSearch.toLowerCase()
        return likedRankings.filter(
            (ranking) =>
                ranking.title.toLowerCase().includes(searchLower) ||
                ranking.description?.toLowerCase().includes(searchLower) ||
                ranking.userName?.toLowerCase().includes(searchLower) ||
                ranking.rankedItems.some((item) => {
                    const title = 'title' in item.content ? item.content.title : item.content.name
                    return title?.toLowerCase().includes(searchLower)
                })
        )
    }, [likedRankings, likedSearch])

    return (
        <SubPageLayout
            title="My Rankings"
            icon={<TrophyIcon className="w-8 h-8" />}
            iconColor="text-yellow-500"
            headerActions={
                <button
                    onClick={handleCreateNew}
                    className={`flex items-center gap-2 px-4 py-2 font-medium rounded-lg transition-colors ${
                        isGuest
                            ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                            : 'bg-yellow-500 hover:bg-yellow-400 text-black'
                    }`}
                    disabled={isGuest}
                    title={isGuest ? 'Sign in to create rankings' : 'Create a new ranking'}
                >
                    <PlusIcon className="w-5 h-5" />
                    <span>Create Ranking {isGuest && '(Sign in required)'}</span>
                </button>
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
                    {isLoading ? (
                        <span className="ml-1 text-sm text-gray-500 animate-pulse">(...)</span>
                    ) : rankings.length > 0 ? (
                        <span className="ml-1 text-sm text-gray-500">({rankings.length})</span>
                    ) : null}
                </button>
                <button
                    onClick={() => setActiveTab('comments')}
                    className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 ${
                        activeTab === 'comments'
                            ? 'border-yellow-500 text-yellow-500'
                            : 'border-transparent text-gray-400 hover:text-white'
                    }`}
                    disabled={isGuest}
                >
                    <ChatBubbleLeftIcon className="w-5 h-5" />
                    <span>Your Comments</span>
                    {!isGuest &&
                        (isLoadingComments ? (
                            <span className="ml-1 text-sm text-gray-500 animate-pulse">(...)</span>
                        ) : userComments.length > 0 ? (
                            <span className="ml-1 text-sm text-gray-500">
                                ({userComments.length})
                            </span>
                        ) : null)}
                </button>
                <button
                    onClick={() => setActiveTab('liked')}
                    className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 ${
                        activeTab === 'liked'
                            ? 'border-yellow-500 text-yellow-500'
                            : 'border-transparent text-gray-400 hover:text-white'
                    }`}
                    disabled={isGuest}
                >
                    <HeartIcon className="w-5 h-5" />
                    <span>Liked Rankings</span>
                    {!isGuest &&
                        (isLoadingLiked ? (
                            <span className="ml-1 text-sm text-gray-500 animate-pulse">(...)</span>
                        ) : likedRankings.length > 0 ? (
                            <span className="ml-1 text-sm text-gray-500">
                                ({likedRankings.length})
                            </span>
                        ) : null)}
                </button>
            </div>

            {/* Rankings Tab */}
            {activeTab === 'rankings' && (
                <>
                    {/* Error State */}
                    {error && (
                        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-6">
                            <p className="text-red-400">{error}</p>
                        </div>
                    )}

                    {/* Search Input */}
                    {rankings.length > 0 && (
                        <div className="mb-6 w-full sm:max-w-lg">
                            <SearchBar
                                value={rankingsSearch}
                                onChange={setRankingsSearch}
                                placeholder="Search your rankings..."
                                focusColor="yellow"
                                voiceInput
                            />
                        </div>
                    )}

                    {/* Rankings Grid */}
                    <RankingGrid
                        rankings={filteredRankings}
                        isLoading={isLoading}
                        emptyMessage={
                            rankingsSearch.trim()
                                ? 'No rankings match your search.'
                                : isGuest
                                  ? 'Sign in to create your first ranking!'
                                  : 'No rankings yet. Create your first ranking to get started!'
                        }
                        showAuthor={false}
                        onLike={handleRankingClick}
                    />

                    {/* Search Results Count */}
                    {rankingsSearch.trim() && filteredRankings.length > 0 && (
                        <p className="mt-4 text-sm text-gray-500 text-center">
                            Showing {filteredRankings.length} of {rankings.length} rankings
                        </p>
                    )}
                </>
            )}

            {/* Comments Tab */}
            {activeTab === 'comments' && (
                <>
                    {/* Search Input */}
                    {userComments.length > 0 && (
                        <div className="mb-6 w-full sm:max-w-lg">
                            <SearchBar
                                value={commentsSearch}
                                onChange={setCommentsSearch}
                                placeholder="Search your comments..."
                                focusColor="yellow"
                                voiceInput
                            />
                        </div>
                    )}

                    <div className="space-y-4">
                        {isLoadingComments ? (
                            <NetflixLoader />
                        ) : filteredComments.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                <ChatBubbleLeftIcon className="w-16 h-16 mx-auto mb-4 text-gray-700" />
                                <p>
                                    {commentsSearch.trim()
                                        ? 'No comments match your search.'
                                        : 'No comments yet. Start commenting on rankings!'}
                                </p>
                            </div>
                        ) : (
                            <>
                                {filteredComments.map((comment) => (
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
                                            On:{' '}
                                            <span className="text-yellow-500">View Ranking →</span>
                                        </div>
                                    </Link>
                                ))}

                                {/* Search Results Count */}
                                {commentsSearch.trim() && filteredComments.length > 0 && (
                                    <p className="mt-4 text-sm text-gray-500 text-center">
                                        Showing {filteredComments.length} of {userComments.length}{' '}
                                        comments
                                    </p>
                                )}
                            </>
                        )}
                    </div>
                </>
            )}

            {/* Liked Rankings Tab */}
            {activeTab === 'liked' && (
                <>
                    {/* Search Input */}
                    {likedRankings.length > 0 && (
                        <div className="mb-6 w-full sm:max-w-lg">
                            <SearchBar
                                value={likedSearch}
                                onChange={setLikedSearch}
                                placeholder="Search liked rankings..."
                                focusColor="yellow"
                                voiceInput
                            />
                        </div>
                    )}

                    {isLoadingLiked ? (
                        <NetflixLoader />
                    ) : (
                        <>
                            <RankingGrid
                                rankings={filteredLikedRankings}
                                isLoading={isLoadingLiked}
                                emptyMessage={
                                    likedSearch.trim()
                                        ? 'No liked rankings match your search.'
                                        : 'No liked rankings yet. Start liking rankings you enjoy!'
                                }
                                showAuthor={true}
                                onLike={handleRankingClick}
                            />

                            {/* Search Results Count */}
                            {likedSearch.trim() && filteredLikedRankings.length > 0 && (
                                <p className="mt-4 text-sm text-gray-500 text-center">
                                    Showing {filteredLikedRankings.length} of {likedRankings.length}{' '}
                                    rankings
                                </p>
                            )}
                        </>
                    )}
                </>
            )}
        </SubPageLayout>
    )
}
