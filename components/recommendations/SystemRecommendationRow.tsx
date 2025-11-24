/**
 * System Recommendation Row
 *
 * A reusable component for rendering system recommendation rows (Trending, Top Rated).
 * These rows fetch from TMDB API endpoints and respect user customization settings.
 */

'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { Content } from '../../typings'
import Row from '../content/Row'
import { useSessionStore } from '../../stores/sessionStore'
import { useAuthStore } from '../../stores/authStore'
import { useGuestStore } from '../../stores/guestStore'
import { SystemRecommendation, SystemRecommendationId } from '../../types/recommendations'
import { Collection } from '../../types/collections'

interface SystemRecommendationRowProps {
    /** The type of system recommendation */
    recommendationId: SystemRecommendationId
    /** Fallback name if user hasn't customized */
    defaultName: string
    /** Movie API endpoint (e.g., '/api/movies/trending') */
    movieEndpoint: string
    /** TV API endpoint (e.g., '/api/tv/trending') */
    tvEndpoint: string
    /** Callback when loading completes (success or failure) */
    onLoadComplete?: () => void
}

export default function SystemRecommendationRow({
    recommendationId,
    defaultName,
    movieEndpoint,
    tvEndpoint,
    onLoadComplete,
}: SystemRecommendationRowProps) {
    const [content, setContent] = useState<Content[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const sessionType = useSessionStore((state) => state.sessionType)

    // Get system recommendations from the appropriate store
    const authSystemRecommendations = useAuthStore((state) => state.systemRecommendations)
    const guestSystemRecommendations = useGuestStore((state) => state.systemRecommendations)
    const systemRecommendations =
        sessionType === 'authenticated' ? authSystemRecommendations : guestSystemRecommendations

    // Get child safety mode from appropriate store
    const authChildSafetyMode = useAuthStore((state) => state.childSafetyMode)
    const guestChildSafetyMode = useGuestStore((state) => state.childSafetyMode)
    const childSafetyMode =
        sessionType === 'authenticated' ? authChildSafetyMode : guestChildSafetyMode

    // Find this recommendation's settings
    const recommendation = useMemo(() => {
        return systemRecommendations.find((r) => r.id === recommendationId)
    }, [systemRecommendations, recommendationId])

    // Get settings with defaults
    const isEnabled = recommendation?.enabled ?? true
    const displayName = recommendation?.name || defaultName
    const mediaType = recommendation?.mediaType || 'both'
    const genres = recommendation?.genres || []
    const emoji = recommendation?.emoji || ''

    // Convert SystemRecommendation to Collection for Row's edit functionality
    const collectionForEdit = useMemo((): Collection | null => {
        if (!recommendation) return null
        return {
            id: recommendation.id,
            name: recommendation.name || defaultName,
            items: [],
            order: recommendation.order,
            displayAsRow: recommendation.enabled,
            enabled: recommendation.enabled,
            mediaType: recommendation.mediaType || 'both',
            genres: recommendation.genres || [],
            genreLogic: 'OR',
            emoji: recommendation.emoji,
            color: recommendation.color,
            isSystemCollection: true,
            isSpecialCollection: true, // Trending/Top Rated are special (no genre filtering required)
            canEdit: true,
            canDelete: false,
            canGenerateMore: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            collectionType: 'tmdb-genre',
        }
    }, [recommendation, defaultName])

    // Create a signature for dependencies to trigger re-fetch
    const settingsSignature = useMemo(
        () => `${mediaType}-${genres.join(',')}-${childSafetyMode}`,
        [mediaType, genres, childSafetyMode]
    )

    // Fetch content based on settings
    const fetchContent = useCallback(async () => {
        if (!isEnabled) {
            setContent([])
            setIsLoading(false)
            return
        }

        setIsLoading(true)
        setError(null)

        try {
            const results: Content[] = []
            const genresParam = genres.length > 0 ? `&genres=${genres.join(',')}` : ''
            const childSafeParam = childSafetyMode ? '&childSafetyMode=true' : ''

            // Fetch based on media type setting
            if (mediaType === 'movie' || mediaType === 'both') {
                const movieResponse = await fetch(
                    `${movieEndpoint}?page=1${genresParam}${childSafeParam}`
                )
                if (movieResponse.ok) {
                    const movieData = await movieResponse.json()
                    results.push(
                        ...(movieData.results || []).map((item: Content) => ({
                            ...item,
                            media_type: 'movie' as const,
                        }))
                    )
                }
            }

            if (mediaType === 'tv' || mediaType === 'both') {
                const tvResponse = await fetch(
                    `${tvEndpoint}?page=1${genresParam}${childSafeParam}`
                )
                if (tvResponse.ok) {
                    const tvData = await tvResponse.json()
                    results.push(
                        ...(tvData.results || []).map((item: Content) => ({
                            ...item,
                            media_type: 'tv' as const,
                        }))
                    )
                }
            }

            // Deduplicate and shuffle if both types
            const seen = new Set<number>()
            const deduped = results.filter((item) => {
                if (seen.has(item.id)) return false
                seen.add(item.id)
                return true
            })

            // If fetching both, interleave results for variety
            if (mediaType === 'both' && deduped.length > 0) {
                // Sort by popularity but keep some randomness
                deduped.sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
            }

            // Limit to 20 items for initial display
            setContent(deduped.slice(0, 20))
        } catch (err) {
            console.error(`Error fetching ${recommendationId}:`, err)
            setError(`Failed to load ${displayName}`)
            setContent([])
        } finally {
            setIsLoading(false)
        }
    }, [
        isEnabled,
        mediaType,
        genres,
        childSafetyMode,
        movieEndpoint,
        tvEndpoint,
        recommendationId,
        displayName,
    ])

    // Fetch content when settings change
    useEffect(() => {
        fetchContent()
    }, [fetchContent, settingsSignature])

    // Notify parent when loading completes
    useEffect(() => {
        if (!isLoading && onLoadComplete) {
            onLoadComplete()
        }
    }, [isLoading, onLoadComplete])

    // Don't render if disabled
    if (!isEnabled) {
        return null
    }

    // Don't render while loading
    if (isLoading) {
        return null
    }

    // Don't render if error or no content
    if (error || content.length === 0) {
        return null
    }

    // Build the title with emoji
    const title = emoji ? `${emoji} ${displayName}` : displayName

    return <Row title={title} content={content} collection={collectionForEdit} />
}

interface WrapperRowProps {
    onLoadComplete?: () => void
}

/**
 * TrendingRow - Wrapper component for trending content
 */
export function TrendingRow({ onLoadComplete }: WrapperRowProps) {
    return (
        <SystemRecommendationRow
            recommendationId="trending"
            defaultName="Trending"
            movieEndpoint="/api/movies/trending"
            tvEndpoint="/api/tv/trending"
            onLoadComplete={onLoadComplete}
        />
    )
}

/**
 * TopRatedRow - Wrapper component for top rated content
 */
export function TopRatedRow({ onLoadComplete }: WrapperRowProps) {
    return (
        <SystemRecommendationRow
            recommendationId="top-rated"
            defaultName="Top Rated"
            movieEndpoint="/api/movies/top-rated"
            tvEndpoint="/api/tv/top-rated"
            onLoadComplete={onLoadComplete}
        />
    )
}
