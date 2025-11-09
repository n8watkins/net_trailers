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

interface MoreLikeThisSectionProps {
    /** Current content being viewed */
    content: Content
}

export default function MoreLikeThisSection({ content }: MoreLikeThisSectionProps) {
    const [recommendations, setRecommendations] = useState<Recommendation[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

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

    return (
        <div className="space-y-4 border-t border-gray-700 pt-6">
            <h3 className="text-lg sm:text-xl font-semibold text-white">
                More Like {getTitle(content)}
            </h3>

            {/* Grid of recommendations */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                {recommendations.map((rec) => (
                    <ContentCard key={rec.content.id} content={rec.content} size="small" />
                ))}
            </div>
        </div>
    )
}
