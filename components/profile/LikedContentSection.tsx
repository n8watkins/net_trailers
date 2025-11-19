/**
 * Liked Content Section Component
 *
 * Displays a preview of user's liked content with visual cards
 * Used in both private profile and public profile pages
 */

import Link from 'next/link'
import { HeartIcon } from '@heroicons/react/24/outline'
import type { Movie, TVShow } from '../../typings'
import { getTitle, getYear, getContentType, isMovie } from '../../typings'
import { ProfileErrorBoundary } from './ProfileErrorBoundary'
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

interface LikedContentSectionProps {
    likedContent: (Movie | TVShow)[]
    userId?: string // For public profiles
    isPublic?: boolean
}

export function LikedContentSection({
    likedContent,
    userId,
    isPublic = false,
}: LikedContentSectionProps) {
    const viewAllUrl = isPublic ? `/users/${userId}/liked` : '/liked'

    return (
        <ProfileErrorBoundary sectionName="Liked Content">
            <section
                id="liked-section"
                className="bg-gradient-to-br from-red-900/20 to-pink-900/10 border border-red-800/30 rounded-xl p-6"
            >
                <div className="flex items-center gap-3 mb-4">
                    <HeartIcon className="w-6 h-6 text-red-400" />
                    <h2 className="text-2xl font-bold text-white">Liked Content</h2>
                    <Link
                        href={viewAllUrl}
                        className="text-base text-red-400 hover:text-red-300 underline"
                    >
                        View all {likedContent.length}
                    </Link>
                </div>
                {likedContent.length > 0 ? (
                    <div className="flex gap-3 flex-wrap">
                        {likedContent.slice(0, 6).map((content) => (
                            <ProfileImageCard key={content.id} content={content} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 bg-black/20 rounded-lg border border-red-800/20">
                        <HeartIcon className="w-16 h-16 text-red-900 mx-auto mb-4" />
                        <p className="text-gray-400">No liked content yet</p>
                    </div>
                )}
            </section>
        </ProfileErrorBoundary>
    )
}
