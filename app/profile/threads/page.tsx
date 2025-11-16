'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import SubPageLayout from '@/components/layout/SubPageLayout'
import { ThreadCard } from '@/components/forum/ThreadCard'
import { useForumStore } from '@/stores/forumStore'
import { useSessionStore } from '@/stores/sessionStore'
import { ChatBubbleLeftRightIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'
import NetflixLoader from '@/components/common/NetflixLoader'

export default function MyThreadsPage() {
    const router = useRouter()
    const { threads, isLoadingThreads, loadThreads } = useForumStore()
    const getUserId = useSessionStore((state) => state.getUserId)
    const userId = getUserId()

    useEffect(() => {
        loadThreads()
    }, [loadThreads])

    // Filter threads to only show user's own threads
    const myThreads = threads.filter((thread) => thread.userId === userId)

    return (
        <SubPageLayout
            title="My Threads"
            icon={<ChatBubbleLeftRightIcon className="w-8 h-8 text-green-500" />}
        >
            {/* Back to Profile Button */}
            <div className="mb-6">
                <button
                    onClick={() => router.push('/profile')}
                    className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                >
                    <ArrowLeftIcon className="w-5 h-5" />
                    <span>Back to Profile</span>
                </button>
            </div>

            {/* Loading State */}
            {isLoadingThreads && (
                <div className="flex justify-center py-20">
                    <NetflixLoader />
                </div>
            )}

            {/* Threads List */}
            {!isLoadingThreads && myThreads.length > 0 && (
                <div className="space-y-3">
                    {myThreads.map((thread) => (
                        <ThreadCard key={thread.id} thread={thread} />
                    ))}
                </div>
            )}

            {/* Empty State */}
            {!isLoadingThreads && myThreads.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700 mb-6">
                        <ChatBubbleLeftRightIcon className="w-10 h-10 text-gray-600" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">No threads yet</h3>
                    <p className="text-gray-400 mb-6">
                        You haven&apos;t created any discussion threads yet.
                    </p>
                    <button
                        onClick={() => router.push('/community/forums')}
                        className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-colors"
                    >
                        Create Your First Thread
                    </button>
                </div>
            )}
        </SubPageLayout>
    )
}
