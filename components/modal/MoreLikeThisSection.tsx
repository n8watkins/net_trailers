/**
 * More Like This Section
 *
 * Displays similar content recommendations in the content modal
 */

'use client'

import { useEffect, useState } from 'react'
import { Content, getTitle } from '../../typings'
import { Recommendation } from '../../types/recommendations'
import ContentCard from '../common/ContentCard'
import { FolderPlusIcon } from '@heroicons/react/24/outline'
import { useModalStore } from '../../stores/modalStore'

interface MoreLikeThisSectionProps {
    /** Current content being viewed */
    content: Content
}

export default function MoreLikeThisSection({ content }: MoreLikeThisSectionProps) {
    const [recommendations, setRecommendations] = useState<Recommendation[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const openCollectionCreatorModal = useModalStore((state) => state.openCollectionCreatorModal)

    // Fetch similar content
    useEffect(() => {
        const fetchSimilar = async () => {
            if (!content || !content.id) return

            setIsLoading(true)
            setError(null)

            try {
                const mediaType = content.media_type || 'movie'
                const response = await fetch(
                    `/api/recommendations/similar/${content.id}?mediaType=${mediaType}&limit=12`
                )

                if (!response.ok) {
                    throw new Error('Failed to fetch similar content')
                }

                const data = await response.json()

                if (data.success) {
                    setRecommendations(data.recommendations || [])
                } else {
                    setError(data.error || 'Failed to load recommendations')
                }
            } catch (err) {
                console.error('Error fetching similar content:', err)
                setError('Unable to load recommendations')
            } finally {
                setIsLoading(false)
            }
        }

        fetchSimilar()
    }, [content.id])

    // Don't render if loading initially
    if (isLoading && recommendations.length === 0) {
        return (
            <div className="space-y-4">
                <h3 className="text-lg sm:text-xl font-semibold text-white">More Like This</h3>
                <div className="flex items-center justify-center py-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-500 border-t-transparent"></div>
                </div>
            </div>
        )
    }

    // Don't render if error
    if (error) {
        return null // Fail silently - recommendations are not critical
    }

    // Don't render if no recommendations
    if (recommendations.length === 0) {
        return null
    }

    const handleCreateCollection = () => {
        if (!openCollectionCreatorModal) return

        // Include the current content plus all recommendations, deduplicated by ID
        const itemsMap = new Map<number, Content>()
        itemsMap.set(content.id, content)
        recommendations.forEach((rec) => {
            if (rec?.content?.id) {
                itemsMap.set(rec.content.id, rec.content)
            }
        })

        const uniqueItems = Array.from(itemsMap.values())
        if (uniqueItems.length === 0) return

        const hasMovies = uniqueItems.some((item) => item.media_type === 'movie')
        const hasTv = uniqueItems.some((item) => item.media_type === 'tv')
        const mediaType: 'movie' | 'tv' | 'all' =
            hasMovies && hasTv ? 'all' : hasTv ? 'tv' : 'movie'

        openCollectionCreatorModal(`More Like ${getTitle(content)}`, uniqueItems, mediaType)
    }

    return (
        <div className="space-y-4 border-t border-gray-700 pt-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-lg sm:text-xl font-semibold text-white">
                    More Like {getTitle(content)}
                </h3>

                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        className="inline-flex items-center gap-1.5 rounded-full border border-red-500/40 px-3 py-1.5 text-sm font-medium text-red-200 hover:border-red-400 hover:bg-red-500/10 transition-colors"
                        onClick={handleCreateCollection}
                    >
                        <FolderPlusIcon className="h-4 w-4" />
                        <span>Create Collection</span>
                    </button>
                </div>
            </div>

            {/* Grid of recommendations */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                {recommendations.map((rec) => (
                    <ContentCard key={rec.content.id} content={rec.content} size="small" />
                ))}
            </div>
        </div>
    )
}
