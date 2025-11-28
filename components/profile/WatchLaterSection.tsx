/**
 * Watch Later Section Component - Cinematic Edition
 *
 * Netflix-style carousel row with:
 * - Glassmorphic container with ambient glow
 * - Soft neon rim light on posters
 * - Hover lift animations
 * - Indigo/blue accent theme
 */

import Link from 'next/link'
import { ClockIcon } from '@heroicons/react/24/outline'
import { ClockIcon as ClockSolidIcon } from '@heroicons/react/24/solid'
import type { Movie, TVShow } from '../../typings'
import { getTitle, getYear, getContentType, isMovie } from '../../typings'
import { useImageWithFallback } from '../../hooks/useImageWithFallback'

// Cinematic poster card with rim glow and hover effects
function ProfileImageCard({ content }: { content: Movie | TVShow }) {
    const { imageToUse, handleImageError } = useImageWithFallback(content)

    return (
        <div className="group relative flex-shrink-0 w-28 sm:w-32 transition-all duration-300 hover:scale-105 hover:-translate-y-1">
            {/* Ambient glow behind poster */}
            <div className="absolute -inset-1 bg-gradient-to-br from-indigo-500/15 via-blue-500/10 to-indigo-500/15 rounded-lg blur-md opacity-0 group-hover:opacity-100 transition-all duration-300" />

            {/* Poster container */}
            <div className="relative aspect-[2/3] overflow-hidden rounded-lg">
                {/* Rim light effect */}
                <div className="absolute -inset-0.5 bg-gradient-to-br from-indigo-400/20 via-blue-500/15 to-indigo-400/20 rounded-lg blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300" />

                {imageToUse ? (
                    <img
                        src={imageToUse}
                        alt={getTitle(content)}
                        className="relative w-full h-full object-cover rounded-lg ring-1 ring-white/10 group-hover:ring-indigo-400/30 transition-all duration-300 shadow-lg group-hover:shadow-[0_8px_25px_rgba(99,102,241,0.2)]"
                        onError={handleImageError}
                    />
                ) : (
                    <div className="relative w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900 text-gray-300 rounded-lg ring-1 ring-white/10">
                        <div className="text-3xl mb-2 opacity-50">
                            {isMovie(content) ? '🎬' : '📺'}
                        </div>
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
        </div>
    )
}

interface WatchLaterSectionProps {
    watchLaterPreview: (Movie | TVShow)[]
    totalCount: number
    userId?: string // For public profiles
    isPublic?: boolean
    limit?: number // Number of items to display (default: 6)
}

export function WatchLaterSection({
    watchLaterPreview,
    totalCount,
    userId,
    isPublic = false,
    limit = 6,
}: WatchLaterSectionProps) {
    const viewAllUrl = isPublic ? `/users/${userId}/collections/watch-later` : '/collections'

    if (watchLaterPreview.length === 0 && isPublic) {
        return null // Don't show empty section on public profiles
    }

    return (
        <section id="watch-later-section" className="relative group/section">
            {/* Ambient glow behind card */}
            <div className="absolute -inset-1 bg-gradient-to-br from-indigo-500/8 via-blue-500/6 to-indigo-500/8 rounded-2xl blur-xl opacity-60 group-hover/section:opacity-100 transition-all duration-300" />

            {/* Main container - Glassmorphic */}
            <div className="relative bg-gradient-to-br from-indigo-950/20 via-zinc-900/80 to-blue-950/20 backdrop-blur-lg rounded-xl overflow-hidden border border-indigo-500/10 group-hover/section:border-indigo-500/20 transition-all duration-300 shadow-lg">
                {/* Inner padding container */}
                <div className="p-5 sm:p-6">
                    {/* Section Header */}
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                            {/* Icon with glow */}
                            <div className="relative">
                                <div className="absolute inset-0 bg-indigo-500/30 blur-lg opacity-60" />
                                <ClockSolidIcon className="relative w-6 h-6 text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                            </div>
                            <h2 className="text-xl sm:text-2xl font-bold text-white">
                                Watch Later
                            </h2>
                        </div>
                        {totalCount > 0 && (
                            <Link
                                href={viewAllUrl}
                                className="group/link flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
                            >
                                <span className="group-hover/link:underline">
                                    View all {totalCount}
                                </span>
                                <span className="text-indigo-500/50 group-hover/link:translate-x-0.5 transition-transform">
                                    &rarr;
                                </span>
                            </Link>
                        )}
                    </div>

                    {/* Content Row */}
                    {watchLaterPreview.length > 0 ? (
                        <div className="relative">
                            {/* Ambient underglow for row */}
                            <div className="absolute inset-x-0 -bottom-2 h-8 bg-gradient-to-t from-indigo-500/5 to-transparent blur-lg" />

                            {/* Scrollable poster row */}
                            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                                {watchLaterPreview.slice(0, limit).map((content, index) => (
                                    <div
                                        key={content.id}
                                        className="animate-fadeInUp"
                                        style={{
                                            animationDelay: `${index * 50}ms`,
                                            animationFillMode: 'both',
                                        }}
                                    >
                                        <ProfileImageCard content={content} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="relative mb-4">
                                <div className="absolute inset-0 bg-indigo-500/20 blur-2xl scale-150" />
                                <div className="relative w-20 h-20 rounded-full bg-zinc-900/60 backdrop-blur-lg flex items-center justify-center border border-zinc-800/50">
                                    <ClockIcon className="w-10 h-10 text-indigo-900" />
                                </div>
                            </div>
                            <p className="text-gray-400 text-sm">No items in watch later</p>
                            <p className="text-gray-500 text-xs mt-1">
                                Add movies & shows to watch later
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </section>
    )
}
