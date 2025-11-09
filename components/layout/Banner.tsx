import React, { useState, useEffect, useCallback } from 'react'
import { Content, getTitle, getYear, getContentType } from '../../typings'
import Image from 'next/image'
import { BASE_URL } from '../../constants/movie'
import { PlayIcon } from '@heroicons/react/24/solid'
import { InformationCircleIcon } from '@heroicons/react/24/outline'
import { useAppStore } from '../../stores/appStore'
import useUserData from '../../hooks/useUserData'
import { filterDislikedContent } from '../../utils/contentFilter'
import SmartSearchInput from '../smartSearch/SmartSearchInput'

interface Props {
    trending: Content[]
    variant?: 'default' | 'compact'
}

//pass props to Banner component
function Banner({ trending, variant = 'default' }: Props) {
    const { openModal } = useAppStore()
    const { hiddenMovies } = useUserData()

    const [currentIndex, setCurrentIndex] = useState(0)
    const [carouselContent, setCarouselContent] = useState<Content[]>([])
    const [isTransitioning, setIsTransitioning] = useState(false)
    const [imagesLoaded, setImagesLoaded] = useState<Set<number>>(new Set())

    // Select 5 random items for carousel and preload images
    useEffect(() => {
        if (trending.length > 0) {
            // Filter out disliked content first
            const filteredTrending = filterDislikedContent(trending, hiddenMovies)

            if (filteredTrending.length > 0) {
                // Fisher-Yates shuffle algorithm for unbiased randomization
                const shuffled = [...filteredTrending]
                for (let i = shuffled.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1))
                    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
                }
                const selected = shuffled.slice(0, Math.min(5, filteredTrending.length))
                setCarouselContent(selected)

                // Preload all carousel images
                selected.forEach((content, index) => {
                    const imgUrl = content.backdrop_path || content.poster_path
                    if (imgUrl) {
                        const img = new window.Image()
                        img.onload = () => {
                            setImagesLoaded((prev) => new Set(prev).add(index))
                        }
                        img.src = `${BASE_URL}/${imgUrl}`
                    }
                })
            } else {
                // No content available after filtering
                setCarouselContent([])
            }
        }
    }, [trending, hiddenMovies])

    // Auto-advance carousel every 8 seconds with smooth transition
    useEffect(() => {
        if (carouselContent.length <= 1) return

        const interval = setInterval(() => {
            setIsTransitioning(true)
            setTimeout(() => {
                setCurrentIndex((prev) => (prev + 1) % carouselContent.length)
                setTimeout(() => setIsTransitioning(false), 300) // Longer delay for fade in
            }, 300) // Fade out duration
        }, 8000)

        return () => clearInterval(interval)
    }, [carouselContent.length])

    const goToSlide = useCallback(
        (index: number) => {
            if (index === currentIndex) return
            setIsTransitioning(true)
            setTimeout(() => {
                setCurrentIndex(index)
                setTimeout(() => setIsTransitioning(false), 300) // Longer delay for fade in
            }, 300) // Fade out duration
        },
        [currentIndex]
    )

    const featuredContent = carouselContent[currentIndex] || null
    const isCurrentImageLoaded = imagesLoaded.has(currentIndex)

    const contentImgUrl = featuredContent?.backdrop_path || featuredContent?.poster_path
    return (
        <>
            {/* AI-Powered Smart Search Overlay - Position varies by variant */}
            <div
                className={`absolute inset-0 flex justify-center pointer-events-none z-20 ${
                    variant === 'compact'
                        ? 'items-start pt-64 sm:pt-72 md:pt-80 lg:pt-96 xl:pt-[26rem]'
                        : 'items-center'
                }`}
            >
                <div className="w-full max-w-3xl px-4 sm:px-6 md:px-8 pointer-events-auto">
                    <SmartSearchInput />
                </div>
            </div>

            {/* background image with mobile-responsive container */}
            <div className="absolute inset-0 -z-10 font-sans overflow-hidden">
                {contentImgUrl && isCurrentImageLoaded && (
                    <div className="relative w-full h-full">
                        <Image
                            src={`${BASE_URL}/${
                                featuredContent?.backdrop_path || featuredContent?.poster_path
                            }`}
                            alt={
                                featuredContent
                                    ? `${getTitle(featuredContent)} backdrop`
                                    : 'Content backdrop'
                            }
                            fill
                            quality={100}
                            priority
                            sizes="100vw"
                            style={{
                                objectFit: 'cover',
                                objectPosition: 'center center',
                            }}
                            className={`select-none transition-opacity duration-300 ${
                                isTransitioning ? 'opacity-0' : 'opacity-100'
                            }`}
                        />
                    </div>
                )}
                {/* Bottom gradient - VARIANT SPECIFIC */}
                <div
                    className={`absolute bottom-0 left-0 right-0 pointer-events-none ${
                        variant === 'compact'
                            ? 'h-[85vh] bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a] 30% via-[#0a0a0a]/90 50% via-[#0a0a0a]/50 60% to-transparent 75%'
                            : 'h-[32rem] bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/80 50% via-[#0a0a0a]/60 70% to-transparent'
                    }`}
                ></div>
            </div>

            {/* movie info background gradient */}
            <div
                className={`absolute inset-0 flex flex-col px-4 sm:px-6 md:px-10 lg:px-16 xl:px-20 ${
                    variant === 'compact'
                        ? 'justify-start pt-32 sm:pt-36 md:pt-40 lg:pt-44 xl:pt-48 bg-gradient-to-r from-[#0a0a0a]/90 to-transparent'
                        : 'justify-center bg-gradient-to-r from-[#0a0a0a]/90 to-transparent'
                }`}
            >
                <div
                    className={`max-w-xl lg:max-w-2xl space-y-3 sm:space-y-4 md:space-y-6 transition-all duration-300 ease-in-out ${
                        isTransitioning
                            ? 'opacity-0 transform translate-y-4'
                            : 'opacity-100 transform translate-y-0'
                    }`}
                >
                    {featuredContent ? (
                        <>
                            <h1 className="text-xl sm:text-2xl md:text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight">
                                {getTitle(featuredContent)}
                            </h1>
                            <div className="flex items-center space-x-2 mb-2">
                                <span className="text-xs md:text-sm text-gray-300">
                                    {getContentType(featuredContent)}
                                </span>
                                <span className="text-xs md:text-sm text-gray-300">
                                    {getYear(featuredContent)}
                                </span>
                            </div>
                            <p className="text-xs md:text-base lg:text-lg leading-relaxed text-gray-200 max-w-lg lg:max-w-xl">
                                {truncateString(featuredContent?.overview)}
                            </p>
                        </>
                    ) : (
                        <>
                            {/* Skeleton for title */}
                            <div className="h-8 sm:h-10 md:h-12 lg:h-14 xl:h-16 w-3/4"></div>
                            {/* Skeleton for metadata */}
                            <div className="h-4 md:h-5 w-32 mb-2"></div>
                            {/* Skeleton for description - multiple lines */}
                            <div className="space-y-2 max-w-lg lg:max-w-xl">
                                <div className="h-4 md:h-5 lg:h-6 w-full"></div>
                                <div className="h-4 md:h-5 lg:h-6 w-full"></div>
                                <div className="h-4 md:h-5 lg:h-6 w-3/4"></div>
                            </div>
                        </>
                    )}

                    {/* Buttons*/}
                    <div className="flex gap-2 sm:gap-3 md:gap-4 pt-3 md:pt-4">
                        <button
                            className="bannerButton bg-white text-black hover:bg-white/80 transition-all duration-200 font-bold"
                            onClick={() => {
                                if (featuredContent) {
                                    // Play mode - autoPlay=true, autoPlayWithSound=true (starts with sound)
                                    openModal(featuredContent, true, true)
                                }
                            }}
                        >
                            <PlayIcon className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 lg:h-7 lg:w-7" />
                            <span className="text-xs sm:text-sm md:text-base lg:text-lg">Play</span>
                        </button>
                        <button
                            className="bannerButton bg-gray-600/70 text-white hover:bg-gray-600/50 transition-all duration-200 font-semibold backdrop-blur-sm"
                            onClick={() => {
                                if (featuredContent) {
                                    // More info mode - autoPlay=true, autoPlayWithSound=false (starts muted)
                                    openModal(featuredContent, true, false)
                                }
                            }}
                        >
                            <InformationCircleIcon className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 lg:h-7 lg:w-7" />
                            <span className="text-xs sm:text-sm md:text-base lg:text-lg">
                                More Info
                            </span>
                        </button>
                    </div>
                </div>

                {/* Image-based pagination - hidden on mobile/tablet, higher on desktop */}
                {carouselContent.length > 1 && (
                    <div
                        className={`hidden lg:flex absolute right-4 sm:right-6 md:right-8 lg:right-12 space-x-4 z-20 ${
                            variant === 'compact'
                                ? 'bottom-[45vh] xl:bottom-[47vh]'
                                : 'bottom-24 xl:bottom-32'
                        }`}
                    >
                        {carouselContent.map((content, index) => (
                            <button
                                key={index}
                                onClick={() => goToSlide(index)}
                                className={`relative transition-all duration-300 rounded-md overflow-hidden ${
                                    index === currentIndex
                                        ? 'w-16 h-24 sm:w-20 sm:h-30 md:w-24 md:h-36 ring-1 ring-red-500/50 shadow-[0_0_15px_rgba(220,38,38,0.4),0_0_30px_rgba(220,38,38,0.2)]'
                                        : 'w-12 h-18 sm:w-14 sm:h-21 md:w-16 md:h-24 hover:scale-105 shadow-[0_0_8px_rgba(0,0,0,0.3)]'
                                }`}
                                style={{
                                    opacity: isTransitioning && index === currentIndex ? 0.7 : 1,
                                    transform:
                                        index === currentIndex
                                            ? 'scale(1.1) translateY(-12px)'
                                            : 'scale(1)',
                                    transformOrigin: 'center center',
                                }}
                                aria-label={`Go to slide ${index + 1}: ${getTitle(content)}`}
                            >
                                {/* Movie poster image */}
                                <Image
                                    src={`${BASE_URL}/${content.poster_path || content.backdrop_path}`}
                                    alt={`${getTitle(content)} poster`}
                                    fill
                                    quality={100}
                                    className="object-cover select-none"
                                    sizes="(max-width: 640px) 200px, (max-width: 768px) 200px, 200px"
                                />

                                {/* Overlay for non-selected items */}
                                {index !== currentIndex && (
                                    <div className="absolute inset-0 bg-black/60 hover:bg-black/40 transition-all duration-300"></div>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </>
    )
}
//helper function to truncate string to 300 characters
const truncateString = (str: string | undefined) => {
    const maxStringLength = 210
    if (str === undefined) return ''
    if (str.length <= maxStringLength) {
        return str
    } else {
        const truncated = str.substring(0, maxStringLength)
        const lastPeriod = truncated.lastIndexOf('.')
        if (lastPeriod === -1) {
            return truncated + '...'
        } else {
            return truncated.substring(0, lastPeriod)
        }
    }
}

export default Banner
