import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Content, getTitle, getYear, getContentType } from '../../typings'
import Image from 'next/image'
import { BASE_URL } from '../../constants/movie'
import { PlayIcon } from '@heroicons/react/24/solid'
import { InformationCircleIcon } from '@heroicons/react/24/outline'
import { useModalStore } from '../../stores/modalStore'
import { filterDislikedContent } from '../../utils/contentFilter'
import SmartSearchInput from '../smartSearch/SmartSearchInput'
import { bannerLog } from '../../utils/debugLogger'
import { useSessionStore } from '@/stores/sessionStore'
import { useAuthStore } from '@/stores/authStore'
import { useGuestStore } from '@/stores/guestStore'

interface Props {
    trending: Content[]
    variant?: 'default' | 'compact'
    onHeroImageLoaded?: () => void // Callback when the first hero image is loaded
}

//pass props to Banner component
function Banner({ trending, variant = 'default', onHeroImageLoaded }: Props) {
    const { openModal } = useModalStore()
    const sessionType = useSessionStore((state) => state.sessionType)
    const authHiddenMovies = useAuthStore((state) => state.hiddenMovies)
    const guestHiddenMovies = useGuestStore((state) => state.hiddenMovies)
    const hiddenMovies = sessionType === 'authenticated' ? authHiddenMovies : guestHiddenMovies

    const [currentIndex, setCurrentIndex] = useState(0)
    const [carouselContent, setCarouselContent] = useState<Content[]>([])
    const [isTransitioning, setIsTransitioning] = useState(false)
    const [imagesLoaded, setImagesLoaded] = useState<Set<number>>(new Set())

    // Ref to store the interval ID for auto-advance
    const intervalRef = useRef<NodeJS.Timeout | null>(null)

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
                    if (!imgUrl) return

                    const img = new window.Image()
                    img.onload = () => {
                        setImagesLoaded((prev) => new Set(prev).add(index))
                    }
                    img.onerror = () => {
                        console.warn(`Failed to preload image: ${imgUrl}`)
                        setImagesLoaded((prev) => new Set(prev).add(index))
                    }
                    img.src = `${BASE_URL}/${imgUrl}`
                })
            } else {
                // No content available after filtering
                setCarouselContent([])
            }
        }
    }, [trending, hiddenMovies])

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
    const isCurrentImageLoaded = imagesLoaded.has(currentIndex)

    const contentImgUrl = featuredContent?.backdrop_path || featuredContent?.poster_path

    // If hero slide has no image at all, don't block the rest of the page
    useEffect(() => {
        if (currentIndex === 0 && !contentImgUrl && onHeroImageLoaded) {
            onHeroImageLoaded()
        }
    }, [contentImgUrl, currentIndex, onHeroImageLoaded])

    // Debug logging
    if (featuredContent) {
        bannerLog('Banner Debug:', {
            hasContent: !!featuredContent,
            contentImgUrl,
            isCurrentImageLoaded,
            currentIndex,
            carouselLength: carouselContent.length,
            imagesLoadedSet: Array.from(imagesLoaded),
        })
    }

    return (
        <>
            {/* Atmospheric Background Layers - Fixed */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute inset-0 bg-black" />
                {/* Radial spotlight gradient (Netflix red theme) */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[800px] bg-gradient-radial from-red-900/15 via-transparent to-transparent opacity-50" />
                {/* Vignette overlay for depth */}
                <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black opacity-60" />
                {/* Subtle film grain texture */}
                <div
                    className="absolute inset-0 opacity-[0.015]"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                    }}
                />
            </div>

            {/* AI-Powered Smart Search Overlay - Position varies by variant */}
            {/* Mobile: pushed lower to avoid hero text, Desktop: centered */}
            <div
                className={`absolute inset-0 flex justify-center pointer-events-none z-20 ${
                    variant === 'compact'
                        ? 'items-start pt-64 sm:pt-72 md:pt-80 lg:pt-96 xl:pt-[26rem]'
                        : 'items-end pb-32 sm:pb-36 md:items-center md:pb-0'
                }`}
            >
                <div className="w-full max-w-4xl px-4 sm:px-6 md:px-8 pointer-events-auto">
                    <SmartSearchInput />
                </div>
            </div>

            {/* background image with mobile-responsive container */}
            <div className="absolute inset-0 z-0 font-sans overflow-hidden">
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
                            }}
                            className={`select-none transition-all duration-500 ease-out object-[10%_center] sm:object-[15%_center] md:object-center ${
                                isTransitioning
                                    ? 'opacity-0 scale-105 blur-sm'
                                    : 'opacity-100 scale-100 blur-0'
                            }`}
                            onLoad={() => {
                                // Ensure callback is called when Next.js Image actually renders
                                if (currentIndex === 0 && onHeroImageLoaded) {
                                    onHeroImageLoaded()
                                }
                            }}
                            onError={() => {
                                console.warn('Failed to load banner hero image')
                                if (currentIndex === 0 && onHeroImageLoaded) {
                                    onHeroImageLoaded()
                                }
                            }}
                        />
                    </div>
                )}
                {/* Enhanced Bottom Gradient with Vignetting - VARIANT SPECIFIC */}
                <div
                    className={`absolute bottom-0 left-0 right-0 pointer-events-none ${
                        variant === 'compact'
                            ? 'h-[85vh] bg-gradient-to-t from-black via-black 30% via-black/95 45% via-black/70 60% to-transparent 75%'
                            : 'h-[40rem] bg-gradient-to-t from-black via-black/95 40% via-black/75 60% via-black/50 75% to-transparent'
                    }`}
                />
                {/* Additional edge vignetting for cinematic depth */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent 20% to-transparent pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent 25% via-transparent 75% to-black/60 pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-l from-black/40 via-transparent 30% to-transparent pointer-events-none" />
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
                    className={`max-w-xl lg:max-w-2xl space-y-3 sm:space-y-4 md:space-y-6 transition-all duration-500 ease-out ${
                        isTransitioning
                            ? 'opacity-0 transform translate-y-6 scale-95'
                            : 'opacity-100 transform translate-y-0 scale-100'
                    }`}
                >
                    {featuredContent ? (
                        <>
                            {/* Enhanced Title with Gradient and Glow */}
                            <h1 className="text-xl sm:text-2xl md:text-4xl lg:text-5xl xl:text-6xl font-black leading-tight tracking-tight">
                                <span className="bg-gradient-to-r from-white via-gray-100 to-white bg-clip-text text-transparent drop-shadow-[0_4px_12px_rgba(0,0,0,0.7)]">
                                    {getTitle(featuredContent)}
                                </span>
                                {/* Subtle text glow behind title */}
                                <div className="absolute inset-0 bg-white/5 blur-3xl -z-10" />
                            </h1>

                            {/* Enhanced Metadata with Glassy Pills */}
                            <div className="flex items-center gap-2 mb-2">
                                <span className="px-3 py-1 text-xs md:text-sm bg-zinc-900/60 backdrop-blur-md border border-zinc-700/50 rounded-full text-gray-200 font-semibold">
                                    {getContentType(featuredContent)}
                                </span>
                                <span className="px-3 py-1 text-xs md:text-sm bg-zinc-900/60 backdrop-blur-md border border-zinc-700/50 rounded-full text-gray-200 font-semibold">
                                    {getYear(featuredContent)}
                                </span>
                            </div>

                            {/* Enhanced Description with Background Container */}
                            <div className="bg-black/30 backdrop-blur-sm rounded-lg p-4 max-w-lg lg:max-w-xl border border-white/5">
                                <p className="text-xs md:text-base lg:text-lg leading-relaxed text-gray-100 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                                    {truncateString(featuredContent?.overview)}
                                </p>
                            </div>
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

                    {/* Premium Buttons with Netflix-Red Theme */}
                    <div className="flex gap-2 sm:gap-3 md:gap-4 pt-3 md:pt-4">
                        {/* Play Button - Netflix Red with Shimmer */}
                        <button
                            className="group relative bannerButton bg-gradient-to-r from-red-600 via-red-700 to-red-900 text-white font-black transition-all duration-300 hover:scale-105 shadow-[0_0_30px_rgba(220,38,38,0.5)] hover:shadow-[0_0_50px_rgba(220,38,38,0.7)] overflow-hidden border border-red-500/30"
                            onClick={() => {
                                if (featuredContent) {
                                    // Play mode - autoPlay=true, autoPlayWithSound=true (starts with sound)
                                    openModal(featuredContent, true, true)
                                }
                            }}
                        >
                            <PlayIcon className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 lg:h-7 lg:w-7 relative z-10" />
                            <span className="text-xs sm:text-sm md:text-base lg:text-lg relative z-10">
                                Play
                            </span>
                            {/* Shimmer effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
                        </button>

                        {/* More Info Button - Glassy */}
                        <button
                            className="bannerButton bg-zinc-900/60 backdrop-blur-lg border border-zinc-700/50 text-white font-semibold transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:bg-zinc-800/70 hover:border-zinc-600"
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

                {/* Enhanced Image-based Pagination - Premium Glow Effects */}
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
                                className={`group relative transition-all duration-500 ease-out rounded-lg overflow-hidden ${
                                    index === currentIndex
                                        ? 'w-16 h-24 sm:w-20 sm:h-30 md:w-24 md:h-36 ring-2 ring-red-500 shadow-[0_0_20px_rgba(220,38,38,0.6),0_0_40px_rgba(220,38,38,0.3)]'
                                        : 'w-12 h-18 sm:w-14 sm:h-21 md:w-16 md:h-24 hover:scale-110 shadow-[0_0_12px_rgba(0,0,0,0.5)] hover:shadow-[0_0_20px_rgba(220,38,38,0.2)]'
                                }`}
                                style={{
                                    opacity: isTransitioning && index === currentIndex ? 0.7 : 1,
                                    transform:
                                        index === currentIndex
                                            ? 'scale(1.15) translateY(-16px)'
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

                                {/* Overlay for non-selected items with backdrop blur */}
                                {index !== currentIndex && (
                                    <div className="absolute inset-0 bg-black/70 backdrop-blur-[1px] group-hover:bg-black/50 group-hover:backdrop-blur-0 transition-all duration-300"></div>
                                )}

                                {/* Active glow pulse effect */}
                                {index === currentIndex && (
                                    <>
                                        <div className="absolute inset-0 ring-2 ring-red-500 rounded-lg animate-pulse" />
                                        <div className="absolute -inset-1 bg-red-500/20 blur-xl rounded-lg" />
                                    </>
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
