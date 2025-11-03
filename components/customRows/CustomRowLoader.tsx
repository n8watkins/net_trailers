'use client'

import React, { useEffect, useState } from 'react'
import Row from '../content/Row'
import { Content } from '../../typings'
import { useSessionStore } from '../../stores/sessionStore'
import { useChildSafety } from '../../hooks/useChildSafety'
import { CustomRow } from '../../types/customRows'

interface CustomRowLoaderProps {
    row: CustomRow
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
    const { childSafetyMode } = useChildSafety()
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
                // Build URL with row configuration as query params
                const url = new URL(`/api/custom-rows/${row.id}/content`, window.location.origin)
                url.searchParams.append('page', '1')
                url.searchParams.append('genres', row.genres.join(','))
                url.searchParams.append('genreLogic', row.genreLogic)
                url.searchParams.append('mediaType', row.mediaType)
                if (childSafetyMode) {
                    url.searchParams.append('childSafetyMode', 'true')
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
    const apiEndpointUrl = new URL(`/api/custom-rows/${row.id}/content`, window.location.origin)
    apiEndpointUrl.searchParams.append('genres', row.genres.join(','))
    apiEndpointUrl.searchParams.append('genreLogic', row.genreLogic)
    apiEndpointUrl.searchParams.append('mediaType', row.mediaType)
    if (childSafetyMode) {
        apiEndpointUrl.searchParams.append('childSafetyMode', 'true')
    }
    const apiEndpoint = apiEndpointUrl.pathname + apiEndpointUrl.search

    return <Row title={row.name} content={content} apiEndpoint={apiEndpoint} />
}
