/**
 * Public User Threads Page
 *
 * Shows all public threads for a specific user's profile
 */

'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore'
import { db } from '../../../../firebase'
import SubPageLayout from '../../../../components/layout/SubPageLayout'
import NetflixLoader from '../../../../components/common/NetflixLoader'
import {
    ChatBubbleLeftRightIcon,
    UserIcon,
    HeartIcon,
    EyeIcon,
    ChatBubbleLeftIcon,
} from '@heroicons/react/24/outline'
import type { Thread } from '../../../../types/forum'
import type { PublicProfilePayload } from '@/lib/publicProfile'
import type { Timestamp } from 'firebase/firestore'
import Link from 'next/link'

export default function UserThreadsPage() {
    const params = useParams()
    const userId = params?.userId as string

    const [threads, setThreads] = useState<Thread[]>([])
    const [displayName, setDisplayName] = useState<string>('User')
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!userId) return

        let isMounted = true

        const loadData = async () => {
            setIsLoading(true)
            setError(null)

            try {
                // Try to get profile data from API first (includes auth displayName fallback)
                let profileDisplayName = 'User'
                try {
                    const response = await fetch(`/api/public-profile/${userId}`)
                    if (response.ok) {
                        const payload = (await response.json()) as PublicProfilePayload
                        profileDisplayName = payload.profile.displayName
                    }
                } catch (apiError) {
                    console.warn('[UserThreads] API failed, will use client-side data')
                }

                if (!isMounted) return

                setDisplayName(profileDisplayName)

                // Load user's threads
                const threadsSnap = await getDocs(
                    query(
                        collection(db, 'threads'),
                        where('userId', '==', userId),
                        orderBy('createdAt', 'desc')
                    )
                )

                const userThreads = threadsSnap.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Thread[]

                setThreads(userThreads)
            } catch (err) {
                console.error('Error loading threads:', err)
                if (isMounted) {
                    setError((err as Error).message || 'Failed to load threads')
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false)
                }
            }
        }

        loadData()

        return () => {
            isMounted = false
        }
    }, [userId])

    const formatDate = (timestamp: Timestamp | number) => {
        const ms = typeof timestamp === 'number' ? timestamp : timestamp.toMillis()
        const date = new Date(ms)
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        })
    }

    const getCategoryColor = (category: string) => {
        const colors: Record<string, string> = {
            general: 'bg-gray-600',
            movies: 'bg-blue-600',
            tv: 'bg-purple-600',
            recommendations: 'bg-green-600',
            rankings: 'bg-yellow-600',
            announcements: 'bg-red-600',
        }
        return colors[category] || 'bg-gray-600'
    }

    if (isLoading) {
        return (
            <SubPageLayout
                title="Loading Threads..."
                icon={<ChatBubbleLeftRightIcon className="w-8 h-8" />}
                iconColor="text-blue-400"
            >
                <NetflixLoader />
            </SubPageLayout>
        )
    }

    if (error) {
        return (
            <SubPageLayout
                title="Error"
                icon={<ChatBubbleLeftRightIcon className="w-8 h-8" />}
                iconColor="text-blue-400"
            >
                <div className="max-w-2xl mx-auto text-center py-16">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-zinc-800 flex items-center justify-center">
                        <ChatBubbleLeftRightIcon className="w-10 h-10 text-gray-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Error Loading Threads</h2>
                    <p className="text-gray-400">{error}</p>
                </div>
            </SubPageLayout>
        )
    }

    return (
        <SubPageLayout
            title={`${displayName}'s Threads`}
            icon={<ChatBubbleLeftRightIcon className="w-8 h-8" />}
            iconColor="text-blue-400"
            description={`${threads.length} ${threads.length === 1 ? 'thread' : 'threads'}`}
        >
            {/* Back to Profile Link */}
            <div className="mb-6">
                <Link
                    href={`/users/${userId}`}
                    className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                    <UserIcon className="w-4 h-4" />
                    Back to {displayName}&apos;s Profile
                </Link>
            </div>

            {threads.length > 0 ? (
                <div className="space-y-4">
                    {threads.map((thread) => (
                        <Link
                            key={thread.id}
                            href={`/community/thread/${thread.id}`}
                            className="block bg-zinc-900 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors p-5"
                        >
                            <div className="flex items-start gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span
                                            className={`px-2 py-0.5 rounded text-xs font-medium text-white ${getCategoryColor(thread.category)}`}
                                        >
                                            {thread.category}
                                        </span>
                                        <span className="text-gray-500 text-sm">
                                            {formatDate(thread.createdAt)}
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
                                        {thread.title}
                                    </h3>
                                    <p className="text-gray-400 text-sm line-clamp-2 mb-3">
                                        {thread.content}
                                    </p>
                                    <div className="flex items-center gap-4 text-sm text-gray-500">
                                        <span className="flex items-center gap-1">
                                            <HeartIcon className="w-4 h-4" />
                                            {thread.likes || 0}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <ChatBubbleLeftIcon className="w-4 h-4" />
                                            {thread.replyCount || 0}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <EyeIcon className="w-4 h-4" />
                                            {thread.views || 0}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 bg-zinc-900 rounded-lg border border-zinc-800">
                    <ChatBubbleLeftRightIcon className="w-20 h-20 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No Threads</h3>
                    <p className="text-gray-400">
                        {displayName} hasn&apos;t created any threads yet
                    </p>
                </div>
            )}
        </SubPageLayout>
    )
}
