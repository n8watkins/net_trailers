/**
 * Recommended For You Row
 *
 * Displays personalized recommendations based on user's preferences
 */

'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { Content } from '../../types/collections'
import { Recommendation } from '../../types/recommendations'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid'
import ContentCard from '../common/ContentCard'
import { useSessionData } from '../../hooks/useSessionData'
import { useSessionStore } from '../../stores/sessionStore'
import { auth } from '../../firebase'

export default function RecommendedForYouRow() {
    const [recommendations, setRecommendations] = useState<Recommendation[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isMoved, setIsMoved] = useState(false)

    const rowRef = useRef<HTMLDivElement>(null)
    const getUserId = useSessionStore((state) => state.getUserId)
    const sessionType = useSessionStore((state) => state.sessionType)
    const userId = getUserId()
    const sessionData = useSessionData()

    // Check if recommendations are enabled in user preferences
    const showRecommendations = sessionData.showRecommendations ?? false

    const likedIdsSignature = useMemo(
        () => sessionData.likedMovies.map((item) => item.id).join(','),
        [sessionData.likedMovies]
    )
    const watchlistIdsSignature = useMemo(
        () => sessionData.defaultWatchlist.map((item) => item.id).join(','),
        [sessionData.defaultWatchlist]
    )
    const hiddenIdsSignature = useMemo(
        () => sessionData.hiddenMovies.map((item) => item.id).join(','),
        [sessionData.hiddenMovies]
    )

    // Fetch personalized recommendations
    useEffect(() => {
        const fetchRecommendations = async () => {
            if (!showRecommendations) {
                setIsLoading(false)
                setRecommendations([])
                return
            }

            // Only show recommendations for authenticated users (requires Firestore)
            if (!userId || sessionType !== 'authenticated') {
                setIsLoading(false)
                return
            }

            setIsLoading(true)
            setError(null)

            try {
                // Get Firebase ID token for authentication
                const currentUser = auth.currentUser
                if (!currentUser) {
                    setIsLoading(false)
                    return
                }

                const idToken = await currentUser.getIdToken()

                // Use POST with body instead of GET with URL params to avoid 431 header size error
                const response = await fetch(`/api/recommendations/personalized`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${idToken}`,
                    },
                    body: JSON.stringify({
                        likedMovies: sessionData.likedMovies.slice(0, 10),
                        watchlist: sessionData.defaultWatchlist.slice(0, 10),
                        hiddenMovies: sessionData.hiddenMovies.slice(0, 10),
                        limit: 20,
                    }),
                })

                if (!response.ok) {
                    // Get error details from response
                    const errorData = await response.json().catch(() => ({}))
                    const errorMsg =
                        errorData.error || `HTTP ${response.status}: ${response.statusText}`
                    console.error('Recommendations API error:', errorMsg, errorData)
                    throw new Error(errorMsg)
                }

                const data = await response.json()

                if (data.success) {
                    setRecommendations(data.recommendations || [])
                } else if (data.requiresData) {
                    // Not enough user data for recommendations
                    setRecommendations([])
                } else {
                    setError(data.error || 'Failed to load recommendations')
                }
            } catch (err) {
                console.error('Error fetching personalized recommendations:', err)
                // Don't show error to user - just silently fail and hide the row
                // Recommendations are optional and shouldn't break the experience
                setRecommendations([])
                setError(null) // Clear error so row is hidden
            } finally {
                setIsLoading(false)
            }
        }

        fetchRecommendations()
    }, [
        userId,
        sessionType,
        likedIdsSignature,
        watchlistIdsSignature,
        hiddenIdsSignature,
        showRecommendations,
    ])

    // Scroll handlers
    const handleClick = (direction: 'left' | 'right') => {
        setIsMoved(true)

        if (rowRef.current) {
            const { scrollLeft, clientWidth } = rowRef.current
            const scrollTo =
                direction === 'left' ? scrollLeft - clientWidth : scrollLeft + clientWidth

            rowRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' })
        }
    }

    // Don't render if feature is disabled
    if (!showRecommendations) {
        return null
    }

    // Don't render for guest users (recommendations require Firestore for interaction tracking)
    if (!userId || sessionType !== 'authenticated') {
        return null
    }

    // Don't render if loading initially
    if (isLoading && recommendations.length === 0) {
        return (
            <div className="space-y-0.5 md:space-y-2 px-4 md:px-12">
                <h2 className="w-56 cursor-pointer text-sm font-semibold text-[#e5e5e5] transition duration-200 hover:text-white md:text-2xl">
                    Recommended For You
                </h2>
                <div className="flex items-center justify-center py-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-500 border-t-transparent"></div>
                </div>
            </div>
        )
    }

    // Don't render if error or no recommendations
    if (error || recommendations.length === 0) {
        return null
    }

    // Convert recommendations to Content array
    const content: Content[] = recommendations.map((rec) => rec.content)

    return (
        <div className="space-y-0.5 md:space-y-2 px-4 md:px-12">
            <h2 className="w-56 cursor-pointer text-sm font-semibold text-[#e5e5e5] transition duration-200 hover:text-white md:text-2xl">
                Recommended For You
            </h2>
            <div className="group relative md:-ml-2">
                {/* Left chevron */}
                <ChevronLeftIcon
                    className={`absolute top-0 bottom-0 left-2 z-40 m-auto h-9 w-9 cursor-pointer opacity-0 transition hover:scale-125 group-hover:opacity-100 ${
                        !isMoved && 'hidden'
                    }`}
                    onClick={() => handleClick('left')}
                />

                {/* Scrollable content */}
                <div
                    ref={rowRef}
                    className="flex items-center space-x-0.5 overflow-x-scroll scrollbar-hide md:space-x-2.5 md:p-2"
                >
                    {content.map((item) => (
                        <ContentCard key={item.id} content={item} />
                    ))}
                </div>

                {/* Right chevron */}
                <ChevronRightIcon
                    className="absolute top-0 bottom-0 right-2 z-40 m-auto h-9 w-9 cursor-pointer opacity-0 transition hover:scale-125 group-hover:opacity-100"
                    onClick={() => handleClick('right')}
                />
            </div>
        </div>
    )
}
