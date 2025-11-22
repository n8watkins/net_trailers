/**
 * Collections Section Component
 *
 * Displays user's collections preview
 * Used in both private profile and public profile pages
 */

import Link from 'next/link'
import { RectangleStackIcon } from '@heroicons/react/24/outline'
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
    const collectionsUrl = isPublic ? `/users/${userId}/collections` : '/collections'
    const collectionDetailUrl = (id: string) =>
        isPublic ? `/users/${userId}/collections/${id}` : `/collections/${id}`

    return (
        <section
            id="collections-section"
            className="bg-gradient-to-br from-purple-900/20 to-violet-900/10 border border-purple-800/30 rounded-xl p-6"
        >
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {collections.slice(0, 3).map((collection) => (
                        <Link
                            key={collection.id}
                            href={collectionDetailUrl(collection.id)}
                            className="group bg-gradient-to-br from-purple-900/30 to-violet-900/20 border border-purple-800/40 hover:border-purple-700/60 rounded-xl p-4 transition-all cursor-pointer"
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
                <div className="text-center py-12 bg-gradient-to-br from-purple-900/30 to-violet-900/20 border border-purple-800/40 rounded-xl">
                    <RectangleStackIcon className="w-16 h-16 text-purple-900 mx-auto mb-4" />
                    <p className="text-gray-400">No collections yet</p>
                </div>
            )}
        </section>
    )
}
