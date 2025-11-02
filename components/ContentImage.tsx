import React from 'react'
import { Content, getTitle, getYear, getContentType, isMovie } from '../typings'
import Image from 'next/image'
import { PlayIcon } from '@heroicons/react/24/solid'
import { useAppStore } from '../stores/appStore'
import WatchLaterButton from './WatchLaterButton'

type ContentImageVariant = 'thumbnail' | 'search' | 'favorites' | 'banner'

interface Props {
    content?: Content
    variant?: ContentImageVariant
    hideTitles?: boolean
    className?: string
    isSelected?: boolean
    showOverview?: boolean
    showRating?: boolean
}

function ContentImage({
    content,
    variant = 'thumbnail',
    hideTitles = false,
    className = '',
    isSelected = false,
    showOverview = false,
    showRating = false,
}: Props) {
    const posterImage = content?.poster_path
    const { openModal } = useAppStore()

    const handleImageClick = () => {
        if (content) {
            // More info mode - autoPlay=true, autoPlayWithSound=false (starts muted)
            openModal(content, true, false)
        }
    }

    const handlePlayClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (content) {
            // Play mode - autoPlay=true, autoPlayWithSound=true (starts with sound)
            openModal(content, true, true)
        }
    }

    // Render thumbnail variant (original ContentCard component functionality)
    if (variant === 'thumbnail') {
        return (
            <div
                className={`relative cursor-pointer transition-all duration-300 ease-out group
                           w-[160px] h-[240px]
                           sm:w-[180px] sm:h-[270px]
                           md:w-[200px] md:h-[300px]
                           lg:w-[220px] lg:h-[330px]
                           xl:w-[260px] xl:h-[390px]
                           hover:scale-110 hover:z-40 ${className}`}
                onClick={handleImageClick}
            >
                {/* Movie Poster with Red Glow */}
                {posterImage && (
                    <div
                        className="relative w-full h-full
                                  transition-all duration-300 ease-out
                                  rounded-md overflow-hidden
                                  group-hover:shadow-[0_0_15px_rgba(220,38,38,0.4),0_0_30px_rgba(220,38,38,0.2)]
                                  group-hover:ring-1 group-hover:ring-red-500/50"
                    >
                        <Image
                            src={`https://image.tmdb.org/t/p/w500${posterImage}`}
                            alt={
                                content
                                    ? `${getTitle(content)} ${getContentType(content)}`
                                    : 'Content poster'
                            }
                            fill
                            style={{ objectFit: 'cover' }}
                            className="rounded-md transition-all duration-300"
                            sizes="(max-width: 640px) 140px, (max-width: 768px) 160px, (max-width: 1024px) 180px, 240px"
                            priority={false}
                        />

                        {/* Additional red glow overlay */}
                        <div
                            className="absolute inset-0 rounded-md
                                      transition-all duration-300 ease-out
                                      group-hover:shadow-[inset_0_0_10px_rgba(220,38,38,0.1)]"
                        ></div>
                    </div>
                )}

                {/* Movie Title Overlay */}
                {content && !hideTitles && (
                    <div
                        className="absolute bottom-0 left-0 right-0 p-2 md:p-3 lg:p-4
                                  opacity-100 group-hover:opacity-0 transition-opacity duration-300"
                    >
                        <h3
                            className="text-white font-bold leading-tight
                                     text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl
                                     line-clamp-2"
                        >
                            {getTitle(content)}
                        </h3>
                    </div>
                )}

                {/* Hover Action Buttons */}
                {content && (
                    <div
                        className="absolute bottom-4 left-4 right-4
                                  opacity-0 group-hover:opacity-100
                                  transition-all duration-300 ease-out
                                  transform translate-y-4 group-hover:translate-y-0
                                  flex gap-3"
                    >
                        <button
                            onClick={handlePlayClick}
                            className="bg-black text-white font-bold
                                     px-4 py-1.5 md:px-6 md:py-2
                                     text-xs md:text-sm
                                     rounded-full hover:bg-red-700 hover:text-white hover:scale-[1.01]
                                     transition-all duration-200
                                     flex-1 flex items-center justify-center gap-1.5
                                     shadow-lg hover:shadow-xl hover:shadow-red-600/20
                                     border-2 border-red-500 hover:border-red-600
                                     group/watch"
                        >
                            <PlayIcon className="w-4 h-4 group-hover/watch:scale-105 transition-transform duration-200" />
                            <span>Watch</span>
                        </button>
                        <WatchLaterButton content={content} variant="thumbnail" />
                    </div>
                )}
            </div>
        )
    }

    // Render search variant (horizontal layout)
    if (variant === 'search') {
        return (
            <div
                className={`flex items-center rounded-lg p-4 cursor-pointer group border transition-all duration-300 ease-in-out ${
                    isSelected
                        ? 'bg-red-600/30 border-red-500/50 shadow-lg shadow-red-500/20'
                        : 'bg-gray-800/50 hover:bg-gray-700/50 border-transparent'
                } ${className}`}
                onClick={handleImageClick}
            >
                {/* Movie Poster */}
                <div className="flex-shrink-0 w-16 h-24 sm:w-20 sm:h-30 md:w-24 md:h-36 relative rounded-lg overflow-hidden bg-gray-700">
                    {posterImage ? (
                        <Image
                            src={`https://image.tmdb.org/t/p/w200${posterImage}`}
                            alt={getTitle(content)}
                            width={200}
                            height={300}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                                <path
                                    fillRule="evenodd"
                                    d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </div>
                    )}
                </div>

                {/* Content Details */}
                <div className="flex-1 ml-4 min-w-0">
                    {/* Title and Year */}
                    <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                            <h3 className="text-white font-semibold text-lg truncate group-hover:text-red-400 transition-colors">
                                {content ? getTitle(content) : 'Loading...'}
                            </h3>
                            <p className="text-gray-400 text-sm">
                                {content ? getYear(content) : ''}
                            </p>
                        </div>
                    </div>

                    {/* Rating, Media Type, and Overview */}
                    <div className="flex items-center gap-4 mb-2">
                        {/* Rating */}
                        {showRating && content && content.vote_average > 0 && (
                            <div className="flex items-center gap-1">
                                <span className="text-yellow-400">⭐</span>
                                <span className="text-white text-sm font-medium">
                                    {content.vote_average.toFixed(1)}
                                </span>
                            </div>
                        )}

                        {/* Media Type Badge */}
                        {content && (
                            <span
                                className={`
                                px-2 py-1 text-xs font-medium rounded-full
                                ${
                                    isMovie(content)
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-green-600 text-white'
                                }
                            `}
                            >
                                {getContentType(content)}
                            </span>
                        )}
                    </div>

                    {/* Overview */}
                    {showOverview && content && content.overview && (
                        <p className="text-gray-300 text-sm line-clamp-2 md:line-clamp-1">
                            {content.overview}
                        </p>
                    )}
                </div>
            </div>
        )
    }

    // Render favorites variant (grid layout)
    if (variant === 'favorites') {
        return (
            <div
                className={`relative group cursor-pointer transition-transform duration-200 hover:scale-105 ${className}`}
                onClick={handleImageClick}
            >
                <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-gray-800">
                    {posterImage ? (
                        <Image
                            src={`https://image.tmdb.org/t/p/w500${posterImage}`}
                            alt={getTitle(content)}
                            fill
                            sizes="(max-width: 640px) 140px, (max-width: 768px) 160px, (max-width: 1024px) 180px, 240px"
                            className="object-cover transition-transform duration-200 group-hover:scale-110"
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                                <div className="text-4xl mb-2">🎬</div>
                                <p className="text-xs text-gray-300">No Poster</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Content info */}
                {!hideTitles && content && (
                    <div className="mt-2">
                        <h3 className="text-sm font-medium text-white truncate">
                            {getTitle(content)}
                        </h3>
                        <p className="text-xs text-gray-400">{getYear(content)}</p>
                    </div>
                )}
            </div>
        )
    }

    // Default fallback to thumbnail variant
    return null
}

export default ContentImage
