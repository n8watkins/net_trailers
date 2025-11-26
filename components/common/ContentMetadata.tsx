import React from 'react'
import Link from 'next/link'
import {
    getTitle,
    getYear,
    getRating,
    getRuntime,
    getContentType,
    getDirectorInfo,
    getMainCast,
    getGenres,
    getIMDbRating,
    Content,
    isMovie,
} from '../../typings'
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/solid'

interface ContentMetadataProps {
    content: Content
    onDebugClick?: (e: React.MouseEvent) => void
    showDebugButton?: boolean
    isLoadingEnhancedData?: boolean
    onPersonClick?: () => void
}

export default function ContentMetadata({
    content,
    onDebugClick,
    showDebugButton = false,
    isLoadingEnhancedData = false,
    onPersonClick,
}: ContentMetadataProps) {
    if (!content) return null

    return (
        <div
            className="text-white space-y-4 sm:space-y-6"
            style={{ textShadow: '0 0 3px rgba(0, 0, 0, .8)' }}
        >
            {/* Title */}
            <h3
                className="text-xl xs:text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white"
                style={{
                    textShadow: '0 0 3px rgba(0, 0, 0, .8), 0 0 5px rgba(0, 0, 0, .9)',
                }}
            >
                {getTitle(content) || 'No Title Available'}
            </h3>

            {/* Debug Button */}
            {showDebugButton && onDebugClick && (
                <button
                    className="px-3 py-2 sm:px-4 sm:py-2 bg-gray-800/80 hover:bg-gray-700/80 text-white rounded-md text-xs sm:text-sm font-medium transition-colors border border-gray-600/50 hover:border-gray-500"
                    onClick={onDebugClick}
                    title="Click to view JSON in modal, Ctrl+Click to open in new tab"
                >
                    📊 View API Data
                </button>
            )}

            {/* Year, Rating, Runtime, Type, TMDB Rating */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm sm:text-base md:text-lg font-medium">
                <span>{getYear(content)}</span>
                {getRating(content) && (
                    <>
                        <span className="text-gray-300">•</span>
                        <span className="border border-white/60 px-1 text-xs sm:text-sm">
                            {getRating(content)}
                        </span>
                    </>
                )}
                {getRuntime(content) && (
                    <>
                        <span className="text-gray-300">•</span>
                        <span className="text-xs sm:text-sm md:text-base">
                            {getRuntime(content)}
                        </span>
                    </>
                )}
                <span className="text-gray-300">•</span>
                <span className="text-xs sm:text-sm md:text-base">{getContentType(content)}</span>
                {/* TMDB Rating - Always available from initial API call */}
                {content.vote_average > 0 && (
                    <>
                        <span className="text-gray-300">•</span>
                        <span className="text-xs sm:text-sm md:text-base text-yellow-400">
                            ⭐ {content.vote_average.toFixed(1)}
                        </span>
                    </>
                )}
                {/* IMDb Link - Only after detailed data loads */}
                {getIMDbRating(content).url && (
                    <>
                        <span className="text-gray-300">•</span>
                        <a
                            href={getIMDbRating(content).url!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-yellow-400 hover:text-yellow-300 underline text-xs sm:text-sm md:text-base flex items-center gap-1"
                        >
                            <span>IMDb</span>
                            <ArrowTopRightOnSquareIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                        </a>
                    </>
                )}
            </div>

            {/* Overview */}
            {content.overview && (
                <p className="text-gray-200 text-base leading-relaxed line-clamp-3">
                    {content.overview}
                </p>
            )}

            {/* Director & Cast - Show skeleton only while loading, hide if data loaded but empty */}
            <div className="space-y-2 text-sm">
                {/* Director - show if exists, or show skeleton if still loading */}
                {(() => {
                    const director = getDirectorInfo(content)
                    if (director) {
                        return (
                            <div>
                                <span className="text-gray-400">Director: </span>
                                <Link
                                    href={`/person/${director.id}`}
                                    className="text-white hover:text-red-400 hover:underline transition-colors"
                                    onClick={onPersonClick}
                                >
                                    {director.name}
                                </Link>
                            </div>
                        )
                    }
                    if (isLoadingEnhancedData) {
                        return (
                            <div className="animate-pulse">
                                <span className="text-gray-400">Director: </span>
                                <span className="inline-block h-5 w-48 bg-gray-700/50 rounded"></span>
                            </div>
                        )
                    }
                    return null
                })()}

                {/* Cast - show if exists, or show skeleton if still loading */}
                {getMainCast(content, 3).length > 0 ? (
                    <div>
                        <span className="text-gray-400">Cast: </span>
                        <span className="text-white">
                            {getMainCast(content, 3).map((actor, index, array) => (
                                <span key={actor.id}>
                                    <Link
                                        href={`/person/${actor.id}`}
                                        className="hover:text-red-400 hover:underline transition-colors"
                                        onClick={onPersonClick}
                                    >
                                        {actor.name}
                                    </Link>
                                    {index < array.length - 1 && ', '}
                                </span>
                            ))}
                        </span>
                    </div>
                ) : isLoadingEnhancedData ? (
                    <div className="animate-pulse">
                        <span className="text-gray-400">Cast: </span>
                        <span className="inline-block h-5 w-64 bg-gray-700/50 rounded"></span>
                    </div>
                ) : null}

                {/* Genres - show if exists, or show skeleton if still loading */}
                {getGenres(content).length > 0 ? (
                    <div>
                        <span className="text-gray-400">Genres: </span>
                        <span className="text-white">
                            {getGenres(content).map((genre, index, array) => {
                                const mediaType = isMovie(content) ? 'movie' : 'tv'
                                return (
                                    <span key={genre.id}>
                                        <Link
                                            href={`/genres/${mediaType}/${genre.id}?name=${encodeURIComponent(genre.name)}`}
                                            className="hover:text-red-400 hover:underline transition-colors"
                                            onClick={onPersonClick}
                                        >
                                            {genre.name}
                                        </Link>
                                        {index < array.length - 1 && ', '}
                                    </span>
                                )
                            })}
                        </span>
                    </div>
                ) : isLoadingEnhancedData ? (
                    <div className="animate-pulse">
                        <span className="text-gray-400">Genres: </span>
                        <span className="inline-block h-5 w-56 bg-gray-700/50 rounded"></span>
                    </div>
                ) : null}
            </div>
        </div>
    )
}
