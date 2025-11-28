/**
 * User Threads Page - My Threads
 *
 * Dedicated page for viewing user's own threads with:
 * - Created/Voted (liked) toggle tabs
 * - All threads the user has created
 * - All threads the user has liked
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
import { ThreadCard } from '@/components/forum/ThreadCard'
import { CreateThreadModal } from '@/components/forum/CreateThreadModal'
import type { ThreadSummary, ForumCategory } from '@/types/forum'
import { ChatBubbleLeftRightIcon, ArrowLeftIcon, PlusIcon } from '@heroicons/react/24/outline'
import { ChatBubbleLeftRightIcon as ChatBubbleSolidIcon } from '@heroicons/react/24/solid'
import { Timestamp, collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore'
import { db, auth } from '@/firebase'

// Helper to convert Firestore Timestamp to number
const timestampToNumber = (ts: Timestamp | number | null | undefined): number | null => {
    if (!ts) return null
    if (typeof ts === 'number') return ts
    return ts.toMillis()
}

export default function UserThreadsPage() {
    const router = useRouter()
    const { threads, isLoadingThreads, loadThreads, createThread } = useForumStore()
    const getUserId = useSessionStore((state) => state.getUserId)
    const { isGuest } = useAuthStatus()
    const isInitialized = useSessionStore((state) => state.isInitialized)
    const userId = getUserId()

    const [activeThreadTab, setActiveThreadTab] = useState<'created' | 'voted'>('created')
    const [votedThreads, setVotedThreads] = useState<ThreadSummary[]>([])
    const [isLoadingVotedThreads, setIsLoadingVotedThreads] = useState(false)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

    const isLoading = !isInitialized || isLoadingThreads

    useEffect(() => {
        document.title = 'My Threads - NetTrailers'
    }, [])

    // Redirect guests to community threads
    useEffect(() => {
        if (isInitialized && isGuest) {
            router.push('/community/threads')
        }
    }, [isInitialized, isGuest, router])

    // Load threads on mount
    useEffect(() => {
        if (userId && isInitialized) {
            loadThreads()
        }
    }, [userId, isInitialized, loadThreads])

    // Fetch voted (liked) threads
    useEffect(() => {
        if (!userId || isGuest) {
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
                    where('userId', '==', userId)
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
                        if (threadData.userId === userId) return null

                        return {
                            id: threadDoc.id,
                            title: threadData.title ?? 'Untitled thread',
                            content: threadData.content ?? '',
                            category: threadData.category ?? 'general',
                            likes: threadData.likes ?? 0,
                            views: threadData.views ?? 0,
                            replyCount: threadData.replyCount ?? 0,
                            createdAt: timestampToNumber(
                                threadData.createdAt as Timestamp | number | null | undefined
                            ),
                            updatedAt: timestampToNumber(
                                threadData.updatedAt as Timestamp | number | null | undefined
                            ),
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
    }, [userId, isGuest])

    const userThreads = useMemo(
        () =>
            threads
                .filter((thread) => thread.userId === userId)
                .map((thread) => ({
                    id: thread.id,
                    title: thread.title,
                    content: thread.content,
                    category: thread.category,
                    likes: thread.likes,
                    views: thread.views,
                    replyCount: thread.replyCount,
                    createdAt: timestampToNumber(thread.createdAt),
                    updatedAt: timestampToNumber(thread.updatedAt),
                }))
                .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)),
        [threads, userId]
    )

    const activeThreads = activeThreadTab === 'created' ? userThreads : votedThreads
    const isLoadingActiveThreads = activeThreadTab === 'voted' && isLoadingVotedThreads

    const handleCreateThread = async (title: string, content: string, category: ForumCategory) => {
        if (!userId) return
        const currentUser = auth.currentUser
        if (!currentUser) return

        const userName = currentUser.displayName || 'Anonymous'
        const userAvatar = currentUser.photoURL || undefined

        await createThread(userId, userName, userAvatar, title, content, category)
        await loadThreads()
        setActiveThreadTab('created') // Switch to created tab to see new thread
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-black">
                <Header />
                <div className="flex items-center justify-center min-h-screen">
                    <NetflixLoader inline message="Loading your threads..." />
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

            {/* Content Container */}
            <div className="relative z-10 pt-28 sm:pt-36 md:pt-44">
                {/* Cinematic Hero Header */}
                <div className="relative overflow-hidden">
                    {/* Animated Background Gradients */}
                    <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-900/80 to-black" />
                    <div
                        className="absolute inset-0 bg-gradient-to-t from-blue-900/20 via-cyan-900/10 to-black/50 animate-pulse"
                        style={{ animationDuration: '4s' }}
                    />
                    <div className="absolute inset-0 bg-gradient-radial from-blue-500/10 via-blue-900/5 to-transparent" />

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
                            <div className="absolute inset-0 bg-blue-500/30 blur-2xl scale-150" />
                            <ChatBubbleSolidIcon className="relative w-16 h-16 text-blue-400 drop-shadow-[0_0_20px_rgba(59,130,246,0.5)]" />
                        </div>

                        {/* Title */}
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-2 text-center tracking-tight">
                            <span className="bg-gradient-to-r from-blue-200 via-cyan-100 to-blue-200 bg-clip-text text-transparent drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">
                                My Threads
                            </span>
                        </h1>

                        {/* Subtitle */}
                        <p className="text-base sm:text-lg text-gray-300 mb-8 text-center max-w-2xl">
                            Manage your threads and track discussions you've liked
                        </p>

                        {/* Tab Switcher */}
                        <div className="inline-flex rounded-full bg-zinc-900/60 backdrop-blur p-1.5 border border-zinc-800/50 mb-4">
                            {[
                                {
                                    id: 'created',
                                    label: 'Created',
                                    count: userThreads.length,
                                },
                                {
                                    id: 'voted',
                                    label: 'Liked',
                                    count: votedThreads.length,
                                },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() =>
                                        setActiveThreadTab(tab.id as 'created' | 'voted')
                                    }
                                    className={`relative px-6 py-3 text-sm font-bold rounded-full transition-all duration-200 ${
                                        activeThreadTab === tab.id
                                            ? 'bg-blue-500 text-white shadow-[0_0_12px_rgba(59,130,246,0.4)]'
                                            : 'text-gray-400 hover:text-white'
                                    }`}
                                >
                                    {tab.label} <span className="opacity-70">({tab.count})</span>
                                </button>
                            ))}
                        </div>

                        {/* Create Thread Button */}
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="group relative px-6 py-3 rounded-full font-bold text-sm transition-all duration-300"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/30 to-cyan-500/30 rounded-full opacity-0 group-hover:opacity-100 blur-lg transition-opacity" />
                            <div className="relative flex items-center gap-2 px-4 py-2 bg-blue-500/20 backdrop-blur-lg text-blue-400 rounded-full border border-blue-500/30 group-hover:border-blue-400/50 group-hover:bg-blue-500/30 group-hover:text-blue-300 transition-all shadow-lg shadow-blue-500/10">
                                <PlusIcon className="w-4 h-4" />
                                <span>Create Thread</span>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="px-4 sm:px-6 lg:px-8 py-8">
                    <div className="max-w-[1400px] mx-auto">
                        {/* Loading state */}
                        {isLoadingActiveThreads && (
                            <div className="py-16">
                                <NetflixLoader inline={true} message="Loading threads..." />
                            </div>
                        )}

                        {/* Empty state */}
                        {!isLoadingActiveThreads && activeThreads.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="relative mb-6">
                                    <div className="absolute inset-0 bg-blue-500/20 blur-xl" />
                                    <div className="relative w-20 h-20 rounded-full bg-zinc-900/60 flex items-center justify-center border border-zinc-800/50">
                                        <ChatBubbleLeftRightIcon className="w-10 h-10 text-blue-500" />
                                    </div>
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-3">
                                    {activeThreadTab === 'created'
                                        ? 'No threads created yet'
                                        : 'No threads liked yet'}
                                </h3>
                                <p className="text-gray-400 mb-8 max-w-md text-lg">
                                    {activeThreadTab === 'created'
                                        ? 'Start a discussion and share your thoughts with the community!'
                                        : 'Like threads to see them here.'}
                                </p>
                                {activeThreadTab === 'created' && (
                                    <button
                                        onClick={() => setIsCreateModalOpen(true)}
                                        className="px-8 py-4 font-bold rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-[0_0_30px_rgba(59,130,246,0.4)] hover:shadow-[0_0_40px_rgba(59,130,246,0.6)] scale-100 hover:scale-105 transition-all duration-300"
                                    >
                                        Create First Thread
                                    </button>
                                )}
                                {activeThreadTab === 'voted' && (
                                    <Link
                                        href="/community/threads"
                                        className="px-8 py-4 font-bold rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-[0_0_30px_rgba(59,130,246,0.4)] hover:shadow-[0_0_40px_rgba(59,130,246,0.6)] scale-100 hover:scale-105 transition-all duration-300 inline-block"
                                    >
                                        Browse Community Threads
                                    </Link>
                                )}
                            </div>
                        )}

                        {/* Thread List - Single Column */}
                        {!isLoadingActiveThreads && activeThreads.length > 0 && (
                            <div className="space-y-4">
                                {activeThreads.map((thread, index) => (
                                    <div
                                        key={thread.id}
                                        className="animate-fadeInUp"
                                        style={{
                                            animationDelay: `${Math.min(index * 50, 500)}ms`,
                                            animationFillMode: 'both',
                                        }}
                                    >
                                        <ThreadCard thread={thread} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Create Thread Modal */}
            <CreateThreadModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onCreate={handleCreateThread}
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
