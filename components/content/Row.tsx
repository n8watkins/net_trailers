import React, { useRef, useState, useEffect, useCallback } from 'react'
import { Content } from '../../typings'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid'
import ContentCard from '../common/ContentCard'
import { useSessionData } from '../../hooks/useSessionData'
import { filterDislikedContent } from '../../utils/contentFilter'

interface Props {
    title: string
    content: Content[]
    apiEndpoint?: string // Optional endpoint for loading more content
}
function Row({ title, content, apiEndpoint }: Props) {
    const rowRef = useRef<HTMLDivElement>(null)
    const [isMoved, setIsMoved] = useState(false)
    const [allContent, setAllContent] = useState<Content[]>(content)
    const [currentPage, setCurrentPage] = useState(1)
    const [isLoading, setIsLoading] = useState(false)
    const [hasMore, setHasMore] = useState(true)
    const sessionData = useSessionData()

    // Update allContent when initial content changes
    useEffect(() => {
        console.log('🔄 [Infinite Row Loading] Content initialized:', {
            title,
            initialContentCount: content.length,
            hasApiEndpoint: !!apiEndpoint,
            apiEndpoint,
        })
        setAllContent(content)
        setCurrentPage(1)
        setHasMore(true)
    }, [content, title, apiEndpoint])

    // Filter out disliked content
    const filteredContent = filterDislikedContent(allContent, sessionData.hiddenMovies)

    // Load next page of content
    const loadMoreContent = useCallback(async () => {
        if (!apiEndpoint) {
            console.log('⚠️ [Infinite Row Loading] No API endpoint configured for:', title)
            return
        }

        if (isLoading) {
            console.log('⏳ [Infinite Row Loading] Already loading, skipping:', title)
            return
        }

        if (!hasMore) {
            console.log('✅ [Infinite Row Loading] No more content available for:', title)
            return
        }

        console.log('🚀 [Infinite Row Loading] Loading next page:', {
            title,
            currentPage,
            nextPage: currentPage + 1,
            apiEndpoint,
        })

        setIsLoading(true)
        try {
            const separator = apiEndpoint.includes('?') ? '&' : '?'
            const url = `${apiEndpoint}${separator}page=${currentPage + 1}`
            console.log('📡 [Infinite Row Loading] Fetching:', url)

            const response = await fetch(url)

            if (!response.ok) {
                console.error('❌ [Infinite Row Loading] Failed to fetch:', response.status)
                setHasMore(false)
                return
            }

            const data = await response.json()
            const newContent = data.results || []

            console.log('📦 [Infinite Row Loading] Received data:', {
                title,
                newContentCount: newContent.length,
                totalPages: data.total_pages,
                currentPage: data.page,
            })

            if (newContent.length === 0 || currentPage + 1 >= (data.total_pages || 1)) {
                console.log('🏁 [Infinite Row Loading] Reached end of content for:', title)
                setHasMore(false)
            }

            // Deduplicate by id and media_type to prevent duplicate items
            setAllContent((prev) => {
                const existing = new Set(prev.map((item) => `${item.media_type}-${item.id}`))
                const filtered = newContent.filter(
                    (item: Content) => !existing.has(`${item.media_type}-${item.id}`)
                )
                console.log('✨ [Infinite Row Loading] Adding new content:', {
                    title,
                    previousCount: prev.length,
                    newUniqueItems: filtered.length,
                    totalCount: prev.length + filtered.length,
                })
                return [...prev, ...filtered]
            })

            setCurrentPage((prev) => prev + 1)
        } catch (error) {
            console.error('💥 [Infinite Row Loading] Error:', title, error)
            setHasMore(false)
        } finally {
            setIsLoading(false)
        }
    }, [apiEndpoint, isLoading, hasMore, currentPage, title])

    // Detect when user scrolls near the end
    const handleScroll = useCallback(() => {
        if (!rowRef.current) {
            console.log('⚠️ [Infinite Row Loading] No rowRef for:', title)
            return
        }

        if (!apiEndpoint) {
            console.log('⚠️ [Infinite Row Loading] No API endpoint for scroll detection:', title)
            return
        }

        if (isLoading) {
            console.log(
                '⏳ [Infinite Row Loading] Loading in progress, skipping scroll check:',
                title
            )
            return
        }

        if (!hasMore) {
            console.log('✅ [Infinite Row Loading] No more content, skipping scroll check:', title)
            return
        }

        const { scrollLeft, scrollWidth, clientWidth } = rowRef.current
        const scrollPercentage = (scrollLeft + clientWidth) / scrollWidth
        const remainingScroll = scrollWidth - (scrollLeft + clientWidth)

        console.log('👁️ [Infinite Row Loading] Scroll detected:', {
            title,
            scrollLeft,
            scrollWidth,
            clientWidth,
            scrollPercentage: (scrollPercentage * 100).toFixed(1) + '%',
            remainingScroll: remainingScroll + 'px',
            threshold: '60% or < 500px remaining',
            willLoad: scrollPercentage > 0.6 || remainingScroll < 500,
        })

        // Load more when 60% scrolled OR less than 500px remaining
        // This ensures loading even with small amounts of content
        if (scrollPercentage > 0.6 || remainingScroll < 500) {
            console.log('🎯 [Infinite Row Loading] Threshold reached! Triggering load for:', title)
            loadMoreContent()
        }
    }, [apiEndpoint, isLoading, hasMore, loadMoreContent, title])

    // Attach scroll listener
    useEffect(() => {
        const currentRow = rowRef.current
        if (currentRow) {
            console.log('👂 [Infinite Row Loading] Attaching scroll listener for:', title)
            currentRow.addEventListener('scroll', handleScroll)
            return () => {
                console.log('🔇 [Infinite Row Loading] Removing scroll listener for:', title)
                currentRow.removeEventListener('scroll', handleScroll)
            }
        } else {
            console.log('⚠️ [Infinite Row Loading] No row element to attach listener:', title)
        }
    }, [handleScroll, title])

    // Don't render if no content after filtering
    if (!filteredContent || filteredContent.length === 0) {
        return null
    }

    const handleClick = (direction: string) => {
        console.log('🖱️ [Infinite Row Loading] Chevron clicked:', {
            title,
            direction,
        })

        setIsMoved(true)
        if (rowRef.current && rowRef.current.children.length > 0) {
            const { scrollLeft, clientWidth } = rowRef.current

            // Use clientWidth for better performance instead of getBoundingClientRect
            const scrollDistance = clientWidth * 0.8 // Scroll 80% of visible width
            const scrollTo =
                direction === 'left' ? scrollLeft - scrollDistance : scrollLeft + scrollDistance

            console.log('📐 [Infinite Row Loading] Chevron scroll calculation:', {
                title,
                direction,
                scrollLeft,
                clientWidth,
                scrollDistance,
                scrollTo,
            })

            rowRef.current.scrollTo({
                left: scrollTo,
                behavior: 'smooth',
            })

            // Check if we need to load more after scrolling right
            // We check multiple times to catch the scroll position after animation
            if (direction === 'right') {
                console.log(
                    '⏰ [Infinite Row Loading] Scheduling scroll checks after right chevron click:',
                    title
                )
                // Check at different intervals to catch when scroll animation completes
                setTimeout(() => {
                    console.log(
                        '⏰ [Infinite Row Loading] Running scheduled check #1 (500ms):',
                        title
                    )
                    handleScroll()
                }, 500)
                setTimeout(() => {
                    console.log(
                        '⏰ [Infinite Row Loading] Running scheduled check #2 (1000ms):',
                        title
                    )
                    handleScroll()
                }, 1000)
            }
        }
    }
    return (
        <div className="pb-4 sm:pb-6 md:pb-8">
            {/* Section Title */}
            <h2 className="text-white text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold px-4 sm:px-6 md:px-8 lg:px-16 pt-8 sm:pt-10 md:pt-12 transition duration-200 hover:text-gray-300">
                {title}
            </h2>

            {/* Content Row */}
            <div className="relative row-container h-[17rem] sm:h-[19rem] md:h-[21rem] lg:h-[23rem] xl:h-[28.5rem] group">
                {/* Left Arrow - Hidden on mobile, visible on larger screens */}
                <div
                    className={`hidden md:flex absolute top-0 left-[-1rem] z-50 rounded-lg w-32 h-[17rem] sm:h-[19rem] md:h-[21rem] lg:h-[23rem] xl:h-[28.5rem] items-center justify-center ${
                        isMoved ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'
                    } transition-all duration-300 cursor-pointer pointer-events-auto border border-transparent hover:shadow-[0_0_20px_rgba(107,114,128,0.5)] hover:backdrop-blur-sm group/chevron`}
                    onClick={() => handleClick('left')}
                >
                    <div
                        className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-80 group-hover/chevron:opacity-100 transition-opacity duration-300"
                        style={{
                            background:
                                'radial-gradient(circle, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.55) 35%, rgba(0,0,0,0.75) 55%, rgba(0,0,0,0.9) 75%, rgba(0,0,0,1) 100%)',
                        }}
                    ></div>
                    <ChevronLeftIcon className="h-14 w-14 text-white drop-shadow-2xl transition-transform duration-300 relative z-10 group-hover/chevron:scale-110" />
                </div>

                {/* Scrollable Container */}
                <div
                    ref={rowRef}
                    className="flex gap-3 sm:gap-4 md:gap-5 lg:gap-6 xl:gap-8 overflow-x-scroll overflow-y-hidden scrollbar-hide scroll-smooth
                              px-4 sm:px-6 md:px-8 lg:px-16
                              py-10"
                    style={{
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                        willChange: 'scroll-position',
                        WebkitOverflowScrolling: 'touch',
                    }}
                >
                    {filteredContent.map((item) => (
                        <div
                            key={`${item.media_type || 'unknown'}-${item.id}`}
                            className="flex-shrink-0"
                        >
                            <ContentCard content={item} />
                        </div>
                    ))}

                    {/* Loading indicator */}
                    {isLoading && apiEndpoint && (
                        <div className="flex-shrink-0 flex items-center justify-center w-[160px] h-[240px] sm:w-[180px] sm:h-[270px] md:w-[200px] md:h-[300px] lg:w-[220px] lg:h-[330px] xl:w-[260px] xl:h-[390px]">
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-2"></div>
                                <div className="text-xs text-gray-400">Loading more...</div>
                            </div>
                        </div>
                    )}

                    {/* End indicator */}
                    {!hasMore && apiEndpoint && !isLoading && (
                        <div className="flex-shrink-0 flex items-center justify-center w-[160px] h-[240px] sm:w-[180px] sm:h-[270px] md:w-[200px] md:h-[300px] lg:w-[220px] lg:h-[330px] xl:w-[260px] xl:h-[390px] text-gray-500 text-sm">
                            <div className="text-center">
                                <div className="mb-2">✓</div>
                                <div>All loaded</div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Arrow - Hidden on mobile, visible on larger screens */}
                <div
                    className="hidden md:flex absolute top-0 right-[-1rem] z-50 rounded-lg w-32 h-[17rem] sm:h-[19rem] md:h-[21rem] lg:h-[23rem] xl:h-[28.5rem] items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer pointer-events-auto border border-transparent hover:shadow-[0_0_20px_rgba(107,114,128,0.5)] hover:backdrop-blur-sm group/chevron"
                    onClick={() => handleClick('right')}
                >
                    <div
                        className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-80 group-hover/chevron:opacity-100 transition-opacity duration-300"
                        style={{
                            background:
                                'radial-gradient(circle, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.55) 35%, rgba(0,0,0,0.75) 55%, rgba(0,0,0,0.9) 75%, rgba(0,0,0,1) 100%)',
                        }}
                    ></div>
                    <ChevronRightIcon className="h-14 w-14 text-white drop-shadow-2xl transition-transform duration-300 relative z-10 group-hover/chevron:scale-110" />
                </div>
            </div>
        </div>
    )
}

export default Row
