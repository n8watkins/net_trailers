/**
 * RankingCard Component
 *
 * Displays a ranking in card format for grids/lists
 * Shows title, creator, stats, and preview of top items
 */

'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Ranking } from '@/types/rankings'
import { getTitle, getPosterPath } from '@/typings'
import { HeartIcon, ChatBubbleLeftIcon, EyeIcon, TrophyIcon } from '@heroicons/react/24/outline'
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
    const getUserId = useSessionStore((state) => state.getUserId)
    const userId = getUserId()
    const { likeRanking, unlikeRanking } = useRankingStore()

    // Check if current user liked this ranking
    // TODO: This should come from a likes state or API call
    const isLiked = false

    const handleLike = async (e: React.MouseEvent) => {
        e.preventDefault() // Prevent navigation
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

    return (
        <Link href={`/rankings/${ranking.id}`}>
            <div className="group relative bg-zinc-900 rounded-lg overflow-hidden hover:bg-zinc-800 transition-all duration-200 hover:scale-[1.02] cursor-pointer border border-zinc-800 hover:border-zinc-700">
                {/* Header with top 3 posters */}
                {topItems.length > 0 && (
                    <div className="relative h-48 bg-gradient-to-b from-zinc-800 to-zinc-900">
                        <div className="absolute inset-0 flex justify-center items-center gap-2 p-4">
                            {topItems.map((item, index) => (
                                <div
                                    key={item.content.id}
                                    className="relative flex-1 h-full"
                                    style={{
                                        transform: `scale(${1 - index * 0.05}) translateY(${index * 4}px)`,
                                        zIndex: 3 - index,
                                    }}
                                >
                                    <Image
                                        src={getPosterPath(item.content)}
                                        alt={getTitle(item.content)}
                                        fill
                                        className="object-cover rounded-md"
                                    />
                                    {/* Position badge */}
                                    <div className="absolute -top-2 -left-2 bg-yellow-500 text-black font-bold rounded-full w-8 h-8 flex items-center justify-center text-sm shadow-lg">
                                        {item.position}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/50 to-transparent" />
                    </div>
                )}

                {/* Content */}
                <div className="p-4 space-y-3">
                    {/* Trophy icon + title */}
                    <div className="flex items-start gap-2">
                        <TrophyIcon className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-1" />
                        <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-bold text-white group-hover:text-yellow-400 transition-colors line-clamp-2">
                                {ranking.title}
                            </h3>
                        </div>
                    </div>

                    {/* Description */}
                    {ranking.description && (
                        <p className="text-sm text-gray-400 line-clamp-2">{ranking.description}</p>
                    )}

                    {/* Author info */}
                    {showAuthor && (
                        <div className="flex items-center gap-2 text-sm">
                            <Link
                                href={`/users/${ranking.userId}`}
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                            >
                                {ranking.userAvatar ? (
                                    <Image
                                        src={ranking.userAvatar}
                                        alt={ranking.userName || 'User'}
                                        width={24}
                                        height={24}
                                        className="rounded-full"
                                    />
                                ) : (
                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xs font-bold">
                                        {ranking.userName?.[0]?.toUpperCase() || '?'}
                                    </div>
                                )}
                                <span className="text-gray-400 hover:text-gray-300">
                                    {ranking.userName || 'Unknown User'}
                                </span>
                            </Link>
                            <span className="text-gray-600">•</span>
                            <span className="text-gray-500 text-xs">
                                {formatDistanceToNow(ranking.createdAt, { addSuffix: true })}
                            </span>
                        </div>
                    )}

                    {/* Tags */}
                    {ranking.tags && ranking.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {ranking.tags.slice(0, 3).map((tag) => (
                                <span
                                    key={tag}
                                    className="px-2 py-1 text-xs font-medium bg-zinc-800 text-gray-300 rounded-full"
                                >
                                    {tag}
                                </span>
                            ))}
                            {ranking.tags.length > 3 && (
                                <span className="px-2 py-1 text-xs font-medium text-gray-500">
                                    +{ranking.tags.length - 3}
                                </span>
                            )}
                        </div>
                    )}

                    {/* Stats & actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                            {/* Likes */}
                            <button
                                onClick={handleLike}
                                className="flex items-center gap-1 hover:text-red-500 transition-colors"
                            >
                                {isLiked ? (
                                    <HeartSolidIcon className="w-5 h-5 text-red-500" />
                                ) : (
                                    <HeartIcon className="w-5 h-5" />
                                )}
                                <span className={isLiked ? 'text-red-500' : ''}>
                                    {ranking.likes}
                                </span>
                            </button>

                            {/* Comments */}
                            <div className="flex items-center gap-1">
                                <ChatBubbleLeftIcon className="w-5 h-5" />
                                <span>{ranking.comments}</span>
                            </div>

                            {/* Views */}
                            <div className="flex items-center gap-1">
                                <EyeIcon className="w-5 h-5" />
                                <span>{ranking.views}</span>
                            </div>
                        </div>

                        {/* Item count */}
                        <div className="text-xs text-gray-500 font-medium">
                            {ranking.rankedItems.length} / {ranking.itemCount} items
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    )
}
