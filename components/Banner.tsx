import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Content, getTitle, getYear, getContentType } from '../typings'
import Image from 'next/image'
import { BASE_URL } from '../constants/movie'
import { PlayIcon } from '@heroicons/react/24/solid'
import { InformationCircleIcon } from '@heroicons/react/24/outline'
import { modalState, movieState, autoPlayWithSoundState } from '../atoms/modalAtom'
import { useRecoilState } from 'recoil'

interface Props {
    trending: Content[]
}

//pass props to Banner component
function Banner({ trending }: Props) {
    const [showModal, setShowModal] = useRecoilState(modalState)
    const [currentContent, setCurrentContent] = useRecoilState(movieState)
    const [autoPlayWithSound, setAutoPlayWithSound] = useRecoilState(autoPlayWithSoundState)

    const [currentIndex, setCurrentIndex] = useState(0)
    const [carouselContent, setCarouselContent] = useState<Content[]>([])
    const [isTransitioning, setIsTransitioning] = useState(false)
    const [imagesLoaded, setImagesLoaded] = useState<Set<number>>(new Set())

    // Select 5 random items for carousel and preload images
    useEffect(() => {
        if (trending.length > 0) {
            const shuffled = [...trending].sort(() => 0.5 - Math.random())
            const selected = shuffled.slice(0, Math.min(5, trending.length))
            setCarouselContent(selected)

            // Preload all carousel images
            selected.forEach((content, index) => {
                const imgUrl = content.backdrop_path || content.poster_path
                if (imgUrl) {
                    const img = new window.Image()
                    img.onload = () => {
                        setImagesLoaded(prev => new Set(prev).add(index))
                    }
                    img.src = `${BASE_URL}/${imgUrl}`
                }
            })
        }
    }, [trending])

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

    const goToSlide = useCallback((index: number) => {
        if (index === currentIndex) return
        setIsTransitioning(true)
        setTimeout(() => {
            setCurrentIndex(index)
            setTimeout(() => setIsTransitioning(false), 300) // Longer delay for fade in
        }, 300) // Fade out duration
    }, [currentIndex])

    const featuredContent = carouselContent[currentIndex] || null
    const isCurrentImageLoaded = imagesLoaded.has(currentIndex)

    const contentImgUrl = featuredContent?.backdrop_path || featuredContent?.poster_path
    return (
        <>
            {/* background image with mobile-responsive container */}
            <div className="absolute inset-0 -z-10 font-sans overflow-hidden">
                {contentImgUrl && isCurrentImageLoaded && (
                    <div className="relative w-full h-full">
                        <Image
                            src={`${BASE_URL}/${
                                featuredContent?.backdrop_path ||
                                featuredContent?.poster_path
                            }`}
                            alt={featuredContent ? `${getTitle(featuredContent)} backdrop` : 'Content backdrop'}
                            fill
                            quality={100}
                            priority
                            style={{
                                objectFit: 'cover',
                                objectPosition: 'center center'
                            }}
                            sizes="100vw"
                            className={`transition-opacity duration-300 ${
                                isTransitioning ? 'opacity-0' : 'opacity-100'
                            }`}
                        />
                    </div>
                )}
                <div className="absolute h-32 w-full bg-gradient-to-b from-transparent to-[#141414] bottom-0"></div>
            </div>

            {/* movie info background gradient */}
            <div className="absolute inset-0 flex flex-col justify-center px-4 sm:px-6 md:px-10 lg:px-16 xl:px-20 bg-gradient-to-r from-[#141414]/90 to-transparent">
                <div className={`max-w-xl lg:max-w-2xl space-y-3 sm:space-y-4 md:space-y-6 transition-all duration-300 ease-in-out ${
                    isTransitioning ? 'opacity-0 transform translate-y-4' : 'opacity-100 transform translate-y-0'
                }`}>
                    <h1 className="text-xl sm:text-2xl md:text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight">
                        {featuredContent ? getTitle(featuredContent) : 'Loading...'}
                    </h1>
                    <div className="flex items-center space-x-2 mb-2">
                        <span className="text-xs md:text-sm text-gray-300">
                            {featuredContent ? getContentType(featuredContent) : ''}
                        </span>
                        <span className="text-xs md:text-sm text-gray-300">
                            {featuredContent ? getYear(featuredContent) : ''}
                        </span>
                    </div>
                    <p className="text-xs md:text-base lg:text-lg leading-relaxed text-gray-200 max-w-lg lg:max-w-xl">
                        {truncateString(featuredContent?.overview)}
                    </p>

                    {/* Buttons*/}
                    <div className="flex gap-2 sm:gap-3 md:gap-4 pt-3 md:pt-4">
                        <button
                            className="bannerButton bg-white text-black hover:bg-white/80 transition-all duration-200 font-bold"
                            onClick={() => {
                                setAutoPlayWithSound(true)
                                setShowModal(true)
                                setCurrentContent(featuredContent)
                            }}
                        >
                            <PlayIcon className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 lg:h-7 lg:w-7" />
                            <span className="text-xs sm:text-sm md:text-base lg:text-lg">Play</span>
                        </button>
                        <button
                            className="bannerButton bg-gray-600/70 text-white hover:bg-gray-600/50 transition-all duration-200 font-semibold backdrop-blur-sm"
                            onClick={() => {
                                setAutoPlayWithSound(false)
                                setShowModal(true)
                                setCurrentContent(featuredContent)
                            }}
                        >
                            <InformationCircleIcon className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 lg:h-7 lg:w-7" />
                            <span className="text-xs sm:text-sm md:text-base lg:text-lg">More Info</span>
                        </button>
                    </div>
                </div>

                {/* Carousel dots - positioned much higher, especially on mobile */}
                {carouselContent.length > 1 && (
                    <div className="absolute bottom-48 sm:bottom-52 md:bottom-56 lg:bottom-60 xl:bottom-64 left-1/2 transform -translate-x-1/2 flex space-x-3 z-30">
                        {carouselContent.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => goToSlide(index)}
                                className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full transition-all duration-300 border-2 ${
                                    index === currentIndex
                                        ? 'bg-white border-white scale-125 shadow-lg'
                                        : 'bg-transparent border-gray-400 hover:border-gray-300 hover:bg-gray-300'
                                }`}
                                aria-label={`Go to slide ${index + 1}`}
                            />
                        ))}
                    </div>
                )}
            </div>
        </>
    )
}
//helper function to truncate string to 300 characters
const truncateString = (str: string | undefined) => {
    let maxSringLength = 210
    if (str === undefined) return ''
    if (str.length <= maxSringLength) {
        return str
    } else {
        let truncated = str.substring(0, maxSringLength)
        let lastPeriod = truncated.lastIndexOf('.')
        if (lastPeriod === -1) {
            return truncated + '...'
        } else {
            return truncated.substring(0, lastPeriod)
        }
    }
}

export default Banner
