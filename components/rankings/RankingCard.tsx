/**
 * RankingCard Component - Bold & Vibrant Edition
 *
 * Displays a ranking in card format with eye-catching gradients,
 * animations, and vibrant visual effects
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Ranking } from '@/types/rankings'
import { getTitle, getPosterPath } from '@/typings'
import {
    HeartIcon,
    ChatBubbleLeftIcon,
    EyeIcon,
    TrophyIcon,
    SparklesIcon,
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'
import { useRankingStore } from '@/stores/rankingStore'
import { useSessionStore } from '@/stores/sessionStore'
import { formatDistanceToNow } from 'date-fns'

interface RankingCardProps {
    ranking: Ranking
    showAuthor?: boolean
    onLike?: (rankingId: string) => void
}

export function RankingCard({ ranking, showAuthor = true, onLike }: RankingCardProps) {
    const router = useRouter()
    const getUserId = useSessionStore((state) => state.getUserId)
    const userId = getUserId()
    const { likeRanking, unlikeRanking } = useRankingStore()
    const [isHovered, setIsHovered] = useState(false)

    // Check if current user liked this ranking
    // TODO: This should come from a likes state or API call
    const isLiked = false

    const handleCardClick = () => {
        router.push(`/rankings/${ranking.id}`)
    }

    const handleLike = async (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()

        if (isLiked) {
            await unlikeRanking(userId, ranking.id)
        } else {
            await likeRanking(userId, ranking.id)
        }

        onLike?.(ranking.id)
    }

    // Get top 3 items to preview
    const topItems = ranking.rankedItems.slice(0, 3)

    // Dynamic gradient based on ranking position/popularity
    const getGradient = () => {
        if (ranking.likes > 100) return 'from-purple-600/20 via-pink-600/20 to-red-600/20'
        if (ranking.likes > 50) return 'from-blue-600/20 via-purple-600/20 to-pink-600/20'
        if (ranking.likes > 20) return 'from-cyan-600/20 via-blue-600/20 to-purple-600/20'
        return 'from-indigo-600/20 via-purple-600/20 to-pink-600/20'
    }

    return (
        <div
            onClick={handleCardClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="group relative cursor-pointer"
        >
            {/* Outer glow effect on hover */}
            <div
                className={`absolute -inset-1 bg-gradient-to-r ${getGradient()} rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500`}
            />

            {/* Main card */}
            <div className="relative bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 rounded-2xl overflow-hidden border-2 border-zinc-800 group-hover:border-transparent transition-all duration-300 transform group-hover:scale-[1.03] group-hover:shadow-2xl">
                {/* Animated background gradient */}
                <div
                    className={`absolute inset-0 bg-gradient-to-br ${getGradient()} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                />

                {/* Content wrapper */}
                <div className="relative">
                    {/* Header with top 3 posters */}
                    {topItems.length > 0 && (
                        <div className="relative h-52 overflow-hidden">
                            {/* Animated gradient background */}
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-pink-900/40 to-red-900/40 animate-gradient-shift" />

                            <div className="absolute inset-0 flex justify-center items-center gap-3 p-5">
                                {topItems.map((item, index) => (
                                    <div
                                        key={item.content.id}
                                        className="relative flex-1 h-full transform transition-all duration-500 group-hover:scale-105"
                                        style={{
                                            transform: `scale(${1 - index * 0.04}) translateY(${index * 4}px) rotateY(${isHovered ? (index - 1) * 5 : 0}deg)`,
                                            zIndex: 3 - index,
                                            transformStyle: 'preserve-3d',
                                        }}
                                    >
                                        {/* Poster glow */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-yellow-500/50 to-transparent blur-lg opacity-0 group-hover:opacity-60 transition-opacity duration-500" />

                                        <Image
                                            src={getPosterPath(item.content)}
                                            alt={getTitle(item.content)}
                                            fill
                                            sizes="(max-width: 768px) 33vw, (max-width: 1200px) 25vw, 200px"
                                            className="object-cover rounded-lg shadow-2xl ring-2 ring-white/10 group-hover:ring-white/30 transition-all duration-300"
                                        />

                                        {/* Animated position badge */}
                                        <div className="absolute -top-3 -left-3 bg-gradient-to-br from-yellow-400 via-yellow-500 to-orange-500 text-black font-black rounded-full w-10 h-10 flex items-center justify-center text-base shadow-lg transform group-hover:rotate-12 group-hover:scale-110 transition-all duration-300 ring-4 ring-yellow-500/30">
                                            <span className="relative z-10">{item.position}</span>
                                            {/* Sparkle effect */}
                                            <SparklesIcon className="absolute inset-0 w-full h-full text-white opacity-0 group-hover:opacity-100 animate-pulse" />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Enhanced gradient overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/60 to-transparent" />

                            {/* Trending badge for popular rankings */}
                            {ranking.likes > 50 && (
                                <div className="absolute top-3 right-3 px-3 py-1.5 bg-gradient-to-r from-orange-500 to-red-500 rounded-full text-xs font-bold text-white shadow-lg flex items-center gap-1 animate-pulse">
                                    <SparklesIcon className="w-3.5 h-3.5" />
                                    <span>TRENDING</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Content section */}
                    <div className="relative p-5 space-y-4">
                        {/* Trophy icon + title */}
                        <div className="flex items-start gap-3">
                            <div className="relative">
                                <TrophyIcon className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-1 drop-shadow-glow-yellow group-hover:scale-110 transition-transform duration-300" />
                                {/* Glow pulse */}
                                <div className="absolute inset-0 w-6 h-6 bg-yellow-400 rounded-full blur-md opacity-0 group-hover:opacity-50 animate-pulse" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-xl font-black text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-yellow-400 group-hover:via-pink-400 group-hover:to-purple-400 transition-all duration-300 line-clamp-2 leading-tight">
                                    {ranking.title}
                                </h3>
                            </div>
                        </div>

                        {/* Description */}
                        {ranking.description && (
                            <p className="text-sm text-gray-300 line-clamp-2 leading-relaxed">
                                {ranking.description}
                            </p>
                        )}

                        {/* Author info */}
                        {showAuthor && (
                            <div className="flex items-center gap-2 text-sm">
                                <Link
                                    href={`/users/${ranking.userId}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="flex items-center gap-2 hover:scale-105 transition-transform duration-200"
                                >
                                    {ranking.userAvatar ? (
                                        <div className="relative">
                                            <Image
                                                src={ranking.userAvatar}
                                                alt={ranking.userName || 'User'}
                                                width={28}
                                                height={28}
                                                className="rounded-full ring-2 ring-purple-500/50"
                                            />
                                            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500/30 to-pink-500/30 blur-sm" />
                                        </div>
                                    ) : (
                                        <div className="relative w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 flex items-center justify-center text-xs font-bold shadow-lg ring-2 ring-purple-500/50">
                                            {ranking.userName?.[0]?.toUpperCase() || '?'}
                                        </div>
                                    )}
                                    <span className="text-gray-200 font-medium hover:text-white transition-colors">
                                        {ranking.userName || 'Unknown User'}
                                    </span>
                                </Link>
                                <span className="text-gray-600">•</span>
                                <span className="text-gray-400 text-xs font-medium">
                                    {formatDistanceToNow(ranking.createdAt, { addSuffix: true })}
                                </span>
                            </div>
                        )}

                        {/* Tags - Vibrant pills */}
                        {ranking.tags && ranking.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {ranking.tags.slice(0, 3).map((tag, index) => {
                                    const tagColors = [
                                        'from-blue-500/20 to-cyan-500/20 text-cyan-300 border-cyan-500/30',
                                        'from-purple-500/20 to-pink-500/20 text-pink-300 border-pink-500/30',
                                        'from-orange-500/20 to-red-500/20 text-orange-300 border-orange-500/30',
                                    ]
                                    return (
                                        <span
                                            key={tag}
                                            className={`px-3 py-1.5 text-xs font-bold bg-gradient-to-r ${tagColors[index % 3]} rounded-full border backdrop-blur-sm hover:scale-105 transition-transform duration-200`}
                                        >
                                            {tag}
                                        </span>
                                    )
                                })}
                                {ranking.tags.length > 3 && (
                                    <span className="px-3 py-1.5 text-xs font-bold text-gray-400 bg-zinc-800/50 rounded-full border border-zinc-700/50">
                                        +{ranking.tags.length - 3}
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Stats & actions - Enhanced with animations */}
                        <div className="flex items-center justify-between pt-3 border-t border-zinc-700/50">
                            <div className="flex items-center gap-4 text-sm">
                                {/* Likes - Animated */}
                                <button
                                    onClick={handleLike}
                                    className="flex items-center gap-1.5 hover:scale-110 transition-all duration-200 group/like"
                                >
                                    {isLiked ? (
                                        <HeartSolidIcon className="w-5 h-5 text-red-500 drop-shadow-glow-red animate-pulse" />
                                    ) : (
                                        <HeartIcon className="w-5 h-5 text-gray-400 group-hover/like:text-red-400 transition-colors" />
                                    )}
                                    <span
                                        className={`font-bold ${isLiked ? 'text-red-400' : 'text-gray-300 group-hover/like:text-red-400'} transition-colors`}
                                    >
                                        {ranking.likes}
                                    </span>
                                </button>

                                {/* Comments */}
                                <div className="flex items-center gap-1.5 text-gray-300 hover:text-blue-400 hover:scale-110 transition-all duration-200">
                                    <ChatBubbleLeftIcon className="w-5 h-5" />
                                    <span className="font-bold">{ranking.comments}</span>
                                </div>

                                {/* Views */}
                                <div className="flex items-center gap-1.5 text-gray-300 hover:text-purple-400 hover:scale-110 transition-all duration-200">
                                    <EyeIcon className="w-5 h-5" />
                                    <span className="font-bold">{ranking.views}</span>
                                </div>
                            </div>

                            {/* Item count - Glowing badge */}
                            <div className="px-3 py-1 text-xs font-bold bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-400 rounded-full border border-yellow-500/30 backdrop-blur-sm">
                                {ranking.rankedItems.length} / {ranking.itemCount}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
