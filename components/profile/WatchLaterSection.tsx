/**
 * Watch Later Section Component
 *
 * Displays a preview of user's watch later list
 * Used in both private profile and public profile pages
 */

import Link from 'next/link'
import { ClockIcon } from '@heroicons/react/24/outline'
import type { Movie, TVShow } from '../../typings'
import { getTitle, getYear, getContentType, isMovie } from '../../typings'
import { useState } from 'react'

// Small image component with fallback support for profile sections
function ProfileImageCard({ content }: { content: Movie | TVShow }) {
    const [posterError, setPosterError] = useState(false)
    const [backdropError, setBackdropError] = useState(false)

    const posterImage = content.poster_path
    const backdropImage = content.backdrop_path

    const imageToUse =
        !posterError && posterImage
            ? `https://image.tmdb.org/t/p/w185${posterImage}`
            : !backdropError && backdropImage
              ? `https://image.tmdb.org/t/p/w185${backdropImage}`
              : null

    const handleImageError = () => {
        if (!posterError && posterImage) {
            setPosterError(true)
        } else if (!backdropError && backdropImage) {
            setBackdropError(true)
        }
    }

    return (
        <div className="w-32 aspect-[2/3] relative overflow-hidden rounded-lg hover:scale-105 transition-transform duration-200">
            {imageToUse ? (
                <img
                    src={imageToUse}
                    alt={getTitle(content)}
                    className="w-full h-full object-cover"
                    onError={handleImageError}
                />
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 text-gray-300">
                    <div className="text-3xl mb-2 opacity-50">{isMovie(content) ? '🎬' : '📺'}</div>
                    <div className="text-center px-2">
                        <p className="font-semibold text-xs line-clamp-2 mb-1">
                            {getTitle(content)}
                        </p>
                        <p className="text-[10px] text-gray-400">{getYear(content)}</p>
                        <span
                            className={`inline-block mt-1 px-1.5 py-0.5 text-[9px] rounded-full ${
                                isMovie(content) ? 'bg-blue-600/50' : 'bg-green-600/50'
                            }`}
                        >
                            {getContentType(content)}
                        </span>
                    </div>
                </div>
            )}
        </div>
    )
}

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
                    {watchLaterPreview.slice(0, 6).map((content) => (
                        <ProfileImageCard key={content.id} content={content} />
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
