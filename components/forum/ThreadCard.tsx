/**
 * ThreadCard Component
 *
 * Displays a discussion thread in card format
 * Premium Netflix-inspired cinematic design with glow effects
 */

'use client'

import { useState, useEffect, memo, useCallback } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Thread } from '@/types/forum'
import { getCategoryInfo } from '@/utils/forumCategories'
import { ChatBubbleLeftIcon, EyeIcon, HeartIcon, ClockIcon } from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'
import { formatDistanceToNow } from 'date-fns'
import { Timestamp, doc, getDoc } from 'firebase/firestore'
import { useSessionStore } from '@/stores/sessionStore'
import { useForumStore } from '@/stores/forumStore'
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

function ThreadCardComponent({ thread, onClick }: ThreadCardProps) {
    const router = useRouter()
    const getUserId = useSessionStore((state) => state.getUserId)
    const userId = getUserId()
    const { likeThread, unlikeThread } = useForumStore()
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

    const handleLike = useCallback(
        async (e: React.MouseEvent) => {
            e.preventDefault()
            e.stopPropagation()

            if (!userId) return

            try {
                if (isLiked) {
                    await unlikeThread(userId, thread.id)
                    setIsLiked(false)
                } else {
                    await likeThread(userId, thread.id)
                    setIsLiked(true)
                }
            } catch (error) {
                console.error('Error toggling thread like:', error)
            }
        },
        [userId, isLiked, thread.id, likeThread, unlikeThread]
    )

    // Category color mapping for left border
    const getCategoryColor = () => {
        switch (thread.category) {
            case 'movies':
                return 'border-l-blue-500'
            case 'tv-shows':
                return 'border-l-purple-500'
            case 'recommendations':
                return 'border-l-yellow-500'
            case 'rankings':
                return 'border-l-orange-500'
            case 'announcements':
                return 'border-l-pink-500'
            default:
                return 'border-l-gray-400'
        }
    }

    // Category glow effect
    const getCategoryGlow = () => {
        switch (thread.category) {
            case 'movies':
                return 'shadow-[0_0_30px_rgba(59,130,246,0.15)]'
            case 'tv-shows':
                return 'shadow-[0_0_30px_rgba(168,85,247,0.15)]'
            case 'recommendations':
                return 'shadow-[0_0_30px_rgba(234,179,8,0.15)]'
            case 'rankings':
                return 'shadow-[0_0_30px_rgba(249,115,22,0.15)]'
            case 'announcements':
                return 'shadow-[0_0_30px_rgba(236,72,153,0.15)]'
            default:
                return 'shadow-[0_0_30px_rgba(156,163,175,0.15)]'
        }
    }

    // Category badge background color
    const getCategoryBadgeColor = () => {
        switch (thread.category) {
            case 'movies':
                return 'bg-blue-500/20 border-blue-500/40 text-blue-400'
            case 'tv-shows':
                return 'bg-purple-500/20 border-purple-500/40 text-purple-400'
            case 'recommendations':
                return 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400'
            case 'rankings':
                return 'bg-orange-500/20 border-orange-500/40 text-orange-400'
            case 'announcements':
                return 'bg-pink-500/20 border-pink-500/40 text-pink-400'
            default:
                return 'bg-gray-500/20 border-gray-500/40 text-gray-400'
        }
    }

    return (
        <div
            onClick={handleClick}
            className={`group relative bg-zinc-900/60 backdrop-blur-xl border-l-4 border-y border-r border-zinc-800/50 rounded-2xl p-4 sm:p-5 cursor-pointer transition-all duration-300 hover:bg-zinc-900/80 hover:border-zinc-700/80 hover:scale-[1.02] hover:-translate-y-1 ${getCategoryColor()} ${getCategoryGlow()} hover:shadow-[0_0_50px_rgba(0,0,0,0.5)]`}
        >
            {/* Glowing rim effect on hover */}
            <div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{
                    background: 'linear-gradient(90deg, rgba(59,130,246,0.1) 0%, transparent 50%)',
                }}
            />

            {/* Header - User Info */}
            <div className="relative z-10 flex items-start gap-3 mb-3">
                {/* Author avatar */}
                {thread.userAvatar ? (
                    <Image
                        src={thread.userAvatar}
                        alt={thread.userName}
                        width={44}
                        height={44}
                        className="rounded-full ring-2 ring-zinc-800/50 group-hover:ring-blue-500/30 transition-all duration-300"
                    />
                ) : (
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-sm font-bold shadow-lg ring-2 ring-zinc-800/50 group-hover:ring-blue-500/30 transition-all duration-300">
                        {thread.userName[0]?.toUpperCase() || '?'}
                    </div>
                )}

                {/* User meta and timestamp */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                        <span className="font-semibold text-gray-200">{thread.userName}</span>
                        <span className="text-gray-600">•</span>
                        <span className="flex items-center gap-1">
                            <ClockIcon className="w-3.5 h-3.5" />
                            {formatDistanceToNow(toDate(thread.createdAt), { addSuffix: true })}
                        </span>
                    </div>

                    {/* Category Badge */}
                    {category && (
                        <div
                            className={`inline-flex px-2.5 py-1 rounded-full border text-xs font-semibold ${getCategoryBadgeColor()}`}
                        >
                            <span className="mr-1.5">{category.icon}</span>
                            <span>{category.name}</span>
                        </div>
                    )}
                </div>

                {/* Pinned indicator */}
                {thread.isPinned && (
                    <div className="px-3 py-1.5 bg-yellow-500/20 border border-yellow-500/40 rounded-full text-xs font-bold text-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.2)]">
                        Pinned
                    </div>
                )}
            </div>

            {/* Thread Title - Large, Bold, Cinematic */}
            <h3 className="relative z-10 text-lg sm:text-xl font-bold text-white leading-tight mb-2 group-hover:text-blue-300 transition-colors line-clamp-2">
                {thread.title}
            </h3>

            {/* Thread Body Preview */}
            <p className="relative z-10 text-gray-400 text-sm mb-4 line-clamp-2 leading-relaxed">
                {thread.content}
            </p>

            {/* Tags - Mini pills with border glow */}
            {thread.tags && thread.tags.length > 0 && (
                <div className="relative z-10 flex flex-wrap gap-1.5 mb-4">
                    {thread.tags.map((tag) => (
                        <span
                            key={tag}
                            className="px-2.5 py-1 bg-zinc-800/60 backdrop-blur-sm text-gray-400 text-[10px] font-medium rounded-full hover:bg-zinc-700/60 hover:text-gray-300 transition-colors border border-zinc-700/50 hover:border-zinc-600"
                        >
                            {tag}
                        </span>
                    ))}
                </div>
            )}

            {/* Gradient Divider */}
            <div className="relative z-10 h-px bg-gradient-to-r from-transparent via-zinc-700/50 to-transparent mb-3" />

            {/* Engagement Footer */}
            <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-gray-400">
                    {/* Likes - with pulse animation on hover */}
                    <button
                        onClick={handleLike}
                        disabled={!userId}
                        className="flex items-center gap-1.5 transition-all duration-300 hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50 group/like"
                    >
                        {isLiked ? (
                            <HeartSolidIcon className="w-5 h-5 text-red-500 animate-pulse group-hover/like:animate-none" />
                        ) : (
                            <HeartIcon className="w-5 h-5 group-hover/like:text-red-400 transition-colors" />
                        )}
                        <span
                            className={`font-semibold ${isLiked ? 'text-red-400' : 'group-hover/like:text-red-400'}`}
                        >
                            {thread.likes}
                        </span>
                    </button>

                    {/* Replies */}
                    <div className="flex items-center gap-1.5 group/replies hover:scale-110 transition-transform">
                        <ChatBubbleLeftIcon className="w-5 h-5 group-hover/replies:text-blue-400 transition-colors" />
                        <span className="font-semibold group-hover/replies:text-blue-400 transition-colors">
                            {thread.replyCount}
                        </span>
                    </div>

                    {/* Views */}
                    <div className="flex items-center gap-1.5 group/views hover:scale-110 transition-transform">
                        <EyeIcon className="w-5 h-5 group-hover/views:text-cyan-400 transition-colors" />
                        <span className="font-semibold group-hover/views:text-cyan-400 transition-colors">
                            {thread.views}
                        </span>
                    </div>
                </div>

                {/* Last reply info */}
                {thread.lastReplyAt && thread.lastReplyBy && (
                    <div className="text-xs text-gray-500 hidden sm:block">
                        Last reply by{' '}
                        <span className="text-gray-400 font-medium">
                            {thread.lastReplyBy.userName}
                        </span>
                    </div>
                )}
            </div>
        </div>
    )
}

// Custom comparison to only re-render when this thread's data changes
function arePropsEqual(prevProps: ThreadCardProps, nextProps: ThreadCardProps): boolean {
    // Check if thread ID changed
    if (prevProps.thread.id !== nextProps.thread.id) return false

    // Check if thread engagement data changed
    if (prevProps.thread.likes !== nextProps.thread.likes) return false
    if (prevProps.thread.replyCount !== nextProps.thread.replyCount) return false
    if (prevProps.thread.views !== nextProps.thread.views) return false

    // Check if last reply changed
    if (prevProps.thread.lastReplyAt !== nextProps.thread.lastReplyAt) return false
    if (prevProps.thread.lastReplyBy?.userName !== nextProps.thread.lastReplyBy?.userName)
        return false

    // Props are equal, no re-render needed
    return true
}

export const ThreadCard = memo(ThreadCardComponent, arePropsEqual)
