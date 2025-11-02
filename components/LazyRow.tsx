import React, { useRef, useState, useEffect, useCallback } from 'react'
import { Content } from '../typings'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid'
import ContentCard from './ContentCard'

interface Props {
    title: string
    content: Content[]
    hideTitles?: boolean
    batchSize?: number
}

type ContentWithVideo = Content & {
    hasVideo?: boolean
    videoKey?: string
    isChecking?: boolean
}

function StreamingRow({ title, content, hideTitles: _hideTitles = false, batchSize = 6 }: Props) {
    const rowRef = useRef<HTMLDivElement>(null)
    const [isMoved, setIsMoved] = useState(false)
    const [streamingContent, setStreamingContent] = useState<ContentWithVideo[]>([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isProcessing, setIsProcessing] = useState(false)

    // Progressive content processing with trailer filtering
    const processNextBatch = useCallback(async () => {
        if (isProcessing || currentIndex >= content.length) return

        setIsProcessing(true)
        const endIndex = Math.min(currentIndex + batchSize, content.length)
        const batch = content.slice(currentIndex, endIndex)

        // Add items to display immediately with checking state
        const itemsWithChecking = batch.map((item) => ({
            ...item,
            isChecking: true,
            hasVideo: false,
        }))

        setStreamingContent((prev) => [...prev, ...itemsWithChecking])

        // Check each item for videos in parallel, but update UI progressively
        const checkPromises = batch.map(async (item, _index) => {
            try {
                const mediaType = item.media_type === 'tv' ? 'tv' : 'movie'
                const response = await fetch(
                    `/api/movies/details/${item.id}?media_type=${mediaType}`
                )

                if (!response.ok) {
                    // Remove item from display if no valid response
                    setStreamingContent((prev) => prev.filter((c) => c.id !== item.id))
                    return null
                }

                const data = await response.json()

                const hasTrailer = data?.videos?.results?.some(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (video: any) => video.type === 'Trailer' && video.site === 'YouTube'
                )

                const trailerKey = data?.videos?.results?.find(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (video: any) => video.type === 'Trailer' && video.site === 'YouTube'
                )?.key

                if (hasTrailer) {
                    // Update the existing item with video info
                    setStreamingContent((prev) =>
                        prev.map((c) =>
                            c.id === item.id
                                ? { ...c, hasVideo: true, videoKey: trailerKey, isChecking: false }
                                : c
                        )
                    )
                    return { ...item, hasVideo: true, videoKey: trailerKey }
                } else {
                    // Remove item if no trailer found
                    setStreamingContent((prev) => prev.filter((c) => c.id !== item.id))
                    return null
                }
            } catch (error) {
                console.error(`Failed to check videos for ${item.id}:`, error)
                // Remove item on error
                setStreamingContent((prev) => prev.filter((c) => c.id !== item.id))
                return null
            }
        })

        await Promise.all(checkPromises)
        setCurrentIndex(endIndex)
        setIsProcessing(false)
    }, [content, currentIndex, batchSize, isProcessing])

    // Start processing when content is available
    useEffect(() => {
        if (content && content.length > 0 && currentIndex === 0) {
            processNextBatch()
        }
    }, [content, processNextBatch, currentIndex])

    // Auto-load next batch when scrolled or when current batch is processed
    useEffect(() => {
        const timer = setTimeout(() => {
            if (currentIndex < content.length && !isProcessing) {
                processNextBatch()
            }
        }, 1000) // Small delay between batches to avoid overwhelming API

        return () => clearTimeout(timer)
    }, [currentIndex, content.length, isProcessing, processNextBatch])

    // Detect when user scrolls near the end to trigger more loading
    const handleScroll = useCallback(() => {
        if (!rowRef.current) return

        const { scrollLeft, scrollWidth, clientWidth } = rowRef.current
        const scrolledPercentage = (scrollLeft + clientWidth) / scrollWidth

        // Trigger next batch when 60% scrolled
        if (scrolledPercentage > 0.6 && currentIndex < content.length && !isProcessing) {
            processNextBatch()
        }
    }, [currentIndex, content.length, isProcessing, processNextBatch])

    useEffect(() => {
        const currentRow = rowRef.current
        if (currentRow) {
            currentRow.addEventListener('scroll', handleScroll)
            return () => currentRow.removeEventListener('scroll', handleScroll)
        }
    }, [handleScroll])

    // Don't render if no content has been processed yet
    if (streamingContent.length === 0 && !isProcessing) {
        return null
    }

    const handleClick = (direction: string) => {
        setIsMoved(true)
        if (rowRef.current) {
            const { scrollLeft } = rowRef.current
            const thumbnailLength = rowRef.current.children[0]?.clientWidth || 220
            const scrollDistance = thumbnailLength * 6

            const scrollTo =
                direction === 'left' ? scrollLeft - scrollDistance : scrollLeft + scrollDistance

            rowRef.current?.scrollTo({
                left: scrollTo,
                behavior: 'smooth',
            })
        }
    }

    return (
        <div className="pb-4 sm:pb-6 md:pb-8">
            {/* Section Title */}
            <h2 className="text-white text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold px-4 sm:px-6 md:px-8 lg:px-16 transition duration-200 hover:text-gray-300">
                {title}
                {isProcessing && (
                    <span className="text-sm opacity-60 ml-2">(Checking for trailers...)</span>
                )}
                <span className="text-xs text-gray-400 ml-2">
                    {streamingContent.filter((c) => c.hasVideo).length} with trailers
                </span>
            </h2>

            {/* Content Row */}
            <div className="relative row-container">
                {/* Left Arrow */}
                <div
                    className={`hidden md:flex absolute left-0 top-0 z-30 h-full items-center pl-2 ${
                        isMoved ? 'row-container:hover:opacity-100' : 'opacity-0'
                    } transition-opacity cursor-pointer pointer-events-auto`}
                    onClick={() => handleClick('left')}
                >
                    <ChevronLeftIcon className="h-8 w-8 text-white hover:scale-110 transition-transform" />
                </div>

                {/* Scrollable Container */}
                <div
                    ref={rowRef}
                    className="flex gap-3 sm:gap-4 md:gap-5 lg:gap-6 xl:gap-8 overflow-x-auto scrollbar-hide scroll-smooth
                              px-4 sm:px-6 md:px-8 lg:px-16
                              py-10"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {/* Render streaming content */}
                    {streamingContent.map((item) => (
                        <div key={item.id} className="flex-shrink-0">
                            {item.isChecking ? (
                                // Placeholder while checking for trailer
                                <div
                                    className="relative cursor-pointer transition-all duration-300 ease-out
                                               w-[160px] h-[240px] sm:w-[180px] sm:h-[270px]
                                               md:w-[200px] md:h-[300px] lg:w-[220px] lg:h-[330px]
                                               xl:w-[260px] xl:h-[390px]
                                               bg-gray-800 rounded-md flex items-center justify-center"
                                >
                                    <div className="text-center">
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600 mx-auto mb-2"></div>
                                        <div className="text-xs text-gray-400">
                                            Checking trailer...
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                // Actual thumbnail once verified to have trailer
                                <ContentCard content={item} />
                            )}
                        </div>
                    ))}

                    {/* Processing indicator */}
                    {isProcessing && currentIndex < content.length && (
                        <div
                            className="flex-shrink-0 flex items-center justify-center
                                       w-[160px] h-[240px] sm:w-[180px] sm:h-[270px]
                                       md:w-[200px] md:h-[300px] lg:w-[220px] lg:h-[330px]
                                       xl:w-[260px] xl:h-[390px]"
                        >
                            <div className="text-center">
                                <div className="animate-pulse rounded-full h-8 w-8 bg-red-600 mx-auto mb-2"></div>
                                <div className="text-xs text-gray-400">Loading batch...</div>
                            </div>
                        </div>
                    )}

                    {/* End indicator */}
                    {currentIndex >= content.length && !isProcessing && (
                        <div
                            className="flex-shrink-0 flex items-center justify-center
                                       w-[160px] h-[240px] sm:w-[180px] sm:h-[270px]
                                       md:w-[200px] md:h-[300px] lg:w-[220px] lg:h-[330px]
                                       xl:w-[260px] xl:h-[390px]
                                       text-gray-400 text-sm"
                        >
                            <div className="text-center">
                                <div className="mb-2">🎬</div>
                                <div>All processed</div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Arrow */}
                <div
                    className="hidden md:flex absolute right-0 top-0 z-30 h-full items-center pr-2 row-container:hover:opacity-100 opacity-0 transition-opacity cursor-pointer pointer-events-auto"
                    onClick={() => handleClick('right')}
                >
                    <ChevronRightIcon className="h-8 w-8 text-white hover:scale-110 transition-transform" />
                </div>
            </div>
        </div>
    )
}

export default StreamingRow
