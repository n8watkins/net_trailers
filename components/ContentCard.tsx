import React, { useRef, useState, useCallback } from 'react'
import { Content, getTitle, getYear, getContentType, isMovie } from '../typings'
import Image from 'next/image'
import {
    PlayIcon,
    PlusIcon,
    HandThumbUpIcon,
    EyeSlashIcon,
    EyeIcon,
} from '@heroicons/react/24/solid'
import { useAppStore } from '../stores/appStore'
import { prefetchMovieDetails } from '../utils/prefetchCache'
import useUserData from '../hooks/useUserData'
import { useToast } from '../hooks/useToast'
import ToolTipMod from './ToolTipMod'
import { useSetRecoilState } from 'recoil'
import { listModalState } from '../atoms/listModalAtom'

interface Props {
    content?: Content
    className?: string
    size?: 'small' | 'medium' | 'large'
}
function ContentCard({ content, className = '', size = 'medium' }: Props) {
    const posterImage = content?.poster_path
    const { openModal } = useAppStore()
    const {
        addLikedMovie,
        removeLikedMovie,
        isLiked,
        addHiddenMovie,
        removeHiddenMovie,
        isHidden,
        getListsContaining,
    } = useUserData()
    const { showContentHidden, showContentShown, showSuccess } = useToast()
    const setListModal = useSetRecoilState(listModalState)
    const [imageLoaded, setImageLoaded] = useState(false)
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const [showHoverActions, setShowHoverActions] = useState(false) // Show hover menu above bookmark button
    const [isCardHovered, setIsCardHovered] = useState(false) // Track card hover state

    // Check if content is liked, hidden, or in any lists
    const liked = content ? isLiked(content.id) : false
    const hidden = content ? isHidden(content.id) : false
    const listsContaining = content ? getListsContaining(content.id) : []
    const isInAnyList = listsContaining.length > 0

    const handleImageClick = () => {
        if (content) {
            // More info mode - autoPlay=true, autoPlayWithSound=false (starts muted)
            openModal(content, true, false)
        }
    }

    // Prefetch on hover (debounced to avoid fetching while user is just scrolling)
    const handleMouseEnter = useCallback(() => {
        if (!content) return
        setIsCardHovered(true)

        // Clear any existing timeout
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current)
        }

        // Wait 300ms before prefetching (user might just be passing by)
        hoverTimeoutRef.current = setTimeout(() => {
            const mediaType = content.media_type === 'tv' ? 'tv' : 'movie'
            prefetchMovieDetails(content.id, mediaType)
        }, 300)
    }, [content])

    const handleMouseLeave = useCallback(() => {
        setIsCardHovered(false)
        // Cancel prefetch if user leaves before timeout
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current)
            hoverTimeoutRef.current = null
        }
    }, [])

    // Size classes for image portion only
    const getImageSizeClasses = () => {
        switch (size) {
            case 'small':
                return 'w-[120px] h-[180px] sm:w-[140px] sm:h-[210px] md:w-[160px] md:h-[240px] lg:w-[180px] lg:h-[270px]'
            case 'large':
                return 'w-[200px] h-[300px] sm:w-[240px] sm:h-[360px] md:w-[280px] md:h-[420px] lg:w-[320px] lg:h-[480px] xl:w-[360px] xl:h-[540px]'
            case 'medium':
            default:
                return 'w-[160px] h-[240px] sm:w-[180px] sm:h-[270px] md:w-[200px] md:h-[300px] lg:w-[220px] lg:h-[330px] xl:w-[260px] xl:h-[390px]'
        }
    }

    // Total card size including text below
    const getCardSizeClasses = () => {
        switch (size) {
            case 'small':
                return 'w-[120px] sm:w-[140px] md:w-[160px] lg:w-[180px]'
            case 'large':
                return 'w-[200px] sm:w-[240px] md:w-[280px] lg:w-[320px] xl:w-[360px]'
            case 'medium':
            default:
                return 'w-[160px] sm:w-[180px] md:w-[200px] lg:w-[220px] xl:w-[260px]'
        }
    }

    return (
        <div
            className={`relative cursor-pointer transition-all duration-300 ease-out group
                       ${getCardSizeClasses()}
                       hover:z-40 ${className}
                       min-h-[340px] sm:min-h-[370px] md:min-h-[400px] lg:min-h-[430px] xl:min-h-[490px]`}
            onClick={handleImageClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* Image Container with Fixed Dimensions */}
            <div
                className={`relative ${getImageSizeClasses()} ${
                    isCardHovered ? 'scale-110' : 'scale-100'
                } transition-transform duration-300 ease-out origin-center`}
            >
                {/* Loading Skeleton */}
                {!imageLoaded && posterImage && (
                    <div className="w-full h-full bg-gray-800 rounded-md animate-pulse flex items-center justify-center">
                        <div className="w-8 h-8 border-2 border-gray-600 border-t-red-600 rounded-full animate-spin"></div>
                    </div>
                )}

                {/* Movie Poster with Red Glow */}
                {posterImage && (
                    <div
                        className={`relative w-full h-full
                                  transition-all duration-300 ease-out
                                  rounded-md overflow-hidden
                                  group-hover:shadow-[0_0_15px_rgba(220,38,38,0.4),0_0_30px_rgba(220,38,38,0.2)]
                                  group-hover:ring-1 group-hover:ring-red-500/50
                                  ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
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
                            className="rounded-md transition-all duration-300 select-none"
                            sizes="(max-width: 640px) 140px, (max-width: 768px) 160px, (max-width: 1024px) 180px, 240px"
                            priority={false}
                            onLoad={() => setImageLoaded(true)}
                        />

                        {/* Additional red glow overlay */}
                        <div
                            className="absolute inset-0 rounded-md
                                  transition-all duration-300 ease-out
                                  group-hover:shadow-[inset_0_0_10px_rgba(220,38,38,0.1)]"
                        ></div>
                    </div>
                )}

                {/* Hover Action Buttons */}
                {content && imageLoaded && (
                    <div
                        className={`absolute bottom-4 left-4 right-4
                              transition-all duration-300 ease-out
                              transform flex gap-3 ${
                                  isCardHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                              }`}
                    >
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                if (content) {
                                    // Watch mode - autoPlay=true, autoPlayWithSound=true (starts with sound)
                                    openModal(content, true, true)
                                }
                            }}
                            className="bg-black text-white font-bold
                                 px-4 py-1.5 md:px-6 md:py-2
                                 text-xs md:text-sm
                                 rounded-full hover:bg-red-700 hover:text-white hover:scale-105
                                 transition-all duration-200
                                 flex-1 flex items-center justify-center gap-1.5
                                 shadow-lg hover:shadow-xl hover:shadow-red-600/20
                                 border-2 border-red-500 hover:border-red-600
                                 group/watch"
                        >
                            <PlayIcon className="w-4 h-4" />
                            <span>Watch</span>
                        </button>

                        {/* Hover Menu with Bookmark Icon - Shows quick actions on hover */}
                        <div
                            className="relative flex items-end"
                            onMouseEnter={() => setShowHoverActions(true)}
                            onMouseLeave={() => setShowHoverActions(false)}
                        >
                            {/* Hover Action Buttons - Fade in above bookmark (vertical stack) */}
                            <div
                                className={`absolute bottom-full pb-1 right-0 flex flex-col gap-2 transition-all duration-300 ${
                                    showHoverActions
                                        ? 'opacity-100 translate-y-0'
                                        : 'opacity-0 translate-y-2 pointer-events-none'
                                }`}
                            >
                                {/* Like Button - Toggle */}
                                <ToolTipMod
                                    title={liked ? 'Remove from Liked' : 'Like'}
                                    placement="right"
                                >
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            if (content) {
                                                if (liked) {
                                                    removeLikedMovie(content.id)
                                                    showSuccess(
                                                        `Removed ${getTitle(content)} from Liked`
                                                    )
                                                } else {
                                                    addLikedMovie(content)
                                                    showSuccess(
                                                        `Added ${getTitle(content)} to Liked`
                                                    )
                                                }
                                            }
                                        }}
                                        className={`group/like p-3 rounded-full border-2 transition-all duration-200 ${
                                            liked
                                                ? 'border-white bg-black hover:bg-black'
                                                : 'border-white/40 bg-black/85 hover:bg-black hover:border-white'
                                        }`}
                                    >
                                        <HandThumbUpIcon
                                            className={`h-5 w-5 transition-colors duration-200 ${
                                                liked ? 'text-white' : 'text-white/60 group-hover/like:text-white'
                                            }`}
                                        />
                                    </button>
                                </ToolTipMod>

                                {/* Hide Button - Toggle */}
                                <ToolTipMod title={hidden ? 'Show' : 'Hide'} placement="right">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            if (content) {
                                                if (hidden) {
                                                    removeHiddenMovie(content.id)
                                                    showContentShown(
                                                        `${getTitle(content)} Shown`,
                                                        'Will appear in recommendations again'
                                                    )
                                                } else {
                                                    addHiddenMovie(content)
                                                    showContentHidden(
                                                        `${getTitle(content)} Hidden`,
                                                        'Hidden from recommendations',
                                                        () => removeHiddenMovie(content.id) // Undo callback
                                                    )
                                                }
                                            }
                                        }}
                                        className={`group/hide p-3 rounded-full border-2 transition-all duration-200 ${
                                            hidden
                                                ? 'border-orange-400/60 bg-orange-500/20 hover:bg-orange-500/30'
                                                : 'border-white/40 bg-black/85 hover:bg-black hover:border-white'
                                        }`}
                                    >
                                        {hidden ? (
                                            <EyeSlashIcon className="h-5 w-5 text-orange-400" />
                                        ) : (
                                            <EyeIcon className="h-5 w-5 text-white/60 group-hover/hide:text-white transition-colors duration-200" />
                                        )}
                                    </button>
                                </ToolTipMod>

                                {/* Add to List Button */}
                                <ToolTipMod title="Add to Lists" placement="right">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            if (content) {
                                                setListModal({
                                                    isOpen: true,
                                                    content: content,
                                                })
                                            }
                                        }}
                                        className="group/add p-3 rounded-full border-2 border-white/40 bg-black/85 hover:bg-black hover:border-white transition-all duration-200"
                                    >
                                        <PlusIcon className="h-5 w-5 text-white/60 group-hover/add:text-white transition-colors duration-200" />
                                    </button>
                                </ToolTipMod>
                            </div>

                            {/* Bookmark Icon - Visual trigger for hover menu */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                }}
                                className={`p-3 rounded-full border-2 transition-all duration-200 ${
                                    showHoverActions
                                        ? 'bg-red-600 border-red-500 text-black'
                                        : 'bg-black border-white/30 text-white hover:bg-red-600 hover:border-red-500 hover:text-black'
                                }`}
                            >
                                <svg
                                    className="w-5 h-5"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                                    />
                                </svg>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Star Rating - Top Left (Outside scaling container) */}
            {content && content.vote_average > 0 && imageLoaded && (
                <div
                    className={`absolute top-2 left-2 bg-black/80 backdrop-blur-sm rounded-full px-2 py-1 md:px-3 md:py-1.5 z-20
                          opacity-100 transition-all duration-300 ease-out ${
                              isCardHovered ? '-translate-x-3 -translate-y-4' : 'translate-x-0 translate-y-0'
                          }`}
                >
                    <div className="flex items-center gap-1">
                        <span className="text-yellow-400 text-sm">⭐</span>
                        <span className="text-white text-xs font-medium">
                            {content.vote_average.toFixed(1)}
                        </span>
                    </div>
                </div>
            )}

            {/* Media Type Pill - Top Right (Outside scaling container) */}
            {content && imageLoaded && (
                <div
                    className={`absolute top-3 right-3 z-20
                          opacity-100 transition-all duration-300 ease-out ${
                              isCardHovered ? 'translate-x-3 -translate-y-4' : 'translate-x-0 translate-y-0'
                          }`}
                >
                    <span
                        className={`px-1.5 py-0.5 md:px-3 md:py-1 text-xs md:text-base rounded-full backdrop-blur-sm ${
                            isMovie(content)
                                ? 'bg-gradient-to-br from-white to-gray-100 text-black font-bold border border-black'
                                : 'bg-gradient-to-br from-black to-gray-900 text-white font-medium border border-white'
                        }`}
                    >
                        {getContentType(content)}
                    </span>
                </div>
            )}

            {/* Movie Title and Year - Below Content Image */}
            {content && imageLoaded && (
                <div
                    className={`transition-all duration-300 ease-out
                              text-left relative z-30 bg-transparent p-2 min-h-[80px] mt-4 ${
                                  isCardHovered ? 'translate-y-2' : 'translate-y-0'
                              }`}
                >
                    <h3 className="text-white font-bold leading-tight mb-1 text-base text-left line-clamp-3">
                        {content ? getTitle(content) : 'No Title'}
                    </h3>
                    <p className="text-gray-400 font-medium leading-tight text-sm text-left">
                        {getYear(content)}
                    </p>
                </div>
            )}
        </div>
    )
}

export default ContentCard
