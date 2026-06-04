/**
 * RankingDetail Component - Cinematic Netflix-Inspired Edition
 *
 * Full-page view for a single ranking with:
 * - Cinematic hero section with blurred poster collage
 * - Gold trophy icon with shimmer effect
 * - Large cinematic title with text glow
 * - Glassy metadata card with inner shadow
 * - Metallic gold rank badges with shine/bevel
 * - Neon-style rating badges
 * - Slide-in animations for items
 * - Premium Netflix-like production value
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
import useAuth from '@/hooks/useAuth'
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
    StarIcon,
    ClockIcon,
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'

interface RankingDetailProps {
    ranking: Ranking
    rankingId: string
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
    const { user } = useAuth()
    const userName = user?.displayName || user?.email?.split('@')[0] || 'Anonymous'
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
            await likeRanking(userId, ranking.id, userName)
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
                console.log('Share cancelled', error)
            }
        } else {
            await navigator.clipboard.writeText(window.location.href)
            onShare?.()
        }
    }

    // Get first 5 posters for blurred background collage
    const backgroundPosters = ranking.rankedItems.slice(0, 5)

    return (
        <div className="relative max-w-6xl mx-auto -mt-8">
            {/* Cinematic Hero Section with Blurred Poster Collage */}
            <div className="relative mb-8 rounded-2xl overflow-hidden">
                {/* Blurred Poster Collage Background */}
                <div className="absolute inset-0">
                    <div className="absolute inset-0 flex">
                        {backgroundPosters.map((item, index) => (
                            <div
                                key={item.content.id}
                                className="flex-1 relative"
                                style={{ opacity: 0.4 - index * 0.05 }}
                            >
                                <Image
                                    src={getPosterPath(item.content)}
                                    alt=""
                                    fill
                                    sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
                                    className="object-cover blur-xl scale-110"
                                    priority={index === 0}
                                />
                            </div>
                        ))}
                    </div>
                    {/* Dark overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-zinc-900/90 to-black/95" />
                </div>

                {/* Hero Content */}
                <div className="relative z-10 p-8 lg:p-12">
                    {/* Trophy Icon */}
                    <div className="flex justify-center mb-6">
                        <div className="p-4 rounded-full bg-zinc-800/50 border border-zinc-700">
                            <TrophyIcon className="w-12 h-12 text-yellow-500" />
                        </div>
                    </div>

                    {/* Title */}
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-center mb-4 text-white">
                        {ranking.title}
                    </h1>

                    {/* Description */}
                    {ranking.description && (
                        <p className="text-lg text-gray-300 text-center max-w-3xl mx-auto mb-8 leading-relaxed">
                            {ranking.description}
                        </p>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-center gap-3 mb-8">
                        {isOwner && (
                            <>
                                <button
                                    onClick={onEdit}
                                    className="group p-3 bg-zinc-800/80 hover:bg-zinc-700 backdrop-blur-sm text-white rounded-xl transition-all duration-300 border border-zinc-700/50 hover:border-yellow-500/50"
                                    title="Edit ranking"
                                >
                                    <PencilIcon className="w-5 h-5 group-hover:text-yellow-400 transition-colors" />
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="group p-3 bg-zinc-800/80 hover:bg-red-900/80 backdrop-blur-sm text-white rounded-xl transition-all duration-300 border border-zinc-700/50 hover:border-red-500/50"
                                    title="Delete ranking"
                                >
                                    <TrashIcon className="w-5 h-5 group-hover:text-red-400 transition-colors" />
                                </button>
                            </>
                        )}
                        {!isOwner && userId && (
                            <button
                                onClick={onClone}
                                className="group p-3 bg-blue-600/80 hover:bg-blue-500 backdrop-blur-sm text-white rounded-xl transition-all duration-300 border border-blue-500/50"
                                title="Clone this ranking to your account"
                            >
                                <DocumentDuplicateIcon className="w-5 h-5" />
                            </button>
                        )}
                        <button
                            onClick={handleShare}
                            className="group p-3 bg-zinc-800/80 hover:bg-zinc-700 backdrop-blur-sm text-white rounded-xl transition-all duration-300 border border-zinc-700/50 hover:border-cyan-500/50"
                            title="Share ranking"
                        >
                            <ShareIcon className="w-5 h-5 group-hover:text-cyan-400 transition-colors" />
                        </button>
                    </div>

                    {/* Glassy Metadata Card */}
                    <div className="max-w-2xl mx-auto bg-zinc-900/60 backdrop-blur-xl rounded-2xl border border-zinc-800/50 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                        {/* Author info */}
                        <div className="flex items-center gap-4 mb-4">
                            {ranking.userAvatar ? (
                                <Image
                                    src={ranking.userAvatar}
                                    alt={ranking.userName || 'User'}
                                    width={48}
                                    height={48}
                                    className="rounded-full ring-2 ring-yellow-500/30"
                                />
                            ) : (
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center font-bold text-lg text-black shadow-lg">
                                    {ranking.userName?.[0]?.toUpperCase() || '?'}
                                </div>
                            )}
                            <div>
                                <Link
                                    href={`/users/${ranking.userUsername || ranking.userId}`}
                                    className="text-white font-semibold text-lg hover:text-yellow-400 transition-colors"
                                >
                                    {ranking.userName || 'Unknown User'}
                                </Link>
                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                    <ClockIcon className="w-4 h-4" />
                                    <span>
                                        {formatDistanceToNow(ranking.createdAt, {
                                            addSuffix: true,
                                        })}
                                        {ranking.updatedAt !== ranking.createdAt && ' (edited)'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Gradient divider */}
                        <div className="h-px bg-gradient-to-r from-transparent via-zinc-700/50 to-transparent mb-4" />

                        {/* Stats */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-6">
                                {/* Like button */}
                                <button
                                    onClick={handleLike}
                                    disabled={!userId}
                                    className="group flex items-center gap-2 disabled:cursor-not-allowed transition-all duration-300 hover:scale-110"
                                >
                                    {isLiked ? (
                                        <HeartSolidIcon className="w-6 h-6 text-red-500" />
                                    ) : (
                                        <HeartIcon className="w-6 h-6 text-gray-400 group-hover:text-red-400 transition-colors" />
                                    )}
                                    <span
                                        className={`font-semibold ${isLiked ? 'text-red-400' : 'text-gray-400 group-hover:text-red-400'}`}
                                    >
                                        {localLikes}
                                    </span>
                                </button>

                                {/* Comments count */}
                                <div className="group flex items-center gap-2 transition-all duration-300 hover:scale-110">
                                    <ChatBubbleLeftIcon className="w-6 h-6 text-gray-400 group-hover:text-blue-400 transition-colors" />
                                    <span className="font-semibold text-gray-400 group-hover:text-blue-400 transition-colors">
                                        {ranking.comments}
                                    </span>
                                </div>

                                {/* Views count */}
                                <div className="group flex items-center gap-2 transition-all duration-300 hover:scale-110">
                                    <EyeIcon className="w-6 h-6 text-gray-400 group-hover:text-cyan-400 transition-colors" />
                                    <span className="font-semibold text-gray-400 group-hover:text-cyan-400 transition-colors">
                                        {localViews}
                                    </span>
                                </div>
                            </div>

                            {/* Privacy indicator */}
                            <div
                                className={`flex items-center gap-2 px-4 py-2 rounded-full border ${
                                    ranking.isPublic
                                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                        : 'bg-zinc-800/80 border-zinc-700 text-gray-400'
                                }`}
                            >
                                {ranking.isPublic ? (
                                    <>
                                        <GlobeAltIcon className="w-4 h-4" />
                                        <span className="text-sm font-medium">Public</span>
                                    </>
                                ) : (
                                    <>
                                        <LockClosedIcon className="w-4 h-4" />
                                        <span className="text-sm font-medium">Private</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Ranked Items List */}
            <div className="relative bg-zinc-900/60 backdrop-blur-xl rounded-2xl p-6 lg:p-8 border border-zinc-800/50 mb-8">
                {/* Section Header */}
                <div className="flex items-center gap-3 mb-8">
                    <TrophyIcon className="w-8 h-8 text-yellow-500" />
                    <h2 className="text-2xl font-bold text-white">
                        Ranked Items{' '}
                        <span className="text-gray-500 font-normal">
                            ({ranking.rankedItems.length} of {ranking.itemCount})
                        </span>
                    </h2>
                </div>

                <div className="space-y-4">
                    {ranking.rankedItems.map((item, index) => (
                        <div
                            key={item.content.id}
                            className="group relative flex items-start gap-4 lg:gap-6 bg-zinc-800/60 hover:bg-zinc-800/80 rounded-2xl p-4 lg:p-5 transition-all duration-300 border border-zinc-700/30 hover:border-zinc-600 animate-slideIn"
                            style={{
                                animationDelay: `${index * 100}ms`,
                                animationFillMode: 'both',
                            }}
                        >
                            {/* Rank Badge */}
                            <div className="absolute -left-3 -top-3 z-20">
                                <div className="w-14 h-14 flex items-center justify-center rounded-xl shadow-lg bg-gradient-to-br from-yellow-500 to-yellow-600 border border-yellow-400">
                                    <span className="text-xl font-black text-black">
                                        #{item.position}
                                    </span>
                                </div>
                            </div>

                            {/* Poster */}
                            <div className="relative w-24 lg:w-28 h-36 lg:h-40 flex-shrink-0 ml-10">
                                <Image
                                    src={getPosterPath(item.content)}
                                    alt={getTitle(item.content)}
                                    fill
                                    sizes="112px"
                                    className="object-cover rounded-xl shadow-lg ring-1 ring-zinc-700 group-hover:ring-zinc-600 transition-all duration-300"
                                />
                            </div>

                            {/* Content info */}
                            <div className="flex-1 min-w-0 pt-2">
                                <div className="flex items-start justify-between gap-4 mb-2">
                                    <h3 className="text-xl lg:text-2xl font-bold text-white transition-colors duration-300 leading-tight">
                                        {getTitle(item.content)}
                                    </h3>

                                    {/* Rating Badge */}
                                    {item.content.vote_average && (
                                        <div className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900/80 rounded-full border border-yellow-600/30">
                                            <StarIcon className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                            <span className="font-bold text-yellow-400">
                                                {item.content.vote_average.toFixed(1)}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-3 text-sm text-gray-400 mb-3">
                                    <span className="font-medium text-gray-300">
                                        {getYear(item.content)}
                                    </span>
                                    <span className="w-1 h-1 rounded-full bg-gray-600" />
                                    <span
                                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                            item.content.media_type === 'movie'
                                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                                : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                        }`}
                                    >
                                        {item.content.media_type === 'movie' ? 'Movie' : 'TV Show'}
                                    </span>
                                </div>

                                {item.note && (
                                    <p className="text-sm text-gray-300 leading-relaxed bg-zinc-900/50 rounded-lg p-3 border border-zinc-700/30">
                                        "{item.note}"
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Show message if not all items are ranked yet */}
                {ranking.rankedItems.length < ranking.itemCount && (
                    <div className="mt-6 p-4 bg-zinc-800/50 rounded-xl border border-zinc-700/30 text-center">
                        <p className="text-gray-400">
                            {isOwner
                                ? `You still need to add ${ranking.itemCount - ranking.rankedItems.length} more ${ranking.itemCount - ranking.rankedItems.length === 1 ? 'item' : 'items'} to complete this ranking.`
                                : `This ranking is incomplete. ${ranking.itemCount - ranking.rankedItems.length} more ${ranking.itemCount - ranking.rankedItems.length === 1 ? 'item' : 'items'} to be added.`}
                        </p>
                    </div>
                )}
            </div>

            {/* Comments Section */}
            <div className="relative bg-zinc-900/60 backdrop-blur-xl rounded-2xl p-6 lg:p-8 border border-zinc-800/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                <div className="flex items-center gap-3 mb-8">
                    <ChatBubbleLeftIcon className="w-8 h-8 text-blue-400" />
                    <h2 className="text-2xl font-bold text-white">
                        Comments{' '}
                        <span className="text-gray-500 font-normal">({ranking.comments})</span>
                    </h2>
                </div>
                <CommentSection
                    rankingId={ranking.id}
                    rankingOwnerId={ranking.userId}
                    comments={comments || []}
                    isLoading={isLoadingComments}
                />
            </div>

            {/* Keyframe animations */}
            <style jsx>{`
                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateX(-20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }

                :global(.animate-slideIn) {
                    animation: slideIn 0.5s ease-out;
                }
            `}</style>
        </div>
    )
}
