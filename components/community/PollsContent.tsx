'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useForumStore } from '@/stores/forumStore'
import { useSessionStore } from '@/stores/sessionStore'
import { useAuthStatus } from '@/hooks/useAuthStatus'
import NetflixLoader from '@/components/common/NetflixLoader'
import SearchBar from '@/components/common/SearchBar'
import { FORUM_CATEGORIES } from '@/utils/forumCategories'
import { PollCard } from '@/components/forum/PollCard'
import { CreatePollModal } from '@/components/forum/CreatePollModal'
import { ForumCategory } from '@/types/forum'
import { auth } from '@/firebase'
import {
    ChartBarIcon,
    MagnifyingGlassIcon,
    FunnelIcon,
    TrophyIcon,
    ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline'

export default function PollsContent() {
    const router = useRouter()
    const { polls, isLoadingPolls, loadPolls, createPoll, voteOnPoll, getUserVote } =
        useForumStore()
    const getUserId = useSessionStore((state) => state.getUserId)
    const { isGuest } = useAuthStatus()
    const [selectedCategory, setSelectedCategory] = useState<ForumCategory | 'all'>('all')
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [userVotes, setUserVotes] = useState<Record<string, string[]>>({})
    const [searchQuery, setSearchQuery] = useState('')
    const userId = getUserId()

    // Load polls on mount
    useEffect(() => {
        loadPolls()
    }, [loadPolls])

    // Fetch user votes so cards remember selections
    useEffect(() => {
        if (!userId) {
            setUserVotes({})
            return
        }

        let isMounted = true
        const fetchVotes = async () => {
            try {
                const entries = await Promise.all(
                    polls.map(async (poll) => {
                        const vote = await getUserVote(userId, poll.id)
                        return vote ? { pollId: poll.id, vote } : null
                    })
                )

                if (!isMounted) return

                const votesMap: Record<string, string[]> = {}
                entries.forEach((entry) => {
                    if (entry) {
                        votesMap[entry.pollId] = entry.vote
                    }
                })
                setUserVotes(votesMap)
            } catch (error) {
                console.error('Failed to fetch user votes:', error)
            }
        }

        fetchVotes()

        return () => {
            isMounted = false
        }
    }, [userId, polls, getUserVote])

    const handleCreatePoll = async (
        question: string,
        options: string[],
        category: ForumCategory
    ) => {
        if (isGuest) {
            alert('Please sign in to create polls')
            return
        }
        const currentUserId = getUserId()
        if (!currentUserId) return

        // Get user info from Firebase Auth
        const currentUser = auth.currentUser
        if (!currentUser) return

        const userName = currentUser.displayName || 'Anonymous'
        const userAvatar = currentUser.photoURL || undefined

        await createPoll(currentUserId, userName, userAvatar, question, options, category)
        await loadPolls() // Reload polls
    }

    const handleOpenCreateModal = () => {
        if (isGuest) {
            alert('Please sign in to create polls')
            return
        }
        setIsCreateModalOpen(true)
    }

    const handleVote = useCallback(
        async (pollId: string, optionIds: string[]) => {
            if (isGuest) {
                alert('Please sign in to vote on polls')
                return
            }
            if (!userId) return
            try {
                await voteOnPoll(userId, pollId, optionIds)
                // Update local state to show vote immediately
                setUserVotes((prev) => ({ ...prev, [pollId]: optionIds }))
                // Store updates polls optimistically, no need to reload
            } catch (error) {
                console.error('Failed to vote:', error)
            }
        },
        [isGuest, userId, voteOnPoll]
    )

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
        <div className="relative -mt-20 -mx-6 sm:-mx-8 lg:-mx-12">
            {/* Atmospheric Background */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-black" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[800px] bg-gradient-radial from-pink-900/20 via-transparent to-transparent opacity-50" />
                <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black opacity-60" />
            </div>

            {/* Content Container */}
            <div className="relative z-10">
                {/* Cinematic Hero Header */}
                <div className="relative overflow-hidden pt-4">
                    {/* Animated Background Gradients */}
                    <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-900/80 to-black" />
                    <div
                        className="absolute inset-0 bg-gradient-to-t from-pink-900/20 via-red-900/10 to-black/50 animate-pulse"
                        style={{ animationDuration: '4s' }}
                    />
                    <div className="absolute inset-0 bg-gradient-radial from-pink-500/10 via-pink-900/5 to-transparent" />

                    {/* Soft edge vignetting for subtle blending */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/80" />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/60" />

                    {/* Hero Content */}
                    <div className="relative z-10 flex flex-col items-center justify-start px-6 pt-8 pb-6">
                        {/* Chart Bar Icon with glow */}
                        <div className="relative mb-4">
                            <div className="absolute inset-0 bg-pink-500/30 blur-2xl scale-150" />
                            <ChartBarIcon className="relative w-16 h-16 text-pink-400 drop-shadow-[0_0_20px_rgba(236,72,153,0.5)]" />
                        </div>

                        {/* Title */}
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-2 text-center tracking-tight">
                            <span className="bg-gradient-to-r from-pink-200 via-pink-100 to-pink-200 bg-clip-text text-transparent drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">
                                Community Polls
                            </span>
                        </h1>

                        {/* Subtitle */}
                        <p className="text-base sm:text-lg text-gray-300 mb-6 text-center max-w-2xl">
                            Discover, vote, and share your voice in the world of movies & TV
                        </p>

                        {/* Main Navigation Tabs */}
                        <div className="mb-6">
                            <div className="inline-flex gap-2 bg-zinc-900/60 backdrop-blur-xl p-2 rounded-xl border border-zinc-800/50 shadow-2xl">
                                {[
                                    {
                                        id: 'rankings',
                                        label: 'Rankings',
                                        icon: TrophyIcon,
                                        color: 'text-yellow-500',
                                    },
                                    {
                                        id: 'threads',
                                        label: 'Threads',
                                        icon: ChatBubbleLeftRightIcon,
                                        color: 'text-blue-500',
                                    },
                                    {
                                        id: 'polls',
                                        label: 'Polls',
                                        icon: ChartBarIcon,
                                        color: 'text-pink-500',
                                    },
                                ].map((tab) => {
                                    const Icon = tab.icon
                                    const isActive = tab.id === 'polls'

                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => router.push(`/community/${tab.id}`)}
                                            className={`relative px-6 py-3 rounded-lg font-bold text-lg transition-all duration-300 ${
                                                isActive
                                                    ? 'bg-zinc-800 text-white shadow-lg scale-105'
                                                    : 'text-gray-400 hover:text-gray-200 hover:bg-zinc-800/50 hover:scale-105'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Icon
                                                    className={`w-6 h-6 ${isActive ? tab.color : ''}`}
                                                />
                                                <span>{tab.label}</span>
                                            </div>
                                            {/* Active glow ring */}
                                            {isActive && (
                                                <div className="absolute inset-0 rounded-lg ring-2 ring-pink-500/50 shadow-[0_0_20px_rgba(236,72,153,0.3)]" />
                                            )}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Category Pills - Integrated in Hero */}
                        <div className="flex flex-wrap gap-2 items-center justify-center mb-5">
                            <button
                                onClick={() => setSelectedCategory('all')}
                                className={`group relative rounded-full px-5 py-2.5 text-sm font-bold transition-all duration-300 backdrop-blur-md border ${
                                    selectedCategory === 'all'
                                        ? 'bg-pink-500/90 text-white border-pink-400 shadow-[0_0_20px_rgba(236,72,153,0.5)] scale-105'
                                        : 'bg-zinc-900/40 text-gray-300 border-zinc-700/50 hover:bg-zinc-800/60 hover:border-zinc-600 hover:scale-105 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]'
                                }`}
                            >
                                <span className="relative z-10">All</span>
                                {selectedCategory === 'all' && (
                                    <div className="absolute inset-0 rounded-full bg-pink-500 blur-xl opacity-30 animate-pulse" />
                                )}
                            </button>
                            {FORUM_CATEGORIES.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={`group relative rounded-full px-5 py-2.5 text-sm font-bold transition-all duration-300 backdrop-blur-md border flex items-center gap-2 ${
                                        selectedCategory === cat.id
                                            ? 'bg-pink-500/90 text-white border-pink-400 shadow-[0_0_20px_rgba(236,72,153,0.5)] scale-105'
                                            : 'bg-zinc-900/40 text-gray-300 border-zinc-700/50 hover:bg-zinc-800/60 hover:border-zinc-600 hover:scale-105 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]'
                                    }`}
                                >
                                    <span className="text-base">{cat.icon}</span>
                                    <span className="relative z-10 hidden sm:inline">
                                        {cat.name}
                                    </span>
                                    {selectedCategory === cat.id && (
                                        <div className="absolute inset-0 rounded-full bg-pink-500 blur-xl opacity-30 animate-pulse" />
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Enhanced Search Bar */}
                        <div className="w-full max-w-3xl relative">
                            <div className="relative group">
                                <MagnifyingGlassIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400 z-10 transition-colors group-focus-within:text-pink-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search polls..."
                                    className="w-full pl-14 pr-14 py-4 bg-zinc-900/40 backdrop-blur-lg border border-zinc-800/50 rounded-2xl text-white text-lg placeholder-gray-500 focus:outline-none focus:border-pink-500 focus:shadow-[0_0_25px_rgba(236,72,153,0.3)] transition-all duration-300 hover:bg-zinc-900/60 hover:border-zinc-700"
                                />
                                <FunnelIcon className="absolute right-5 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400 z-10 transition-colors hover:text-pink-400 cursor-pointer" />

                                {/* Glowing border effect on focus */}
                                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-pink-500 to-red-500 opacity-0 group-focus-within:opacity-20 blur-xl transition-opacity duration-300 -z-10" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="px-6 sm:px-8 lg:px-12 py-8 space-y-6">
                    {/* Loading state */}
                    {isLoadingPolls && (
                        <div className="py-16">
                            <NetflixLoader inline={true} message="Loading polls..." />
                        </div>
                    )}

                    {/* Empty state */}
                    {!isLoadingPolls && polls.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-24 h-24 rounded-full bg-zinc-900/60 backdrop-blur-lg flex items-center justify-center border-2 border-zinc-800/50 mb-6">
                                <ChartBarIcon className="w-12 h-12 text-pink-500" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-3">No polls yet</h3>
                            <p className="text-gray-400 mb-8 max-w-md text-lg">
                                Be the first to create a poll! Ask the community what they think
                                about hot topics, favorite shows, or anything else.
                            </p>
                            <button
                                onClick={handleOpenCreateModal}
                                className={`px-8 py-4 font-bold rounded-xl transition-all duration-300 ${
                                    isGuest
                                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white shadow-[0_0_30px_rgba(236,72,153,0.4)] hover:shadow-[0_0_40px_rgba(236,72,153,0.6)] scale-100 hover:scale-105'
                                }`}
                                disabled={isGuest}
                            >
                                {isGuest ? 'Sign in to Create Polls' : 'Create First Poll'}
                            </button>
                        </div>
                    )}

                    {/* Poll Grid - 2 Column Layout */}
                    {!isLoadingPolls && filteredPolls.length > 0 && (
                        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {filteredPolls.map((poll) => (
                                <PollCard
                                    key={poll.id}
                                    poll={poll}
                                    userVote={userVotes[poll.id] || []}
                                    onVote={isGuest ? undefined : handleVote}
                                />
                            ))}
                        </div>
                    )}

                    {/* No results state */}
                    {!isLoadingPolls && polls.length > 0 && filteredPolls.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-20 h-20 mb-4 rounded-full bg-zinc-900/60 backdrop-blur-lg flex items-center justify-center border border-zinc-800/50">
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
                    )}
                </div>

                {/* Floating CTA Button */}
                {!isGuest && (
                    <button
                        onClick={handleOpenCreateModal}
                        className="fixed bottom-8 right-20 z-50 group"
                        style={{
                            animation: 'bob 5s ease-in-out infinite',
                        }}
                    >
                        <div className="relative">
                            {/* Glowing background */}
                            <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-red-500 rounded-full blur-2xl opacity-60 group-hover:opacity-80 transition-opacity" />

                            {/* Button */}
                            <div className="relative flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-pink-500 via-red-500 to-pink-600 rounded-full text-white font-bold shadow-[0_0_40px_rgba(236,72,153,0.6)] group-hover:shadow-[0_0_60px_rgba(236,72,153,0.8)] group-hover:scale-110 transition-all duration-300">
                                <ChartBarIcon className="w-6 h-6" />
                                <span className="hidden sm:inline">New Poll</span>
                            </div>
                        </div>
                    </button>
                )}
            </div>

            {/* Create Poll Modal */}
            <CreatePollModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onCreate={handleCreatePoll}
            />

            {/* Add keyframe animation for bobbing */}
            <style jsx>{`
                @keyframes bob {
                    0%,
                    100% {
                        transform: translateY(0);
                    }
                    50% {
                        transform: translateY(-10px);
                    }
                }
            `}</style>
        </div>
    )
}
