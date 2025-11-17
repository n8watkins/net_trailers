import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { Content, getTitle } from '../../typings'
import { ChevronLeftIcon, ChevronRightIcon, PencilIcon } from '@heroicons/react/24/solid'
import ContentCard from '../common/ContentCard'
import { useSessionData } from '../../hooks/useSessionData'
import { filterDislikedContent } from '../../utils/contentFilter'
import { useModalStore } from '../../stores/modalStore'
import { uiLog, uiWarn } from '../../utils/debugLogger'
import { Collection } from '../../types/userLists'
import CollectionEditorModal from '../modals/CollectionEditorModal'

// Helper for infinite scroll logging with emoji prefix
const debugLog = (emoji: string, message: string, data?: any): void => {
    uiLog(`${emoji} [Infinite Row Loading] ${message}`, data || '')
}

interface Props {
    title: string
    content: Content[]
    apiEndpoint?: string // Optional endpoint for loading more content
    pageType?: 'home' | 'movies' | 'tv' // Page type for row editing
    collection?: Collection | null // Optional collection data for editing
}
function Row({ title, content, apiEndpoint, pageType, collection }: Props) {
    const openRowEditorModal = useModalStore((state) => state.openRowEditorModal)
    const rowRef = useRef<HTMLDivElement>(null)
    const sentinelRef = useRef<HTMLDivElement>(null)
    const isLoadingRef = useRef(false)
    const hasMoreRef = useRef(true)
    const retryCountRef = useRef(0)
    const consecutiveDuplicatesRef = useRef(0)
    const [isMoved, setIsMoved] = useState(false)
    const [allContent, setAllContent] = useState<Content[]>(content)
    const [currentPage, setCurrentPage] = useState(1)
    const [isLoading, setIsLoading] = useState(false)
    const [hasMore, setHasMore] = useState(true)
    const sessionData = useSessionData()

    // Collection editor state
    const [showCollectionEditor, setShowCollectionEditor] = useState(false)

    // Handler to open collection editor
    const handleEditCollection = () => {
        if (collection) {
            setShowCollectionEditor(true)
        }
    }

    // Handler to close collection editor
    const handleCloseCollectionEditor = () => {
        setShowCollectionEditor(false)
    }

    // Show pencil for all collections - the modal will handle what can be edited based on collection type
    const canEditCollection = !!collection

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

    // Filter out disliked content (memoized for performance)
    const filteredContent = useMemo(
        () => filterDislikedContent(allContent, sessionData.hiddenMovies),
        [allContent, sessionData.hiddenMovies]
    )

    // Load next page of content
    const loadMoreContent = useCallback(async () => {
        if (!apiEndpoint) {
            uiLog('⚠️ [Infinite Row Loading] No API endpoint configured for:', title)
            return
        }

        if (isLoading) {
            uiLog('⏳ [Infinite Row Loading] Already loading, skipping:', title)
            return
        }

        if (!hasMore) {
            uiLog('✅ [Infinite Row Loading] No more content available for:', title)
            return
        }

        uiLog('🚀 [Infinite Row Loading] Loading next page:', {
            title,
            currentPage,
            nextPage: currentPage + 1,
            apiEndpoint,
        })

        setIsLoading(true)
        try {
            const separator = apiEndpoint.includes('?') ? '&' : '?'
            const url = `${apiEndpoint}${separator}page=${currentPage + 1}`
            uiLog('📡 [Infinite Row Loading] Fetching:', url)

            const response = await fetch(url)

            if (!response.ok) {
                // FIX: Differentiate between permanent and transient errors
                const isPermanentError = response.status === 404 || response.status === 410
                const isTransientError =
                    response.status >= 500 || // 5xx server errors
                    response.status === 429 || // Rate limiting
                    response.status === 408 // Request timeout

                if (isPermanentError) {
                    // Permanent error (404/410) - stop loading more content
                    setHasMore(false)
                    return
                }

                if (isTransientError && retryCountRef.current < 3) {
                    retryCountRef.current += 1
                    const backoffDelay = Math.min(
                        1000 * Math.pow(2, retryCountRef.current - 1),
                        5000
                    )
                    uiWarn(
                        `⚠️ [Infinite Row Loading] Transient error (${response.status}), retry ${retryCountRef.current}/3 after ${backoffDelay}ms:`,
                        title
                    )
                    setTimeout(() => loadMoreContent(), backoffDelay)
                    return
                }

                // After 3 retries or other errors, stop loading more content
                setHasMore(false)
                return
            }

            // Reset retry count on successful fetch
            retryCountRef.current = 0

            const data = await response.json()
            const newContent = data.results || []

            uiLog('📦 [Infinite Row Loading] Received data:', {
                title,
                newContentCount: newContent.length,
                totalPages: data.total_pages,
                currentPage: data.page,
            })

            if (newContent.length === 0 || currentPage + 1 >= (data.total_pages || 1)) {
                uiLog('🏁 [Infinite Row Loading] Reached end of content for:', title)
                setHasMore(false)
            }

            // Deduplicate by id and media_type to prevent duplicate items
            const existing = new Set(allContent.map((item) => `${item.media_type}-${item.id}`))
            const filtered = newContent.filter(
                (item: Content) => !existing.has(`${item.media_type}-${item.id}`)
            )

            uiLog('✨ [Infinite Row Loading] Processing new content:', {
                title,
                previousCount: allContent.length,
                newUniqueItems: filtered.length,
                totalCount: allContent.length + filtered.length,
            })

            // Handle duplicate-only pages intelligently
            if (filtered.length === 0) {
                consecutiveDuplicatesRef.current += 1

                debugLog(
                    '⚠️',
                    `Page ${currentPage + 1} all duplicates (${consecutiveDuplicatesRef.current}/3)`,
                    { title, pageReturned: newContent.length }
                )

                // Stop after 3 consecutive duplicate pages OR if we've reached the end
                if (
                    consecutiveDuplicatesRef.current >= 3 ||
                    currentPage + 1 >= (data.total_pages || 1)
                ) {
                    debugLog('🏁', 'Stopping: Multiple duplicate pages or reached end', {
                        title,
                        consecutiveDuplicates: consecutiveDuplicatesRef.current,
                        currentPage: currentPage + 1,
                        totalPages: data.total_pages,
                    })
                    setHasMore(false)
                    return
                }

                // Skip this duplicate page and increment to try the next one
                debugLog('⏭️', `Skipping duplicate page, will try page ${currentPage + 2}`, {
                    title,
                })
                setCurrentPage((prev) => prev + 1)
                return // Intersection Observer will trigger loadMoreContent again
            }

            // Reset counter on successful page with unique content
            if (consecutiveDuplicatesRef.current > 0) {
                debugLog('🔄', 'Resetting duplicate counter after finding unique content', {
                    title,
                    previousCount: consecutiveDuplicatesRef.current,
                })
                consecutiveDuplicatesRef.current = 0
            }

            // Preload images for new content in the background
            filtered.forEach((item: Content) => {
                if (item.poster_path) {
                    const img = new Image()
                    img.onload = () => {
                        debugLog('✅', `Image loaded successfully`, {
                            id: item.id,
                            title: getTitle(item),
                        })
                    }
                    img.onerror = () => {
                        debugLog('⚠️', `Image failed to load`, {
                            id: item.id,
                            title: getTitle(item),
                        })
                    }
                    img.src = `https://image.tmdb.org/t/p/w500${item.poster_path}`
                }
            })
            debugLog('🖼️', `Preloading images for ${filtered.length} items`)

            // Update content and increment page only if we have unique items
            setAllContent((prev) => [...prev, ...filtered])
            setCurrentPage((prev) => prev + 1)
        } catch (error) {
            // FIX: Network errors are transient - retry up to 3 times
            if (retryCountRef.current < 3) {
                retryCountRef.current += 1
                const backoffDelay = Math.min(1000 * Math.pow(2, retryCountRef.current - 1), 5000)
                uiWarn(
                    `⚠️ [Infinite Row Loading] Network error, retry ${retryCountRef.current}/3 after ${backoffDelay}ms:`,
                    title,
                    error
                )
                setTimeout(() => loadMoreContent(), backoffDelay)
                return
            }

            // After 3 retries, stop loading more content
            setHasMore(false)
        } finally {
            setIsLoading(false)
        }
    }, [apiEndpoint, isLoading, hasMore, currentPage, title])

    // Detect when user scrolls near the end
    const handleScroll = useCallback(() => {
        if (!rowRef.current) {
            uiLog('⚠️ [Infinite Row Loading] No rowRef for:', title)
            return
        }

        if (!apiEndpoint) {
            uiLog('⚠️ [Infinite Row Loading] No API endpoint for scroll detection:', title)
            return
        }

        if (isLoadingRef.current) {
            uiLog('⏳ [Infinite Row Loading] Loading in progress, skipping scroll check:', title)
            return
        }

        if (!hasMoreRef.current) {
            uiLog('✅ [Infinite Row Loading] No more content, skipping scroll check:', title)
            return
        }

        const { scrollLeft, scrollWidth, clientWidth } = rowRef.current
        const scrollPercentage = (scrollLeft + clientWidth) / scrollWidth
        const remainingScroll = scrollWidth - (scrollLeft + clientWidth)

        uiLog('👁️ [Infinite Row Loading] Scroll detected:', {
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
            uiLog('🎯 [Infinite Row Loading] Threshold reached! Triggering load for:', title)
            loadMoreContent()
        }
    }, [apiEndpoint, isLoading, hasMore, loadMoreContent, title])

    // Attach scroll listener
    useEffect(() => {
        const currentRow = rowRef.current
        if (currentRow) {
            uiLog('👂 [Infinite Row Loading] Attaching scroll listener for:', title)
            currentRow.addEventListener('scroll', handleScroll)
            return () => {
                uiLog('🔇 [Infinite Row Loading] Removing scroll listener for:', title)
                currentRow.removeEventListener('scroll', handleScroll)
            }
        } else {
            uiLog('⚠️ [Infinite Row Loading] No row element to attach listener:', title)
        }
    }, [handleScroll, title])

    // Intersection Observer for sentinel element (primary detection method)
    useEffect(() => {
        if (!apiEndpoint) {
            uiLog('⚠️ [Infinite Row Loading] No API endpoint for Intersection Observer:', title)
            return
        }

        const sentinel = sentinelRef.current
        const row = rowRef.current

        if (!sentinel || !row) {
            uiLog('⚠️ [Infinite Row Loading] Missing sentinel or row element:', title)
            return
        }

        uiLog('🔭 [Infinite Row Loading] Setting up Intersection Observer for:', title)

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    uiLog('👁️ [Infinite Row Loading] Observer callback triggered:', {
                        title,
                        isIntersecting: entry.isIntersecting,
                        intersectionRatio: entry.intersectionRatio,
                        isLoading,
                        hasMore,
                    })

                    if (entry.isIntersecting && !isLoadingRef.current && hasMoreRef.current) {
                        uiLog(
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
        uiLog('✅ [Infinite Row Loading] Observer attached to sentinel for:', title)

        return () => {
            uiLog('🔇 [Infinite Row Loading] Removing Intersection Observer for:', title)
            observer.disconnect()
        }
    }, [apiEndpoint, loadMoreContent, isLoading, hasMore, title])

    // Don't render if no content after filtering
    if (!filteredContent || filteredContent.length === 0) {
        return null
    }

    const handleClick = (direction: string) => {
        uiLog('🖱️ [Infinite Row Loading] Chevron clicked:', {
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

            uiLog('📐 [Infinite Row Loading] Chevron scroll calculation:', {
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
                uiLog(
                    '⏰ [Infinite Row Loading] Scheduling scroll checks after right chevron click:',
                    title
                )
                // Check at different intervals to catch when scroll animation completes
                setTimeout(() => {
                    uiLog('⏰ [Infinite Row Loading] Running scheduled check #1 (500ms):', title)
                    handleScroll()
                }, 500)
                setTimeout(() => {
                    uiLog('⏰ [Infinite Row Loading] Running scheduled check #2 (1000ms):', title)
                    handleScroll()
                }, 1000)
            }
        }
    }
    return (
        <div className="pb-4 sm:pb-6 md:pb-8">
            {/* Section Title with Edit Button */}
            <div className="flex items-center gap-3 px-4 sm:px-6 md:px-8 lg:px-16 pt-8 sm:pt-10 md:pt-12 group/title">
                <h2 className="text-white text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold transition duration-200 hover:text-gray-300">
                    {title}
                </h2>
                {canEditCollection && (
                    <button
                        onClick={handleEditCollection}
                        className="opacity-0 group-hover/title:opacity-100 transition-opacity duration-200 p-1.5 hover:bg-gray-800/50 rounded-lg group/pencil flex items-center relative z-[250]"
                        title="Edit collection"
                    >
                        <PencilIcon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-300 hover:scale-110 transition-all duration-200" />
                    </button>
                )}
            </div>

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
                    {filteredContent.map((item, index) => (
                        <div
                            key={`${item.media_type || 'unknown'}-${item.id}-${index}`}
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

            {/* Collection Editor Modal */}
            {collection && (
                <CollectionEditorModal
                    collection={collection}
                    isOpen={showCollectionEditor}
                    onClose={handleCloseCollectionEditor}
                />
            )}
        </div>
    )
}

export default Row
