/**
 * Rankings Dashboard Page
 *
 * Displays user's created rankings, comments, and liked rankings
 * Tab-based layout with search functionality
 */

'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import SubPageLayout from '../../components/layout/SubPageLayout'
import { RankingGrid } from '../../components/rankings/RankingGrid'
import { useRankingStore } from '../../stores/rankingStore'
import { useSessionStore } from '../../stores/sessionStore'
import { useAuthStatus } from '../../hooks/useAuthStatus'
import NetflixLoader from '../../components/common/NetflixLoader'
import { Ranking, RankingComment } from '../../types/rankings'
import { getUserComments } from '../../utils/firestore/rankingComments'
import { getUserLikedRankings } from '../../utils/firestore/rankings'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { TrophyIcon, ChatBubbleLeftIcon, HeartIcon, XMarkIcon } from '@heroicons/react/24/outline'
import {
    Cog6ToothIcon,
    ChevronDownIcon,
    TrashIcon,
    PlusIcon,
    MagnifyingGlassIcon,
} from '@heroicons/react/24/solid'

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

    // Manage dropdown state
    const [showManageDropdown, setShowManageDropdown] = useState(false)
    const manageDropdownRef = useRef<HTMLDivElement>(null)

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                manageDropdownRef.current &&
                !manageDropdownRef.current.contains(event.target as Node)
            ) {
                setShowManageDropdown(false)
            }
        }

        if (showManageDropdown) {
            document.addEventListener('mousedown', handleClickOutside)
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [showManageDropdown])

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

    // Get current search value and setter based on active tab
    const currentSearch =
        activeTab === 'rankings'
            ? rankingsSearch
            : activeTab === 'comments'
              ? commentsSearch
              : likedSearch
    const setCurrentSearch =
        activeTab === 'rankings'
            ? setRankingsSearch
            : activeTab === 'comments'
              ? setCommentsSearch
              : setLikedSearch

    // Check if we should show search bar
    const showSearch =
        (activeTab === 'rankings' && rankings.length > 0) ||
        (activeTab === 'comments' && userComments.length > 0) ||
        (activeTab === 'liked' && likedRankings.length > 0)

    return (
        <SubPageLayout hideHeader>
            <div className="relative -mt-20 -mx-6 sm:-mx-8 lg:-mx-12">
                {/* Atmospheric Background */}
                <div className="fixed inset-0 pointer-events-none">
                    <div className="absolute inset-0 bg-black" />
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[800px] bg-gradient-radial from-yellow-900/20 via-transparent to-transparent opacity-50" />
                    <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black opacity-60" />
                </div>

                {/* Content Container */}
                <div className="relative z-10">
                    {/* Cinematic Hero Header */}
                    <div className="relative overflow-hidden pt-4">
                        {/* Animated Background Gradients */}
                        <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-900/80 to-black" />
                        <div
                            className="absolute inset-0 bg-gradient-to-t from-yellow-900/20 via-amber-900/10 to-black/50 animate-pulse"
                            style={{ animationDuration: '4s' }}
                        />
                        <div className="absolute inset-0 bg-gradient-radial from-yellow-500/10 via-yellow-900/5 to-transparent" />

                        {/* Soft edge vignetting for subtle blending */}
                        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/80" />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/60" />

                        {/* Hero Content */}
                        <div className="relative z-10 flex flex-col items-center justify-start px-6 pt-8 pb-6">
                            {/* Trophy Icon with glow */}
                            <div className="relative mb-4">
                                <div className="absolute inset-0 bg-yellow-500/30 blur-2xl scale-150" />
                                <TrophyIcon className="relative w-16 h-16 text-yellow-400 drop-shadow-[0_0_20px_rgba(234,179,8,0.5)]" />
                            </div>

                            {/* Title */}
                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-2 text-center tracking-tight">
                                <span className="bg-gradient-to-r from-yellow-200 via-amber-100 to-yellow-200 bg-clip-text text-transparent drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">
                                    My Rankings
                                </span>
                            </h1>

                            {/* Subtitle */}
                            <p className="text-base sm:text-lg text-gray-300 mb-6 text-center max-w-2xl">
                                Create, manage, and share your personalized content rankings
                            </p>

                            {/* Tab Pills */}
                            <div className="flex flex-wrap gap-2 items-center justify-center mb-5 px-4">
                                {[
                                    {
                                        value: 'rankings',
                                        label: 'Your Rankings',
                                        icon: TrophyIcon,
                                        count: rankings.length,
                                        loading: isLoading,
                                    },
                                    {
                                        value: 'comments',
                                        label: 'Comments',
                                        icon: ChatBubbleLeftIcon,
                                        count: userComments.length,
                                        loading: isLoadingComments,
                                        disabled: isGuest,
                                    },
                                    {
                                        value: 'liked',
                                        label: 'Liked',
                                        icon: HeartIcon,
                                        count: likedRankings.length,
                                        loading: isLoadingLiked,
                                        disabled: isGuest,
                                    },
                                ].map((tab) => {
                                    const Icon = tab.icon
                                    const isSelected = activeTab === tab.value

                                    return (
                                        <button
                                            key={tab.value}
                                            onClick={() =>
                                                !tab.disabled &&
                                                setActiveTab(
                                                    tab.value as 'rankings' | 'comments' | 'liked'
                                                )
                                            }
                                            disabled={tab.disabled}
                                            className={`group relative rounded-full px-5 py-2.5 text-sm font-bold transition-all duration-300 backdrop-blur-md border flex items-center gap-2 ${
                                                tab.disabled
                                                    ? 'bg-zinc-900/20 text-gray-600 border-zinc-800/50 cursor-not-allowed'
                                                    : isSelected
                                                      ? 'bg-yellow-500/90 text-black border-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.3)] scale-105'
                                                      : 'bg-zinc-900/40 text-gray-300 border-zinc-700/50 hover:bg-zinc-800/60 hover:border-zinc-600 hover:scale-105 hover:shadow-[0_0_8px_rgba(255,255,255,0.08)]'
                                            }`}
                                        >
                                            <Icon
                                                className={`w-4 h-4 ${isSelected ? 'text-black' : ''}`}
                                            />
                                            <span className="relative z-10">{tab.label}</span>
                                            {!tab.disabled && (
                                                <span
                                                    className={`text-xs ${isSelected ? 'text-black/70' : 'text-gray-500'}`}
                                                >
                                                    {tab.loading ? '...' : `(${tab.count})`}
                                                </span>
                                            )}
                                            {isSelected && !tab.disabled && (
                                                <div className="absolute inset-0 rounded-full bg-yellow-500 blur-md opacity-15 animate-pulse" />
                                            )}
                                        </button>
                                    )
                                })}
                            </div>

                            {/* Action Row - Create & Manage */}
                            <div className="flex gap-2 items-center mb-5">
                                {/* Create Ranking Button */}
                                <button
                                    onClick={handleCreateNew}
                                    disabled={isGuest}
                                    className={`group relative rounded-full px-5 py-2.5 text-sm font-bold transition-all duration-300 backdrop-blur-md border flex items-center gap-2 ${
                                        isGuest
                                            ? 'bg-zinc-900/20 text-gray-600 border-zinc-800/50 cursor-not-allowed'
                                            : 'bg-yellow-500/90 text-black border-yellow-400 hover:bg-yellow-400 hover:scale-105 hover:shadow-[0_0_10px_rgba(234,179,8,0.3)]'
                                    }`}
                                    title={
                                        isGuest
                                            ? 'Sign in to create rankings'
                                            : 'Create a new ranking'
                                    }
                                >
                                    <PlusIcon className="w-4 h-4" />
                                    <span>Create Ranking</span>
                                </button>

                                {/* Manage dropdown */}
                                <div className="relative" ref={manageDropdownRef}>
                                    <button
                                        type="button"
                                        onClick={() => setShowManageDropdown(!showManageDropdown)}
                                        className="group relative rounded-full px-5 py-2.5 text-sm font-bold transition-all duration-300 backdrop-blur-md border flex items-center gap-2 bg-zinc-900/40 text-gray-300 border-zinc-700/50 hover:bg-zinc-800/60 hover:border-zinc-600 hover:scale-105 hover:shadow-[0_0_8px_rgba(255,255,255,0.08)]"
                                    >
                                        <Cog6ToothIcon className="w-4 h-4 text-gray-400" />
                                        <span>Manage</span>
                                        <ChevronDownIcon
                                            className={`w-4 h-4 transition-transform ${
                                                showManageDropdown ? 'rotate-180' : ''
                                            }`}
                                        />
                                    </button>

                                    {/* Dropdown Menu */}
                                    {showManageDropdown && (
                                        <div className="absolute top-full mt-2 right-0 bg-zinc-900/95 backdrop-blur-lg border border-zinc-700/50 rounded-xl shadow-2xl z-50 min-w-[200px] overflow-hidden">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    router.push('/settings/account')
                                                    setShowManageDropdown(false)
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-zinc-800/80 transition-colors"
                                            >
                                                <TrashIcon className="w-5 h-5 text-red-400 flex-shrink-0" />
                                                <span>Clear Data</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Enhanced Search Bar */}
                            {showSearch && (
                                <div className="w-full max-w-3xl relative">
                                    <div className="relative group">
                                        <MagnifyingGlassIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400 z-10 transition-colors group-focus-within:text-yellow-400" />
                                        <input
                                            type="text"
                                            value={currentSearch}
                                            onChange={(e) => setCurrentSearch(e.target.value)}
                                            placeholder={`Search ${activeTab === 'rankings' ? 'your rankings' : activeTab === 'comments' ? 'your comments' : 'liked rankings'}...`}
                                            className="w-full pl-14 pr-14 py-4 bg-zinc-900/40 backdrop-blur-lg border border-zinc-800/50 rounded-2xl text-white text-lg placeholder-gray-500 focus:outline-none focus:border-yellow-500 focus:shadow-[0_0_25px_rgba(234,179,8,0.3)] transition-all duration-300 hover:bg-zinc-900/60 hover:border-zinc-700"
                                        />
                                        {currentSearch && (
                                            <button
                                                onClick={() => setCurrentSearch('')}
                                                className="absolute right-5 top-1/2 -translate-y-1/2 z-10 text-gray-400 hover:text-white transition-colors"
                                            >
                                                <XMarkIcon className="w-6 h-6" />
                                            </button>
                                        )}

                                        {/* Glowing border effect on focus */}
                                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-yellow-500 to-amber-500 opacity-0 group-focus-within:opacity-20 blur-xl transition-opacity duration-300 -z-10" />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="px-6 sm:px-8 lg:px-12 py-8 space-y-6">
                        {/* Guest Mode Banner */}
                        {isGuest && (
                            <div className="flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-yellow-600/10 border border-yellow-600/30 max-w-2xl mx-auto">
                                <span className="text-yellow-500 text-sm text-center">
                                    Sign in to create rankings, comment, and like other rankings.
                                </span>
                                <Link
                                    href="/auth"
                                    className="text-yellow-500 hover:text-yellow-400 text-sm font-medium underline underline-offset-2 whitespace-nowrap"
                                >
                                    Sign In
                                </Link>
                            </div>
                        )}

                        {/* Error State */}
                        {error && (
                            <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 max-w-2xl mx-auto">
                                <p className="text-red-400 text-center">{error}</p>
                            </div>
                        )}

                        {/* Rankings Tab Content */}
                        {activeTab === 'rankings' && (
                            <>
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
                                    <p className="text-sm text-gray-500 text-center">
                                        Showing {filteredRankings.length} of {rankings.length}{' '}
                                        rankings
                                    </p>
                                )}
                            </>
                        )}

                        {/* Comments Tab Content */}
                        {activeTab === 'comments' && (
                            <>
                                {isLoadingComments ? (
                                    <div className="py-16">
                                        <NetflixLoader
                                            inline={true}
                                            message="Loading comments..."
                                        />
                                    </div>
                                ) : filteredComments.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-center">
                                        <div className="relative mb-6">
                                            <div className="absolute inset-0 bg-yellow-500/20 blur-2xl scale-150" />
                                            <div className="relative w-24 h-24 rounded-full bg-zinc-900/60 backdrop-blur-lg flex items-center justify-center border-2 border-zinc-800/50">
                                                <ChatBubbleLeftIcon className="w-12 h-12 text-yellow-500" />
                                            </div>
                                        </div>
                                        <h3 className="text-2xl font-bold text-white mb-3">
                                            {commentsSearch.trim()
                                                ? 'No comments match your search'
                                                : 'No comments yet'}
                                        </h3>
                                        <p className="text-gray-400 mb-8 max-w-md text-lg">
                                            {commentsSearch.trim()
                                                ? 'Try a different search term'
                                                : 'Start commenting on rankings to see them here!'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-4 max-w-3xl mx-auto">
                                        {filteredComments.map((comment, index) => (
                                            <Link
                                                key={comment.id}
                                                href={`/rankings/${comment.rankingId}`}
                                                className="block bg-zinc-900/60 backdrop-blur-lg border border-zinc-800/50 rounded-xl p-4 hover:border-yellow-500/30 hover:shadow-[0_0_15px_rgba(234,179,8,0.1)] transition-all duration-300 animate-fadeInUp"
                                                style={{
                                                    animationDelay: `${Math.min(index * 50, 500)}ms`,
                                                    animationFillMode: 'both',
                                                }}
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

                                        {/* Search Results Count */}
                                        {commentsSearch.trim() && filteredComments.length > 0 && (
                                            <p className="text-sm text-gray-500 text-center">
                                                Showing {filteredComments.length} of{' '}
                                                {userComments.length} comments
                                            </p>
                                        )}
                                    </div>
                                )}
                            </>
                        )}

                        {/* Liked Rankings Tab Content */}
                        {activeTab === 'liked' && (
                            <>
                                {isLoadingLiked ? (
                                    <div className="py-16">
                                        <NetflixLoader
                                            inline={true}
                                            message="Loading liked rankings..."
                                        />
                                    </div>
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
                                            <p className="text-sm text-gray-500 text-center">
                                                Showing {filteredLikedRankings.length} of{' '}
                                                {likedRankings.length} rankings
                                            </p>
                                        )}
                                    </>
                                )}
                            </>
                        )}
                    </div>
                </div>

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
