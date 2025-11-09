'use client'

import React, { useEffect, useState } from 'react'
import Row from '../content/Row'
import { Content } from '../../typings'
import { useSessionStore } from '../../stores/sessionStore'
import { useChildSafety } from '../../hooks/useChildSafety'
import { CustomRow, DisplayRow } from '../../types/customRows'

interface CustomRowLoaderProps {
    row: CustomRow | DisplayRow
    pageType?: 'home' | 'movies' | 'tv' // Page type for row editing
}

/**
 * CustomRowLoader Component
 *
 * Loads TMDB content for a custom row and displays it using the Row component.
 * Handles initial content fetch and provides API endpoint for infinite scroll.
 * Integrates with child safety mode and user session.
 */
export function CustomRowLoader({ row, pageType }: CustomRowLoaderProps) {
    const [content, setContent] = useState<Content[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const getUserId = useSessionStore((state) => state.getUserId)
    const { isEnabled: childSafetyMode } = useChildSafety()
    const userId = getUserId()

    useEffect(() => {
        if (!userId) {
            setIsLoading(false)
            setError('User not authenticated')
            return
        }

        const loadContent = async () => {
            setIsLoading(true)
            setError(null)

            try {
                let url: URL

                // Handle special system rows (trending, top-rated)
                // Note: Curated rows with contentIds but no genres should NOT be treated as special rows
                const customRow = row as CustomRow
                const hasCuratedContent =
                    customRow.advancedFilters?.contentIds &&
                    customRow.advancedFilters.contentIds.length > 0

                if (row.isSpecialRow || (row.genres.length === 0 && !hasCuratedContent)) {
                    // For 'both' mediaType, we need to fetch from both APIs and combine
                    if (row.mediaType === 'both') {
                        const apiType = row.id.includes('trending') ? 'trending' : 'top-rated'

                        // Fetch both movies and TV in parallel
                        const [moviesResponse, tvResponse] = await Promise.all([
                            fetch(
                                `/api/movies/${apiType}${childSafetyMode ? '?childSafetyMode=true' : ''}`,
                                {
                                    headers: { 'X-User-ID': userId },
                                }
                            ),
                            fetch(
                                `/api/tv/${apiType}${childSafetyMode ? '?childSafetyMode=true' : ''}`,
                                {
                                    headers: { 'X-User-ID': userId },
                                }
                            ),
                        ])

                        if (!moviesResponse.ok || !tvResponse.ok) {
                            throw new Error('Failed to load content')
                        }

                        const [moviesData, tvData] = await Promise.all([
                            moviesResponse.json(),
                            tvResponse.json(),
                        ])

                        // Combine and interleave results (alternating between movies and TV)
                        const combined: Content[] = []
                        const maxLength = Math.max(moviesData.results.length, tvData.results.length)

                        for (let i = 0; i < maxLength; i++) {
                            if (i < moviesData.results.length) {
                                combined.push(moviesData.results[i])
                            }
                            if (i < tvData.results.length) {
                                combined.push(tvData.results[i])
                            }
                        }

                        setContent(combined)
                        setIsLoading(false)
                        return
                    }

                    // For single media type
                    const mediaType = row.mediaType === 'tv' ? 'tv' : 'movies'

                    if (row.id.includes('trending')) {
                        url = new URL(`/api/${mediaType}/trending`, window.location.origin)
                    } else if (row.id.includes('top-rated')) {
                        url = new URL(`/api/${mediaType}/top-rated`, window.location.origin)
                    } else {
                        throw new Error('Invalid special row configuration')
                    }

                    if (childSafetyMode) {
                        url.searchParams.append('childSafetyMode', 'true')
                    }
                } else {
                    // Regular custom/system row with genre filters or curated content list
                    url = new URL(`/api/custom-rows/${row.id}/content`, window.location.origin)
                    url.searchParams.append('page', '1')

                    // Check for curated content list (Gemini recommendations)
                    const customRow = row as CustomRow
                    if (
                        customRow.advancedFilters?.contentIds &&
                        customRow.advancedFilters.contentIds.length > 0
                    ) {
                        // Use content IDs for concept-based rows
                        url.searchParams.append(
                            'contentIds',
                            customRow.advancedFilters.contentIds.join(',')
                        )
                    } else {
                        // Use genre filters for traditional rows
                        url.searchParams.append('genres', row.genres.join(','))
                        url.searchParams.append('genreLogic', row.genreLogic)
                    }

                    url.searchParams.append('mediaType', row.mediaType)
                    if (childSafetyMode) {
                        url.searchParams.append('childSafetyMode', 'true')
                    }
                }

                const response = await fetch(url.toString(), {
                    headers: {
                        'X-User-ID': userId,
                    },
                })

                if (!response.ok) {
                    let errorMessage = 'Failed to load content'
                    try {
                        const errorData = await response.json()
                        errorMessage = errorData.message || errorMessage
                    } catch {
                        // Response body is not JSON, use default error message
                        errorMessage = `Failed to load content (${response.status} ${response.statusText})`
                    }
                    throw new Error(errorMessage)
                }

                const data = await response.json()
                setContent(data.results || [])
            } catch (err) {
                console.error('Error loading custom row content:', err)
                setError((err as Error).message)
            } finally {
                setIsLoading(false)
            }
        }

        loadContent()
    }, [row.id, row.genres.join(','), row.genreLogic, row.mediaType, userId, childSafetyMode])

    // Don't render if no user
    if (!userId) {
        return null
    }

    // Don't render if error
    if (error) {
        console.error(`CustomRowLoader error for row ${row.id}:`, error)
        return null
    }

    // Don't render while loading
    if (isLoading) {
        return null
    }

    // Don't render if no content
    if (content.length === 0) {
        return null
    }

    // Build API endpoint for infinite scroll with row configuration
    let apiEndpoint: string

    // Check for curated content to avoid treating it as a special row
    const customRow = row as CustomRow
    const hasCuratedContent =
        customRow.advancedFilters?.contentIds && customRow.advancedFilters.contentIds.length > 0

    // Handle special system rows (trending, top-rated)
    // Note: For 'both' mediaType, infinite scroll will use movies API
    // (combined results are only for initial load)
    // Note: Curated rows with contentIds but no genres should NOT be treated as special rows
    if (row.isSpecialRow || (row.genres.length === 0 && !hasCuratedContent)) {
        const mediaType = row.mediaType === 'tv' ? 'tv' : 'movies' // Default to movies for 'both'

        if (row.id.includes('trending')) {
            apiEndpoint = `/api/${mediaType}/trending${childSafetyMode ? '?childSafetyMode=true' : ''}`
        } else if (row.id.includes('top-rated')) {
            apiEndpoint = `/api/${mediaType}/top-rated${childSafetyMode ? '?childSafetyMode=true' : ''}`
        } else {
            // Fallback - shouldn't reach here
            apiEndpoint = `/api/movies/trending`
        }
    } else {
        // Regular custom/system row with genre filters or curated content
        const apiEndpointUrl = new URL(`/api/custom-rows/${row.id}/content`, window.location.origin)

        // Check if this row has genres for fallback infinite content
        const hasGenres = row.genres && row.genres.length > 0

        if (hasCuratedContent) {
            // For curated rows: include contentIds
            apiEndpointUrl.searchParams.append(
                'contentIds',
                customRow.advancedFilters!.contentIds!.join(',')
            )

            // Only include genres if they exist (for fallback infinite content)
            if (hasGenres) {
                apiEndpointUrl.searchParams.append('genres', row.genres.join(','))
                apiEndpointUrl.searchParams.append('genreLogic', row.genreLogic)
            }
        } else if (hasGenres) {
            // For traditional rows: use genres only
            apiEndpointUrl.searchParams.append('genres', row.genres.join(','))
            apiEndpointUrl.searchParams.append('genreLogic', row.genreLogic)
        }

        apiEndpointUrl.searchParams.append('mediaType', row.mediaType)
        if (childSafetyMode) {
            apiEndpointUrl.searchParams.append('childSafetyMode', 'true')
        }
        apiEndpoint = apiEndpointUrl.pathname + apiEndpointUrl.search
    }

    return <Row title={row.name} content={content} apiEndpoint={apiEndpoint} pageType={pageType} />
}
