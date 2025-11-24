/**
 * Title Preference Modal
 *
 * Allows users to rate individual movies/TV shows to improve recommendations.
 * Features large poster display, cast/crew details, and smooth vote animations.
 * Prioritizes watchlist content that hasn't been voted on.
 */

'use client'

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
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

interface DirectorInfo {
    name: string
    profile_path: string | null
}

export interface ContentWithCredits extends BaseContent {
    media_type: 'movie' | 'tv'
    // Movie fields
    title?: string
    release_date?: string
    // TV fields
    name?: string
    first_air_date?: string
    // Extra credits fields
    cast?: CastMember[]
    director?: DirectorInfo | null
    creator?: DirectorInfo | null
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
    /** Pre-fetched content to use instead of fetching (for instant loading) */
    prefetchedContent?: ContentWithCredits[] | null
}

export default function TitlePreferenceModal({
    isOpen,
    onClose,
    onSave,
    existingVotes = [],
    watchlistContent = [],
    likedContent = [],
    prefetchedContent = null,
}: TitlePreferenceModalProps) {
    const [mounted, setMounted] = useState(false)
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

    // Swipe gesture state
    const cardRef = useRef<HTMLDivElement>(null)
    const [swipeOffset, setSwipeOffset] = useState({ x: 0, y: 0 })
    const [isDragging, setIsDragging] = useState(false)
    const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)

    // Swipe thresholds
    const SWIPE_THRESHOLD = 100 // pixels needed to trigger action
    const SWIPE_VELOCITY_THRESHOLD = 0.5 // pixels per ms for quick swipes

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

    // Mount portal after client-side render
    useEffect(() => {
        setMounted(true)
        return () => setMounted(false)
    }, [])

    // Auto-save on close - saves whatever progress was made
    const handleClose = useCallback(async () => {
        if (Object.keys(votes).length > 0 && !isSaving) {
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
            } catch (error) {
                console.error('Failed to save title preferences:', error)
            } finally {
                setIsSaving(false)
            }
        }
        onClose()
    }, [votes, isSaving, onSave, onClose])

    // Handle escape key - saves progress on close
    useEffect(() => {
        if (!isOpen) return

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault()
                handleClose()
            }
        }

        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, handleClose])

    // Fetch content on mount (or use prefetched content if available)
    useEffect(() => {
        if (!isOpen) return

        // Use prefetched content if available (instant loading!)
        if (prefetchedContent && prefetchedContent.length > 0) {
            setContent(prefetchedContent)
            setIsLoading(false)
            return
        }

        const fetchContent = async () => {
            setIsLoading(true)
            try {
                const response = await fetch('/api/recommendations/preference-content', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        excludeIds,
                        limit: 10,
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
    }, [isOpen, excludeIds, priorityContent, prefetchedContent])

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
            const newVotes = {
                ...votes,
                [contentKey]: vote,
            }
            setVotes(newVotes)

            // Reset swipe state
            setSwipeOffset({ x: 0, y: 0 })
            setIsDragging(false)

            // Auto-advance after animation or auto-save if last item
            setTimeout(async () => {
                setAnimatingVote(null)
                if (currentIndex < content.length - 1) {
                    setCurrentIndex((prev) => prev + 1)
                } else {
                    // Last item - auto-save and close
                    setIsSaving(true)
                    try {
                        const votesToSave: VotedContent[] = Object.entries(newVotes).map(
                            ([key, v]) => {
                                const [contentId, mediaType] = key.split('-')
                                return {
                                    contentId: parseInt(contentId),
                                    mediaType: mediaType as 'movie' | 'tv',
                                    vote: v,
                                    votedAt: Date.now(),
                                }
                            }
                        )
                        await onSave(votesToSave)
                        onClose()
                    } catch (error) {
                        console.error('Failed to save title preferences:', error)
                        setIsSaving(false)
                    }
                }
            }, 400)
        },
        [currentContent, contentKey, currentIndex, content.length, votes, onSave, onClose]
    )

    // Touch/swipe handlers for mobile
    const handleTouchStart = useCallback(
        (e: React.TouchEvent) => {
            if (animatingVote) return
            const touch = e.touches[0]
            touchStartRef.current = {
                x: touch.clientX,
                y: touch.clientY,
                time: Date.now(),
            }
            setIsDragging(true)
        },
        [animatingVote]
    )

    const handleTouchMove = useCallback(
        (e: React.TouchEvent) => {
            if (!touchStartRef.current || animatingVote) return
            const touch = e.touches[0]
            const deltaX = touch.clientX - touchStartRef.current.x
            const deltaY = touch.clientY - touchStartRef.current.y

            // Only allow horizontal swipes (ignore if vertical movement is dominant)
            if (Math.abs(deltaY) > Math.abs(deltaX) * 1.5 && Math.abs(deltaX) < 30) {
                return
            }

            setSwipeOffset({ x: deltaX, y: deltaY * 0.3 }) // Dampen vertical movement
        },
        [animatingVote]
    )

    const handleTouchEnd = useCallback(() => {
        if (!touchStartRef.current) return

        const deltaX = swipeOffset.x
        const deltaTime = Date.now() - touchStartRef.current.time
        const velocity = Math.abs(deltaX) / deltaTime

        // Check if swipe was fast enough or far enough
        const swipedRight =
            deltaX > SWIPE_THRESHOLD || (deltaX > 50 && velocity > SWIPE_VELOCITY_THRESHOLD)
        const swipedLeft =
            deltaX < -SWIPE_THRESHOLD || (deltaX < -50 && velocity > SWIPE_VELOCITY_THRESHOLD)

        if (swipedRight) {
            handleVote('love')
        } else if (swipedLeft) {
            handleVote('not_for_me')
        } else {
            // Snap back
            setSwipeOffset({ x: 0, y: 0 })
        }

        touchStartRef.current = null
        setIsDragging(false)
    }, [swipeOffset.x, handleVote, SWIPE_THRESHOLD, SWIPE_VELOCITY_THRESHOLD])

    // Mouse drag handlers for desktop testing
    const handleMouseDown = useCallback(
        (e: React.MouseEvent) => {
            if (animatingVote) return
            touchStartRef.current = {
                x: e.clientX,
                y: e.clientY,
                time: Date.now(),
            }
            setIsDragging(true)
        },
        [animatingVote]
    )

    const handleMouseMove = useCallback(
        (e: React.MouseEvent) => {
            if (!touchStartRef.current || !isDragging || animatingVote) return
            const deltaX = e.clientX - touchStartRef.current.x
            const deltaY = e.clientY - touchStartRef.current.y
            setSwipeOffset({ x: deltaX, y: deltaY * 0.3 })
        },
        [isDragging, animatingVote]
    )

    const handleMouseUp = useCallback(() => {
        if (!touchStartRef.current) return
        handleTouchEnd()
    }, [handleTouchEnd])

    const handleMouseLeave = useCallback(() => {
        if (isDragging) {
            setSwipeOffset({ x: 0, y: 0 })
            touchStartRef.current = null
            setIsDragging(false)
        }
    }, [isDragging])

    // Calculate swipe visual feedback
    const swipeRotation = swipeOffset.x * 0.05 // Slight rotation based on swipe
    const swipeOpacity = Math.max(0.5, 1 - Math.abs(swipeOffset.x) / 300)
    const swipeIndicator = swipeOffset.x > 50 ? 'love' : swipeOffset.x < -50 ? 'not_for_me' : null

    const progress = content.length > 0 ? ((currentIndex + 1) / content.length) * 100 : 0

    if (!isOpen || !mounted) return null

    const modalContent = (
        <div className="fixed inset-0 z-modal flex items-center justify-center p-2 sm:p-4">
            {/* Background overlay */}
            <div
                className="fixed inset-0 transition-opacity bg-black/90 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Modal panel */}
            <div className="relative w-full max-w-lg overflow-hidden transition-all transform bg-[#0a0a0a] border border-gray-700/50 rounded-lg sm:rounded-xl shadow-2xl max-h-[98vh] sm:max-h-[95vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-3 sm:p-4 md:p-5 border-b border-gray-700/50 shrink-0">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <SparklesIcon className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400 shrink-0" />
                        <div>
                            <h2 className="text-base sm:text-lg md:text-xl font-bold text-white">
                                Rate Titles
                            </h2>
                            {!isLoading && content.length > 0 && (
                                <p className="text-xs sm:text-sm text-gray-400">
                                    {currentIndex + 1} of {content.length}
                                </p>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-white transition-colors duration-200 p-2 rounded-full hover:bg-white/10 -mr-2 shrink-0"
                    >
                        <XMarkIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-5">
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
                            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-red-600 mb-4" />
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
                            ref={cardRef}
                            className={`relative select-none ${
                                isDragging ? '' : 'transition-all duration-300 ease-out'
                            } ${
                                animatingVote
                                    ? animatingVote === 'love'
                                        ? 'scale-90 opacity-0'
                                        : animatingVote === 'not_for_me'
                                          ? 'scale-90 opacity-0'
                                          : 'scale-95 opacity-0'
                                    : ''
                            }`}
                            style={{
                                transform:
                                    !animatingVote && swipeOffset.x !== 0
                                        ? `translateX(${Math.max(-100, Math.min(100, swipeOffset.x))}px) rotate(${swipeRotation * 0.5}deg)`
                                        : undefined,
                                opacity: !animatingVote ? swipeOpacity : undefined,
                            }}
                            onTouchStart={handleTouchStart}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseLeave}
                        >
                            {/* Swipe indicator overlays */}
                            {swipeIndicator && (
                                <div
                                    className={`absolute inset-0 z-10 flex items-center justify-center pointer-events-none rounded-lg ${
                                        swipeIndicator === 'love'
                                            ? 'bg-green-500/20'
                                            : 'bg-red-500/20'
                                    }`}
                                >
                                    <div
                                        className={`px-4 py-2 rounded-lg border-4 rotate-[-15deg] ${
                                            swipeIndicator === 'love'
                                                ? 'border-green-500 text-green-500'
                                                : 'border-red-500 text-red-500'
                                        }`}
                                    >
                                        <span className="text-2xl font-bold uppercase tracking-wider">
                                            {swipeIndicator === 'love' ? 'LOVE' : 'NOPE'}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Centered card layout */}
                            <div className="flex flex-col items-center text-center">
                                {/* Large centered poster */}
                                <div className="relative w-[160px] sm:w-[200px] md:w-[220px] aspect-[2/3] rounded-lg overflow-hidden bg-gray-900 shadow-2xl mb-3 sm:mb-4">
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
                                                    ? 'bg-pink-500/50'
                                                    : animatingVote === 'not_for_me'
                                                      ? 'bg-red-500/50'
                                                      : 'bg-gray-500/50'
                                            }`}
                                        >
                                            {animatingVote === 'love' && (
                                                <HeartIcon className="w-16 h-16 text-white animate-pulse" />
                                            )}
                                            {animatingVote === 'not_for_me' && (
                                                <HandThumbDownIcon className="w-16 h-16 text-white animate-pulse" />
                                            )}
                                            {animatingVote === 'neutral' && (
                                                <MinusIcon className="w-16 h-16 text-white animate-pulse" />
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Title */}
                                <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white leading-tight mb-1 px-2">
                                    {getContentTitle(currentContent)}
                                </h3>

                                {/* Year, Rating & Media type inline */}
                                <div className="flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-400 mb-3 flex-wrap">
                                    <span>{getContentYear(currentContent)}</span>
                                    {currentContent.vote_average &&
                                        currentContent.vote_average > 0 && (
                                            <>
                                                <span className="text-gray-600">•</span>
                                                <span className="text-yellow-500 font-medium">
                                                    {currentContent.vote_average.toFixed(1)}/10
                                                </span>
                                            </>
                                        )}
                                    <span className="text-gray-600">•</span>
                                    <span
                                        className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${
                                            isContentMovie(currentContent)
                                                ? 'bg-black text-white border border-gray-700'
                                                : 'bg-white text-black'
                                        }`}
                                    >
                                        {isContentMovie(currentContent) ? 'Movie' : 'Series'}
                                    </span>
                                </div>

                                {/* Director/Creator with profile image - only show if they have an image */}
                                {(() => {
                                    const person = currentContent.director || currentContent.creator
                                    if (!person || !person.profile_path) return null
                                    return (
                                        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                                            <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden bg-gray-800 shrink-0">
                                                <Image
                                                    src={`https://image.tmdb.org/t/p/w185${person.profile_path}`}
                                                    alt={person.name}
                                                    fill
                                                    className="object-cover"
                                                />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">
                                                    {isContentMovie(currentContent)
                                                        ? 'Director'
                                                        : 'Creator'}
                                                </p>
                                                <p className="text-sm sm:text-base lg:text-lg text-white font-medium">
                                                    {person.name}
                                                </p>
                                            </div>
                                        </div>
                                    )
                                })()}

                                {/* Description */}
                                {currentContent.overview && (
                                    <p className="text-gray-400 text-sm sm:text-base line-clamp-3 mb-4 px-2 max-w-md">
                                        {currentContent.overview}
                                    </p>
                                )}

                                {/* Cast section with profile images */}
                                {currentContent.cast && currentContent.cast.length > 0 && (
                                    <div className="w-full">
                                        <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide mb-2 sm:mb-3">
                                            Cast
                                        </p>
                                        <div className="flex justify-center gap-3 sm:gap-4 lg:gap-5 overflow-x-auto pb-2 px-2">
                                            {currentContent.cast.slice(0, 5).map((actor) => (
                                                <div
                                                    key={actor.id}
                                                    className="flex flex-col items-center shrink-0 w-16 sm:w-20 lg:w-24"
                                                >
                                                    <div className="relative w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-full overflow-hidden bg-gray-800 mb-1.5">
                                                        {actor.profile_path ? (
                                                            <Image
                                                                src={`https://image.tmdb.org/t/p/w185${actor.profile_path}`}
                                                                alt={actor.name}
                                                                fill
                                                                className="object-cover"
                                                            />
                                                        ) : (
                                                            <div className="absolute inset-0 flex items-center justify-center bg-gray-700">
                                                                <span className="text-gray-400 text-sm sm:text-base font-medium">
                                                                    {actor.name.charAt(0)}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span className="text-[11px] sm:text-xs lg:text-sm text-gray-400 text-center leading-tight line-clamp-2">
                                                        {actor.name}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Vote buttons - Netflix style */}
                            <div
                                className="flex justify-center gap-3 sm:gap-4 md:gap-5 mt-4 sm:mt-5"
                                onMouseDown={(e) => e.stopPropagation()}
                                onTouchStart={(e) => e.stopPropagation()}
                            >
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        handleVote('not_for_me')
                                    }}
                                    disabled={!!animatingVote}
                                    className={`flex flex-col items-center gap-1 transition-all duration-200 active:scale-95 ${
                                        currentVote === 'not_for_me'
                                            ? 'scale-110'
                                            : 'hover:scale-105'
                                    }`}
                                >
                                    <div
                                        className={`w-14 h-14 sm:w-16 sm:h-16 md:w-[70px] md:h-[70px] rounded-full flex items-center justify-center border-2 transition-all ${
                                            currentVote === 'not_for_me'
                                                ? 'bg-red-600 border-red-600'
                                                : 'bg-transparent border-gray-500 hover:border-red-500 hover:bg-red-500/10'
                                        }`}
                                    >
                                        <HandThumbDownIcon
                                            className={`w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 ${
                                                currentVote === 'not_for_me'
                                                    ? 'text-white'
                                                    : 'text-gray-300'
                                            }`}
                                        />
                                    </div>
                                    <span className="text-[10px] sm:text-xs text-gray-400 font-medium">
                                        Not for me
                                    </span>
                                </button>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        handleVote('neutral')
                                    }}
                                    disabled={!!animatingVote}
                                    className={`flex flex-col items-center gap-1 transition-all duration-200 active:scale-95 ${
                                        currentVote === 'neutral' ? 'scale-110' : 'hover:scale-105'
                                    }`}
                                >
                                    <div
                                        className={`w-14 h-14 sm:w-16 sm:h-16 md:w-[70px] md:h-[70px] rounded-full flex items-center justify-center border-2 transition-all ${
                                            currentVote === 'neutral'
                                                ? 'bg-gray-600 border-gray-600'
                                                : 'bg-transparent border-gray-500 hover:border-gray-400 hover:bg-gray-500/10'
                                        }`}
                                    >
                                        <MinusIcon
                                            className={`w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 ${
                                                currentVote === 'neutral'
                                                    ? 'text-white'
                                                    : 'text-gray-300'
                                            }`}
                                        />
                                    </div>
                                    <span className="text-[10px] sm:text-xs text-gray-400 font-medium">
                                        Neutral
                                    </span>
                                </button>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        handleVote('love')
                                    }}
                                    disabled={!!animatingVote}
                                    className={`flex flex-col items-center gap-1 transition-all duration-200 active:scale-95 ${
                                        currentVote === 'love' ? 'scale-110' : 'hover:scale-105'
                                    }`}
                                >
                                    <div
                                        className={`w-14 h-14 sm:w-16 sm:h-16 md:w-[70px] md:h-[70px] rounded-full flex items-center justify-center border-2 transition-all ${
                                            currentVote === 'love'
                                                ? 'bg-green-600 border-green-600'
                                                : 'bg-transparent border-gray-500 hover:border-green-500 hover:bg-green-500/10'
                                        }`}
                                    >
                                        <HeartIcon
                                            className={`w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 ${
                                                currentVote === 'love'
                                                    ? 'text-white'
                                                    : 'text-gray-300'
                                            }`}
                                        />
                                    </div>
                                    <span className="text-[10px] sm:text-xs text-gray-400 font-medium">
                                        Love it
                                    </span>
                                </button>
                            </div>

                            {/* Hint for mobile */}
                            <p className="text-center text-[10px] sm:text-xs text-gray-500 mt-3 sm:mt-4 sm:hidden">
                                Tap buttons or swipe to vote
                            </p>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    )

    // Render via portal to escape stacking contexts
    return createPortal(modalContent, document.body)
}
