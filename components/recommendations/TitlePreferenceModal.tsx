/**
 * Title Preference Modal
 *
 * Allows users to rate individual movies/TV shows to improve recommendations.
 * Features large poster display, cast/crew details, and smooth vote animations.
 * Prioritizes watchlist content that hasn't been voted on.
 */

'use client'

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import Image from 'next/image'
import { XMarkIcon } from '@heroicons/react/24/outline'
import {
    HeartIcon,
    HandThumbDownIcon,
    MinusIcon,
    FilmIcon,
    TvIcon,
    SparklesIcon,
} from '@heroicons/react/24/solid'
import { Content, BaseContent } from '../../typings'
import { VotedContent } from '../../types/shared'

type VoteValue = 'love' | 'neutral' | 'not_for_me'

interface CastMember {
    id: number
    name: string
    character: string
    profile_path: string | null
}

interface ContentWithCredits extends BaseContent {
    media_type: 'movie' | 'tv'
    // Movie fields
    title?: string
    release_date?: string
    // TV fields
    name?: string
    first_air_date?: string
    // Extra credits fields
    cast?: CastMember[]
    director?: string
    creator?: string
}

// Helper functions for ContentWithCredits
function getContentTitle(content: ContentWithCredits): string {
    return content.title || content.name || 'Unknown Title'
}

function getContentYear(content: ContentWithCredits): string {
    const date = content.release_date || content.first_air_date
    if (date && typeof date === 'string' && date.length >= 4) {
        return date.slice(0, 4)
    }
    return ''
}

function isContentMovie(content: ContentWithCredits): boolean {
    return content.media_type === 'movie'
}

interface TitlePreferenceModalProps {
    isOpen: boolean
    onClose: () => void
    onSave: (votes: VotedContent[]) => Promise<void>
    existingVotes?: VotedContent[]
    watchlistContent?: Content[]
    likedContent?: Content[]
}

