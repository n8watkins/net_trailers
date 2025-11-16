/**
 * Rankings Section Component
 *
 * Displays user's rankings preview
 * Used in both private profile and public profile pages
 */

import Link from 'next/link'
import {
    TrophyIcon,
    HeartIcon,
    EyeIcon,
    ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline'
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
        <section
            id="rankings-section"
            className="bg-gradient-to-br from-yellow-900/20 to-orange-900/10 border border-yellow-800/30 rounded-xl p-6"
        >
            <div className="flex items-center gap-3 mb-4">
                <TrophyIcon className="w-6 h-6 text-yellow-400" />
                <h2 className="text-2xl font-bold text-white">Rankings</h2>
                <Link
                    href={rankingsUrl}
                    className="text-base text-yellow-400 hover:text-yellow-300 underline"
                >
                    View all {rankings.length}
                </Link>
            </div>
            {rankings.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {rankings.slice(0, 3).map((ranking) => (
                        <Link
                            key={ranking.id}
                            href={rankingDetailUrl(ranking.id)}
                            className="group bg-gradient-to-br from-yellow-900/30 to-orange-900/20 border border-yellow-800/40 hover:border-yellow-700/60 rounded-xl p-4 transition-all cursor-pointer"
                        >
                            <h3 className="text-sm font-bold text-white group-hover:text-yellow-400 transition-colors line-clamp-2 mb-3 h-10">
                                {ranking.title}
                            </h3>
                            <div className="flex gap-2 mb-3">
                                {ranking.rankedItems?.slice(0, 3).map((item, idx) => (
                                    <div
                                        key={idx}
                                        className="flex-1 aspect-[2/3] relative overflow-hidden rounded"
                                    >
                                        {item.content?.poster_path && (
                                            <img
                                                src={`https://image.tmdb.org/t/p/w185${item.content.poster_path}`}
                                                alt={`Ranked item ${idx + 1}`}
                                                className="w-full h-full object-cover"
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-gray-400">
                                <span className="flex items-center gap-1.5">
                                    <HeartIcon className="w-3 h-3" />
                                    <span className="font-medium">{ranking.likes || 0}</span>
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <EyeIcon className="w-3 h-3" />
                                    <span className="font-medium">{ranking.views || 0}</span>
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <ChatBubbleLeftRightIcon className="w-3 h-3" />
                                    <span className="font-medium">{ranking.comments || 0}</span>
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 bg-gradient-to-br from-yellow-900/30 to-orange-900/20 border border-yellow-800/40 rounded-xl">
                    <TrophyIcon className="w-16 h-16 text-yellow-900 mx-auto mb-4" />
                    <p className="text-gray-400">No rankings yet</p>
                </div>
            )}
        </section>
    )
}
