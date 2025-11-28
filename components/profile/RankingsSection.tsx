/**
 * Rankings Section Component - Cinematic Edition
 *
 * Premium ranking cards with:
 * - Gold/amber accent theme
 * - Glass card surfaces with glowing borders
 * - 3-4 poster collage with rim glow
 * - Engagement icons with hover glow
 * - Cinematic typography
 */

import Link from 'next/link'
import Image from 'next/image'
import {
    TrophyIcon,
    HeartIcon,
    EyeIcon,
    ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline'
import { TrophyIcon as TrophySolidIcon } from '@heroicons/react/24/solid'
import type { Ranking } from '../../types/rankings'

interface RankingsSectionProps {
    rankings: Ranking[]
    userId?: string // For public profiles
    isPublic?: boolean
}

export function RankingsSection({ rankings, userId, isPublic = false }: RankingsSectionProps) {
    const rankingsUrl = isPublic ? `/users/${userId}/rankings` : '/rankings'
    const rankingDetailUrl = (id: string) => `/rankings/${id}`

    return (
        <section id="rankings-section" className="relative group/section">
            {/* Ambient glow behind section */}
            <div className="absolute -inset-1 bg-gradient-to-br from-yellow-500/8 via-amber-500/6 to-yellow-500/8 rounded-2xl blur-xl opacity-60 group-hover/section:opacity-100 transition-all duration-300" />

            {/* Main container - Glassmorphic */}
            <div className="relative bg-gradient-to-br from-yellow-950/20 via-zinc-900/80 to-amber-950/20 backdrop-blur-lg rounded-xl overflow-hidden border border-yellow-500/10 group-hover/section:border-yellow-500/20 transition-all duration-300 shadow-lg">
                {/* Inner padding container */}
                <div className="p-5 sm:p-6">
                    {/* Section Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            {/* Icon with glow */}
                            <div className="relative">
                                <div className="absolute inset-0 bg-yellow-500/30 blur-lg opacity-60" />
                                <TrophySolidIcon className="relative w-6 h-6 text-yellow-400 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]" />
                            </div>
                            <h2 className="text-xl sm:text-2xl font-bold text-white">Rankings</h2>
                        </div>
                        {rankings.length > 0 && (
                            <Link
                                href={rankingsUrl}
                                className="group/link flex items-center gap-2 text-sm text-yellow-400 hover:text-yellow-300 transition-colors"
                            >
                                <span className="group-hover/link:underline">
                                    View all {rankings.length}
                                </span>
                                <span className="text-yellow-500/50 group-hover/link:translate-x-0.5 transition-transform">
                                    &rarr;
                                </span>
                            </Link>
                        )}
                    </div>

                    {/* Rankings Grid - Responsive: 1 col mobile, 2 col tablet, 3 col desktop */}
                    {rankings.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {rankings.slice(0, 3).map((ranking, index) => (
                                <Link
                                    key={ranking.id}
                                    href={rankingDetailUrl(ranking.id)}
                                    className="group relative transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 animate-fadeInUp"
                                    style={{
                                        animationDelay: `${index * 75}ms`,
                                        animationFillMode: 'both',
                                    }}
                                >
                                    {/* Card glow */}
                                    <div className="absolute -inset-1 bg-gradient-to-br from-yellow-500/10 via-amber-500/8 to-yellow-500/10 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-all duration-300" />

                                    {/* Card container */}
                                    <div className="relative bg-gradient-to-br from-yellow-950/30 via-zinc-900/60 to-amber-950/30 backdrop-blur-lg rounded-xl overflow-hidden border border-yellow-500/15 group-hover:border-yellow-500/30 transition-all duration-300">
                                        {/* Poster collage - larger height */}
                                        <div className="relative h-32 sm:h-36 overflow-hidden">
                                            <div className="absolute inset-0 bg-gradient-to-br from-yellow-950/40 via-zinc-900/80 to-amber-950/40" />
                                            <div className="absolute inset-0 flex justify-center items-center gap-2 px-3 py-2">
                                                {ranking.rankedItems
                                                    ?.slice(0, 4)
                                                    .map((item, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="relative flex-1 max-w-[70px] h-[100px] sm:h-[110px]"
                                                        >
                                                            {item.content?.poster_path ? (
                                                                <img
                                                                    src={`https://image.tmdb.org/t/p/w185${item.content.poster_path}`}
                                                                    alt=""
                                                                    className="w-full h-full object-cover rounded-md shadow-lg ring-1 ring-white/10"
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full bg-zinc-800 rounded-md flex items-center justify-center">
                                                                    <span className="text-zinc-600 text-xs">
                                                                        {idx + 1}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                            </div>
                                            <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-zinc-900/90 to-transparent" />
                                        </div>

                                        {/* Content */}
                                        <div className="relative z-20 p-4">
                                            <h3 className="text-sm font-bold text-white group-hover:text-yellow-200 transition-colors line-clamp-1 mb-2">
                                                {ranking.title}
                                            </h3>
                                            <div className="flex items-center gap-3 text-xs text-gray-500">
                                                <span className="flex items-center gap-1">
                                                    <HeartIcon className="w-3.5 h-3.5" />
                                                    {ranking.likes || 0}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <EyeIcon className="w-3.5 h-3.5" />
                                                    {ranking.views || 0}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <ChatBubbleLeftRightIcon className="w-3.5 h-3.5" />
                                                    {ranking.comments || 0}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="relative mb-4">
                                <div className="absolute inset-0 bg-yellow-500/20 blur-2xl scale-150" />
                                <div className="relative w-20 h-20 rounded-full bg-zinc-900/60 backdrop-blur-lg flex items-center justify-center border border-zinc-800/50">
                                    <TrophyIcon className="w-10 h-10 text-yellow-900" />
                                </div>
                            </div>
                            <p className="text-gray-400 text-sm">No rankings yet</p>
                            <p className="text-gray-500 text-xs mt-1">
                                Create your first ranking to see it here
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </section>
    )
}
