/**
 * Thread Detail Page
 *
 * Shows full thread with replies and interaction options
 */

'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import SubPageLayout from '@/components/layout/SubPageLayout'
import { useForumStore } from '@/stores/forumStore'
import { useSessionStore } from '@/stores/sessionStore'
import { useAuthStatus } from '@/hooks/useAuthStatus'
import { getCategoryInfo } from '@/utils/forumCategories'
import NetflixLoader from '@/components/common/NetflixLoader'
import ImageUpload from '@/components/forum/ImageUpload'
import { formatDistanceToNow } from 'date-fns'
import { Timestamp } from 'firebase/firestore'
import { auth } from '@/firebase'
import {
    ChatBubbleLeftIcon,
    HeartIcon,
    EyeIcon,
    ArrowLeftIcon,
    TrashIcon,
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'

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

interface ThreadDetailPageProps {
    params: Promise<{
        id: string
    }>
}

export default function ThreadDetailPage({ params }: ThreadDetailPageProps) {
    const resolvedParams = use(params)
    const router = useRouter()
    const { isGuest, isInitialized } = useAuthStatus()
    const getUserId = useSessionStore((state) => state.getUserId)
    const userId = getUserId()

    const {
        currentThread,
        threadReplies,
        isLoadingThreads,
        loadThreadById,
        loadThreadReplies,
        replyToThread,
        likeThread,
        unlikeThread,
        deleteThread,
        deleteReply,
    } = useForumStore()

    const [replyContent, setReplyContent] = useState('')
    const [replyImageUrls, setReplyImageUrls] = useState<string[]>([])
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [replyingTo, setReplyingTo] = useState<string | null>(null)
    const [isLiked, setIsLiked] = useState(false)

    // Load thread and replies
    useEffect(() => {
        if (isInitialized && resolvedParams.id) {
            loadThreadById(resolvedParams.id)
            loadThreadReplies(resolvedParams.id)
        }
    }, [isInitialized, resolvedParams.id, loadThreadById, loadThreadReplies])

    const handleReply = async () => {
        if (!replyContent.trim() || isGuest || !currentThread || !userId) return

        // Get user info from Firebase Auth
        const currentUser = auth.currentUser
        if (!currentUser) return

        const userName = currentUser.displayName || 'Anonymous'
        const userAvatar = currentUser.photoURL || undefined

        setIsSubmitting(true)
        try {
            await replyToThread(
                userId,
                userName,
                userAvatar,
                currentThread.id,
                replyContent,
                replyingTo || undefined,
                replyImageUrls
            )
            setReplyContent('')
            setReplyImageUrls([])
            setReplyingTo(null)
            await loadThreadReplies(currentThread.id)
        } catch (error) {
            console.error('Failed to post reply:', error)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleLike = async () => {
        if (isGuest || !currentThread || !userId) return

        try {
            if (isLiked) {
                await unlikeThread(userId, currentThread.id)
            } else {
                await likeThread(userId, currentThread.id)
            }
            setIsLiked(!isLiked)
            await loadThreadById(currentThread.id)
        } catch (error) {
            console.error('Failed to like thread:', error)
        }
    }

    const handleDelete = async () => {
        if (!currentThread || !userId || currentThread.userId !== userId) return

        if (confirm('Are you sure you want to delete this thread?')) {
            try {
                await deleteThread(userId, currentThread.id)
                router.push('/community?tab=forums')
            } catch (error) {
                console.error('Failed to delete thread:', error)
            }
        }
    }

    const handleDeleteReply = async (replyId: string) => {
        if (!userId) return
        if (confirm('Are you sure you want to delete this reply?')) {
            try {
                await deleteReply(userId, replyId)
                if (currentThread) {
                    await loadThreadReplies(currentThread.id)
                }
            } catch (error) {
                console.error('Failed to delete reply:', error)
            }
        }
    }

    if (isLoadingThreads || !currentThread) {
        return (
            <SubPageLayout title="Loading..." icon={<ChatBubbleLeftIcon className="w-8 h-8" />}>
                <NetflixLoader />
            </SubPageLayout>
        )
    }

    const category = getCategoryInfo(currentThread.category)
    const isOwner = currentThread.userId === userId

    return (
        <SubPageLayout
            title="Discussion"
            icon={<ChatBubbleLeftIcon className="w-8 h-8" />}
            iconColor="text-blue-500"
        >
            {/* Back button */}
            <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
            >
                <ArrowLeftIcon className="w-5 h-5" />
                <span>Back to Community</span>
            </button>

            {/* Thread content */}
            <div className="max-w-4xl mx-auto">
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-6">
                    {/* Header */}
                    <div className="flex items-start gap-4 mb-4">
                        {currentThread.userAvatar ? (
                            <Image
                                src={currentThread.userAvatar}
                                alt={currentThread.userName}
                                width={50}
                                height={50}
                                className="rounded-full"
                            />
                        ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-lg font-bold">
                                {currentThread.userName[0]?.toUpperCase() || '?'}
                            </div>
                        )}

                        <div className="flex-1">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h1 className="text-2xl font-bold text-white mb-2">
                                        {currentThread.title}
                                    </h1>
                                    <div className="flex items-center gap-2 text-sm text-gray-400">
                                        <span>{currentThread.userName}</span>
                                        <span>•</span>
                                        <span>
                                            {formatDistanceToNow(toDate(currentThread.createdAt), {
                                                addSuffix: true,
                                            })}
                                        </span>
                                        {category && (
                                            <>
                                                <span>•</span>
                                                <span className="flex items-center gap-1">
                                                    <span>{category.icon}</span>
                                                    <span className={category.color}>
                                                        {category.name}
                                                    </span>
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {isOwner && (
                                    <button
                                        onClick={handleDelete}
                                        className="px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors flex items-center gap-2"
                                    >
                                        <TrashIcon className="w-5 h-5" />
                                        <span className="text-sm">Delete</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="prose prose-invert max-w-none mb-4">
                        <p className="text-gray-300 whitespace-pre-wrap">{currentThread.content}</p>
                    </div>

                    {/* Images */}
                    {currentThread.images && currentThread.images.length > 0 && (
                        <div
                            className={`grid gap-3 mb-4 ${
                                currentThread.images.length === 1
                                    ? 'grid-cols-1'
                                    : currentThread.images.length === 2
                                      ? 'grid-cols-2'
                                      : 'grid-cols-2 md:grid-cols-3'
                            }`}
                        >
                            {currentThread.images.map((imageUrl, index) => (
                                <div
                                    key={index}
                                    className="relative aspect-video bg-zinc-800 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={() => window.open(imageUrl, '_blank')}
                                >
                                    <Image
                                        src={imageUrl}
                                        alt={`Thread image ${index + 1}`}
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Tags */}
                    {currentThread.tags && currentThread.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                            {currentThread.tags.map((tag) => (
                                <span
                                    key={tag}
                                    className="px-3 py-1 bg-zinc-800 text-gray-400 text-sm rounded-full"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Stats and actions */}
                    <div className="flex items-center gap-4 pt-4 border-t border-zinc-800">
                        <button
                            onClick={handleLike}
                            disabled={isGuest}
                            className="flex items-center gap-2 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                        >
                            {isLiked ? (
                                <HeartSolidIcon className="w-5 h-5 text-red-500" />
                            ) : (
                                <HeartIcon className="w-5 h-5" />
                            )}
                            <span className={isLiked ? 'text-red-500' : ''}>
                                {currentThread.likes}
                            </span>
                        </button>

                        <div className="flex items-center gap-2 text-gray-400">
                            <ChatBubbleLeftIcon className="w-5 h-5" />
                            <span>{currentThread.replyCount}</span>
                        </div>

                        <div className="flex items-center gap-2 text-gray-400">
                            <EyeIcon className="w-5 h-5" />
                            <span>{currentThread.views}</span>
                        </div>
                    </div>
                </div>

                {/* Reply form */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-6">
                    <h2 className="text-xl font-bold text-white mb-4">
                        {replyingTo ? 'Reply to comment' : 'Post a reply'}
                    </h2>

                    {isGuest ? (
                        <p className="text-gray-400 text-center py-8">
                            Please sign in to reply to this thread
                        </p>
                    ) : (
                        <>
                            <textarea
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                                placeholder="Share your thoughts..."
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-4 text-white placeholder-gray-500 resize-none focus:outline-none focus:border-blue-500 transition-colors"
                                rows={4}
                                maxLength={2000}
                            />

                            <div className="mt-4">
                                <ImageUpload
                                    maxImages={4}
                                    onImagesChange={setReplyImageUrls}
                                    storagePath={`forum/threads/${currentThread?.id}/replies`}
                                    disabled={isSubmitting}
                                />
                            </div>

                            <div className="flex items-center justify-between mt-4">
                                <span className="text-sm text-gray-500">
                                    {replyContent.length} / 2000
                                </span>

                                <div className="flex gap-2">
                                    {replyingTo && (
                                        <button
                                            onClick={() => setReplyingTo(null)}
                                            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    )}
                                    <button
                                        onClick={handleReply}
                                        disabled={!replyContent.trim() || isSubmitting}
                                        className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isSubmitting ? 'Posting...' : 'Post Reply'}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Replies */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-white mb-4">
                        Replies ({threadReplies.length})
                    </h2>

                    {threadReplies.length === 0 ? (
                        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 text-center">
                            <ChatBubbleLeftIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                            <p className="text-gray-400">No replies yet. Be the first to reply!</p>
                        </div>
                    ) : (
                        threadReplies.map((reply) => {
                            const isReplyOwner = reply.userId === userId
                            return (
                                <div
                                    key={reply.id}
                                    className="bg-zinc-900 border border-zinc-800 rounded-lg p-4"
                                >
                                    <div className="flex items-start gap-3">
                                        {reply.userAvatar ? (
                                            <Image
                                                src={reply.userAvatar}
                                                alt={reply.userName}
                                                width={40}
                                                height={40}
                                                className="rounded-full"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-sm font-bold">
                                                {reply.userName[0]?.toUpperCase() || '?'}
                                            </div>
                                        )}

                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2 text-sm">
                                                    <span className="font-semibold text-white">
                                                        {reply.userName}
                                                    </span>
                                                    <span className="text-gray-500">
                                                        {formatDistanceToNow(
                                                            toDate(reply.createdAt),
                                                            {
                                                                addSuffix: true,
                                                            }
                                                        )}
                                                    </span>
                                                    {reply.isEdited && (
                                                        <span className="text-xs text-gray-500">
                                                            (edited)
                                                        </span>
                                                    )}
                                                </div>

                                                {(isReplyOwner || isOwner) && (
                                                    <button
                                                        onClick={() => handleDeleteReply(reply.id)}
                                                        className="text-red-400 hover:text-red-300 text-sm"
                                                    >
                                                        Delete
                                                    </button>
                                                )}
                                            </div>

                                            <p className="text-gray-300 whitespace-pre-wrap mb-2">
                                                {reply.content}
                                            </p>

                                            {/* Reply Images */}
                                            {reply.images && reply.images.length > 0 && (
                                                <div
                                                    className={`grid gap-2 mb-3 ${
                                                        reply.images.length === 1
                                                            ? 'grid-cols-1 max-w-xs'
                                                            : 'grid-cols-2'
                                                    }`}
                                                >
                                                    {reply.images.map((imageUrl, index) => (
                                                        <div
                                                            key={index}
                                                            className="relative aspect-video bg-zinc-800 rounded overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                                                            onClick={() =>
                                                                window.open(imageUrl, '_blank')
                                                            }
                                                        >
                                                            <Image
                                                                src={imageUrl}
                                                                alt={`Reply image ${index + 1}`}
                                                                fill
                                                                className="object-cover"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="flex items-center gap-3 text-sm">
                                                <button
                                                    disabled={isGuest}
                                                    className="text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1 disabled:opacity-50"
                                                >
                                                    <HeartIcon className="w-4 h-4" />
                                                    <span>{reply.likes}</span>
                                                </button>

                                                <button
                                                    onClick={() => setReplyingTo(reply.id)}
                                                    disabled={isGuest}
                                                    className="text-gray-400 hover:text-blue-500 transition-colors disabled:opacity-50"
                                                >
                                                    Reply
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </div>
        </SubPageLayout>
    )
}
