/**
 * Liked Content Section Component
 *
 * Displays a preview of user's liked content with visual cards
 * Used in both private profile and public profile pages
 */

import Link from 'next/link'
import { HeartIcon } from '@heroicons/react/24/outline'
import type { Movie, TVShow } from '../../typings'
import { getTitle } from '../../typings'
import { ProfileErrorBoundary } from './ProfileErrorBoundary'

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
                        {likedContent.slice(0, 5).map((content) => (
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
                    <div className="text-center py-12 bg-black/20 rounded-lg border border-red-800/20">
                        <HeartIcon className="w-16 h-16 text-red-900 mx-auto mb-4" />
                        <p className="text-gray-400">No liked content yet</p>
                    </div>
                )}
            </section>
        </ProfileErrorBoundary>
    )
}
