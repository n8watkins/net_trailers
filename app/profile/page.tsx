/**
 * Profile Page - Cinematic Edition
 *
 * Premium Netflix-style user profile with:
 * - Cinematic hero header with atmospheric gradients
 * - Glassmorphic panels and cards
 * - Neon accent glows (blue for profile theme)
 * - Soft rim lighting on avatars and images
 * - Hover animations and micro-transitions
 */

'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { UserIcon, EyeIcon, PencilIcon, SparklesIcon } from '@heroicons/react/24/outline'
import useAuth from '../../hooks/useAuth'
import useUserData from '../../hooks/useUserData'
import NetflixLoader from '../../components/common/NetflixLoader'
import Header from '../../components/layout/Header'
import { GuestModeNotification } from '../../components/auth/GuestModeNotification'
import { useAuthStatus } from '../../hooks/useAuthStatus'
import { useRankingStore } from '../../stores/rankingStore'
import { useForumStore } from '../../stores/forumStore'
import { useSessionStore } from '../../stores/sessionStore'
import { useProfileStore } from '../../stores/profileStore'
import { LikedContentSection } from '../../components/profile/LikedContentSection'
import { WatchLaterSection } from '../../components/profile/WatchLaterSection'
import { RankingsSection } from '../../components/profile/RankingsSection'
import { CollectionsSection } from '../../components/profile/CollectionsSection'
import { ForumActivitySection } from '../../components/profile/ForumActivitySection'
import type { PollSummary, ThreadSummary } from '../../types/forum'
import {
    Timestamp,
    collection,
    doc,
    getDoc,
    getDocs,
    limit,
    query,
    where,
} from 'firebase/firestore'
import { db } from '@/firebase'

// Helper to convert Firestore Timestamp to number
const timestampToNumber = (ts: Timestamp | number | null | undefined): number | null => {
    if (!ts) return null
    if (typeof ts === 'number') return ts
    return ts.toMillis()
}

