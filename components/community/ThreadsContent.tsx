'use client'

import { useState, useEffect } from 'react'
import { useForumStore } from '@/stores/forumStore'
import { useSessionStore } from '@/stores/sessionStore'
import { useAuthStatus } from '@/hooks/useAuthStatus'
import NetflixLoader from '@/components/common/NetflixLoader'
import SearchBar from '@/components/common/SearchBar'
import { FORUM_CATEGORIES } from '@/utils/forumCategories'
import { ThreadCard } from '@/components/forum/ThreadCard'
import { CreateThreadModal } from '@/components/forum/CreateThreadModal'
import { ForumCategory } from '@/types/forum'
import { auth } from '@/firebase'
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline'

export default function ThreadsContent() {
    const { threads, isLoadingThreads, loadThreads, createThread } = useForumStore()
    const getUserId = useSessionStore((state) => state.getUserId)
    const { isGuest } = useAuthStatus()
    const [selectedCategory, setSelectedCategory] = useState<ForumCategory | 'all'>('all')
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')

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
        <div className="space-y-6">
            {/* Filters Section - Top Horizontal Layout */}
            <div className="space-y-4">
                {/* Category Filter Pills and Create Button */}
                <div className="flex flex-wrap gap-2 items-center justify-between">
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setSelectedCategory('all')}
                            className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                                selectedCategory === 'all'
                                    ? 'bg-blue-500 text-white shadow-lg scale-105'
                                    : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700/80 hover:scale-105'
                            }`}
                        >
                            All
                        </button>
                        {FORUM_CATEGORIES.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
                                    selectedCategory === cat.id
                                        ? 'bg-blue-500 text-white shadow-lg scale-105'
                                        : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700/80 hover:scale-105'
                                }`}
                            >
                                <span>{cat.icon}</span>
                                <span>{cat.name}</span>
                            </button>
                        ))}
                    </div>

                    {/* Create thread button */}
                    <button
                        onClick={handleOpenCreateModal}
                        className={`rounded-full px-5 py-2.5 font-semibold transition-all duration-200 flex items-center gap-2 ${
                            isGuest
                                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                : 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg hover:scale-105'
                        }`}
                        disabled={isGuest}
                        title={isGuest ? 'Sign in to create threads' : 'Create a new thread'}
                    >
                        <ChatBubbleLeftRightIcon className="w-5 h-5" />
                        <span className="hidden sm:inline">New Thread</span>
                        {isGuest && <span className="text-xs">(Sign in)</span>}
                    </button>
                </div>

                {/* Search Threads */}
                <SearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search threads..."
                    focusColor="blue"
                    voiceInput={true}
                    voiceSourceId="threads-search"
                />
            </div>

            {/* Create Thread Modal */}
            <CreateThreadModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onCreate={handleCreateThread}
            />

            {/* Loading state */}
            {isLoadingThreads && <NetflixLoader inline={true} message="Loading threads..." />}

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
            {!isLoadingThreads &&
                (filteredThreads.length > 0 ? (
                    <div className="space-y-3">
                        {filteredThreads.map((thread) => (
                            <ThreadCard key={thread.id} thread={thread} />
                        ))}
                    </div>
                ) : (
                    threads.length > 0 && (
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
                ))}
        </div>
    )
}
