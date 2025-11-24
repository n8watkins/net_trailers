'use client'

import { useEffect, useState, useCallback } from 'react'
import { XMarkIcon } from '@heroicons/react/24/solid'
import Image from 'next/image'
import { useModalStore } from '../../stores/modalStore'
import { Content, getTitle } from '../../typings'
import ContentCard from '../common/ContentCard'

export default function ActorContentModal() {
    const { actorContentModal, closeActorContentModal, openModal } = useModalStore()
    const { isOpen, actor } = actorContentModal

    const [content, setContent] = useState<Content[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Fetch content for the actor
    const fetchActorContent = useCallback(async () => {
        if (!actor) return

        setIsLoading(true)
        setError(null)

        try {
            const response = await fetch(
                `/api/discover/by-actor?actorId=${actor.id}&mediaType=both`
            )
            if (!response.ok) {
                throw new Error(`Failed to fetch content: ${response.status}`)
            }

            const data = await response.json()
            setContent(data.results || [])
        } catch (err) {
            console.error('Error fetching actor content:', err)
            setError('Failed to load content')
            setContent([])
        } finally {
            setIsLoading(false)
        }
    }, [actor])

    // Fetch content when modal opens with an actor
    useEffect(() => {
        if (isOpen && actor) {
            fetchActorContent()
        } else {
            setContent([])
        }
    }, [isOpen, actor, fetchActorContent])

    // Handle escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                closeActorContentModal()
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, closeActorContentModal])

    // Handle backdrop click
    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            closeActorContentModal()
        }
    }

    // Handle content click - open the main content modal
    const handleContentClick = (item: Content) => {
        closeActorContentModal()
        openModal(item, true, false)
    }

    if (!isOpen || !actor) return null

    const profileImage = actor.profile_path
        ? `https://image.tmdb.org/t/p/w185${actor.profile_path}`
        : null

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={handleBackdropClick}
        >
            <div className="relative w-full max-w-6xl max-h-[90vh] mx-4 bg-gray-900 rounded-xl overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-gradient-to-b from-gray-900 via-gray-900 to-transparent px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            {/* Actor Photo */}
                            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden ring-2 ring-red-500 flex-shrink-0">
                                {profileImage ? (
                                    <Image
                                        src={profileImage}
                                        alt={actor.name}
                                        fill
                                        style={{ objectFit: 'cover' }}
                                        sizes="80px"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                                        <span className="text-2xl">
                                            {actor.gender === 1 ? '👩' : '👨'}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Actor Info */}
                            <div>
                                <h2 className="text-xl sm:text-2xl font-bold text-white">
                                    {actor.name}
                                </h2>
                                <p className="text-sm text-gray-400">
                                    {content.length > 0
                                        ? `${content.length} titles found`
                                        : 'Loading filmography...'}
                                </p>
                            </div>
                        </div>

                        {/* Close Button */}
                        <button
                            onClick={closeActorContentModal}
                            className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors"
                        >
                            <XMarkIcon className="w-6 h-6 text-white" />
                        </button>
                    </div>
                </div>

                {/* Content Grid */}
                <div className="px-6 pb-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                    {isLoading && (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-12 h-12 border-4 border-gray-600 border-t-red-600 rounded-full animate-spin" />
                        </div>
                    )}

                    {error && (
                        <div className="flex items-center justify-center py-12">
                            <p className="text-red-400">{error}</p>
                        </div>
                    )}

                    {!isLoading && !error && content.length === 0 && (
                        <div className="flex items-center justify-center py-12">
                            <p className="text-gray-400">No content found for this actor</p>
                        </div>
                    )}

                    {!isLoading && !error && content.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                            {content.map((item) => (
                                <div
                                    key={`${item.media_type}-${item.id}`}
                                    onClick={() => handleContentClick(item)}
                                    className="cursor-pointer"
                                >
                                    <ContentCard content={item} size="compact" />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
