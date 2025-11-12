/**
 * RankingDetail Component
 *
 * Full-page view for a single ranking with:
 * - Complete list of all ranked items
 * - Drag & drop reordering (for owner)
 * - Edit/delete controls (for owner)
 * - Integrated comment section
 * - Like/share functionality
 * - View tracking
 */

'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Ranking } from '@/types/rankings'
import { getTitle, getPosterPath, getYear } from '@/typings'
import { CommentSection } from './CommentSection'
import { useRankingStore } from '@/stores/rankingStore'
import { useSessionStore } from '@/stores/sessionStore'
import { formatDistanceToNow } from 'date-fns'
import {
    HeartIcon,
    ChatBubbleLeftIcon,
    EyeIcon,
    TrophyIcon,
    PencilIcon,
    TrashIcon,
    ShareIcon,
    GlobeAltIcon,
    LockClosedIcon,
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'

interface RankingDetailProps {
    ranking: Ranking
    rankingId: string // Add rankingId prop to avoid re-renders from ranking object changes
    onEdit?: () => void
    onDelete?: () => void
    onShare?: () => void
}

export function RankingDetail({
    ranking,
    rankingId,
    onEdit,
    onDelete,
    onShare,
}: RankingDetailProps) {
    const getUserId = useSessionStore((state) => state.getUserId)
    const userId = getUserId()
    const { likeRanking, unlikeRanking, incrementView, comments, loadComments } = useRankingStore()

    const [isLiked, setIsLiked] = useState(false)
    const [localLikes, setLocalLikes] = useState(ranking.likes)
    const [localViews, setLocalViews] = useState(ranking.views)
    const [isLoadingComments, setIsLoadingComments] = useState(false)

    const isOwner = userId && userId === ranking.userId

    // Track view on mount - use rankingId prop instead of ranking.id to avoid infinite loop
    useEffect(() => {
        let isMounted = true

        if (userId) {
            incrementView(rankingId, userId).then(() => {
                if (isMounted) {
                    setLocalViews((prev) => prev + 1)
                }
            })
        }

        return () => {
            isMounted = false
        }
    }, [userId, rankingId])

    // Load comments
    useEffect(() => {
        let isMounted = true

        const loadData = async () => {
            if (isMounted) {
                setIsLoadingComments(true)
            }
            try {
                await loadComments(ranking.id)
            } catch (error) {
                console.error('Failed to load comments:', error)
            } finally {
                if (isMounted) {
                    setIsLoadingComments(false)
                }
            }
        }
        loadData()

        return () => {
            isMounted = false
        }
    }, [ranking.id])

    const handleLike = async () => {
        if (!userId) return

        if (isLiked) {
            await unlikeRanking(userId, ranking.id)
            setIsLiked(false)
            setLocalLikes((prev) => prev - 1)
        } else {
            await likeRanking(userId, ranking.id)
            setIsLiked(true)
            setLocalLikes((prev) => prev + 1)
        }
    }

    const handleDelete = () => {
        if (
            confirm('Are you sure you want to delete this ranking? This action cannot be undone.')
        ) {
            onDelete?.()
        }
    }

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: ranking.title,
                    text: ranking.description || `Check out my ranking: ${ranking.title}`,
                    url: window.location.href,
                })
            } catch (error) {
                // User cancelled or share failed
                console.log('Share cancelled', error)
            }
        } else {
            // Fallback: copy to clipboard
            await navigator.clipboard.writeText(window.location.href)
            onShare?.()
        }
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            {/* Header Section */}
            <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
                {/* Title and actions */}
                <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <TrophyIcon className="w-8 h-8 text-yellow-500" />
                            <h1 className="text-3xl font-bold text-white">{ranking.title}</h1>
                        </div>
                        {ranking.description && (
                            <p className="text-gray-400 text-lg">{ranking.description}</p>
                        )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2">
                        {isOwner && (
                            <>
                                <button
                                    onClick={onEdit}
                                    className="p-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                                    title="Edit ranking"
                                >
                                    <PencilIcon className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="p-2 bg-zinc-800 hover:bg-red-900 text-white rounded-lg transition-colors"
                                    title="Delete ranking"
                                >
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                            </>
                        )}
                        <button
                            onClick={handleShare}
                            className="p-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                            title="Share ranking"
                        >
                            <ShareIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Author info */}
                <div className="flex items-center gap-3 mb-4">
                    {ranking.userAvatar ? (
                        <Image
                            src={ranking.userAvatar}
                            alt={ranking.userName || 'User'}
                            width={40}
                            height={40}
                            className="rounded-full"
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold">
                            {ranking.userName?.[0]?.toUpperCase() || '?'}
                        </div>
                    )}
                    <div>
                        <Link
                            href={`/users/${ranking.userId}`}
                            className="text-white font-medium hover:text-yellow-400 transition-colors"
                        >
                            {ranking.userName || 'Unknown User'}
                        </Link>
                        <p className="text-sm text-gray-500">
                            {formatDistanceToNow(ranking.createdAt, { addSuffix: true })}
                            {ranking.updatedAt !== ranking.createdAt && ' (edited)'}
                        </p>
                    </div>
                </div>

                {/* Tags */}
                {ranking.tags && ranking.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                        {ranking.tags.map((tag) => (
                            <span
                                key={tag}
                                className="px-3 py-1 text-sm font-medium bg-zinc-800 text-gray-300 rounded-full"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                )}

                {/* Stats */}
                <div className="flex items-center gap-6 pt-4 border-t border-zinc-800">
                    {/* Like button */}
                    <button
                        onClick={handleLike}
                        disabled={!userId}
                        className="flex items-center gap-2 text-gray-400 hover:text-red-500 disabled:cursor-not-allowed transition-colors"
                    >
                        {isLiked ? (
                            <HeartSolidIcon className="w-6 h-6 text-red-500" />
                        ) : (
                            <HeartIcon className="w-6 h-6" />
                        )}
                        <span className={`font-medium ${isLiked ? 'text-red-500' : ''}`}>
                            {localLikes}
                        </span>
                    </button>

                    {/* Comments count */}
                    <div className="flex items-center gap-2 text-gray-400">
                        <ChatBubbleLeftIcon className="w-6 h-6" />
                        <span className="font-medium">{ranking.comments}</span>
                    </div>

                    {/* Views count */}
                    <div className="flex items-center gap-2 text-gray-400">
                        <EyeIcon className="w-6 h-6" />
                        <span className="font-medium">{localViews}</span>
                    </div>

                    {/* Privacy indicator */}
                    <div className="flex items-center gap-2 text-gray-400 ml-auto">
                        {ranking.isPublic ? (
                            <>
                                <GlobeAltIcon className="w-5 h-5" />
                                <span className="text-sm">Public</span>
                            </>
                        ) : (
                            <>
                                <LockClosedIcon className="w-5 h-5" />
                                <span className="text-sm">Private</span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Ranked Items List */}
            <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
                <h2 className="text-2xl font-bold text-white mb-6">
                    Ranked Items ({ranking.rankedItems.length} of {ranking.itemCount})
                </h2>

                <div className="space-y-4">
                    {ranking.rankedItems.map((item) => (
                        <div
                            key={item.content.id}
                            className="group flex items-center gap-4 bg-zinc-800 hover:bg-zinc-750 rounded-lg p-4 transition-colors"
                        >
                            {/* Position number */}
                            <div className="flex-shrink-0 w-12 h-12 bg-yellow-500 text-black font-bold rounded-full flex items-center justify-center text-xl">
                                {item.position}
                            </div>

                            {/* Poster */}
                            <div className="relative w-16 h-24 flex-shrink-0">
                                <Image
                                    src={getPosterPath(item.content)}
                                    alt={getTitle(item.content)}
                                    fill
                                    sizes="64px"
                                    className="object-cover rounded-md"
                                />
                            </div>

                            {/* Content info */}
                            <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-bold text-white group-hover:text-yellow-400 transition-colors truncate">
                                    {getTitle(item.content)}
                                </h3>
                                <p className="text-sm text-gray-400">
                                    {getYear(item.content)} •{' '}
                                    {item.content.media_type === 'movie' ? 'Movie' : 'TV Show'}
                                </p>
                                {item.note && (
                                    <p className="text-sm text-gray-300 mt-1 line-clamp-2">
                                        {item.note}
                                    </p>
                                )}
                            </div>

                            {/* Rating if available */}
                            {item.content.vote_average && (
                                <div className="flex-shrink-0 text-gray-400">
                                    <div className="flex items-center gap-1">
                                        <span className="text-yellow-400">★</span>
                                        <span className="font-medium">
                                            {item.content.vote_average.toFixed(1)}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Show message if not all items are ranked yet */}
                {ranking.rankedItems.length < ranking.itemCount && (
                    <div className="mt-6 p-4 bg-zinc-800 rounded-lg text-center">
                        <p className="text-gray-400">
                            {isOwner
                                ? `You still need to add ${ranking.itemCount - ranking.rankedItems.length} more ${ranking.itemCount - ranking.rankedItems.length === 1 ? 'item' : 'items'} to complete this ranking.`
                                : `This ranking is incomplete. ${ranking.itemCount - ranking.rankedItems.length} more ${ranking.itemCount - ranking.rankedItems.length === 1 ? 'item' : 'items'} to be added.`}
                        </p>
                    </div>
                )}
            </div>

            {/* Comments Section */}
            <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
                <h2 className="text-2xl font-bold text-white mb-6">
                    Comments ({ranking.comments})
                </h2>
                <CommentSection
                    rankingId={ranking.id}
                    rankingOwnerId={ranking.userId}
                    comments={comments || []}
                    isLoading={isLoadingComments}
                />
            </div>
        </div>
    )
}
