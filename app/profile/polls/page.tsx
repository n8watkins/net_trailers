/**
 * User Polls Page - My Polls
 *
 * Dedicated page for viewing user's own polls with:
 * - Created/Voted toggle tabs
 * - All polls the user has created
 * - All polls the user has voted on (including their own)
 */

'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForumStore } from '@/stores/forumStore'
import { useSessionStore } from '@/stores/sessionStore'
import { useAuthStatus } from '@/hooks/useAuthStatus'
import NetflixLoader from '@/components/common/NetflixLoader'
import Header from '@/components/layout/Header'
import { PollCard } from '@/components/forum/PollCard'
import { CreatePollModal } from '@/components/forum/CreatePollModal'
import type { PollSummary, ForumCategory } from '@/types/forum'
import { ChartBarIcon, ArrowLeftIcon, PlusIcon } from '@heroicons/react/24/outline'
import { ChartBarIcon as ChartBarSolidIcon } from '@heroicons/react/24/solid'
import { Timestamp, collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore'
import { db, auth } from '@/firebase'

// Helper to convert Firestore Timestamp to number
const timestampToNumber = (ts: Timestamp | number | null | undefined): number | null => {
    if (!ts) return null
    if (typeof ts === 'number') return ts
    return ts.toMillis()
}

export default function UserPollsPage() {
    const router = useRouter()
    const { polls, isLoadingPolls, loadPolls, createPoll, voteOnPoll, getUserVote } =
        useForumStore()
    const getUserId = useSessionStore((state) => state.getUserId)
    const { isGuest } = useAuthStatus()
    const isInitialized = useSessionStore((state) => state.isInitialized)
    const userId = getUserId()

    const [activePollTab, setActivePollTab] = useState<'created' | 'voted'>('created')
    const [votedPolls, setVotedPolls] = useState<PollSummary[]>([])
    const [isLoadingVotedPolls, setIsLoadingVotedPolls] = useState(false)
    const [userVotes, setUserVotes] = useState<Record<string, string[]>>({})
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

    const isLoading = !isInitialized || isLoadingPolls

    useEffect(() => {
        document.title = 'My Polls - NetTrailers'
    }, [])

    // Redirect guests to community polls
    useEffect(() => {
        if (isInitialized && isGuest) {
            router.push('/community/polls')
        }
    }, [isInitialized, isGuest, router])

    // Load polls on mount
    useEffect(() => {
        if (userId && isInitialized) {
            loadPolls()
        }
    }, [userId, isInitialized, loadPolls])

    // Fetch voted polls
    useEffect(() => {
        if (!userId || isGuest) {
            setVotedPolls([])
            setIsLoadingVotedPolls(false)
            return
        }

        let isMounted = true
        const fetchVotedPolls = async () => {
            setIsLoadingVotedPolls(true)
            try {
                const votesQuery = query(
                    collection(db, 'poll_votes'),
                    where('userId', '==', userId)
                )
                const votesSnap = await getDocs(votesQuery)

                const pollsFromVotes = await Promise.all(
                    votesSnap.docs.map(async (voteDoc) => {
                        const voteData = voteDoc.data() || {}
                        const pollId = voteData.pollId as string | undefined
                        if (!pollId) return null

                        const pollDoc = await getDoc(doc(db, 'polls', pollId))
                        if (!pollDoc.exists()) return null
                        const pollData = pollDoc.data() || {}

                        return {
                            id: pollDoc.id,
                            question: pollData.question ?? 'Untitled poll',
                            category: pollData.category ?? 'general',
                            userId: pollData.userId ?? '',
                            userName: pollData.userName ?? 'Unknown User',
                            userAvatar: pollData.userAvatar,
                            totalVotes: pollData.totalVotes ?? 0,
                            isMultipleChoice: Boolean(pollData.isMultipleChoice),
                            allowAddOptions: Boolean(pollData.allowAddOptions),
                            options: Array.isArray(pollData.options)
                                ? pollData.options.map((option: any) => ({
                                      id: option.id ?? '',
                                      text: option.text ?? '',
                                      votes: option.votes ?? 0,
                                      percentage: option.percentage ?? 0,
                                  }))
                                : [],
                            createdAt: timestampToNumber(
                                pollData.createdAt as Timestamp | number | null | undefined
                            ),
                            expiresAt: timestampToNumber(
                                pollData.expiresAt as Timestamp | number | null | undefined
                            ),
                            votedAt: timestampToNumber(
                                voteData.votedAt as Timestamp | number | null | undefined
                            ),
                        } as PollSummary
                    })
                )

                if (!isMounted) return

                const filtered = pollsFromVotes
                    .filter((poll): poll is PollSummary => Boolean(poll))
                    .sort((a, b) => (b.votedAt ?? 0) - (a.votedAt ?? 0))

                setVotedPolls(filtered)
            } catch (error) {
                console.error('Failed to load voted polls:', error)
                if (isMounted) {
                    setVotedPolls([])
                }
            } finally {
                if (isMounted) {
                    setIsLoadingVotedPolls(false)
                }
            }
        }

        fetchVotedPolls()

        return () => {
            isMounted = false
        }
    }, [userId, isGuest])

    const userPolls = useMemo(
        () =>
            polls
                .filter((poll) => poll.userId === userId)
                .map((poll) => ({
                    id: poll.id,
                    question: poll.question,
                    category: poll.category,
                    userId: poll.userId,
                    userName: poll.userName,
                    userAvatar: poll.userAvatar,
                    totalVotes: poll.totalVotes,
                    isMultipleChoice: poll.isMultipleChoice,
                    allowAddOptions: poll.allowAddOptions,
                    options: poll.options.map((opt) => ({
                        id: opt.id,
                        text: opt.text,
                        votes: opt.votes,
                        percentage: opt.percentage,
                    })),
                    createdAt: timestampToNumber(poll.createdAt),
                    expiresAt: timestampToNumber(poll.expiresAt),
                    votedAt: null,
                }))
                .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)),
        [polls, userId]
    )

    const activePolls = activePollTab === 'created' ? userPolls : votedPolls
    const isLoadingActivePolls = activePollTab === 'voted' && isLoadingVotedPolls

    // Fetch user votes for all polls
    useEffect(() => {
        if (!userId) {
            setUserVotes({})
            return
        }

        let isMounted = true
        const fetchVotes = async () => {
            try {
                const allPolls = activePollTab === 'created' ? userPolls : votedPolls
                const entries = await Promise.all(
                    allPolls.map(async (poll) => {
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
    }, [userId, activePollTab, userPolls, votedPolls, getUserVote])

    const handleCreatePoll = async (
        question: string,
        options: string[],
        category: ForumCategory
    ) => {
        if (!userId) return
        const currentUser = auth.currentUser
        if (!currentUser) return

        const userName = currentUser.displayName || 'Anonymous'
        const userAvatar = currentUser.photoURL || undefined

        await createPoll(userId, userName, userAvatar, question, options, category)
        await loadPolls()
        setActivePollTab('created') // Switch to created tab to see new poll
    }

    const handleVote = useCallback(
        async (pollId: string, optionIds: string[]) => {
            if (!userId) return
            try {
                await voteOnPoll(userId, pollId, optionIds)
                setUserVotes((prev) => ({ ...prev, [pollId]: optionIds }))
            } catch (error) {
                console.error('Failed to vote:', error)
            }
        },
        [userId, voteOnPoll]
    )

    if (isLoading) {
        return (
            <div className="min-h-screen bg-black">
                <Header />
                <div className="flex items-center justify-center min-h-screen">
                    <NetflixLoader inline message="Loading your polls..." />
                </div>
            </div>
        )
    }

    return (
        <div className="relative min-h-screen bg-black overflow-x-clip">
            {/* Navigation Header */}
            <Header />

            {/* Atmospheric Background - Fixed */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-black" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[800px] bg-gradient-radial from-pink-900/20 via-transparent to-transparent opacity-50" />
                <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black opacity-60" />
            </div>

            {/* Content Container */}
            <div className="relative z-10 pt-28 sm:pt-36 md:pt-44">
                {/* Cinematic Hero Header */}
                <div className="relative overflow-hidden">
                    {/* Animated Background Gradients */}
                    <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-900/80 to-black" />
                    <div
                        className="absolute inset-0 bg-gradient-to-t from-pink-900/20 via-red-900/10 to-black/50 animate-pulse"
                        style={{ animationDuration: '4s' }}
                    />
                    <div className="absolute inset-0 bg-gradient-radial from-pink-500/10 via-pink-900/5 to-transparent" />

                    {/* Soft edge vignetting */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/80" />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/60" />

                    {/* Hero Content */}
                    <div className="relative z-10 flex flex-col items-center justify-start px-6 pt-8 pb-12">
                        {/* Back Button */}
                        <div className="w-full max-w-5xl mb-4">
                            <Link
                                href="/profile"
                                className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors group"
                            >
                                <ArrowLeftIcon className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                                <span className="text-sm font-medium">Back to Profile</span>
                            </Link>
                        </div>

                        {/* Icon with glow */}
                        <div className="relative mb-4">
                            <div className="absolute inset-0 bg-pink-500/30 blur-2xl scale-150" />
                            <ChartBarSolidIcon className="relative w-16 h-16 text-pink-400 drop-shadow-[0_0_20px_rgba(236,72,153,0.5)]" />
                        </div>

                        {/* Title */}
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-2 text-center tracking-tight">
                            <span className="bg-gradient-to-r from-pink-200 via-pink-100 to-pink-200 bg-clip-text text-transparent drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">
                                My Polls
                            </span>
                        </h1>

                        {/* Subtitle */}
                        <p className="text-base sm:text-lg text-gray-300 mb-8 text-center max-w-2xl">
                            Manage your polls and track your votes
                        </p>

                        {/* Tab Switcher */}
                        <div className="inline-flex rounded-full bg-zinc-900/60 backdrop-blur p-1.5 border border-zinc-800/50 mb-4">
                            {[
                                {
                                    id: 'created',
                                    label: 'Created',
                                    count: userPolls.length,
                                },
                                {
                                    id: 'voted',
                                    label: 'Voted',
                                    count: votedPolls.length,
                                },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActivePollTab(tab.id as 'created' | 'voted')}
                                    className={`relative px-6 py-3 text-sm font-bold rounded-full transition-all duration-200 ${
                                        activePollTab === tab.id
                                            ? 'bg-pink-500 text-white shadow-[0_0_12px_rgba(236,72,153,0.4)]'
                                            : 'text-gray-400 hover:text-white'
                                    }`}
                                >
                                    {tab.label} <span className="opacity-70">({tab.count})</span>
                                </button>
                            ))}
                        </div>

                        {/* Create Poll Button */}
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="group relative px-6 py-3 rounded-full font-bold text-sm transition-all duration-300"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-pink-500/30 to-red-500/30 rounded-full opacity-0 group-hover:opacity-100 blur-lg transition-opacity" />
                            <div className="relative flex items-center gap-2 px-4 py-2 bg-pink-500/20 backdrop-blur-lg text-pink-400 rounded-full border border-pink-500/30 group-hover:border-pink-400/50 group-hover:bg-pink-500/30 group-hover:text-pink-300 transition-all shadow-lg shadow-pink-500/10">
                                <PlusIcon className="w-4 h-4" />
                                <span>Create Poll</span>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="px-4 sm:px-6 lg:px-8 py-8">
                    <div className="max-w-[1400px] mx-auto">
                        {/* Loading state */}
                        {isLoadingActivePolls && (
                            <div className="py-16">
                                <NetflixLoader inline={true} message="Loading polls..." />
                            </div>
                        )}

                        {/* Empty state */}
                        {!isLoadingActivePolls && activePolls.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="relative mb-6">
                                    <div className="absolute inset-0 bg-pink-500/20 blur-xl" />
                                    <div className="relative w-20 h-20 rounded-full bg-zinc-900/60 flex items-center justify-center border border-zinc-800/50">
                                        <ChartBarIcon className="w-10 h-10 text-pink-500" />
                                    </div>
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-3">
                                    {activePollTab === 'created'
                                        ? 'No polls created yet'
                                        : 'No polls voted on yet'}
                                </h3>
                                <p className="text-gray-400 mb-8 max-w-md text-lg">
                                    {activePollTab === 'created'
                                        ? 'Create your first poll to ask the community what they think!'
                                        : 'Vote on polls to see them here.'}
                                </p>
                                {activePollTab === 'created' && (
                                    <button
                                        onClick={() => setIsCreateModalOpen(true)}
                                        className="px-8 py-4 font-bold rounded-xl bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white shadow-[0_0_30px_rgba(236,72,153,0.4)] hover:shadow-[0_0_40px_rgba(236,72,153,0.6)] scale-100 hover:scale-105 transition-all duration-300"
                                    >
                                        Create First Poll
                                    </button>
                                )}
                                {activePollTab === 'voted' && (
                                    <Link
                                        href="/community/polls"
                                        className="px-8 py-4 font-bold rounded-xl bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white shadow-[0_0_30px_rgba(236,72,153,0.4)] hover:shadow-[0_0_40px_rgba(236,72,153,0.6)] scale-100 hover:scale-105 transition-all duration-300 inline-block"
                                    >
                                        Browse Community Polls
                                    </Link>
                                )}
                            </div>
                        )}

                        {/* Poll Grid - 2 Column Layout */}
                        {!isLoadingActivePolls && activePolls.length > 0 && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {activePolls.map((poll, index) => (
                                    <div
                                        key={poll.id}
                                        className="animate-fadeInUp"
                                        style={{
                                            animationDelay: `${Math.min(index * 50, 500)}ms`,
                                            animationFillMode: 'both',
                                        }}
                                    >
                                        <PollCard
                                            poll={poll}
                                            userVote={userVotes[poll.id] || []}
                                            onVote={handleVote}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Create Poll Modal */}
            <CreatePollModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onCreate={handleCreatePoll}
            />

            {/* Keyframe animations */}
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
    )
}