export default function ProfilePage() {
    const { user, loading: authLoading } = useAuth()
    const userData = useUserData()
    const { isGuest } = useAuthStatus()
    const isInitialized = useSessionStore((state) => state.isInitialized)
    const { rankings, loadUserRankings } = useRankingStore()
    const { threads, polls, loadThreads, loadPolls } = useForumStore()
    const profileUsername = useProfileStore((state) => state.profile?.displayName)

    // Show loading state while data is being fetched
    const isLoading = !isInitialized || authLoading

    useEffect(() => {
        document.title = 'Profile - NetTrailers'
    }, [])

    // Load user rankings, threads, and polls
    useEffect(() => {
        const getUserId = useSessionStore.getState().getUserId
        const userId = getUserId()

        if (userId && isInitialized) {
            loadUserRankings(userId)
            loadThreads()
            loadPolls()
        }
    }, [isInitialized, loadUserRankings, loadThreads, loadPolls])

    const getUserId = useSessionStore((state) => state.getUserId)
    const currentUserId = getUserId()
    const [votedPolls, setVotedPolls] = useState<PollSummary[]>([])
    const [isLoadingVotedPolls, setIsLoadingVotedPolls] = useState(false)
    const [votedThreads, setVotedThreads] = useState<ThreadSummary[]>([])
    const [isLoadingVotedThreads, setIsLoadingVotedThreads] = useState(false)

    useEffect(() => {
        if (!currentUserId || isGuest) {
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
                    where('userId', '==', currentUserId),
                    limit(25)
                )
                const votesSnap = await getDocs(votesQuery)

                const pollsFromVotes = await Promise.all(
                    votesSnap.docs.map(async (voteDoc) => {
                        const voteData = voteDoc.data() || {}
                        const pollId = voteData.pollId as string | undefined
                        if (!pollId) {
                            return null
                        }

                        const pollDoc = await getDoc(doc(db, 'polls', pollId))
                        if (!pollDoc.exists()) {
                            return null
                        }
                        const pollData = pollDoc.data() || {}

                        return {
                            id: pollDoc.id,
                            question: pollData.question ?? 'Untitled poll',
                            category: pollData.category ?? 'general',
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
    }, [currentUserId, isGuest])

    // Fetch voted (liked) threads
    useEffect(() => {
        if (!currentUserId || isGuest) {
            setVotedThreads([])
            setIsLoadingVotedThreads(false)
            return
        }

        let isMounted = true
        const fetchVotedThreads = async () => {
            setIsLoadingVotedThreads(true)
            try {
                const likesQuery = query(
                    collection(db, 'thread_likes'),
                    where('userId', '==', currentUserId),
                    limit(25)
                )
                const likesSnap = await getDocs(likesQuery)

                const threadsFromLikes = await Promise.all(
                    likesSnap.docs.map(async (likeDoc) => {
                        const likeData = likeDoc.data() || {}
                        const threadId = likeData.threadId as string | undefined
                        if (!threadId) return null

                        const threadDoc = await getDoc(doc(db, 'threads', threadId))
                        if (!threadDoc.exists()) return null
                        const threadData = threadDoc.data() || {}

                        // Don't include user's own threads in voted tab
                        if (threadData.userId === currentUserId) return null

                        return {
                            id: threadDoc.id,
                            title: threadData.title ?? 'Untitled thread',
                            content: threadData.content ?? '',
                            category: threadData.category ?? 'general',
                            userId: threadData.userId ?? '',
                            userName: threadData.userName ?? 'Anonymous',
                            userAvatar: threadData.userAvatar,
                            likes: threadData.likes ?? 0,
                            views: threadData.views ?? 0,
                            replyCount: threadData.replyCount ?? 0,
                            createdAt: timestampToNumber(
                                threadData.createdAt as Timestamp | number | null | undefined
                            ),
                            updatedAt: timestampToNumber(
                                threadData.updatedAt as Timestamp | number | null | undefined
                            ),
                            lastReplyAt: timestampToNumber(
                                threadData.lastReplyAt as Timestamp | number | null | undefined
                            ),
                            lastReplyBy: threadData.lastReplyBy,
                            tags: threadData.tags,
                            isPinned: threadData.isPinned ?? false,
                        } as ThreadSummary
                    })
                )

                if (!isMounted) return

                const filtered = threadsFromLikes
                    .filter((thread): thread is ThreadSummary => Boolean(thread))
                    .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))

                setVotedThreads(filtered)
            } catch (error) {
                console.error('Failed to load voted threads:', error)
                if (isMounted) {
                    setVotedThreads([])
                }
            } finally {
                if (isMounted) {
                    setIsLoadingVotedThreads(false)
                }
            }
        }

        fetchVotedThreads()

        return () => {
            isMounted = false
        }
    }, [currentUserId, isGuest])

    // Memoize filtered arrays and convert to summary types
    const userThreads = useMemo(
        () =>
            threads
                .filter((thread) => thread.userId === currentUserId)
                .map((thread) => ({
                    id: thread.id,
                    title: thread.title,
                    content: thread.content,
                    category: thread.category,
                    userId: thread.userId,
                    userName: thread.userName,
                    userAvatar: thread.userAvatar,
                    likes: thread.likes,
                    views: thread.views,
                    replyCount: thread.replyCount,
                    createdAt: timestampToNumber(thread.createdAt),
                    updatedAt: timestampToNumber(thread.updatedAt),
                    lastReplyAt: thread.lastReplyAt ? timestampToNumber(thread.lastReplyAt) : null,
                    lastReplyBy: thread.lastReplyBy,
                    tags: thread.tags,
                    isPinned: thread.isPinned,
                })),
        [threads, currentUserId]
    )
    const userPolls = useMemo(
        () =>
            polls
                .filter((poll) => poll.userId === currentUserId)
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
                })),
        [polls, currentUserId]
    )

    const userName = isGuest ? 'Guest' : user?.displayName || user?.email?.split('@')[0] || 'User'
    const userInitials = userName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)

    const likedContent = userData.likedMovies || []
    const watchLaterPreview = (userData.defaultWatchlist || []).slice(0, 6)
    // Filter collections: exclude system collections and empty manual/ai-generated collections
    // TMDB genre-based collections are always shown (content is fetched dynamically)
    const collections = (userData.userCreatedWatchlists || []).filter((c: any) => {
        if (c.isSystemCollection) return false
        // TMDB genre-based collections don't store items, they fetch dynamically
        if (c.collectionType === 'tmdb-genre') return true
        // Manual and AI-generated collections must have items
        return c.items && c.items.length > 0
    })

    // Show loading screen while data is being fetched
    if (isLoading) {
        return (
            <div className="min-h-screen bg-black">
                <div className="flex items-center justify-center min-h-screen">
                    <NetflixLoader inline message="Loading your profile data..." />
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
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[800px] bg-gradient-radial from-blue-900/20 via-transparent to-transparent opacity-50" />
                <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black opacity-60" />
            </div>

            {/* Content Container - with padding for fixed header and sub-nav */}
            <div className="relative z-10 pt-28 sm:pt-36 md:pt-44">
                {/* Cinematic Hero Header */}
                <div className="relative overflow-hidden">
                    {/* Animated Background Gradients */}
                    <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-900/80 to-black" />
                    <div
                        className="absolute inset-0 bg-gradient-to-t from-blue-900/20 via-indigo-900/10 to-black/50 animate-pulse"
                        style={{ animationDuration: '4s' }}
                    />
                    <div className="absolute inset-0 bg-gradient-radial from-blue-500/10 via-blue-900/5 to-transparent" />

                    {/* Soft edge vignetting */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/80" />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/60" />

                    {/* Hero Content */}
                    <div className="relative z-10 flex flex-col items-center justify-start px-6 pt-8 pb-12">
                        {/* Guest Mode Notification */}
                        {isInitialized && isGuest && (
                            <div className="mb-8 w-full max-w-2xl">
                                <GuestModeNotification align="center" />
                            </div>
                        )}

                        {/* Avatar with atmospheric glow */}
                        <div className="relative mb-6 group cursor-pointer transition-transform duration-300 hover:-translate-y-1">
                            {/* Ambient glow behind avatar */}
                            <div className="absolute -inset-4 bg-gradient-to-br from-blue-500/30 via-indigo-500/20 to-purple-500/30 rounded-full blur-2xl opacity-60 group-hover:opacity-100 transition-opacity duration-300" />

                            {/* Avatar container with rim light */}
                            <div className="relative">
                                {/* Rim light effect */}
                                <div className="absolute -inset-1 bg-gradient-to-br from-blue-400/40 via-indigo-500/30 to-purple-400/40 rounded-full blur-sm opacity-80 group-hover:opacity-100 transition-opacity" />

                                {user?.photoURL ? (
                                    <img
                                        src={user.photoURL}
                                        alt={userName}
                                        className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-full object-cover ring-2 ring-blue-500/50 group-hover:ring-blue-400/70 transition-all duration-300 shadow-[0_0_30px_rgba(59,130,246,0.3)]"
                                        referrerPolicy="no-referrer"
                                        onError={(e) => {
                                            e.currentTarget.style.display = 'none'
                                            const fallbackDiv = e.currentTarget
                                                .nextElementSibling as HTMLElement
                                            if (fallbackDiv) fallbackDiv.style.display = 'flex'
                                        }}
                                    />
                                ) : null}
                                <div
                                    className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-full bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 flex items-center justify-center ring-2 ring-blue-500/50 group-hover:ring-blue-400/70 transition-all duration-300 shadow-[0_0_30px_rgba(59,130,246,0.3)]"
                                    style={{ display: user?.photoURL ? 'none' : 'flex' }}
                                >
                                    <span className="text-4xl sm:text-5xl font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                                        {userInitials}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Username with glow */}
                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-2 text-center tracking-tight">
                            <span className="bg-gradient-to-r from-blue-200 via-white to-blue-200 bg-clip-text text-transparent drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">
                                {userName}
                            </span>
                        </h1>

                        {/* Email with subtle glow */}
                        {user?.email && (
                            <p className="text-gray-400 text-base sm:text-lg mb-6 text-center">
                                {user.email}
                            </p>
                        )}

                        {/* Action Buttons - Glassmorphic pills */}
                        <div className="flex items-center justify-center gap-4 flex-wrap">
                            <Link
                                href="/settings/profile"
                                className="group relative px-6 py-3 rounded-full font-bold text-sm transition-all duration-300"
                            >
                                {/* Button glow */}
                                <div className="absolute inset-0 bg-gradient-to-r from-zinc-700/50 to-zinc-600/50 rounded-full opacity-0 group-hover:opacity-100 blur-lg transition-opacity" />

                                <div className="relative flex items-center gap-2 px-4 py-2 bg-zinc-900/60 backdrop-blur-lg text-white rounded-full border border-zinc-700/50 group-hover:border-zinc-600 group-hover:bg-zinc-800/60 transition-all shadow-lg">
                                    <PencilIcon className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
                                    <span>Edit Profile</span>
                                </div>
                            </Link>

                            {/* View Public Profile Button - Auth only */}
                            {!isGuest && currentUserId && (
                                <Link
                                    href={`/users/${profileUsername || currentUserId}`}
                                    className="group relative px-6 py-3 rounded-full font-bold text-sm transition-all duration-300"
                                >
                                    {/* Button glow */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/30 to-indigo-500/30 rounded-full opacity-0 group-hover:opacity-100 blur-lg transition-opacity" />

                                    <div className="relative flex items-center gap-2 px-4 py-2 bg-blue-500/10 backdrop-blur-lg text-blue-400 rounded-full border border-blue-500/30 group-hover:border-blue-400/50 group-hover:bg-blue-500/20 group-hover:text-blue-300 transition-all shadow-lg shadow-blue-500/10">
                                        <EyeIcon className="w-4 h-4" />
                                        <span>View Public Profile</span>
                                    </div>
                                </Link>
                            )}
                        </div>
                    </div>
                </div>

                {/* Main Content Area - constrained width like SubPageLayout */}
                <div className="px-4 sm:px-6 lg:px-8 py-8">
                    <div className="max-w-[1800px] mx-auto space-y-8">
                        {/* Bento Grid Layout - Liked & Watch Later */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <LikedContentSection likedContent={likedContent} />
                            <WatchLaterSection
                                watchLaterPreview={watchLaterPreview}
                                totalCount={userData.defaultWatchlist.length}
                            />
                        </div>

                        {/* Rankings & Collections - Side by Side */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <RankingsSection rankings={rankings} />
                            <CollectionsSection collections={collections} />
                        </div>

                        {/* Community Activity */}
                        {!isGuest && (
                            <ForumActivitySection
                                threads={userThreads}
                                threadsVoted={votedThreads}
                                pollsCreated={userPolls}
                                pollsVoted={votedPolls}
                                isLoadingVotedPolls={isLoadingVotedPolls}
                                isLoadingVotedThreads={isLoadingVotedThreads}
                            />
                        )}
                    </div>
                </div>
            </div>

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
