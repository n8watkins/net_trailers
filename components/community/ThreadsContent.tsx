'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForumStore } from '@/stores/forumStore'
import { useSessionStore } from '@/stores/sessionStore'
import { useAuthStatus } from '@/hooks/useAuthStatus'
import { useVoiceInput } from '@/hooks/useVoiceInput'
import { useToast } from '@/hooks/useToast'
import NetflixLoader from '@/components/common/NetflixLoader'
import { FORUM_CATEGORIES } from '@/utils/forumCategories'
import { ThreadCard } from '@/components/forum/ThreadCard'
import { CreateThreadModal } from '@/components/forum/CreateThreadModal'
import { ForumCategory } from '@/types/forum'
import { auth } from '@/firebase'
import {
    ChatBubbleLeftRightIcon,
    MagnifyingGlassIcon,
    MicrophoneIcon,
    TrophyIcon,
    ChartBarIcon,
} from '@heroicons/react/24/outline'

export default function ThreadsContent() {
    const router = useRouter()
    const { threads, isLoadingThreads, loadThreads, createThread } = useForumStore()
    const getUserId = useSessionStore((state) => state.getUserId)
    const { isGuest } = useAuthStatus()
    const { showError } = useToast()
    const [selectedCategory, setSelectedCategory] = useState<ForumCategory | 'all'>('all')
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')

    // Voice input
    const { isListening, isSupported, startListening, stopListening } = useVoiceInput({
        onResult: (transcript) => {
            setSearchQuery(transcript)
        },
        onError: (error) => {
            showError(error)
        },
        sourceId: 'threads-search',
    })

    const handleVoiceClick = async () => {
        if (isListening) {
            stopListening()
        } else {
            await startListening()
        }
    }

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
        <div className="relative -mt-16 -mx-6 sm:-mx-8 lg:-mx-12">
            {/* Atmospheric Background */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-black" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[800px] bg-gradient-radial from-blue-900/20 via-transparent to-transparent opacity-50" />
                <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black opacity-60" />
            </div>

            {/* Content Container */}
            <div className="relative z-10">
                {/* Cinematic Hero Header */}
                <div className="relative overflow-hidden pt-4">
                    {/* Animated Background Gradients */}
                    <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-900/80 to-black" />
                    <div
                        className="absolute inset-0 bg-gradient-to-t from-blue-900/20 via-cyan-900/10 to-black/50 animate-pulse"
                        style={{ animationDuration: '4s' }}
                    />
                    <div className="absolute inset-0 bg-gradient-radial from-blue-500/10 via-blue-900/5 to-transparent" />

                    {/* Soft edge vignetting for subtle blending */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/80" />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/60" />

                    {/* Hero Content */}
                    <div className="relative z-10 flex flex-col items-center justify-start px-6 pt-8 pb-6">
                        {/* Chat Bubble Icon with glow */}
                        <div className="relative mb-4">
                            <div className="absolute inset-0 bg-blue-500/30 blur-2xl scale-150" />
                            <ChatBubbleLeftRightIcon className="relative w-16 h-16 text-blue-400 drop-shadow-[0_0_20px_rgba(59,130,246,0.5)]" />
                        </div>

                        {/* Title */}
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-2 text-center tracking-tight">
                            <span className="bg-gradient-to-r from-blue-200 via-blue-100 to-blue-200 bg-clip-text text-transparent drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">
                                Community Threads
                            </span>
                        </h1>

                        {/* Subtitle */}
                        <p className="text-base sm:text-lg text-gray-300 mb-6 text-center max-w-2xl">
                            Connect, discuss, and share your passion for movies & TV
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
                                    const isActive = tab.id === 'threads'

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
                                                <div className="absolute inset-0 rounded-lg ring-2 ring-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.3)]" />
                                            )}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Category Pills - Integrated in Hero */}
                        <div className="flex flex-wrap gap-2 items-center justify-center mb-5 overflow-x-auto pb-2 max-w-full">
                            <button
                                onClick={() => setSelectedCategory('all')}
                                className={`group relative rounded-full px-5 py-2.5 text-sm font-bold transition-all duration-300 backdrop-blur-md border whitespace-nowrap ${
                                    selectedCategory === 'all'
                                        ? 'bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500 text-white border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.5)] scale-105'
                                        : 'bg-zinc-900/40 text-gray-300 border-zinc-700/50 hover:bg-zinc-800/60 hover:border-zinc-600 hover:scale-105 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]'
                                }`}
                            >
                                <span className="relative z-10">All</span>
                                {selectedCategory === 'all' && (
                                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 blur-xl opacity-30 animate-pulse" />
                                )}
                            </button>
                            {FORUM_CATEGORIES.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={`group relative rounded-full px-5 py-2.5 text-sm font-bold transition-all duration-300 backdrop-blur-md border flex items-center gap-2 whitespace-nowrap ${
                                        selectedCategory === cat.id
                                            ? 'bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500 text-white border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.5)] scale-105'
                                            : 'bg-zinc-900/40 text-gray-300 border-zinc-700/50 hover:bg-zinc-800/60 hover:border-zinc-600 hover:scale-105 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]'
                                    }`}
                                >
                                    <span className="text-base">{cat.icon}</span>
                                    <span className="relative z-10 hidden sm:inline">
                                        {cat.name}
                                    </span>
                                    {selectedCategory === cat.id && (
                                        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 blur-xl opacity-30 animate-pulse" />
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Enhanced Search Bar */}
                        <div className="w-full max-w-3xl relative">
                            <div className="relative group">
                                <MagnifyingGlassIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400 z-10 transition-colors group-focus-within:text-blue-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search threads..."
                                    className="w-full pl-14 pr-14 py-4 bg-zinc-900/40 backdrop-blur-lg border border-zinc-800/50 rounded-2xl text-white text-lg placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:shadow-[0_0_25px_rgba(59,130,246,0.3)] transition-all duration-300 hover:bg-zinc-900/60 hover:border-zinc-700"
                                />
                                {isSupported && (
                                    <button
                                        type="button"
                                        onClick={handleVoiceClick}
                                        className="absolute right-5 top-1/2 -translate-y-1/2 z-10 transition-all duration-200"
                                        title={isListening ? 'Stop listening' : 'Start voice input'}
                                    >
                                        <div className="relative">
                                            {isListening && (
                                                <>
                                                    <span className="absolute inset-0 rounded-full bg-red-500/40 animate-ping" />
                                                    <span className="absolute inset-0 rounded-full bg-red-500/30 animate-pulse" />
                                                </>
                                            )}
                                            <MicrophoneIcon
                                                className={`w-6 h-6 relative z-10 transition-all ${
                                                    isListening
                                                        ? 'text-red-500 scale-110 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]'
                                                        : 'text-gray-400 hover:text-blue-400'
                                                }`}
                                            />
                                        </div>
                                    </button>
                                )}

                                {/* Glowing border effect on focus */}
                                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 opacity-0 group-focus-within:opacity-20 blur-xl transition-opacity duration-300 -z-10" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="px-6 sm:px-8 lg:px-12 py-8 space-y-6">
                    {/* Loading state */}
                    {isLoadingThreads && (
                        <div className="py-16">
                            <NetflixLoader inline={true} message="Loading threads..." />
                        </div>
                    )}

                    {/* Empty state */}
                    {!isLoadingThreads && threads.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-24 h-24 rounded-full bg-zinc-900/60 backdrop-blur-lg flex items-center justify-center border-2 border-zinc-800/50 mb-6">
                                <ChatBubbleLeftRightIcon className="w-12 h-12 text-blue-500" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-3">No threads yet</h3>
                            <p className="text-gray-400 mb-8 max-w-md text-lg">
                                Be the first to start a discussion! Share your thoughts, ask
                                questions, or start a debate about your favorite movies and shows.
                            </p>
                            <button
                                onClick={handleOpenCreateModal}
                                className={`px-8 py-4 font-bold rounded-xl transition-all duration-300 ${
                                    isGuest
                                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-[0_0_30px_rgba(59,130,246,0.4)] hover:shadow-[0_0_40px_rgba(59,130,246,0.6)] scale-100 hover:scale-105'
                                }`}
                                disabled={isGuest}
                            >
                                {isGuest ? 'Sign in to Create Threads' : 'Create First Thread'}
                            </button>
                        </div>
                    )}

                    {/* Thread Grid - 1-2 Column Layout */}
                    {!isLoadingThreads && filteredThreads.length > 0 && (
                        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {filteredThreads.map((thread) => (
                                <ThreadCard key={thread.id} thread={thread} />
                            ))}
                        </div>
                    )}

                    {/* No results state */}
                    {!isLoadingThreads && threads.length > 0 && filteredThreads.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-20 h-20 mb-4 rounded-full bg-zinc-900/60 backdrop-blur-lg flex items-center justify-center border border-zinc-800/50">
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
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full blur-2xl opacity-60 group-hover:opacity-80 transition-opacity" />

                            {/* Button */}
                            <div className="relative flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-600 rounded-full text-white font-bold shadow-[0_0_40px_rgba(59,130,246,0.6)] group-hover:shadow-[0_0_60px_rgba(59,130,246,0.8)] group-hover:scale-110 transition-all duration-300">
                                <ChatBubbleLeftRightIcon className="w-6 h-6" />
                                <span className="hidden sm:inline">New Thread</span>
                            </div>
                        </div>
                    </button>
                )}
            </div>

            {/* Create Thread Modal */}
            <CreateThreadModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onCreate={handleCreateThread}
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
