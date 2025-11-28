/**
 * Collections Section Component - Cinematic Edition
 *
 * Premium collection cards with:
 * - Purple/violet accent theme
 * - Glass card surfaces with glowing borders
 * - Poster previews with rim glow
 * - Hover lift animations
 * - Cinematic typography
 */

import Link from 'next/link'
import { RectangleStackIcon, SparklesIcon } from '@heroicons/react/24/outline'
import { RectangleStackIcon as RectangleStackSolidIcon } from '@heroicons/react/24/solid'
import type { UserList } from '../../types/collections'

interface CollectionsSectionProps {
    collections: UserList[]
    userId?: string // For public profiles
    isPublic?: boolean
}

export function CollectionsSection({
    collections,
    userId,
    isPublic = false,
}: CollectionsSectionProps) {
    const collectionsUrl = isPublic ? `/users/${userId}/collections` : '/collections/watch-later'
    const collectionDetailUrl = (id: string) =>
        isPublic ? `/users/${userId}/collections/${id}` : `/collections/${id}`

    return (
        <section id="collections-section" className="relative group/section">
            {/* Ambient glow behind section */}
            <div className="absolute -inset-1 bg-gradient-to-br from-purple-500/8 via-violet-500/6 to-purple-500/8 rounded-2xl blur-xl opacity-60 group-hover/section:opacity-100 transition-all duration-300" />

            {/* Main container - Glassmorphic */}
            <div className="relative bg-gradient-to-br from-purple-950/20 via-zinc-900/80 to-violet-950/20 backdrop-blur-lg rounded-xl overflow-hidden border border-purple-500/10 group-hover/section:border-purple-500/20 transition-all duration-300 shadow-lg">
                {/* Inner padding container */}
                <div className="p-5 sm:p-6">
                    {/* Section Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            {/* Icon with glow */}
                            <div className="relative">
                                <div className="absolute inset-0 bg-purple-500/30 blur-lg opacity-60" />
                                <RectangleStackSolidIcon className="relative w-6 h-6 text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
                            </div>
                            <h2 className="text-xl sm:text-2xl font-bold text-white">
                                Collections
                            </h2>
                        </div>
                        {collections.length > 0 && (
                            <Link
                                href={collectionsUrl}
                                className="group/link flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors"
                            >
                                <span className="group-hover/link:underline">
                                    View all {collections.length}
                                </span>
                                <span className="text-purple-500/50 group-hover/link:translate-x-0.5 transition-transform">
                                    &rarr;
                                </span>
                            </Link>
                        )}
                    </div>

                    {/* Collections Grid - Responsive: 1 col mobile, 2 col tablet, 3 col desktop */}
                    {collections.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {collections.slice(0, 3).map((collection, index) => (
                                <Link
                                    key={collection.id}
                                    href={collectionDetailUrl(collection.id)}
                                    className="group relative transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 animate-fadeInUp"
                                    style={{
                                        animationDelay: `${index * 75}ms`,
                                        animationFillMode: 'both',
                                    }}
                                >
                                    {/* Card glow */}
                                    <div className="absolute -inset-1 bg-gradient-to-br from-purple-500/10 via-violet-500/8 to-purple-500/10 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-all duration-300" />

                                    {/* Card container */}
                                    <div className="relative bg-gradient-to-br from-purple-950/30 via-zinc-900/60 to-violet-950/30 backdrop-blur-lg rounded-xl overflow-hidden border border-purple-500/15 group-hover:border-purple-500/30 transition-all duration-300">
                                        {/* Poster collage - larger height */}
                                        <div className="relative h-32 sm:h-36 overflow-hidden">
                                            <div className="absolute inset-0 bg-gradient-to-br from-purple-950/40 via-zinc-900/80 to-violet-950/40" />
                                            <div className="absolute inset-0 flex justify-center items-center gap-2 px-3 py-2">
                                                {collection.items && collection.items.length > 0 ? (
                                                    collection.items
                                                        .slice(0, 4)
                                                        .map((item, idx) => (
                                                            <div
                                                                key={item.id}
                                                                className="relative flex-1 max-w-[70px] h-[100px] sm:h-[110px]"
                                                            >
                                                                {item.poster_path ? (
                                                                    <img
                                                                        src={`https://image.tmdb.org/t/p/w185${item.poster_path}`}
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
                                                        ))
                                                ) : (
                                                    <div className="flex items-center justify-center w-full">
                                                        <SparklesIcon className="w-10 h-10 text-purple-500" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-zinc-900/90 to-transparent" />
                                        </div>

                                        {/* Content */}
                                        <div className="relative z-20 p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                {collection.emoji && (
                                                    <span className="text-lg flex-shrink-0">
                                                        {collection.emoji}
                                                    </span>
                                                )}
                                                <h3 className="text-sm font-bold text-white group-hover:text-purple-200 transition-colors line-clamp-1 flex-1 min-w-0">
                                                    {collection.name}
                                                </h3>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <span className="flex items-center gap-1">
                                                    <RectangleStackIcon className="w-3.5 h-3.5" />
                                                    {collection.collectionType === 'tmdb-genre'
                                                        ? 'Dynamic'
                                                        : `${collection.items?.length || 0} items`}
                                                </span>
                                                {collection.collectionType === 'ai-generated' && (
                                                    <span className="flex items-center gap-1 px-1.5 py-0.5 bg-purple-500/20 rounded-full text-[10px] text-purple-400">
                                                        <SparklesIcon className="w-3 h-3" />
                                                        AI
                                                    </span>
                                                )}
                                                {collection.collectionType === 'tmdb-genre' && (
                                                    <span className="px-1.5 py-0.5 bg-indigo-500/20 rounded-full text-[10px] text-indigo-400">
                                                        Auto
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="relative mb-4">
                                <div className="absolute inset-0 bg-purple-500/20 blur-2xl scale-150" />
                                <div className="relative w-20 h-20 rounded-full bg-zinc-900/60 backdrop-blur-lg flex items-center justify-center border border-zinc-800/50">
                                    <RectangleStackIcon className="w-10 h-10 text-purple-900" />
                                </div>
                            </div>
                            <p className="text-gray-400 text-sm">No collections yet</p>
                            <p className="text-gray-500 text-xs mt-1">
                                Create custom collections to organize content
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </section>
    )
}
