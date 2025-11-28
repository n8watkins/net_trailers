/**
 * RankingCard Component - Compact Cinematic Edition
 *
 * Displays a ranking in a compact card format with:
 * - Larger poster images (3 posters)
 * - Tighter spacing for more cards per row
 * - Soft neon rim glows on posters
 * - Hover lift animations
 * - Glassy dark surface
 * - Compact engagement icons
 */

'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Ranking } from '@/types/rankings'
import { getTitle, getPosterPath } from '@/typings'
import { HeartIcon, ChatBubbleLeftIcon, EyeIcon, FireIcon } from '@heroicons/react/24/outline'
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
            className="group relative cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1"
        >
            {/* Ambient glow behind card - subtle yellow */}
            <div className="absolute -inset-1 bg-gradient-to-br from-yellow-500/10 via-amber-500/8 to-yellow-500/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {/* Main card container */}
            <div className="relative bg-zinc-900/70 group-hover:bg-yellow-950/30 backdrop-blur-lg rounded-xl overflow-hidden border border-zinc-800/50 group-hover:border-yellow-500/25 transition-all duration-300 shadow-lg group-hover:shadow-[0_0_20px_rgba(234,179,8,0.1)]">
                {/* Header with top 3 posters - Larger images */}
                {topItems.length > 0 && (
                    <div className="relative h-48 overflow-hidden">
                        {/* Background gradient */}
                        <div className="absolute inset-0 bg-gradient-to-br from-zinc-800/60 via-zinc-900/80 to-black" />

                        {/* Ambient glow behind posters - subtle yellow */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-full h-24 bg-gradient-to-r from-yellow-500/8 via-amber-500/12 to-yellow-500/8 blur-2xl opacity-40 group-hover:opacity-70 transition-opacity duration-300" />
                        </div>

                        {/* Posters container - Larger posters */}
                        <div className="absolute inset-0 flex justify-center items-center gap-2 px-3 py-3">
                            {topItems.map((item, index) => (
                                <div
                                    key={item.content.id}
                                    className="relative flex-1 max-w-[110px] h-[160px] transition-all duration-300 group-hover:scale-105"
                                    style={{
                                        transitionDelay: `${index * 30}ms`,
                                        transform: `translateY(${index === 1 ? '-3px' : '0'})`,
                                    }}
                                >
                                    {/* Poster glow rim - subtle yellow */}
                                    <div className="absolute -inset-0.5 bg-gradient-to-br from-yellow-400/15 via-amber-500/10 to-yellow-400/15 rounded-md blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                                    <Image
                                        src={getPosterPath(item.content)}
                                        alt={getTitle(item.content)}
                                        fill
                                        loading="lazy"
                                        sizes="110px"
                                        className="object-cover rounded-md shadow-lg relative z-10 ring-1 ring-white/10"
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Gradient fade to content */}
                        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-zinc-900/95 via-zinc-900/50 to-transparent" />

                        {/* Trending badge */}
                        {ranking.likes > 50 && (
                            <div className="absolute top-2 left-2 px-2 py-1 bg-gradient-to-r from-orange-500 to-red-500 rounded-full text-[10px] font-bold text-white flex items-center gap-1 shadow-[0_0_12px_rgba(249,115,22,0.5)]">
                                <FireIcon className="w-3 h-3" />
                                <span>HOT</span>
                            </div>
                        )}

                        {/* Item count badge */}
                        <div className="absolute top-2 right-2 px-2.5 py-1 bg-zinc-900/80 backdrop-blur-sm rounded-full text-xs font-semibold text-gray-300 border border-zinc-700/50">
                            {ranking.rankedItems.length} items
                        </div>
                    </div>
                )}

                {/* Content section - Compact */}
                <div className="relative z-20 p-3 space-y-2">
                    {/* Title */}
                    <h3 className="text-base font-bold text-white group-hover:text-yellow-100 transition-colors duration-200 line-clamp-1 leading-tight">
                        {ranking.title}
                    </h3>

                    {/* Author + timestamp row */}
                    {showAuthor && (
                        <div className="flex items-center gap-2 text-xs">
                            <Link
                                href={`/users/${ranking.userUsername || ranking.userId}`}
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                            >
                                {ranking.userAvatar ? (
                                    <Image
                                        src={ranking.userAvatar}
                                        alt={ranking.userName || 'User'}
                                        width={18}
                                        height={18}
                                        loading="lazy"
                                        className="rounded-full ring-1 ring-zinc-700/50"
                                    />
                                ) : (
                                    <div className="w-[18px] h-[18px] rounded-full bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center text-[9px] font-bold text-black">
                                        {ranking.userName?.[0]?.toUpperCase() || '?'}
                                    </div>
                                )}
                                <span className="text-gray-400 hover:text-gray-200 transition-colors truncate max-w-[80px]">
                                    {ranking.userName || 'Unknown'}
                                </span>
                            </Link>
                            <span className="text-gray-600">•</span>
                            <span className="text-gray-500 truncate">
                                {formatDistanceToNow(ranking.createdAt, { addSuffix: true })}
                            </span>
                        </div>
                    )}

                    {/* Stats row - Compact */}
                    <div className="flex items-center gap-4 pt-1 border-t border-zinc-800/50">
                        {/* Likes */}
                        <button
                            onClick={handleLike}
                            className="group/like flex items-center gap-1 transition-all duration-200 hover:scale-105"
                        >
                            {isLiked ? (
                                <HeartSolidIcon className="w-4 h-4 text-red-500 drop-shadow-[0_0_6px_rgba(239,68,68,0.4)]" />
                            ) : (
                                <HeartIcon className="w-4 h-4 text-gray-500 group-hover/like:text-red-400 transition-colors" />
                            )}
                            <span
                                className={`text-xs font-medium transition-colors ${
                                    isLiked
                                        ? 'text-red-400'
                                        : 'text-gray-500 group-hover/like:text-red-400'
                                }`}
                            >
                                {ranking.likes}
                            </span>
                        </button>

                        {/* Comments */}
                        <div className="group/comments flex items-center gap-1 transition-all duration-200 hover:scale-105">
                            <ChatBubbleLeftIcon className="w-4 h-4 text-gray-500 group-hover/comments:text-blue-400 transition-colors" />
                            <span className="text-xs font-medium text-gray-500 group-hover/comments:text-blue-400 transition-colors">
                                {ranking.comments}
                            </span>
                        </div>

                        {/* Views */}
                        <div className="group/views flex items-center gap-1 transition-all duration-200 hover:scale-105">
                            <EyeIcon className="w-4 h-4 text-gray-500 group-hover/views:text-cyan-400 transition-colors" />
                            <span className="text-xs font-medium text-gray-500 group-hover/views:text-cyan-400 transition-colors">
                                {ranking.views}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
