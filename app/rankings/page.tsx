/**
 * Rankings Dashboard Page
 *
 * Displays user's created rankings, comments, and liked rankings
 * All sections displayed vertically with search functionality
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
import {
    TrophyIcon,
    PlusIcon,
    ChatBubbleLeftIcon,
    HeartIcon,
    MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'

export default function RankingsPage() {
    const router = useRouter()
    const getUserId = useSessionStore((state) => state.getUserId)
    const userId = getUserId()
    const { isGuest, isInitialized } = useAuthStatus()

    const { rankings, isLoading, error, loadUserRankings } = useRankingStore()

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
            loadUserRankings(userId)

            // Load comments if authenticated
            if (!isGuest) {
                setIsLoadingComments(true)
                getUserComments(userId)
                    .then((result) => setUserComments(result.data))
                    .catch(console.error)
                    .finally(() => setIsLoadingComments(false))

                // Load liked rankings if authenticated
                setIsLoadingLiked(true)
                getUserLikedRankings(userId)
                    .then((result) => setLikedRankings(result.data))
                    .catch(console.error)
                    .finally(() => setIsLoadingLiked(false))
            }
        }
    }, [isInitialized, userId, isGuest])

    const handleCreateNew = () => {
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

    if (!isInitialized) {
        return (
            <SubPageLayout
                title="My Rankings"
                icon={<TrophyIcon className="w-8 h-8" />}
                iconColor="text-yellow-500"
            >
                <div className="space-y-12">
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-4">Your Rankings</h2>
                        <NetflixLoader />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-4">Your Comments</h2>
                        <NetflixLoader />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-4">Liked Rankings</h2>
                        <NetflixLoader />
                    </div>
                </div>
            </SubPageLayout>
        )
    }

    return (
        <SubPageLayout
            title="My Rankings"
            icon={<TrophyIcon className="w-8 h-8" />}
            iconColor="text-yellow-500"
            headerActions={
                <button
                    onClick={handleCreateNew}
                    className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-medium rounded-lg transition-colors"
                >
                    <PlusIcon className="w-5 h-5" />
                    <span>Create Ranking</span>
                </button>
            }
        >
            {/* Guest Mode Notification */}
            {isGuest && (
                <div className="mb-8">
                    <GuestModeNotification />
                </div>
            )}

            {/* Error State */}
            {error && (
                <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-8">
                    <p className="text-red-400">{error}</p>
                </div>
            )}

            <div className="space-y-12">
                {/* Your Rankings Section */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <TrophyIcon className="w-6 h-6 text-yellow-500" />
                            <h2 className="text-2xl font-bold text-white">Your Rankings</h2>
                            {rankings.length > 0 && (
                                <span className="text-sm text-gray-500">({rankings.length})</span>
                            )}
                        </div>
                    </div>

                    {/* Search Input */}
                    {rankings.length > 0 && (
                        <div className="relative mb-6">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search your rankings..."
                                value={rankingsSearch}
                                onChange={(e) => setRankingsSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 transition-colors"
                            />
                        </div>
                    )}

                    {isLoading ? (
                        <NetflixLoader />
                    ) : (
                        <>
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
                            {rankingsSearch.trim() && filteredRankings.length > 0 && (
                                <p className="mt-4 text-sm text-gray-500 text-center">
                                    Showing {filteredRankings.length} of {rankings.length} rankings
                                </p>
                            )}
                        </>
                    )}
                </section>

                {/* Your Comments Section */}
                {!isGuest && (
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <ChatBubbleLeftIcon className="w-6 h-6 text-blue-500" />
                                <h2 className="text-2xl font-bold text-white">Your Comments</h2>
                                {userComments.length > 0 && (
                                    <span className="text-sm text-gray-500">
                                        ({userComments.length})
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Search Input */}
                        {userComments.length > 0 && (
                            <div className="relative mb-6">
                                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                <input
                                    type="text"
                                    placeholder="Search your comments..."
                                    value={commentsSearch}
                                    onChange={(e) => setCommentsSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                                />
                            </div>
                        )}

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
                                <div className="space-y-4">
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
                                                <span className="text-yellow-500">
                                                    View Ranking →
                                                </span>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                                {commentsSearch.trim() && filteredComments.length > 0 && (
                                    <p className="mt-4 text-sm text-gray-500 text-center">
                                        Showing {filteredComments.length} of {userComments.length}{' '}
                                        comments
                                    </p>
                                )}
                            </>
                        )}
                    </section>
                )}

                {/* Liked Rankings Section */}
                {!isGuest && (
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <HeartIcon className="w-6 h-6 text-red-500" />
                                <h2 className="text-2xl font-bold text-white">Liked Rankings</h2>
                                {likedRankings.length > 0 && (
                                    <span className="text-sm text-gray-500">
                                        ({likedRankings.length})
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Search Input */}
                        {likedRankings.length > 0 && (
                            <div className="relative mb-6">
                                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                <input
                                    type="text"
                                    placeholder="Search liked rankings..."
                                    value={likedSearch}
                                    onChange={(e) => setLikedSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-500 transition-colors"
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
                                {likedSearch.trim() && filteredLikedRankings.length > 0 && (
                                    <p className="mt-4 text-sm text-gray-500 text-center">
                                        Showing {filteredLikedRankings.length} of{' '}
                                        {likedRankings.length} rankings
                                    </p>
                                )}
                            </>
                        )}
                    </section>
                )}
            </div>
        </SubPageLayout>
    )
}