export default function TitlePreferenceModal({
    isOpen,
    onClose,
    onSave,
    existingVotes = [],
    watchlistContent = [],
    likedContent = [],
}: TitlePreferenceModalProps) {
    const [isSaving, setIsSaving] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [content, setContent] = useState<ContentWithCredits[]>([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [votes, setVotes] = useState<Record<string, VoteValue>>(() => {
        const initial: Record<string, VoteValue> = {}
        existingVotes.forEach((v) => {
            initial[`${v.contentId}-${v.mediaType}`] = v.vote
        })
        return initial
    })
    const [animatingVote, setAnimatingVote] = useState<VoteValue | null>(null)

    // Build list of IDs to exclude (already voted or liked)
    const excludeIds = useMemo(() => {
        const ids = new Set<number>()
        existingVotes.forEach((v) => ids.add(v.contentId))
        likedContent.forEach((c) => ids.add(c.id))
        return Array.from(ids)
    }, [existingVotes, likedContent])

    // Build priority content from watchlist (items not yet voted on)
    const priorityContent = useMemo(() => {
        const votedIds = new Set(existingVotes.map((v) => v.contentId))
        const likedIds = new Set(likedContent.map((c) => c.id))
        return watchlistContent
            .filter((c) => !votedIds.has(c.id) && !likedIds.has(c.id))
            .map((c) => ({
                id: c.id,
                mediaType: (c.media_type || 'movie') as 'movie' | 'tv',
            }))
    }, [watchlistContent, existingVotes, likedContent])

    // Fetch content on mount
    useEffect(() => {
        if (!isOpen) return

        const fetchContent = async () => {
            setIsLoading(true)
            try {
                const response = await fetch('/api/recommendations/preference-content', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        excludeIds,
                        limit: 15,
                        includeCredits: true,
                        priorityContent,
                    }),
                })

                if (!response.ok) throw new Error('Failed to fetch content')

                const data = await response.json()
                if (data.success && data.content) {
                    setContent(data.content)
                }
            } catch (error) {
                console.error('Error fetching preference content:', error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchContent()
    }, [isOpen, excludeIds, priorityContent])

    const currentContent = content[currentIndex]
    const contentKey = currentContent
        ? `${currentContent.id}-${currentContent.media_type || 'movie'}`
        : ''
    const currentVote = votes[contentKey]

    const handleVote = useCallback(
        (vote: VoteValue) => {
            if (!currentContent) return

            // Trigger animation
            setAnimatingVote(vote)

            // Update votes
            setVotes((prev) => ({
                ...prev,
                [contentKey]: vote,
            }))

            // Auto-advance after animation
            setTimeout(() => {
                setAnimatingVote(null)
                if (currentIndex < content.length - 1) {
                    setCurrentIndex((prev) => prev + 1)
                }
            }, 400)
        },
        [currentContent, contentKey, currentIndex, content.length]
    )

    const handleSave = async () => {
        setIsSaving(true)
        try {
            const votesToSave: VotedContent[] = Object.entries(votes).map(([key, vote]) => {
                const [contentId, mediaType] = key.split('-')
                return {
                    contentId: parseInt(contentId),
                    mediaType: mediaType as 'movie' | 'tv',
                    vote,
                    votedAt: Date.now(),
                }
            })
            await onSave(votesToSave)
            onClose()
        } catch (error) {
            console.error('Failed to save title preferences:', error)
        } finally {
            setIsSaving(false)
        }
    }

    const progress = content.length > 0 ? ((currentIndex + 1) / content.length) * 100 : 0
    const votedCount = Object.keys(votes).length

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[50000] flex items-center justify-center p-2 sm:p-4">
            {/* Background overlay */}
            <div
                className="fixed inset-0 transition-opacity bg-black/90 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal panel */}
            <div className="relative w-full max-w-lg overflow-hidden transition-all transform bg-[#0a0a0a] border border-gray-700/50 rounded-xl shadow-2xl max-h-[95vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-700/50 shrink-0">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <SparklesIcon className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
                        <div>
                            <h2 className="text-base sm:text-lg font-bold text-white">
                                Rate Titles
                            </h2>
                            {!isLoading && content.length > 0 && (
                                <p className="text-xs text-gray-400">
                                    {currentIndex + 1} of {content.length}
                                </p>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors duration-200 p-2 rounded-full hover:bg-white/10 -mr-2"
                    >
                        <XMarkIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-4">
                    {/* Progress bar */}
                    {!isLoading && content.length > 0 && (
                        <div className="h-1 bg-gray-800 rounded-full mb-4">
                            <div
                                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    )}

                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-500 mb-4" />
                            <p className="text-gray-400 text-sm">
                                Finding titles for you to rate...
                            </p>
                        </div>
                    ) : content.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <SparklesIcon className="w-12 h-12 text-gray-600 mb-4" />
                            <p className="text-gray-400">No new titles to rate right now.</p>
                            <p className="text-gray-500 text-sm mt-2">
                                Add more to your watchlist or check back later.
                            </p>
                        </div>
                    ) : currentContent ? (
                        <div
                            className={`transition-all duration-300 ${
                                animatingVote
                                    ? animatingVote === 'love'
                                        ? 'scale-95 opacity-70'
                                        : animatingVote === 'not_for_me'
                                          ? 'scale-95 opacity-70 -rotate-2'
                                          : 'scale-95 opacity-70'
                                    : ''
                            }`}
                        >
                            {/* Large poster */}
                            <div className="relative w-full aspect-[2/3] rounded-xl overflow-hidden mb-4 bg-gray-900">
                                {currentContent.poster_path ? (
                                    <Image
                                        src={`https://image.tmdb.org/t/p/w500${currentContent.poster_path}`}
                                        alt={getContentTitle(currentContent)}
                                        fill
                                        className="object-cover"
                                        priority
                                    />
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                                        {isContentMovie(currentContent) ? (
                                            <FilmIcon className="w-16 h-16 text-gray-600" />
                                        ) : (
                                            <TvIcon className="w-16 h-16 text-gray-600" />
                                        )}
                                    </div>
                                )}

                                {/* Vote overlay animation */}
                                {animatingVote && (
                                    <div
                                        className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${
                                            animatingVote === 'love'
                                                ? 'bg-pink-500/30'
                                                : animatingVote === 'not_for_me'
                                                  ? 'bg-red-500/30'
                                                  : 'bg-gray-500/30'
                                        }`}
                                    >
                                        {animatingVote === 'love' && (
                                            <HeartIcon className="w-24 h-24 text-pink-500 animate-pulse" />
                                        )}
                                        {animatingVote === 'not_for_me' && (
                                            <HandThumbDownIcon className="w-24 h-24 text-red-500 animate-pulse" />
                                        )}
                                        {animatingVote === 'neutral' && (
                                            <MinusIcon className="w-24 h-24 text-gray-400 animate-pulse" />
                                        )}
                                    </div>
                                )}

                                {/* Media type badge */}
                                <div className="absolute top-3 left-3">
                                    <span
                                        className={`px-2 py-1 rounded text-xs font-medium ${
                                            isContentMovie(currentContent)
                                                ? 'bg-blue-500/80 text-white'
                                                : 'bg-purple-500/80 text-white'
                                        }`}
                                    >
                                        {isContentMovie(currentContent) ? 'Movie' : 'TV Show'}
                                    </span>
                                </div>
                            </div>

                            {/* Title and year */}
                            <div className="text-center mb-3">
                                <h3 className="text-xl sm:text-2xl font-bold text-white">
                                    {getContentTitle(currentContent)}
                                </h3>
                                <p className="text-gray-400 text-sm">
                                    {getContentYear(currentContent)}
                                    {currentContent.vote_average && (
                                        <span className="ml-2">
                                            ⭐ {currentContent.vote_average.toFixed(1)}
                                        </span>
                                    )}
                                </p>
                            </div>

                            {/* Director/Creator */}
                            {(currentContent.director || currentContent.creator) && (
                                <p className="text-center text-gray-400 text-sm mb-3">
                                    {currentContent.director
                                        ? `Directed by ${currentContent.director}`
                                        : `Created by ${currentContent.creator}`}
                                </p>
                            )}

                            {/* Cast */}
                            {currentContent.cast && currentContent.cast.length > 0 && (
                                <div className="mb-4">
                                    <p className="text-gray-500 text-xs mb-2 text-center">
                                        Starring
                                    </p>
                                    <div className="flex flex-wrap justify-center gap-1">
                                        {currentContent.cast.slice(0, 4).map((actor) => (
                                            <span
                                                key={actor.id}
                                                className="px-2 py-1 bg-gray-800 rounded-full text-xs text-gray-300"
                                            >
                                                {actor.name}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Overview */}
                            {currentContent.overview && (
                                <p className="text-gray-400 text-sm text-center line-clamp-3 mb-4">
                                    {currentContent.overview}
                                </p>
                            )}

                            {/* Vote buttons */}
                            <div className="flex justify-center gap-3 sm:gap-4">
                                <button
                                    onClick={() => handleVote('not_for_me')}
                                    disabled={!!animatingVote}
                                    className={`flex flex-col items-center gap-1.5 p-3 sm:p-4 rounded-xl transition-all duration-200 min-w-[80px] sm:min-w-[100px] active:scale-95 ${
                                        currentVote === 'not_for_me'
                                            ? 'bg-red-500/20 border-2 border-red-500 scale-105'
                                            : 'bg-gray-800/50 border-2 border-transparent hover:bg-gray-700/50 hover:border-red-500/30'
                                    }`}
                                >
                                    <HandThumbDownIcon
                                        className={`w-7 h-7 sm:w-8 sm:h-8 ${
                                            currentVote === 'not_for_me'
                                                ? 'text-red-500'
                                                : 'text-gray-400'
                                        }`}
                                    />
                                    <span
                                        className={`text-xs font-medium ${
                                            currentVote === 'not_for_me'
                                                ? 'text-red-400'
                                                : 'text-gray-400'
                                        }`}
                                    >
                                        Not for me
                                    </span>
                                </button>

                                <button
                                    onClick={() => handleVote('neutral')}
                                    disabled={!!animatingVote}
                                    className={`flex flex-col items-center gap-1.5 p-3 sm:p-4 rounded-xl transition-all duration-200 min-w-[80px] sm:min-w-[100px] active:scale-95 ${
                                        currentVote === 'neutral'
                                            ? 'bg-gray-500/20 border-2 border-gray-500 scale-105'
                                            : 'bg-gray-800/50 border-2 border-transparent hover:bg-gray-700/50 hover:border-gray-500/30'
                                    }`}
                                >
                                    <MinusIcon
                                        className={`w-7 h-7 sm:w-8 sm:h-8 ${
                                            currentVote === 'neutral'
                                                ? 'text-gray-400'
                                                : 'text-gray-500'
                                        }`}
                                    />
                                    <span
                                        className={`text-xs font-medium ${
                                            currentVote === 'neutral'
                                                ? 'text-gray-300'
                                                : 'text-gray-500'
                                        }`}
                                    >
                                        Neutral
                                    </span>
                                </button>

                                <button
                                    onClick={() => handleVote('love')}
                                    disabled={!!animatingVote}
                                    className={`flex flex-col items-center gap-1.5 p-3 sm:p-4 rounded-xl transition-all duration-200 min-w-[80px] sm:min-w-[100px] active:scale-95 ${
                                        currentVote === 'love'
                                            ? 'bg-pink-500/20 border-2 border-pink-500 scale-105'
                                            : 'bg-gray-800/50 border-2 border-transparent hover:bg-gray-700/50 hover:border-pink-500/30'
                                    }`}
                                >
                                    <HeartIcon
                                        className={`w-7 h-7 sm:w-8 sm:h-8 ${
                                            currentVote === 'love'
                                                ? 'text-pink-500'
                                                : 'text-gray-400'
                                        }`}
                                    />
                                    <span
                                        className={`text-xs font-medium ${
                                            currentVote === 'love'
                                                ? 'text-pink-400'
                                                : 'text-gray-400'
                                        }`}
                                    >
                                        Love it
                                    </span>
                                </button>
                            </div>
                        </div>
                    ) : null}

                    {/* Navigation dots */}
                    {!isLoading && content.length > 0 && (
                        <div className="flex justify-center gap-1.5 flex-wrap max-w-xs mx-auto mt-4">
                            {content.map((c, index) => {
                                const key = `${c.id}-${c.media_type || 'movie'}`
                                const vote = votes[key]
                                return (
                                    <button
                                        key={key}
                                        onClick={() => setCurrentIndex(index)}
                                        className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full transition-all duration-200 ${
                                            index === currentIndex
                                                ? 'bg-purple-500 w-4 sm:w-5'
                                                : vote
                                                  ? vote === 'love'
                                                      ? 'bg-pink-500/60'
                                                      : vote === 'not_for_me'
                                                        ? 'bg-red-500/60'
                                                        : 'bg-gray-500/60'
                                                  : 'bg-gray-700'
                                        }`}
                                    />
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-3 sm:px-4 py-3 bg-gray-800/30 border-t border-gray-700/50 shrink-0">
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-lg font-medium transition-all duration-200 hover:bg-gray-600 text-sm sm:text-base"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving || votedCount === 0}
                            className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all duration-200 text-sm sm:text-base ${
                                votedCount > 0
                                    ? 'bg-purple-600 hover:bg-purple-500 text-white'
                                    : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                            }`}
                        >
                            {isSaving ? 'Saving...' : `Save (${votedCount})`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
