/**
 * RankingCard Component - Refined Edition
 *
 * Displays a ranking in card format with subtle animations
 * and clean, professional styling
 */

'use client'

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
    FireIcon,
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
    const { likeRanking, unlikeRanking, likes } = useRankingStore()

    // Check if current user liked this ranking
    const isLiked = userId
        ? likes.some((like) => like.rankingId === ranking.id && like.userId === userId)
        : false

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

    return (
        <div
            onClick={handleCardClick}
            className="group relative bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 hover:border-zinc-700 transition-all duration-200 cursor-pointer hover:shadow-xl"
        >
            {/* Main card */}
            <div className="relative">
                {/* Header with top 3 posters */}
                {topItems.length > 0 && (
                    <div className="relative h-48 bg-gradient-to-br from-zinc-800/50 to-zinc-900">
                        <div className="absolute inset-0 flex justify-center items-center gap-2 p-4">
                            {topItems.map((item) => (
                                <div key={item.content.id} className="relative flex-1 h-full">
                                    <Image
                                        src={getPosterPath(item.content)}
                                        alt={getTitle(item.content)}
                                        fill
                                        loading="lazy"
                                        sizes="(max-width: 768px) 33vw, (max-width: 1200px) 25vw, 200px"
                                        className="object-cover rounded-md shadow-lg"
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/50 to-transparent" />

                        {/* Trending badge for popular rankings */}
                        {ranking.likes > 50 && (
                            <div className="absolute top-3 right-3 px-2.5 py-1 bg-orange-500/90 backdrop-blur-sm rounded text-xs font-semibold text-white flex items-center gap-1">
                                <FireIcon className="w-3 h-3" />
                                <span>HOT</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Content section */}
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

                    {/* Description - Fixed height for 2 lines */}
                    <div className="h-10">
                        {ranking.description && (
                            <p className="text-sm text-gray-400 line-clamp-2">
                                {ranking.description}
                            </p>
                        )}
                    </div>

                    {/* Author info */}
                    {showAuthor && (
                        <div className="flex items-center gap-2 text-sm">
                            <Link
                                href={`/users/${ranking.userUsername || ranking.userId}`}
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                            >
                                {ranking.userAvatar ? (
                                    <Image
                                        src={ranking.userAvatar}
                                        alt={ranking.userName || 'User'}
                                        width={24}
                                        height={24}
                                        loading="lazy"
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
                            <div className="flex items-center gap-1 hover:text-blue-400 transition-colors">
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
                            {ranking.rankedItems.length} / {ranking.itemCount}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
