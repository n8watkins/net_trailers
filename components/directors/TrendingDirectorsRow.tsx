'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid'
import { TrendingPerson } from '../../typings'
import DirectorCard from './DirectorCard'
import { useSessionStore } from '../../stores/sessionStore'
import { useAuthStore } from '../../stores/authStore'
import { useGuestStore } from '../../stores/guestStore'
import { SystemRecommendationId } from '../../types/recommendations'

interface TrendingDirectorsRowProps {
    onLoadComplete?: () => void
}

export default function TrendingDirectorsRow({ onLoadComplete }: TrendingDirectorsRowProps) {
    const [directors, setDirectors] = useState<TrendingPerson[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isMoved, setIsMoved] = useState(false)
    const rowRef = useRef<HTMLDivElement>(null)

    const sessionType = useSessionStore((state) => state.sessionType)

    // Get system recommendations from the appropriate store
    const authSystemRecommendations = useAuthStore((state) => state.systemRecommendations)
    const guestSystemRecommendations = useGuestStore((state) => state.systemRecommendations)
    const systemRecommendations =
        sessionType === 'authenticated' ? authSystemRecommendations : guestSystemRecommendations

    // Find this recommendation's settings
    const recommendationId: SystemRecommendationId = 'trending-directors'
    const recommendation = useMemo(() => {
        return systemRecommendations.find((r) => r.id === recommendationId)
    }, [systemRecommendations])

    // Get settings with defaults
    const isEnabled = recommendation?.enabled ?? true
    const displayName = recommendation?.name || 'Trending Directors'
    const emoji = recommendation?.emoji || '🎬'

    // Fetch trending directors
    useEffect(() => {
        const fetchDirectors = async () => {
            if (!isEnabled) {
                setDirectors([])
                setIsLoading(false)
                return
            }

            setIsLoading(true)
            setError(null)

            try {
                const response = await fetch(
                    '/api/people/trending?time_window=week&department=Directing'
                )
                if (!response.ok) {
                    throw new Error(`Failed to fetch trending directors: ${response.status}`)
                }

                const data = await response.json()
                setDirectors(data.results || [])
            } catch (err) {
                console.error('Error fetching trending directors:', err)
                setError('Failed to load trending directors')
                setDirectors([])
            } finally {
                setIsLoading(false)
            }
        }

        fetchDirectors()
    }, [isEnabled])

    // Notify parent when loading completes
    useEffect(() => {
        if (!isLoading && onLoadComplete) {
            onLoadComplete()
        }
    }, [isLoading, onLoadComplete])

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
        }
    }

    // Don't render if disabled
    if (!isEnabled) {
        return null
    }

    // Don't render while loading
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
        <div className="pb-4 sm:pb-6 md:pb-8">
            {/* Section Title */}
            <div className="flex items-center gap-3 px-4 sm:px-6 md:px-8 lg:px-16 pt-8 sm:pt-10 md:pt-12">
                <h2 className="text-white text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold transition duration-200 hover:text-gray-300">
                    {title}
                </h2>
            </div>

            {/* Directors Row */}
            <div className="relative h-[200px] sm:h-[220px] md:h-[250px] lg:h-[280px] group">
                {/* Left Arrow */}
                <div
                    className={`hidden sm:flex absolute top-0 left-[-1rem] z-50 rounded-lg w-12 sm:w-20 md:w-32 h-full items-center justify-center ${
                        isMoved ? 'opacity-70 sm:opacity-0 sm:group-hover:opacity-100' : 'opacity-0'
                    } transition-all duration-300 cursor-pointer pointer-events-auto`}
                    onClick={() => handleClick('left')}
                >
                    <div
                        className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-80 transition-opacity duration-300"
                        style={{
                            background:
                                'radial-gradient(circle, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.55) 35%, rgba(0,0,0,0.75) 55%, rgba(0,0,0,0.9) 75%, rgba(0,0,0,1) 100%)',
                        }}
                    />
                    <ChevronLeftIcon className="h-14 w-14 text-white drop-shadow-2xl transition-transform duration-300 relative z-10 group-hover:scale-110" />
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
                            <DirectorCard director={director} />
                        </div>
                    ))}
                </div>

                {/* Right Arrow */}
                <div
                    className="hidden sm:flex absolute top-0 right-[-1rem] z-50 rounded-lg w-12 sm:w-20 md:w-32 h-full items-center justify-center opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-300 cursor-pointer pointer-events-auto"
                    onClick={() => handleClick('right')}
                >
                    <div
                        className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-80 transition-opacity duration-300"
                        style={{
                            background:
                                'radial-gradient(circle, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.55) 35%, rgba(0,0,0,0.75) 55%, rgba(0,0,0,0.9) 75%, rgba(0,0,0,1) 100%)',
                        }}
                    />
                    <ChevronRightIcon className="h-14 w-14 text-white drop-shadow-2xl transition-transform duration-300 relative z-10 group-hover:scale-110" />
                </div>
            </div>
        </div>
    )
}
