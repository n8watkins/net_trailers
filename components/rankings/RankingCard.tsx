/**
 * RankingCard Component - Cinematic Netflix-Inspired Edition
 *
 * Displays a ranking in card format with:
 * - Soft neon rim glows on posters
 * - Hover lift animations
 * - Pink-gold ambient glow behind poster group
 * - Subtle film-grain texture overlay
 * - Glassy dark surface with inner shadow
 * - Gold trophy icon with glow
 * - Engagement icons with hover glow pulses
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
            className="group relative cursor-pointer transition-all duration-500 hover:scale-[1.02] hover:-translate-y-2"
        >
            {/* Ambient glow behind card */}
            <div className="absolute -inset-2 bg-gradient-to-br from-yellow-500/20 via-pink-500/10 to-amber-500/20 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            {/* Main card container */}
            <div className="relative bg-zinc-900/60 backdrop-blur-xl rounded-2xl overflow-hidden border border-zinc-800/50 group-hover:border-yellow-500/30 transition-all duration-500 shadow-[0_0_0_1px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)] group-hover:shadow-[0_0_40px_rgba(234,179,8,0.15)]">
                {/* Film grain texture overlay */}
                <div
                    className="absolute inset-0 opacity-[0.03] pointer-events-none z-10"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                    }}
                />

                {/* Header with top 3 posters */}
                {topItems.length > 0 && (
                    <div className="relative h-52 overflow-hidden">
                        {/* Background gradient */}
                        <div className="absolute inset-0 bg-gradient-to-br from-zinc-800/80 via-zinc-900/90 to-black" />

                        {/* Pink-gold ambient glow behind posters */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-64 h-32 bg-gradient-to-r from-pink-500/20 via-amber-500/30 to-pink-500/20 blur-3xl opacity-60 group-hover:opacity-100 transition-opacity duration-500" />
                        </div>

                        {/* Posters container */}
                        <div className="absolute inset-0 flex justify-center items-center gap-3 p-5">
                            {topItems.map((item, index) => (
                                <div
                                    key={item.content.id}
                                    className="relative flex-1 max-w-[100px] h-36 transition-all duration-500 group-hover:scale-105"
                                    style={{
                                        transitionDelay: `${index * 50}ms`,
                                        transform: `translateY(${index === 1 ? '-4px' : '0'})`,
                                    }}
                                >
                                    {/* Poster glow rim */}
                                    <div className="absolute -inset-1 bg-gradient-to-br from-yellow-400/40 via-pink-500/30 to-amber-400/40 rounded-lg blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                    <Image
                                        src={getPosterPath(item.content)}
                                        alt={getTitle(item.content)}
                                        fill
                                        loading="lazy"
                                        sizes="(max-width: 768px) 33vw, (max-width: 1200px) 25vw, 100px"
                                        className="object-cover rounded-lg shadow-xl relative z-10 ring-1 ring-white/10"
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Gradient fade to content */}
                        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-zinc-900/95 via-zinc-900/60 to-transparent" />

                        {/* Trending badge for popular rankings */}
                        {ranking.likes > 50 && (
                            <div className="absolute top-3 right-3 px-3 py-1.5 bg-gradient-to-r from-orange-500 to-red-500 backdrop-blur-sm rounded-full text-xs font-bold text-white flex items-center gap-1.5 shadow-[0_0_20px_rgba(249,115,22,0.5)]">
                                <FireIcon className="w-3.5 h-3.5" />
                                <span>HOT</span>
                            </div>
                        )}

                        {/* Item count badge */}
                        <div className="absolute top-3 left-3 px-3 py-1.5 bg-zinc-900/80 backdrop-blur-sm rounded-full text-xs font-semibold text-gray-300 border border-zinc-700/50">
                            {ranking.rankedItems.length} items ranked
                        </div>
                    </div>
                )}

                {/* Content section */}
                <div className="relative z-20 p-5 space-y-4">
                    {/* Trophy icon + title */}
                    <div className="flex items-start gap-3">
                        {/* Glowing trophy icon */}
                        <div className="relative flex-shrink-0">
                            <div className="absolute inset-0 bg-yellow-500/50 blur-lg opacity-60 group-hover:opacity-100 transition-opacity" />
                            <TrophyIcon className="relative w-7 h-7 text-yellow-400 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-xl font-bold text-white group-hover:text-yellow-300 transition-colors duration-300 line-clamp-2 leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                                {ranking.title}
                            </h3>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="min-h-[2.5rem]">
                        {ranking.description && (
                            <p className="text-sm text-gray-400 line-clamp-2 leading-relaxed tracking-wide">
                                {ranking.description}
                            </p>
                        )}
                    </div>

                    {/* Author info */}
                    {showAuthor && (
                        <div className="flex items-center gap-3">
                            <Link
                                href={`/users/${ranking.userUsername || ranking.userId}`}
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-2 hover:opacity-80 transition-opacity group/author"
                            >
                                {ranking.userAvatar ? (
                                    <Image
                                        src={ranking.userAvatar}
                                        alt={ranking.userName || 'User'}
                                        width={28}
                                        height={28}
                                        loading="lazy"
                                        className="rounded-full ring-2 ring-zinc-700/50 group-hover/author:ring-yellow-500/30 transition-all"
                                    />
                                ) : (
                                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center text-xs font-bold text-black shadow-lg">
                                        {ranking.userName?.[0]?.toUpperCase() || '?'}
                                    </div>
                                )}
                                <span className="text-sm text-gray-300 group-hover/author:text-yellow-300 transition-colors font-medium">
                                    {ranking.userName || 'Unknown User'}
                                </span>
                            </Link>
                            <span className="text-gray-600">•</span>
                            <span className="text-gray-500 text-xs">
                                {formatDistanceToNow(ranking.createdAt, { addSuffix: true })}
                            </span>
                        </div>
                    )}

                    {/* Gradient divider */}
                    <div className="h-px bg-gradient-to-r from-transparent via-zinc-700/50 to-transparent" />

                    {/* Stats & actions */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-5">
                            {/* Likes */}
                            <button
                                onClick={handleLike}
                                className="group/like flex items-center gap-1.5 transition-all duration-300 hover:scale-110"
                            >
                                {isLiked ? (
                                    <HeartSolidIcon className="w-5 h-5 text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                                ) : (
                                    <HeartIcon className="w-5 h-5 text-gray-400 group-hover/like:text-red-400 transition-colors" />
                                )}
                                <span
                                    className={`text-sm font-semibold transition-colors ${
                                        isLiked
                                            ? 'text-red-400'
                                            : 'text-gray-400 group-hover/like:text-red-400'
                                    }`}
                                >
                                    {ranking.likes}
                                </span>
                            </button>

                            {/* Comments */}
                            <div className="group/comments flex items-center gap-1.5 transition-all duration-300 hover:scale-110">
                                <ChatBubbleLeftIcon className="w-5 h-5 text-gray-400 group-hover/comments:text-blue-400 transition-colors" />
                                <span className="text-sm font-semibold text-gray-400 group-hover/comments:text-blue-400 transition-colors">
                                    {ranking.comments}
                                </span>
                            </div>

                            {/* Views */}
                            <div className="group/views flex items-center gap-1.5 transition-all duration-300 hover:scale-110">
                                <EyeIcon className="w-5 h-5 text-gray-400 group-hover/views:text-cyan-400 transition-colors" />
                                <span className="text-sm font-semibold text-gray-400 group-hover/views:text-cyan-400 transition-colors">
                                    {ranking.views}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
