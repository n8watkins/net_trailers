'use client'

import React, { useEffect, useState } from 'react'
import Row from '../content/Row'
import { Content } from '../../typings'
import { useSessionStore } from '../../stores/sessionStore'
import { useChildSafety } from '../../hooks/useChildSafety'
import { CustomRow, DisplayRow } from '../../types/customRows'

interface CustomRowLoaderProps {
    row: CustomRow | DisplayRow
}

/**
 * CustomRowLoader Component
 *
 * Loads TMDB content for a custom row and displays it using the Row component.
 * Handles initial content fetch and provides API endpoint for infinite scroll.
 * Integrates with child safety mode and user session.
 */
export function CustomRowLoader({ row }: CustomRowLoaderProps) {
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
                if (row.genres.length === 0) {
                    // Determine API endpoint based on row ID
                    if (row.id.includes('trending')) {
                        const mediaType =
                            row.mediaType === 'both'
                                ? 'movies'
                                : row.mediaType === 'tv'
                                  ? 'tv'
                                  : 'movies'
                        url = new URL(`/api/${mediaType}/trending`, window.location.origin)
                    } else if (row.id.includes('top-rated')) {
                        const mediaType =
                            row.mediaType === 'both'
                                ? 'movies'
                                : row.mediaType === 'tv'
                                  ? 'tv'
                                  : 'movies'
                        url = new URL(`/api/${mediaType}/top-rated`, window.location.origin)
                    } else {
                        throw new Error('Invalid special row configuration')
                    }

                    if (childSafetyMode) {
                        url.searchParams.append('childSafetyMode', 'true')
                    }
                } else {
                    // Regular custom/system row with genre filters
                    url = new URL(`/api/custom-rows/${row.id}/content`, window.location.origin)
                    url.searchParams.append('page', '1')
                    url.searchParams.append('genres', row.genres.join(','))
                    url.searchParams.append('genreLogic', row.genreLogic)
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
    }, [row.id, row.genres, row.genreLogic, row.mediaType, userId, childSafetyMode])

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

    // Handle special system rows (trending, top-rated)
    if (row.genres.length === 0) {
        if (row.id.includes('trending')) {
            const mediaType =
                row.mediaType === 'both' ? 'movies' : row.mediaType === 'tv' ? 'tv' : 'movies'
            apiEndpoint = `/api/${mediaType}/trending${childSafetyMode ? '?childSafetyMode=true' : ''}`
        } else if (row.id.includes('top-rated')) {
            const mediaType =
                row.mediaType === 'both' ? 'movies' : row.mediaType === 'tv' ? 'tv' : 'movies'
            apiEndpoint = `/api/${mediaType}/top-rated${childSafetyMode ? '?childSafetyMode=true' : ''}`
        } else {
            // Fallback - shouldn't reach here
            apiEndpoint = `/api/movies/trending`
        }
    } else {
        // Regular custom/system row with genre filters
        const apiEndpointUrl = new URL(`/api/custom-rows/${row.id}/content`, window.location.origin)
        apiEndpointUrl.searchParams.append('genres', row.genres.join(','))
        apiEndpointUrl.searchParams.append('genreLogic', row.genreLogic)
        apiEndpointUrl.searchParams.append('mediaType', row.mediaType)
        if (childSafetyMode) {
            apiEndpointUrl.searchParams.append('childSafetyMode', 'true')
        }
        apiEndpoint = apiEndpointUrl.pathname + apiEndpointUrl.search
    }

    return <Row title={row.name} content={content} apiEndpoint={apiEndpoint} />
}
