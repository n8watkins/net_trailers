/**
 * CommentSection Component
 *
 * Displays comments with one level of replies
 * Handles creating, deleting, and liking comments
 */

'use client'

import { useState } from 'react'
import Image from 'next/image'
import { RankingComment } from '@/types/rankings'
import { useRankingStore } from '@/stores/rankingStore'
import { useSessionStore } from '@/stores/sessionStore'
import { useProfileStore } from '@/stores/profileStore'
import { formatDistanceToNow } from 'date-fns'
import {
    HeartIcon,
    ChatBubbleLeftIcon,
    TrashIcon,
    PaperAirplaneIcon,
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'

interface CommentSectionProps {
    rankingId: string
    rankingOwnerId: string
    comments: RankingComment[]
    isLoading?: boolean
}

export function CommentSection({
    rankingId,
    rankingOwnerId,
    comments,
    isLoading = false,
}: CommentSectionProps) {
    const getUserId = useSessionStore((state) => state.getUserId)
    const userId = getUserId()
    const { profile } = useProfileStore()
    const { createComment, deleteComment, likeComment, unlikeComment } = useRankingStore()

    const [newCommentText, setNewCommentText] = useState('')
    const [replyingTo, setReplyingTo] = useState<string | null>(null)
    const [replyText, setReplyText] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSubmitComment = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!userId || !profile || !newCommentText.trim()) return

        setIsSubmitting(true)
        try {
            await createComment(userId, profile.username, profile.avatarUrl, {
                rankingId,
                type: 'ranking',
                text: newCommentText.trim(),
            })
            setNewCommentText('')
        } catch (error) {
            console.error('Failed to create comment:', error)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleSubmitReply = async (parentCommentId: string) => {
        if (!userId || !profile || !replyText.trim()) return

        setIsSubmitting(true)
        try {
            await createComment(userId, profile.username, profile.avatarUrl, {
                rankingId,
                type: 'ranking',
                text: replyText.trim(),
                parentCommentId,
            })
            setReplyText('')
            setReplyingTo(null)
        } catch (error) {
            console.error('Failed to create reply:', error)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDeleteComment = async (commentId: string) => {
        if (!userId) return

        if (confirm('Are you sure you want to delete this comment?')) {
            await deleteComment(userId, commentId, rankingOwnerId)
        }
    }

    const handleLikeComment = async (commentId: string) => {
        if (!userId) return
        await likeComment(userId, commentId)
    }

    const canDelete = (comment: RankingComment) => {
        return userId && (comment.userId === userId || rankingOwnerId === userId)
    }

    if (isLoading) {
        return (
            <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="animate-pulse">
                        <div className="flex gap-3">
                            <div className="w-10 h-10 rounded-full bg-zinc-800" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-zinc-800 rounded w-1/4" />
                                <div className="h-16 bg-zinc-800 rounded" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Comment input */}
            {userId && profile ? (
                <form onSubmit={handleSubmitComment} className="flex gap-3">
                    {profile.avatarUrl ? (
                        <Image
                            src={profile.avatarUrl}
                            alt={profile.username}
                            width={40}
                            height={40}
                            className="rounded-full"
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold">
                            {profile.username[0].toUpperCase()}
                        </div>
                    )}
                    <div className="flex-1">
                        <textarea
                            value={newCommentText}
                            onChange={(e) => setNewCommentText(e.target.value)}
                            placeholder="Add a comment..."
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 resize-none"
                            rows={3}
                            maxLength={500}
                        />
                        <div className="flex justify-between items-center mt-2">
                            <span className="text-sm text-gray-500">
                                {newCommentText.length}/500
                            </span>
                            <button
                                type="submit"
                                disabled={!newCommentText.trim() || isSubmitting}
                                className="px-4 py-2 bg-yellow-500 text-black font-medium rounded-lg hover:bg-yellow-400 disabled:bg-zinc-800 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                            >
                                <PaperAirplaneIcon className="w-4 h-4" />
                                {isSubmitting ? 'Posting...' : 'Post'}
                            </button>
                        </div>
                    </div>
                </form>
            ) : (
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-6 py-4 text-center">
                    <p className="text-gray-400">Sign in to comment on this ranking</p>
                </div>
            )}

            {/* Comments list */}
            <div className="space-y-6">
                {comments.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        No comments yet. Be the first to comment!
                    </div>
                ) : (
                    comments.map((comment) => (
                        <div key={comment.id} className="space-y-4">
                            {/* Main comment */}
                            <div className="flex gap-3">
                                {comment.userAvatar ? (
                                    <Image
                                        src={comment.userAvatar}
                                        alt={comment.userName}
                                        width={40}
                                        height={40}
                                        className="rounded-full"
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center font-bold">
                                        {comment.userName[0].toUpperCase()}
                                    </div>
                                )}
                                <div className="flex-1 space-y-2">
                                    {/* Comment header */}
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-white">
                                            {comment.userName}
                                        </span>
                                        <span className="text-gray-600">•</span>
                                        <span className="text-sm text-gray-500">
                                            {formatDistanceToNow(comment.createdAt, {
                                                addSuffix: true,
                                            })}
                                        </span>
                                    </div>

                                    {/* Comment text */}
                                    <p className="text-gray-300">{comment.text}</p>

                                    {/* Comment actions */}
                                    <div className="flex items-center gap-4 text-sm">
                                        <button
                                            onClick={() => handleLikeComment(comment.id)}
                                            disabled={!userId}
                                            className="flex items-center gap-1 text-gray-400 hover:text-red-500 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <HeartIcon className="w-4 h-4" />
                                            <span>{comment.likes}</span>
                                        </button>

                                        {userId && (
                                            <button
                                                onClick={() => setReplyingTo(comment.id)}
                                                className="flex items-center gap-1 text-gray-400 hover:text-yellow-500 transition-colors"
                                            >
                                                <ChatBubbleLeftIcon className="w-4 h-4" />
                                                <span>Reply</span>
                                            </button>
                                        )}

                                        {canDelete(comment) && (
                                            <button
                                                onClick={() => handleDeleteComment(comment.id)}
                                                className="flex items-center gap-1 text-gray-400 hover:text-red-500 transition-colors"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                                <span>Delete</span>
                                            </button>
                                        )}
                                    </div>

                                    {/* Reply input */}
                                    {replyingTo === comment.id && (
                                        <div className="mt-3 flex gap-2">
                                            <input
                                                type="text"
                                                value={replyText}
                                                onChange={(e) => setReplyText(e.target.value)}
                                                placeholder="Write a reply..."
                                                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500"
                                                maxLength={500}
                                                autoFocus
                                            />
                                            <button
                                                onClick={() => handleSubmitReply(comment.id)}
                                                disabled={!replyText.trim() || isSubmitting}
                                                className="px-3 py-2 bg-yellow-500 text-black text-sm font-medium rounded-lg hover:bg-yellow-400 disabled:bg-zinc-800 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
                                            >
                                                Reply
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setReplyingTo(null)
                                                    setReplyText('')
                                                }}
                                                className="px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Replies (one level deep) */}
                            {comment.replies && comment.replies.length > 0 && (
                                <div className="ml-12 space-y-4">
                                    {comment.replies.map((reply) => (
                                        <div key={reply.id} className="flex gap-3">
                                            {reply.userAvatar ? (
                                                <Image
                                                    src={reply.userAvatar}
                                                    alt={reply.userName}
                                                    width={32}
                                                    height={32}
                                                    className="rounded-full"
                                                />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center text-sm font-bold">
                                                    {reply.userName[0].toUpperCase()}
                                                </div>
                                            )}
                                            <div className="flex-1 space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-white text-sm">
                                                        {reply.userName}
                                                    </span>
                                                    <span className="text-gray-600">•</span>
                                                    <span className="text-xs text-gray-500">
                                                        {formatDistanceToNow(reply.createdAt, {
                                                            addSuffix: true,
                                                        })}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-300">
                                                    {reply.text}
                                                </p>
                                                <div className="flex items-center gap-4 text-xs">
                                                    <button
                                                        onClick={() => handleLikeComment(reply.id)}
                                                        disabled={!userId}
                                                        className="flex items-center gap-1 text-gray-400 hover:text-red-500 disabled:cursor-not-allowed transition-colors"
                                                    >
                                                        <HeartIcon className="w-3 h-3" />
                                                        <span>{reply.likes}</span>
                                                    </button>
                                                    {canDelete(reply) && (
                                                        <button
                                                            onClick={() =>
                                                                handleDeleteComment(reply.id)
                                                            }
                                                            className="flex items-center gap-1 text-gray-400 hover:text-red-500 transition-colors"
                                                        >
                                                            <TrashIcon className="w-3 h-3" />
                                                            <span>Delete</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
