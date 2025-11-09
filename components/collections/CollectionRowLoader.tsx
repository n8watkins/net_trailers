'use client'

import React, { useEffect, useState } from 'react'
import Row from '../content/Row'
import { Content } from '../../typings'
import { useSessionStore } from '../../stores/sessionStore'
import { useChildSafety } from '../../hooks/useChildSafety'
import { Collection } from '../../types/userLists'
import { deduplicateContent } from '../../utils/contentDeduplication'

interface CollectionRowLoaderProps {
    collection: Collection
    pageType?: 'home' | 'movies' | 'tv'
}

/**
 * CollectionRowLoader Component
 *
 * Renders a collection as a row on browse pages.
 * - For manual/ai-generated collections: renders items array directly
 * - For TMDB-based collections: fetches content from TMDB using genres/filters
 *
 * Integrates with child safety mode and supports infinite scroll.
 */
export function CollectionRowLoader({ collection, pageType }: CollectionRowLoaderProps) {
    const [content, setContent] = useState<Content[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const getUserId = useSessionStore((state) => state.getUserId)
    const { isEnabled: childSafetyMode } = useChildSafety()
    const userId = getUserId()

    useEffect(() => {
        // For manual/ai-generated collections, use items directly
        if (
            collection.collectionType === 'manual' ||
            collection.collectionType === 'ai-generated'
        ) {
            setContent(collection.items || [])
            setIsLoading(false)
            return
        }

        // For TMDB-based collections, fetch from API
        // Note: Special collections (trending, top-rated) don't require authentication
        const loadContent = async () => {
            setIsLoading(true)
            setError(null)

            try {
                let url: URL

                // Handle special collections (trending, top-rated)
                const hasCuratedContent =
                    collection.advancedFilters?.contentIds &&
                    collection.advancedFilters.contentIds.length > 0

                const isSpecialPublicCollection =
                    collection.isSpecialCollection ||
                    ((!collection.genres || collection.genres.length === 0) && !hasCuratedContent)

                // Only require userId for non-public collections
                if (!isSpecialPublicCollection && !userId) {
                    setIsLoading(false)
                    setError('User not authenticated')
                    return
                }

                if (isSpecialPublicCollection) {
                    // For 'both' mediaType, fetch from both APIs and combine
                    if (collection.mediaType === 'both') {
                        const apiType = collection.id.includes('trending')
                            ? 'trending'
                            : 'top-rated'

                        // Fetch both movies and TV in parallel (no auth required)
                        const [moviesResponse, tvResponse] = await Promise.all([
                            fetch(
                                `/api/movies/${apiType}${childSafetyMode ? '?childSafetyMode=true' : ''}`
                            ),
                            fetch(
                                `/api/tv/${apiType}${childSafetyMode ? '?childSafetyMode=true' : ''}`
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

                        // Deduplicate combined results
                        setContent(deduplicateContent(combined))
                        setIsLoading(false)
                        return
                    }

                    // For single media type
                    const mediaType = collection.mediaType === 'tv' ? 'tv' : 'movies'

                    if (collection.id.includes('trending')) {
                        url = new URL(`/api/${mediaType}/trending`, window.location.origin)
                    } else if (collection.id.includes('top-rated')) {
                        url = new URL(`/api/${mediaType}/top-rated`, window.location.origin)
                    } else {
                        throw new Error('Invalid special collection configuration')
                    }

                    if (childSafetyMode) {
                        url.searchParams.append('childSafetyMode', 'true')
                    }
                } else {
                    // Regular TMDB collection with genre filters or curated content
                    url = new URL(
                        `/api/custom-rows/${collection.id}/content`,
                        window.location.origin
                    )
                    url.searchParams.append('page', '1')

                    // Check for curated content list (AI recommendations)
                    if (hasCuratedContent) {
                        url.searchParams.append(
                            'contentIds',
                            collection.advancedFilters!.contentIds!.join(',')
                        )
                    } else if (collection.genres && collection.genres.length > 0) {
                        // Use genre filters
                        url.searchParams.append('genres', collection.genres.join(','))
                        url.searchParams.append('genreLogic', collection.genreLogic || 'OR')
                    }

                    if (collection.mediaType) {
                        url.searchParams.append('mediaType', collection.mediaType)
                    }
                    if (childSafetyMode) {
                        url.searchParams.append('childSafetyMode', 'true')
                    }
                }

                // Only add X-User-ID header for non-public endpoints
                const headers: Record<string, string> = {}
                if (!isSpecialPublicCollection && userId) {
                    headers['X-User-ID'] = userId
                }

                const response = await fetch(url.toString(), { headers })

                if (!response.ok) {
                    let errorMessage = 'Failed to load content'
                    try {
                        const errorData = await response.json()
                        errorMessage = errorData.message || errorMessage
                    } catch {
                        errorMessage = `Failed to load content (${response.status} ${response.statusText})`
                    }
                    throw new Error(errorMessage)
                }

                const data = await response.json()
                setContent(data.results || [])
            } catch (err) {
                console.error('Error loading collection content:', err)
                setError((err as Error).message)
            } finally {
                setIsLoading(false)
            }
        }

        loadContent()
    }, [
        collection.id,
        collection.collectionType,
        collection.genres?.join(','),
        collection.genreLogic,
        collection.mediaType,
        collection.isSpecialCollection,
        userId,
        childSafetyMode,
    ])

    // Don't render if disabled
    if (!collection.enabled) {
        return null
    }

    // Don't render if no user (for non-public TMDB-based collections)
    // Special collections (trending, top-rated) are public and don't require auth
    const isPublicCollection =
        collection.isSpecialCollection ||
        (collection.collectionType === 'tmdb-genre' &&
            (!collection.genres || collection.genres.length === 0) &&
            !collection.advancedFilters?.contentIds)

    if (collection.collectionType === 'tmdb-genre' && !isPublicCollection && !userId) {
        return null
    }

    // Don't render if error
    if (error) {
        console.error(`CollectionRowLoader error for collection ${collection.id}:`, error)
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
    let apiEndpoint: string | undefined

    // Manual/AI collections don't need infinite scroll (they have fixed items)
    if (collection.collectionType === 'manual' || collection.collectionType === 'ai-generated') {
        apiEndpoint = undefined
    } else {
        // TMDB-based collections support infinite scroll
        const hasCuratedContent =
            collection.advancedFilters?.contentIds &&
            collection.advancedFilters.contentIds.length > 0

        // Handle special collections (trending, top-rated)
        if (
            collection.isSpecialCollection ||
            ((!collection.genres || collection.genres.length === 0) && !hasCuratedContent)
        ) {
            const mediaType = collection.mediaType === 'tv' ? 'tv' : 'movies'

            if (collection.id.includes('trending')) {
                apiEndpoint = `/api/${mediaType}/trending${childSafetyMode ? '?childSafetyMode=true' : ''}`
            } else if (collection.id.includes('top-rated')) {
                apiEndpoint = `/api/${mediaType}/top-rated${childSafetyMode ? '?childSafetyMode=true' : ''}`
            } else {
                apiEndpoint = `/api/movies/trending`
            }
        } else {
            // Regular TMDB collection with genre filters or curated content
            const apiEndpointUrl = new URL(
                `/api/custom-rows/${collection.id}/content`,
                window.location.origin
            )

            const hasGenres = collection.genres && collection.genres.length > 0

            if (hasCuratedContent) {
                apiEndpointUrl.searchParams.append(
                    'contentIds',
                    collection.advancedFilters!.contentIds!.join(',')
                )

                if (hasGenres) {
                    apiEndpointUrl.searchParams.append('genres', collection.genres!.join(','))
                    apiEndpointUrl.searchParams.append('genreLogic', collection.genreLogic || 'OR')
                }
            } else if (hasGenres) {
                apiEndpointUrl.searchParams.append('genres', collection.genres!.join(','))
                apiEndpointUrl.searchParams.append('genreLogic', collection.genreLogic || 'OR')
            }

            if (collection.mediaType) {
                apiEndpointUrl.searchParams.append('mediaType', collection.mediaType)
            }
            if (childSafetyMode) {
                apiEndpointUrl.searchParams.append('childSafetyMode', 'true')
            }
            apiEndpoint = apiEndpointUrl.pathname + apiEndpointUrl.search
        }
    }

    return (
        <Row
            title={collection.name}
            content={content}
            apiEndpoint={apiEndpoint}
            pageType={pageType}
        />
    )
}
