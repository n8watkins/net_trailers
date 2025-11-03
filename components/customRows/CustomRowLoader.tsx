'use client'

import React, { useEffect, useState } from 'react'
import Row from '../content/Row'
import { Content } from '../../types/content'
import { useSessionStore } from '../../stores/sessionStore'
import { useChildSafety } from '../../hooks/useChildSafety'

interface CustomRowLoaderProps {
    rowId: string
    rowName: string
}

/**
 * CustomRowLoader Component
 *
 * Loads TMDB content for a custom row and displays it using the Row component.
 * Handles initial content fetch and provides API endpoint for infinite scroll.
 * Integrates with child safety mode and user session.
 */
export function CustomRowLoader({ rowId, rowName }: CustomRowLoaderProps) {
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
                const url = new URL(`/api/custom-rows/${rowId}/content`, window.location.origin)
                url.searchParams.append('page', '1')
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
    }, [rowId, userId, childSafetyMode])

    // Don't render if no user
    if (!userId) {
        return null
    }

    // Don't render if error
    if (error) {
        console.error(`CustomRowLoader error for row ${rowId}:`, error)
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

    // Build API endpoint for infinite scroll
    const apiEndpoint = `/api/custom-rows/${rowId}/content${
        childSafetyMode ? '?childSafetyMode=true' : ''
    }`

    return <Row title={rowName} content={content} apiEndpoint={apiEndpoint} />
}
