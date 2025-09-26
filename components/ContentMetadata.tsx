import React from 'react'
import {
    getTitle,
    getYear,
    getRating,
    getRuntime,
    getContentType,
    getDirector,
    getMainCast,
    getGenreNames,
    getIMDbRating,
    Content,
} from '../typings'

interface ContentMetadataProps {
    content: Content
    onDebugClick?: (e: React.MouseEvent) => void
    showDebugButton?: boolean
}

export default function ContentMetadata({
    content,
    onDebugClick,
    showDebugButton = false,
}: ContentMetadataProps) {
    if (!content) return null

    return (
        <div
            className="text-white space-y-4 sm:space-y-6"
            style={{ textShadow: '0 0 3px rgba(0, 0, 0, .8)' }}
        >
            {/* Title */}
            <h3
                className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white"
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

            {/* Year, Rating, Runtime, Type */}
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
            </div>

            {/* Overview */}
            {content.overview && (
                <p className="text-gray-200 text-base leading-relaxed line-clamp-3">
                    {content.overview}
                </p>
            )}

            {/* Director & Cast */}
            <div className="space-y-2 text-sm">
                {getDirector(content) && (
                    <div>
                        <span className="text-gray-400">Director: </span>
                        <span className="text-white">{getDirector(content)}</span>
                    </div>
                )}

                {getMainCast(content, 3).length > 0 && (
                    <div>
                        <span className="text-gray-400">Cast: </span>
                        <span className="text-white">
                            {getMainCast(content, 3)
                                .map((actor) => actor.name)
                                .join(', ')}
                        </span>
                    </div>
                )}

                {getGenreNames(content).length > 0 && (
                    <div>
                        <span className="text-gray-400">Genres: </span>
                        <span className="text-white">{getGenreNames(content).join(', ')}</span>
                    </div>
                )}

                {getIMDbRating(content).url && (
                    <div>
                        <span className="text-gray-400">IMDb: </span>
                        <a
                            href={getIMDbRating(content).url!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-yellow-400 hover:text-yellow-300 underline"
                        >
                            View on IMDb
                        </a>
                    </div>
                )}
            </div>
        </div>
    )
}
