/**
 * Rankings and Collections Section Component
 *
 * Displays side-by-side rankings and collections previews
 * Used in both private profile and public profile pages
 */

import Link from 'next/link'
import {
    TrophyIcon,
    HeartIcon,
    EyeIcon,
    RectangleStackIcon,
    ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline'
import type { Ranking } from '../../types/rankings'
import type { UserList } from '../../types/userLists'

interface RankingsCollectionsSectionProps {
    rankings: Ranking[]
    collections: UserList[]
    userId?: string // For public profiles
    isPublic?: boolean
}

export function RankingsCollectionsSection({
    rankings,
    collections,
    userId,
    isPublic = false,
}: RankingsCollectionsSectionProps) {
    const rankingsUrl = isPublic ? `/users/${userId}/rankings` : '/rankings'
    const collectionsUrl = isPublic ? `/users/${userId}/collections` : '/collections'
    const rankingDetailUrl = (id: string) => `/rankings/${id}`
    const collectionDetailUrl = (id: string) =>
        isPublic ? `/users/${userId}/collections/${id}` : `/collections/${id}`

    return (
        <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-800/50 border border-zinc-700 rounded-xl p-6 mb-6">
            <div className="flex gap-6">
                {/* Rankings Section - Takes 1/2 width */}
                <section id="rankings-section" className="flex-1">
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
                        <div className="flex gap-3">
                            {rankings.slice(0, 3).map((ranking) => (
                                <Link
                                    key={ranking.id}
                                    href={rankingDetailUrl(ranking.id)}
                                    className="group bg-gradient-to-br from-yellow-900/20 to-orange-900/10 border border-yellow-800/30 hover:border-yellow-700/50 rounded-xl p-4 transition-all cursor-pointer flex-1 min-w-0"
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
                                            <span className="font-medium">
                                                {ranking.likes || 0}
                                            </span>
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <EyeIcon className="w-3 h-3" />
                                            <span className="font-medium">
                                                {ranking.views || 0}
                                            </span>
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <ChatBubbleLeftRightIcon className="w-3 h-3" />
                                            <span className="font-medium">
                                                {ranking.comments || 0}
                                            </span>
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-gradient-to-br from-yellow-900/20 to-orange-900/10 border border-yellow-800/30 rounded-xl">
                            <TrophyIcon className="w-16 h-16 text-yellow-900 mx-auto mb-4" />
                            <p className="text-gray-400">No rankings yet</p>
                        </div>
                    )}
                </section>

                {/* Collections Section - Takes 1/2 width */}
                <section id="collections-section" className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                        <RectangleStackIcon className="w-6 h-6 text-purple-400" />
                        <h2 className="text-2xl font-bold text-white">Collections</h2>
                        <Link
                            href={collectionsUrl}
                            className="text-base text-purple-400 hover:text-purple-300 underline"
                        >
                            View all {collections.length}
                        </Link>
                    </div>
                    {collections.length > 0 ? (
                        <div className="flex gap-3">
                            {collections.slice(0, 3).map((collection) => (
                                <Link
                                    key={collection.id}
                                    href={collectionDetailUrl(collection.id)}
                                    className="group bg-gradient-to-br from-purple-900/20 to-violet-900/10 border border-purple-800/30 hover:border-purple-700/50 rounded-xl p-4 transition-all cursor-pointer flex-1 min-w-0"
                                >
                                    <div className="flex items-center gap-2 mb-3 h-10">
                                        {collection.emoji && (
                                            <span className="text-xl flex-shrink-0">
                                                {collection.emoji}
                                            </span>
                                        )}
                                        <h3 className="text-sm font-bold text-white group-hover:text-purple-400 transition-colors line-clamp-2 flex-1 min-w-0">
                                            {collection.name}
                                        </h3>
                                    </div>
                                    <div className="flex gap-2 mb-3">
                                        {collection.items?.slice(0, 3).map((item) => (
                                            <div
                                                key={item.id}
                                                className="flex-1 aspect-[2/3] relative overflow-hidden rounded"
                                            >
                                                {item.poster_path && (
                                                    <img
                                                        src={`https://image.tmdb.org/t/p/w185${item.poster_path}`}
                                                        alt={`Collection item`}
                                                        className="w-full h-full object-cover"
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex items-center text-xs text-gray-400">
                                        <span className="flex items-center gap-1.5">
                                            <RectangleStackIcon className="w-3 h-3" />
                                            <span className="font-medium">
                                                {collection.items?.length || 0} items
                                            </span>
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-gradient-to-br from-purple-900/20 to-violet-900/10 border border-purple-800/30 rounded-xl">
                            <RectangleStackIcon className="w-16 h-16 text-purple-900 mx-auto mb-4" />
                            <p className="text-gray-400">No collections yet</p>
                        </div>
                    )}
                </section>
            </div>
        </div>
    )
}
