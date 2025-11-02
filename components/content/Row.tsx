import React, { useRef, useState, useEffect, useCallback } from 'react'
import { Content } from '../../typings'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid'
import ContentCard from '../common/ContentCard'
import { useSessionData } from '../../hooks/useSessionData'
import { filterDislikedContent } from '../../utils/contentFilter'

// Debug logging - only in development
const DEBUG_INFINITE_SCROLL = process.env.NODE_ENV === 'development'
const debugLog = (emoji: string, message: string, data?: any) => {
    if (DEBUG_INFINITE_SCROLL) {
        console.log(`${emoji} [Infinite Row Loading] ${message}`, data || '')
    }
}

interface Props {
    title: string
    content: Content[]
    apiEndpoint?: string // Optional endpoint for loading more content
}
function Row({ title, content, apiEndpoint }: Props) {
    const rowRef = useRef<HTMLDivElement>(null)
    const sentinelRef = useRef<HTMLDivElement>(null)
    const isLoadingRef = useRef(false)
    const hasMoreRef = useRef(true)
    const retryCountRef = useRef(0)
    const [isMoved, setIsMoved] = useState(false)
    const [allContent, setAllContent] = useState<Content[]>(content)
    const [currentPage, setCurrentPage] = useState(1)
    const [isLoading, setIsLoading] = useState(false)
    const [hasMore, setHasMore] = useState(true)
    const sessionData = useSessionData()

    // Keep refs in sync with state for Intersection Observer
    useEffect(() => {
        isLoadingRef.current = isLoading
        hasMoreRef.current = hasMore
    }, [isLoading, hasMore])

    // Update allContent when initial content changes
    useEffect(() => {
        debugLog('🔄', `Content initialized: ${title}`, {
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
                // FIX: Differentiate between permanent and transient errors
                const isPermanentError = response.status === 404 || response.status === 410
                const isTransientError =
                    response.status >= 500 || // 5xx server errors
                    response.status === 429 || // Rate limiting
                    response.status === 408 // Request timeout

                if (isPermanentError) {
                    console.error(
                        '❌ [Infinite Row Loading] Permanent error, stopping load:',
                        response.status
                    )
                    setHasMore(false)
                    return
                }

                if (isTransientError && retryCountRef.current < 3) {
                    retryCountRef.current += 1
                    const backoffDelay = Math.min(
                        1000 * Math.pow(2, retryCountRef.current - 1),
                        5000
                    )
                    console.warn(
                        `⚠️ [Infinite Row Loading] Transient error (${response.status}), retry ${retryCountRef.current}/3 after ${backoffDelay}ms:`,
                        title
                    )
                    setTimeout(() => loadMoreContent(), backoffDelay)
                    return
                }

                // After 3 retries or other errors, stop
                console.error(
                    '❌ [Infinite Row Loading] Failed to fetch after retries:',
                    response.status
                )
                setHasMore(false)
                return
            }

            // Reset retry count on successful fetch
            retryCountRef.current = 0

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
            const existing = new Set(allContent.map((item) => `${item.media_type}-${item.id}`))
            const filtered = newContent.filter(
                (item: Content) => !existing.has(`${item.media_type}-${item.id}`)
            )

            console.log('✨ [Infinite Row Loading] Processing new content:', {
                title,
                previousCount: allContent.length,
                newUniqueItems: filtered.length,
                totalCount: allContent.length + filtered.length,
            })

            // FIX: If all items were duplicates, stop loading to prevent infinite spinner
            if (filtered.length === 0) {
                console.log(
                    '⚠️ [Infinite Row Loading] All items were duplicates, stopping load:',
                    title
                )
                setHasMore(false)
                return // Exit early - don't update state or increment page
            }

            // Preload images for new content in the background
            filtered.forEach((item: Content) => {
                if (item.poster_path) {
                    const img = new Image()
                    img.src = `https://image.tmdb.org/t/p/w500${item.poster_path}`
                }
            })
            console.log(
                '🖼️ [Infinite Row Loading] Preloading images for:',
                filtered.length,
                'items'
            )

            // Update content and increment page only if we have unique items
            setAllContent((prev) => [...prev, ...filtered])
            setCurrentPage((prev) => prev + 1)
        } catch (error) {
            // FIX: Network errors are transient - retry up to 3 times
            if (retryCountRef.current < 3) {
                retryCountRef.current += 1
                const backoffDelay = Math.min(1000 * Math.pow(2, retryCountRef.current - 1), 5000)
                console.warn(
                    `⚠️ [Infinite Row Loading] Network error, retry ${retryCountRef.current}/3 after ${backoffDelay}ms:`,
                    title,
                    error
                )
                setTimeout(() => loadMoreContent(), backoffDelay)
                return
            }

            // After 3 retries, stop
            console.error('💥 [Infinite Row Loading] Error after retries:', title, error)
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

    // Intersection Observer for sentinel element (primary detection method)
    useEffect(() => {
        if (!apiEndpoint) {
            console.log(
                '⚠️ [Infinite Row Loading] No API endpoint for Intersection Observer:',
                title
            )
            return
        }

        const sentinel = sentinelRef.current
        const row = rowRef.current

        if (!sentinel || !row) {
            console.log('⚠️ [Infinite Row Loading] Missing sentinel or row element:', title)
            return
        }

        console.log('🔭 [Infinite Row Loading] Setting up Intersection Observer for:', title)

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    console.log('👁️ [Infinite Row Loading] Observer callback triggered:', {
                        title,
                        isIntersecting: entry.isIntersecting,
                        intersectionRatio: entry.intersectionRatio,
                        isLoading,
                        hasMore,
                    })

                    if (entry.isIntersecting && !isLoading && hasMore) {
                        console.log(
                            '🎯 [Infinite Row Loading] Observer detected sentinel! Loading more:',
                            title
                        )
                        loadMoreContent()
                    }
                })
            },
            {
                root: row, // Observe within the scrollable row
                rootMargin: '500px', // Start loading 500px before sentinel becomes visible
                threshold: 0,
            }
        )

        observer.observe(sentinel)
        console.log('✅ [Infinite Row Loading] Observer attached to sentinel for:', title)

        return () => {
            console.log('🔇 [Infinite Row Loading] Removing Intersection Observer for:', title)
            observer.disconnect()
        }
    }, [apiEndpoint, loadMoreContent, isLoading, hasMore, title])

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

                    {/* Sentinel element for Intersection Observer - invisible marker near end */}
                    {apiEndpoint && hasMore && (
                        <div
                            ref={sentinelRef}
                            className="flex-shrink-0 w-1 h-1"
                            aria-hidden="true"
                            style={{ visibility: 'hidden' }}
                        />
                    )}

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
