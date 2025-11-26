'use client'

import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { ChevronLeftIcon, ChevronRightIcon, PencilIcon } from '@heroicons/react/24/solid'
import { TrendingPerson } from '../../typings'
import DirectorCard from './DirectorCard'
import { useSessionStore } from '../../stores/sessionStore'
import { useAuthStore } from '../../stores/authStore'
import { useGuestStore } from '../../stores/guestStore'
import { SystemRecommendation, SystemRecommendationId } from '../../types/recommendations'
import { uiLog } from '../../utils/debugLogger'
import SystemRecommendationEditorModal from '../modals/SystemRecommendationEditorModal'
import {
    generateSystemRecommendationName,
    getSystemRecommendationEmoji,
} from '../../utils/systemRecommendationNames'
import { translateToTMDBGenres, translateToTMDBGenresForBoth } from '../../utils/genreMapping'

interface TrendingDirectorsRowProps {
    onLoadComplete?: () => void
    mediaType?: 'movie' | 'tv'
    recommendationId?: SystemRecommendationId
}

export default function TrendingDirectorsRow({
    onLoadComplete,
    recommendationId: propRecommendationId,
}: TrendingDirectorsRowProps) {
    const [directors, setDirectors] = useState<TrendingPerson[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isLoadingMore, setIsLoadingMore] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isMoved, setIsMoved] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [hasMore, setHasMore] = useState(true)
    const rowRef = useRef<HTMLDivElement>(null)
    const sentinelRef = useRef<HTMLDivElement>(null)
    const isLoadingRef = useRef(false)
    const hasMoreRef = useRef(true)

    const sessionType = useSessionStore((state) => state.sessionType)

    // Get system recommendations from the appropriate store
    const authSystemRecommendations = useAuthStore((state) => state.systemRecommendations)
    const guestSystemRecommendations = useGuestStore((state) => state.systemRecommendations)
    const systemRecommendations =
        sessionType === 'authenticated' ? authSystemRecommendations : guestSystemRecommendations

    // Find this recommendation's settings
    const recommendationId: SystemRecommendationId = propRecommendationId || 'trending-directors'
    const recommendation = useMemo(() => {
        return systemRecommendations.find((r) => r.id === recommendationId)
    }, [systemRecommendations, recommendationId])

    // Get update function from appropriate store
    const authUpdateSystemRecommendation = useAuthStore((state) => state.updateSystemRecommendation)
    const guestUpdateSystemRecommendation = useGuestStore(
        (state) => state.updateSystemRecommendation
    )
    const updateSystemRecommendation =
        sessionType === 'authenticated'
            ? authUpdateSystemRecommendation
            : guestUpdateSystemRecommendation

    // Get settings with defaults - use recommendation's mediaType and genres
    const isEnabled = recommendation?.enabled ?? true
    const effectiveMediaType = recommendation?.mediaType || 'both'
    const selectedGenres = recommendation?.genres || []

    // Auto-generate display name based on mediaType and genres
    const displayName = generateSystemRecommendationName({
        recommendationId,
        mediaType: effectiveMediaType,
        genres: selectedGenres,
    })
    const emoji = getSystemRecommendationEmoji(recommendationId)

    // Build API endpoint based on recommendation's mediaType and genres
    const API_ENDPOINT = useMemo(() => {
        let url = '/api/people/popular-directors?time_window=week'

        // Add media type filter
        if (effectiveMediaType === 'movie') {
            url += '&media_type=movie'
        } else if (effectiveMediaType === 'tv') {
            url += '&media_type=tv'
        }

        // Add genre filter (translate unified IDs to TMDB IDs)
        if (selectedGenres.length > 0) {
            let tmdbGenreIds: number[] = []
            if (effectiveMediaType === 'both') {
                // For 'both', combine movie and TV genre IDs
                const { movieIds, tvIds } = translateToTMDBGenresForBoth(selectedGenres)
                tmdbGenreIds = [...new Set([...movieIds, ...tvIds])]
            } else {
                tmdbGenreIds = translateToTMDBGenres(selectedGenres, effectiveMediaType)
            }
            if (tmdbGenreIds.length > 0) {
                url += `&genres=${tmdbGenreIds.join(',')}`
            }
        }

        return url
    }, [effectiveMediaType, selectedGenres])

    // State for the editor modal
    const [showEditor, setShowEditor] = useState(false)

    // Handle opening the editor
    const handleEdit = useCallback(() => {
        setShowEditor(true)
    }, [])

    // Keep refs in sync with state
    useEffect(() => {
        isLoadingRef.current = isLoadingMore
        hasMoreRef.current = hasMore
    }, [isLoadingMore, hasMore])

    // Preload images for smoother experience
    const preloadImages = useCallback((people: TrendingPerson[]) => {
        people.forEach((person) => {
            if (person.profile_path) {
                const img = new Image()
                img.src = `https://image.tmdb.org/t/p/w185${person.profile_path}`
            }
        })
    }, [])

    // Load more directors
    const loadMoreDirectors = useCallback(async () => {
        if (isLoadingRef.current || !hasMoreRef.current) return

        uiLog('[Trending Directors] Loading more directors, page:', currentPage + 1)
        setIsLoadingMore(true)
        isLoadingRef.current = true

        try {
            const response = await fetch(`${API_ENDPOINT}&page=${currentPage + 1}`)
            if (!response.ok) throw new Error('Failed to fetch')

            const data = await response.json()
            const newDirectors = data.results || []

            if (newDirectors.length === 0 || !data.has_more) {
                setHasMore(false)
                hasMoreRef.current = false
            } else {
                // Deduplicate
                const existingIds = new Set(directors.map((d) => d.id))
                const uniqueDirectors = newDirectors.filter(
                    (d: TrendingPerson) => !existingIds.has(d.id)
                )

                // Preload images before adding to state
                preloadImages(uniqueDirectors)

                setDirectors((prev) => [...prev, ...uniqueDirectors])
                setCurrentPage((prev) => prev + 1)
            }
        } catch (err) {
            console.error('Error loading more directors:', err)
            setHasMore(false)
        } finally {
            setIsLoadingMore(false)
            isLoadingRef.current = false
        }
    }, [currentPage, directors, preloadImages])

    // Fetch initial directors and preload next page
    const fetchDirectors = useCallback(async () => {
        if (!isEnabled) {
            setDirectors([])
            setIsLoading(false)
            return
        }

        setIsLoading(true)
        setError(null)

        try {
            const response = await fetch(`${API_ENDPOINT}&page=1`)
            if (!response.ok) {
                throw new Error(`Failed to fetch trending directors: ${response.status}`)
            }

            const data = await response.json()
            const initialDirectors = data.results || []

            // Preload images for initial directors
            preloadImages(initialDirectors)

            setDirectors(initialDirectors)
            setHasMore(data.has_more ?? true)
            setCurrentPage(1)

            // Preload next page in background for smoother scrolling
            if (data.has_more) {
                fetch(`${API_ENDPOINT}&page=2`)
                    .then((res) => res.json())
                    .then((nextData) => {
                        if (nextData.results) {
                            preloadImages(nextData.results)
                        }
                    })
                    .catch(() => {})
            }
        } catch (err) {
            console.error('Error fetching trending directors:', err)
            setError('Failed to load trending directors')
            setDirectors([])
        } finally {
            setIsLoading(false)
        }
    }, [isEnabled, preloadImages, API_ENDPOINT])

    // Fetch directors on mount
    useEffect(() => {
        fetchDirectors()
    }, [fetchDirectors])

    // Notify parent when loading completes
    useEffect(() => {
        if (!isLoading && onLoadComplete) {
            onLoadComplete()
        }
    }, [isLoading, onLoadComplete])

    // Handle scroll for infinite loading - trigger early for smoother experience
    const handleScroll = useCallback(() => {
        if (!rowRef.current || isLoadingRef.current || !hasMoreRef.current) return

        const { scrollLeft, scrollWidth, clientWidth } = rowRef.current
        const scrollPercentage = (scrollLeft + clientWidth) / scrollWidth
        const remainingScroll = scrollWidth - (scrollLeft + clientWidth)

        // Load more when 50% scrolled OR less than 600px remaining (earlier threshold)
        if (scrollPercentage > 0.5 || remainingScroll < 600) {
            uiLog('[Trending Directors] Threshold reached, loading more')
            loadMoreDirectors()
        }
    }, [loadMoreDirectors])

    // Attach scroll listener
    useEffect(() => {
        const currentRow = rowRef.current
        if (currentRow) {
            currentRow.addEventListener('scroll', handleScroll)
            return () => currentRow.removeEventListener('scroll', handleScroll)
        }
    }, [handleScroll])

    // Intersection Observer for sentinel
    useEffect(() => {
        const sentinel = sentinelRef.current
        const row = rowRef.current
        if (!sentinel || !row) return

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && !isLoadingRef.current && hasMoreRef.current) {
                        loadMoreDirectors()
                    }
                })
            },
            { root: row, rootMargin: '400px', threshold: 0 }
        )

        observer.observe(sentinel)
        return () => observer.disconnect()
    }, [loadMoreDirectors])

    // Handle chevron clicks for scrolling
    const handleClick = (direction: string) => {
        setIsMoved(true)
        if (rowRef.current) {
            const { scrollLeft, clientWidth } = rowRef.current
            const scrollDistance = clientWidth * 0.8
            const scrollTo =
                direction === 'left' ? scrollLeft - scrollDistance : scrollLeft + scrollDistance

            rowRef.current.scrollTo({
                left: scrollTo,
                behavior: 'smooth',
            })

            // On right click, immediately trigger load check and multiple follow-ups
            if (direction === 'right') {
                // Immediate check
                handleScroll()
                // Follow-up checks after scroll animation
                setTimeout(() => handleScroll(), 300)
                setTimeout(() => handleScroll(), 600)
                setTimeout(() => handleScroll(), 1000)
            }
        }
    }

    // Don't render if disabled
    if (!isEnabled) {
        return null
    }

    // Don't render while loading initial data
    if (isLoading) {
        return null
    }

    // Don't render if error or no directors
    if (error || directors.length === 0) {
        return null
    }

    // Build the title with emoji
    const title = emoji ? `${emoji} ${displayName}` : displayName

    return (
        <div className="-mt-4 sm:-mt-6 md:-mt-8">
            {/* Section Title */}
            <div className="flex items-center gap-3 px-4 sm:px-6 md:px-8 lg:px-16 pt-0 group/header">
                <h2 className="text-white text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold transition duration-200 hover:text-gray-300">
                    {title}
                </h2>
                {/* Edit button - appears on hover */}
                <button
                    onClick={handleEdit}
                    className="opacity-0 group-hover/header:opacity-100 transition-opacity duration-200 p-1.5 rounded-md hover:bg-gray-700/50 text-gray-400 hover:text-gray-200"
                    title="Edit this row"
                >
                    <PencilIcon className="w-5 h-5" />
                </button>
            </div>

            {/* Directors Row */}
            <div className="relative h-[200px] sm:h-[220px] md:h-[250px] lg:h-[280px] group">
                {/* Left Arrow */}
                <div
                    className={`hidden sm:flex absolute top-0 left-[-1rem] z-50 rounded-lg w-12 sm:w-20 md:w-32 h-full items-center justify-center ${
                        isMoved ? 'opacity-70 sm:opacity-0 sm:group-hover:opacity-100' : 'opacity-0'
                    } transition-all duration-300 cursor-pointer pointer-events-auto border border-transparent hover:shadow-[0_0_20px_rgba(107,114,128,0.5)] hover:backdrop-blur-sm group/chevron`}
                    onClick={() => handleClick('left')}
                >
                    <div
                        className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-80 group-hover/chevron:opacity-100 transition-opacity duration-300"
                        style={{
                            background:
                                'radial-gradient(circle, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.55) 35%, rgba(0,0,0,0.75) 55%, rgba(0,0,0,0.9) 75%, rgba(0,0,0,1) 100%)',
                        }}
                    />
                    <ChevronLeftIcon className="h-14 w-14 text-white drop-shadow-2xl transition-transform duration-300 relative z-10 group-hover/chevron:scale-110" />
                </div>

                {/* Scrollable Container */}
                <div
                    ref={rowRef}
                    className="flex gap-4 sm:gap-6 md:gap-8 overflow-x-scroll overflow-y-hidden scrollbar-hide scroll-smooth px-4 sm:px-6 md:px-8 lg:px-16 py-6"
                    style={{
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                        WebkitOverflowScrolling: 'touch',
                    }}
                >
                    {directors.map((director) => (
                        <div key={director.id} className="flex-shrink-0">
                            <DirectorCard
                                director={director}
                                genreFilter={selectedGenres.length === 1 ? selectedGenres[0] : undefined}
                            />
                        </div>
                    ))}

                    {/* Sentinel for infinite scroll */}
                    {hasMore && (
                        <div
                            ref={sentinelRef}
                            className="flex-shrink-0 w-1 h-1"
                            aria-hidden="true"
                            style={{ visibility: 'hidden' }}
                        />
                    )}

                    {/* Loading indicator */}
                    {isLoadingMore && (
                        <div className="flex-shrink-0 flex items-center justify-center w-[120px] h-[160px] sm:w-[140px] sm:h-[180px]">
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600 mx-auto mb-2"></div>
                                <div className="text-xs text-gray-400">Loading...</div>
                            </div>
                        </div>
                    )}

                    {/* End indicator */}
                    {!hasMore && !isLoadingMore && directors.length > 15 && (
                        <div className="flex-shrink-0 flex items-center justify-center w-[120px] h-[160px] text-gray-500 text-sm">
                            <div className="text-center">
                                <div className="mb-2">✓</div>
                                <div>All loaded</div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Arrow */}
                <div
                    className="hidden sm:flex absolute top-0 right-[-1rem] z-50 rounded-lg w-12 sm:w-20 md:w-32 h-full items-center justify-center opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-300 cursor-pointer pointer-events-auto border border-transparent hover:shadow-[0_0_20px_rgba(107,114,128,0.5)] hover:backdrop-blur-sm group/chevron"
                    onClick={() => handleClick('right')}
                >
                    <div
                        className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-80 group-hover/chevron:opacity-100 transition-opacity duration-300"
                        style={{
                            background:
                                'radial-gradient(circle, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.55) 35%, rgba(0,0,0,0.75) 55%, rgba(0,0,0,0.9) 75%, rgba(0,0,0,1) 100%)',
                        }}
                    />
                    <ChevronRightIcon className="h-14 w-14 text-white drop-shadow-2xl transition-transform duration-300 relative z-10 group-hover/chevron:scale-110" />
                </div>
            </div>

            {/* System Recommendation Editor Modal */}
            <SystemRecommendationEditorModal
                recommendation={recommendation as SystemRecommendation | null}
                isOpen={showEditor}
                onClose={() => setShowEditor(false)}
            />
        </div>
    )
}
