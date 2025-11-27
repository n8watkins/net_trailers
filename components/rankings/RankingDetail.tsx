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
import { hasUserLikedRanking } from '@/utils/firestore/rankings'
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
    DocumentDuplicateIcon,
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'

interface RankingDetailProps {
    ranking: Ranking
    rankingId: string // Add rankingId prop to avoid re-renders from ranking object changes
    onEdit?: () => void
    onDelete?: () => void
    onShare?: () => void
    onClone?: () => void
}

export function RankingDetail({
    ranking,
    rankingId,
    onEdit,
    onDelete,
    onShare,
    onClone,
}: RankingDetailProps) {
    const getUserId = useSessionStore((state) => state.getUserId)
    const userId = getUserId()
    const comments = useRankingStore((state) => state.comments)
    const { likeRanking, unlikeRanking, incrementView, loadComments } = useRankingStore()

    const [isLiked, setIsLiked] = useState(false)
    const [localLikes, setLocalLikes] = useState(ranking.likes)
    const [localViews, setLocalViews] = useState(ranking.views)
    const [isLoadingComments, setIsLoadingComments] = useState(false)

    const isOwner = userId && userId === ranking.userId

    // Check if user has already liked this ranking
    useEffect(() => {
        let isMounted = true

        const checkLikeStatus = async () => {
            if (!userId) return
            try {
                const liked = await hasUserLikedRanking(userId, rankingId)
                if (isMounted) {
                    setIsLiked(liked)
                }
            } catch (error) {
                console.error('Failed to check like status:', error)
            }
        }

        checkLikeStatus()

        return () => {
            isMounted = false
        }
    }, [userId, rankingId])

    // Track view on mount - only increment if not owner
    useEffect(() => {
        let isMounted = true

        // Only increment view if user is logged in and is not the owner
        if (userId && userId !== ranking.userId) {
            incrementView(rankingId, userId).then(() => {
                if (isMounted) {
                    setLocalViews((prev) => prev + 1)
                }
            })
        }

        return () => {
            isMounted = false
        }
    }, [userId, rankingId, ranking.userId])

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
                                    className="p-2 sm:p-2.5 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors flex items-center justify-center"
                                    title="Edit ranking"
                                >
                                    <PencilIcon className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="p-2 sm:p-2.5 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 bg-zinc-800 hover:bg-red-900 text-white rounded-lg transition-colors flex items-center justify-center"
                                    title="Delete ranking"
                                >
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                            </>
                        )}
                        {!isOwner && userId && (
                            <button
                                onClick={onClone}
                                className="p-2 sm:p-2.5 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors flex items-center justify-center"
                                title="Clone this ranking to your account"
                            >
                                <DocumentDuplicateIcon className="w-5 h-5" />
                            </button>
                        )}
                        <button
                            onClick={handleShare}
                            className="p-2 sm:p-2.5 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors flex items-center justify-center"
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
                            href={`/users/${ranking.userUsername || ranking.userId}`}
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

                <div className="space-y-3">
                    {ranking.rankedItems.map((item) => (
                        <div
                            key={item.content.id}
                            className="group relative flex items-start gap-4 bg-zinc-800 hover:bg-zinc-750 rounded-lg p-4 transition-colors border border-zinc-700 hover:border-zinc-600"
                        >
                            {/* Position number - IMDb style with gradient background */}
                            <div className="relative flex-shrink-0">
                                <div className="absolute -left-2 -top-2 w-16 h-16 bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 rounded-tl-lg rounded-br-3xl shadow-lg flex items-center justify-center">
                                    <span className="text-2xl font-black text-black drop-shadow-md">
                                        {item.position}
                                    </span>
                                </div>
                            </div>

                            {/* Poster - Larger like IMDb */}
                            <div className="relative w-24 h-36 flex-shrink-0 ml-12">
                                <Image
                                    src={getPosterPath(item.content)}
                                    alt={getTitle(item.content)}
                                    fill
                                    sizes="96px"
                                    className="object-cover rounded-md shadow-md"
                                />
                                {/* Checkmark overlay like IMDb */}
                                <div className="absolute -top-2 -left-2 w-8 h-8 bg-yellow-500 rounded-sm flex items-center justify-center shadow-lg">
                                    <svg
                                        className="w-5 h-5 text-black"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={3}
                                            d="M5 13l4 4L19 7"
                                        />
                                    </svg>
                                </div>
                            </div>

                            {/* Content info */}
                            <div className="flex-1 min-w-0 pt-1">
                                <div className="flex items-start justify-between gap-4 mb-2">
                                    <h3 className="text-xl font-bold text-white group-hover:text-yellow-400 transition-colors">
                                        {getTitle(item.content)}
                                    </h3>
                                    {/* Rating if available */}
                                    {item.content.vote_average && (
                                        <div className="flex-shrink-0 flex items-center gap-1 bg-zinc-900 px-2 py-1 rounded">
                                            <span className="text-yellow-400 text-lg">★</span>
                                            <span className="font-bold text-white">
                                                {item.content.vote_average.toFixed(1)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                                    <span className="font-medium">{getYear(item.content)}</span>
                                    <span>•</span>
                                    <span>
                                        {item.content.media_type === 'movie' ? 'Movie' : 'TV Show'}
                                    </span>
                                </div>
                                {item.note && (
                                    <p className="text-sm text-gray-300 mt-2 leading-relaxed">
                                        {item.note}
                                    </p>
                                )}
                            </div>
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
