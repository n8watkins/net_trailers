/**
 * ThreadCard Component
 *
 * Displays a discussion thread in card format
 * Clean, professional design without excessive animations
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Thread } from '@/types/forum'
import { getCategoryInfo } from '@/utils/forumCategories'
import { ChatBubbleLeftIcon, EyeIcon, HeartIcon, ClockIcon } from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'
import { formatDistanceToNow } from 'date-fns'
import { Timestamp, doc, getDoc } from 'firebase/firestore'
import { useSessionStore } from '@/stores/sessionStore'
import { db } from '@/firebase'

// Helper to convert Firebase Timestamp to Date
const toDate = (timestamp: Timestamp | Date | number): Date => {
    if (timestamp instanceof Timestamp) {
        return timestamp.toDate()
    }
    if (timestamp instanceof Date) {
        return timestamp
    }
    return new Date(timestamp)
}

interface ThreadCardProps {
    thread: Thread
    onClick?: () => void
}

export function ThreadCard({ thread, onClick }: ThreadCardProps) {
    const router = useRouter()
    const getUserId = useSessionStore((state) => state.getUserId)
    const userId = getUserId()
    const category = getCategoryInfo(thread.category)
    const [isLiked, setIsLiked] = useState(false)

    // Check if user has liked this thread
    useEffect(() => {
        const checkLikeStatus = async () => {
            if (!userId) {
                setIsLiked(false)
                return
            }

            try {
                const likeRef = doc(db, 'thread_likes', `${userId}_${thread.id}`)
                const likeDoc = await getDoc(likeRef)
                setIsLiked(likeDoc.exists())
            } catch (error) {
                console.error('Error checking thread like status:', error)
                setIsLiked(false)
            }
        }

        checkLikeStatus()
    }, [userId, thread.id])

    const handleClick = () => {
        if (onClick) {
            onClick()
        } else {
            router.push(`/community/thread/${thread.id}`)
        }
    }

    return (
        <div
            onClick={handleClick}
            className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-colors cursor-pointer"
        >
            {/* Header */}
            <div className="flex items-start gap-3 mb-3">
                {/* Author avatar */}
                {thread.userAvatar ? (
                    <Image
                        src={thread.userAvatar}
                        alt={thread.userName}
                        width={40}
                        height={40}
                        className="rounded-full"
                    />
                ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-sm font-bold">
                        {thread.userName[0]?.toUpperCase() || '?'}
                    </div>
                )}

                {/* Title and meta */}
                <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-white hover:text-blue-400 transition-colors line-clamp-2 mb-1">
                        {thread.title}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                        <span>{thread.userName}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                            <ClockIcon className="w-4 h-4" />
                            {formatDistanceToNow(toDate(thread.createdAt), { addSuffix: true })}
                        </span>
                        {category && (
                            <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                    <span>{category.icon}</span>
                                    <span className={category.color}>{category.name}</span>
                                </span>
                            </>
                        )}
                    </div>
                </div>

                {/* Pinned indicator */}
                {thread.isPinned && (
                    <div className="px-2 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs font-medium text-yellow-500">
                        Pinned
                    </div>
                )}
            </div>

            {/* Content preview */}
            <p className="text-gray-400 text-sm line-clamp-2 mb-3">{thread.content}</p>

            {/* Tags */}
            {thread.tags && thread.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                    {thread.tags.map((tag) => (
                        <span
                            key={tag}
                            className="px-2 py-0.5 bg-zinc-800 text-gray-400 text-xs rounded hover:bg-zinc-700 transition-colors"
                        >
                            {tag}
                        </span>
                    ))}
                </div>
            )}

            {/* Footer stats */}
            <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
                <div className="flex items-center gap-4 text-sm text-gray-400">
                    {/* Likes */}
                    <div className="flex items-center gap-1">
                        {isLiked ? (
                            <HeartSolidIcon className="w-4 h-4 text-red-500" />
                        ) : (
                            <HeartIcon className="w-4 h-4" />
                        )}
                        <span className={isLiked ? 'text-red-500' : ''}>{thread.likes}</span>
                    </div>

                    {/* Replies */}
                    <div className="flex items-center gap-1">
                        <ChatBubbleLeftIcon className="w-4 h-4" />
                        <span>{thread.replyCount}</span>
                    </div>

                    {/* Views */}
                    <div className="flex items-center gap-1">
                        <EyeIcon className="w-4 h-4" />
                        <span>{thread.views}</span>
                    </div>
                </div>

                {/* Last reply info */}
                {thread.lastReplyAt && thread.lastReplyBy && (
                    <div className="text-xs text-gray-500">
                        Last reply by {thread.lastReplyBy.userName}
                    </div>
                )}
            </div>
        </div>
    )
}
