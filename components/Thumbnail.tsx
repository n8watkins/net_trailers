import React, { useRef, useState } from 'react'
import { Content, getTitle, getYear, getContentType, isMovie } from '../typings'
import Image from 'next/image'
import { useRecoilState } from 'recoil'
import { PlayIcon } from '@heroicons/react/24/solid'
import { modalState, movieState, autoPlayWithSoundState } from '../atoms/modalAtom'
import WatchLaterButton from './WatchLaterButton'

interface Props {
    content?: Content
    className?: string
    size?: 'small' | 'medium' | 'large'
}
function Thumbnail({ content, className = '', size = 'medium' }: Props) {
    const posterImage = content?.poster_path
    const [showModal, setShowModal] = useRecoilState(modalState)
    const [currentContent, setCurrentContent] = useRecoilState(movieState)
    const [autoPlayWithSound, setAutoPlayWithSound] = useRecoilState(autoPlayWithSoundState)
    const [imageLoaded, setImageLoaded] = useState(false)

    const handleImageClick = () => {
        if (content) {
            setAutoPlayWithSound(false) // More info mode - starts muted
            setShowModal(true)
            setCurrentContent(content)
        }
    }

    // Size classes based on size prop
    const getSizeClasses = () => {
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

    return (
        <div
            className={`relative cursor-pointer transition-all duration-300 ease-out group
                       ${getSizeClasses()}
                       hover:scale-110 hover:z-40 ${className}`}
            onClick={handleImageClick}
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
                        className="rounded-md transition-all duration-300"
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

            {/* Star Rating - Top Left */}
            {content && content.vote_average > 0 && imageLoaded && (
                <div
                    className="absolute top-2 left-2 bg-black/80 backdrop-blur-sm rounded-md px-2 py-1 z-20
                              opacity-100 group-hover:opacity-0 transition-opacity duration-300"
                >
                    <div className="flex items-center gap-1">
                        <span className="text-yellow-400 text-sm">⭐</span>
                        <span className="text-white text-xs font-medium">
                            {content.vote_average.toFixed(1)}
                        </span>
                    </div>
                </div>
            )}

            {/* Media Type Pill - Top Right */}
            {content && imageLoaded && (
                <div
                    className="absolute top-2 right-2 z-20
                              opacity-100 group-hover:opacity-0 transition-opacity duration-300"
                >
                    <span className="px-2 py-1 text-xs font-medium rounded-full backdrop-blur-sm bg-red-600/90 text-white">
                        {getContentType(content)}
                    </span>
                </div>
            )}

            {/* Hover Action Buttons */}
            {content && imageLoaded && (
                <div
                    className="absolute bottom-4 left-4 right-4
                              opacity-0 group-hover:opacity-100
                              transition-all duration-300 ease-out
                              transform translate-y-4 group-hover:translate-y-0
                              flex gap-3"
                >
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            setAutoPlayWithSound(true)
                            setShowModal(true)
                            setCurrentContent(content || null)
                        }}
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

            {/* Movie Title and Year - Below Thumbnail */}
            {content && imageLoaded && (
                <div
                    className="mt-2 transition-all duration-300 ease-out
                              group-hover:mt-3 group-hover:scale-105 text-left"
                >
                    <h3 className="text-white font-bold leading-tight mb-1 text-base bg-black/60 px-2 py-1 rounded text-left">
                        {content?.title || content?.name || 'No Title'}
                    </h3>
                    <p className="text-gray-400 font-medium leading-tight text-sm text-left px-2">
                        {getYear(content)}
                    </p>
                </div>
            )}
        </div>
    )
}

export default Thumbnail
