import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Content, getTitle, getYear, getContentType } from '../../typings'
import Image from 'next/image'
import { PlayIcon } from '@heroicons/react/24/solid'
import { InformationCircleIcon } from '@heroicons/react/24/outline'
import { useModalStore } from '../../stores/modalStore'
import { filterDislikedContent } from '../../utils/contentFilter'
import SmartSearchInput from '../smartSearch/SmartSearchInput'
import { useSessionStore } from '@/stores/sessionStore'
import { useAuthStore } from '@/stores/authStore'
import { useGuestStore } from '@/stores/guestStore'

interface Props {
    trending: Content[]
    variant?: 'default' | 'compact'
}

// TMDB's own sizes: next/image resizes from these instead of the multi-megabyte originals
const BACKDROP_BASE = 'https://image.tmdb.org/t/p/w1280'
const POSTER_BASE = 'https://image.tmdb.org/t/p/w342'
const CAROUSEL_SIZE = 5

//pass props to Banner component
function Banner({ trending, variant = 'default' }: Props) {
    const { openModal } = useModalStore()
    const sessionType = useSessionStore((state) => state.sessionType)
    const authHiddenMovies = useAuthStore((state) => state.hiddenMovies)
    const guestHiddenMovies = useGuestStore((state) => state.hiddenMovies)
    const hiddenMovies = sessionType === 'authenticated' ? authHiddenMovies : guestHiddenMovies

    const [currentIndex, setCurrentIndex] = useState(0)
    const [isTransitioning, setIsTransitioning] = useState(false)

    // Ref to store the interval ID for auto-advance
    const intervalRef = useRef<NodeJS.Timeout | null>(null)

    // The top trending titles, in order: the same list on the server and the client,
    // so the hero is in the server-rendered HTML and paints without waiting for JS.
    // (A random pick after hydration made the largest paint wait for the whole app.)
    const carouselContent = useMemo(
        () => filterDislikedContent(trending, hiddenMovies).slice(0, CAROUSEL_SIZE),
        [trending, hiddenMovies]
    )

    useEffect(() => {
        if (currentIndex >= carouselContent.length) setCurrentIndex(0)
    }, [carouselContent.length, currentIndex])

    // Helper function to start the auto-advance timer
    const startAutoAdvance = useCallback(() => {
        // Clear any existing interval
        if (intervalRef.current) {
            clearInterval(intervalRef.current)
        }

        // Only start if we have multiple items
        if (carouselContent.length <= 1) return

        // Create new interval
        intervalRef.current = setInterval(() => {
            setIsTransitioning(true)
            setTimeout(() => {
                setCurrentIndex((prev) => (prev + 1) % carouselContent.length)
                setTimeout(() => setIsTransitioning(false), 300) // Longer delay for fade in
            }, 300) // Fade out duration
        }, 8000)
    }, [carouselContent.length])

    // Auto-advance carousel every 8 seconds with smooth transition
    useEffect(() => {
        startAutoAdvance()

        // Cleanup on unmount or when dependencies change
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
                intervalRef.current = null
            }
        }
    }, [startAutoAdvance])

    const goToSlide = useCallback(
        (index: number) => {
            if (index === currentIndex) return
            setIsTransitioning(true)
            setTimeout(() => {
                setCurrentIndex(index)
                setTimeout(() => setIsTransitioning(false), 300) // Longer delay for fade in
            }, 300) // Fade out duration

            // Reset the auto-advance timer when user manually clicks
            startAutoAdvance()
        },
        [currentIndex, startAutoAdvance]
    )

    const featuredContent = carouselContent[currentIndex] || null

    const contentImgUrl = featuredContent?.backdrop_path || featuredContent?.poster_path

    return (
        <>
            {/* AI-Powered Smart Search Overlay - Position varies by variant */}
            {/* background image with mobile-responsive container */}
            <div className="absolute inset-0 z-0 font-sans overflow-hidden">
                {contentImgUrl && (
                    <div className="relative w-full h-full">
                        <Image
                            src={
                                featuredContent?.backdrop_path
                                    ? `${BACKDROP_BASE}${featuredContent.backdrop_path}`
                                    : `${POSTER_BASE}${featuredContent?.poster_path}`
                            }
                            alt={
                                featuredContent
                                    ? `${getTitle(featuredContent)} backdrop`
                                    : 'Content backdrop'
                            }
                            fill
                            priority={currentIndex === 0}
                            fetchPriority={currentIndex === 0 ? 'high' : 'auto'}
                            sizes="100vw"
                            style={{
                                objectFit: 'cover',
                            }}
                            className={`select-none transition-opacity duration-300 object-[10%_center] sm:object-[15%_center] md:object-center ${
                                isTransitioning ? 'opacity-0' : 'opacity-100'
                            }`}
                        />
                    </div>
                )}
                {/* Scrim: keeps the title and description readable on bright backdrops */}
                <div className="absolute inset-0 pointer-events-none bg-black/30" />
                <div className="absolute inset-y-0 left-0 w-full md:w-3/4 pointer-events-none bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
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
            {/* Mobile: hero text pushed higher to make room for smart search below */}
            <div
                className={`absolute inset-0 flex flex-col px-4 sm:px-6 md:px-10 lg:px-16 xl:px-20 ${
                    variant === 'compact'
                        ? 'justify-start pt-28 xs:pt-32 sm:pt-36 md:pt-40 lg:pt-44 xl:pt-48 bg-gradient-to-r from-[#0a0a0a]/90 to-transparent'
                        : 'justify-start pt-24 xs:pt-28 sm:pt-32 md:justify-center md:pt-0 bg-gradient-to-r from-[#0a0a0a]/90 to-transparent'
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
                            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight [text-shadow:0_2px_12px_rgb(0_0_0/0.6)]">
                                {getTitle(featuredContent)}
                            </h1>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="px-3 py-1.5 text-sm md:text-base bg-zinc-800/70 backdrop-blur-sm border border-zinc-700/50 rounded-full text-gray-200 font-semibold">
                                    {getContentType(featuredContent)}
                                </span>
                                <span className="px-3 py-1.5 text-sm md:text-base bg-zinc-800/70 backdrop-blur-sm border border-zinc-700/50 rounded-full text-gray-200 font-semibold">
                                    {getYear(featuredContent)}
                                </span>
                            </div>
                            <p className="text-sm md:text-base lg:text-lg leading-relaxed text-gray-100 max-w-lg lg:max-w-xl line-clamp-4 md:line-clamp-none [text-shadow:0_1px_8px_rgb(0_0_0/0.7)]">
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
                            className="bannerButton bg-white text-black hover:bg-white/90 hover:scale-105 transition-all duration-200 font-bold"
                            onClick={() => {
                                if (featuredContent) {
                                    // Play mode - autoPlay=true, autoPlayWithSound=true (starts with sound)
                                    openModal(featuredContent, true, true)
                                }
                            }}
                        >
                            <PlayIcon className="h-5 w-5 md:h-6 md:w-6 lg:h-7 lg:w-7" />
                            <span className="text-sm md:text-base lg:text-lg">Play</span>
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
                            <InformationCircleIcon className="h-5 w-5 md:h-6 md:w-6 lg:h-7 lg:w-7" />
                            <span className="text-sm md:text-base lg:text-lg">More Info</span>
                        </button>
                    </div>
                </div>

                {/* AI mood search sits under the actions so it never covers the title.
                    Outside the fading block so typing is not interrupted by slide changes. */}
                <div id="mood-search" className="relative z-20 w-full max-w-2xl pt-5 md:pt-8">
                    <SmartSearchInput />
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
                                        ? 'w-16 h-24 sm:w-20 sm:h-30 md:w-24 md:h-36 ring-1 ring-amber-400/50 shadow-[0_0_15px_rgba(245,158,11,0.4),0_0_30px_rgba(245,158,11,0.2)]'
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
                                    src={
                                        content.poster_path
                                            ? `${POSTER_BASE}${content.poster_path}`
                                            : `${BACKDROP_BASE}${content.backdrop_path}`
                                    }
                                    alt={`${getTitle(content)} poster`}
                                    fill
                                    className="object-cover select-none"
                                    sizes="96px"
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
