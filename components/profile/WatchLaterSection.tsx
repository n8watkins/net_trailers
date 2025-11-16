/**
 * Watch Later Section Component
 *
 * Displays a preview of user's watch later list
 * Used in both private profile and public profile pages
 */

import Link from 'next/link'
import { ClockIcon } from '@heroicons/react/24/outline'
import type { Movie, TVShow } from '../../typings'
import { getTitle } from '../../typings'

interface WatchLaterSectionProps {
    watchLaterPreview: (Movie | TVShow)[]
    totalCount: number
    userId?: string // For public profiles
    isPublic?: boolean
}

export function WatchLaterSection({
    watchLaterPreview,
    totalCount,
    userId,
    isPublic = false,
}: WatchLaterSectionProps) {
    const viewAllUrl = isPublic ? `/users/${userId}/watch-later` : '/collections'

    if (watchLaterPreview.length === 0 && isPublic) {
        return null // Don't show empty section on public profiles
    }

    return (
        <section className="bg-gradient-to-br from-indigo-900/20 to-blue-900/10 border border-indigo-800/30 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
                <ClockIcon className="w-6 h-6 text-indigo-400" />
                <h2 className="text-2xl font-bold text-white">Watch Later</h2>
                <Link
                    href={viewAllUrl}
                    className="text-base text-indigo-400 hover:text-indigo-300 underline"
                >
                    View all {totalCount}
                </Link>
            </div>
            {watchLaterPreview.length > 0 ? (
                <div className="flex gap-3 flex-wrap">
                    {watchLaterPreview.map((content) => (
                        <div
                            key={content.id}
                            className="w-24 aspect-[2/3] relative overflow-hidden rounded-lg"
                        >
                            {content.poster_path && (
                                <img
                                    src={`https://image.tmdb.org/t/p/w185${content.poster_path}`}
                                    alt={getTitle(content)}
                                    className="w-full h-full object-cover"
                                />
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 bg-black/20 rounded-lg border border-indigo-800/20">
                    <ClockIcon className="w-16 h-16 text-indigo-900 mx-auto mb-4" />
                    <p className="text-gray-400">No items in watch later</p>
                </div>
            )}
        </section>
    )
}
