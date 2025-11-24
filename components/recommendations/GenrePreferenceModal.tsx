/**
 * Genre Preference Modal
 *
 * Allows users to rate genre preferences (love/not for me) to improve recommendations.
 * Features preview posters for each genre and swipe gestures for mobile.
 * Auto-saves progress when modal is closed.
 */

'use client'

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { HeartIcon, HandThumbDownIcon, SparklesIcon } from '@heroicons/react/24/solid'
import { UNIFIED_GENRES } from '../../constants/unifiedGenres'
import { GenrePreference } from '../../types/shared'

type PreferenceValue = 'love' | 'not_for_me'

interface PreviewContent {
    id: number
    poster_path: string | null
    title?: string
    name?: string
}

interface GenrePreferenceModalProps {
    isOpen: boolean
    onClose: () => void
    onSave: (preferences: GenrePreference[]) => Promise<void>
    existingPreferences?: GenrePreference[]
    /** Pre-fetched genre preview content for instant loading */
    prefetchedPreviews?: Record<string, PreviewContent[]> | null
}

// Key genres for the preference quiz
const PREFERENCE_GENRES: string[] = [
    'action',
    'comedy',
    'drama',
    'horror',
    'romance',
    'scifi',
    'thriller',
    'fantasy',
    'animation',
    'documentary',
    'mystery',
    'crime',
]

export default function GenrePreferenceModal({
    isOpen,
    onClose,
    onSave,
    existingPreferences = [],
    prefetchedPreviews = null,
}: GenrePreferenceModalProps) {
    const [mounted, setMounted] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [preferences, setPreferences] = useState<Record<string, PreferenceValue>>(() => {
        const initial: Record<string, PreferenceValue> = {}
        existingPreferences.forEach((pref) => {
            initial[pref.genreId] = pref.preference
        })
        return initial
    })
    const [currentIndex, setCurrentIndex] = useState(0)
    const [animatingVote, setAnimatingVote] = useState<PreferenceValue | null>(null)
    const [previewContent, setPreviewContent] = useState<Record<string, PreviewContent[]>>(
        prefetchedPreviews || {}
    )
    const [isLoadingPreviews, setIsLoadingPreviews] = useState(!prefetchedPreviews)

    // Swipe gesture state
    const cardRef = useRef<HTMLDivElement>(null)
    const [swipeOffset, setSwipeOffset] = useState({ x: 0, y: 0 })
    const [isDragging, setIsDragging] = useState(false)
    const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)

    // Swipe thresholds
    const SWIPE_THRESHOLD = 100
    const SWIPE_VELOCITY_THRESHOLD = 0.5

    const quizGenres = useMemo(
        () => UNIFIED_GENRES.filter((g) => PREFERENCE_GENRES.includes(g.id)),
        []
    )

    // Mount portal after client-side render
    useEffect(() => {
        setMounted(true)
        return () => setMounted(false)
    }, [])

    // Use prefetched content when it arrives
    useEffect(() => {
        if (prefetchedPreviews && Object.keys(prefetchedPreviews).length > 0) {
            setPreviewContent(prefetchedPreviews)
            setIsLoadingPreviews(false)
        }
    }, [prefetchedPreviews])

    // Fetch remaining previews if not prefetched or incomplete
    useEffect(() => {
        if (!isOpen) return

        // Check which genres still need previews
        const missingGenres = PREFERENCE_GENRES.filter(
            (g) => !previewContent[g] || previewContent[g].length === 0
        )

        if (missingGenres.length === 0) {
            setIsLoadingPreviews(false)
            return
        }

        const fetchMissingPreviews = async () => {
            try {
                const response = await fetch(
                    `/api/recommendations/genre-previews?genres=${missingGenres.join(',')}&limit=3`
                )
                if (!response.ok) return

                const data = await response.json()
                if (data.success && data.previews) {
                    setPreviewContent((prev) => ({
                        ...prev,
                        ...data.previews,
                    }))
                }
            } catch (error) {
                console.error('Error fetching genre previews:', error)
            } finally {
                setIsLoadingPreviews(false)
            }
        }

        fetchMissingPreviews()
    }, [isOpen, previewContent])

    // Auto-save on close
    const handleClose = useCallback(async () => {
        if (Object.keys(preferences).length > 0 && !isSaving) {
            setIsSaving(true)
            try {
                const prefsToSave: GenrePreference[] = Object.entries(preferences).map(
                    ([genreId, preference]) => ({
                        genreId,
                        preference,
                        updatedAt: Date.now(),
                    })
                )
                await onSave(prefsToSave)
            } catch (error) {
                console.error('Failed to save genre preferences:', error)
            } finally {
                setIsSaving(false)
            }
        }
        onClose()
    }, [preferences, isSaving, onSave, onClose])

    // Handle escape key
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

    const currentGenre = quizGenres[currentIndex]
    const currentPreviews = currentGenre ? previewContent[currentGenre.id] || [] : []

    const handleVote = useCallback(
        (vote: PreferenceValue) => {
            if (!currentGenre) return

            // Trigger animation
            setAnimatingVote(vote)

            // Update preferences
            setPreferences((prev) => ({
                ...prev,
                [currentGenre.id]: vote,
            }))

            // Reset swipe state
            setSwipeOffset({ x: 0, y: 0 })
            setIsDragging(false)

            // Auto-advance after animation or auto-save if last item
            setTimeout(async () => {
                setAnimatingVote(null)
                if (currentIndex < quizGenres.length - 1) {
                    setCurrentIndex((prev) => prev + 1)
                } else {
                    // Last item - auto-save and close
                    const newPrefs = {
                        ...preferences,
                        [currentGenre.id]: vote,
                    }
                    setIsSaving(true)
                    try {
                        const prefsToSave: GenrePreference[] = Object.entries(newPrefs).map(
                            ([genreId, pref]) => ({
                                genreId,
                                preference: pref,
                                updatedAt: Date.now(),
                            })
                        )
                        await onSave(prefsToSave)
                        onClose()
                    } catch (error) {
                        console.error('Failed to save genre preferences:', error)
                        setIsSaving(false)
                    }
                }
            }, 400)
        },
        [currentGenre, currentIndex, quizGenres.length, preferences, onSave, onClose]
    )

    // Touch/swipe handlers
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

            if (Math.abs(deltaY) > Math.abs(deltaX) * 1.5 && Math.abs(deltaX) < 30) {
                return
            }

            setSwipeOffset({ x: deltaX, y: deltaY * 0.3 })
        },
        [animatingVote]
    )

    const handleTouchEnd = useCallback(() => {
        if (!touchStartRef.current) return

        const deltaX = swipeOffset.x
        const deltaTime = Date.now() - touchStartRef.current.time
        const velocity = Math.abs(deltaX) / deltaTime

        const swipedRight =
            deltaX > SWIPE_THRESHOLD || (deltaX > 50 && velocity > SWIPE_VELOCITY_THRESHOLD)
        const swipedLeft =
            deltaX < -SWIPE_THRESHOLD || (deltaX < -50 && velocity > SWIPE_VELOCITY_THRESHOLD)

        if (swipedRight) {
            handleVote('love')
        } else if (swipedLeft) {
            handleVote('not_for_me')
        } else {
            setSwipeOffset({ x: 0, y: 0 })
        }

        touchStartRef.current = null
        setIsDragging(false)
    }, [swipeOffset.x, handleVote])

    // Mouse drag handlers
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

    // Visual feedback calculations
    const swipeRotation = swipeOffset.x * 0.05
    const swipeOpacity = Math.max(0.5, 1 - Math.abs(swipeOffset.x) / 300)
    const swipeIndicator = swipeOffset.x > 50 ? 'love' : swipeOffset.x < -50 ? 'not_for_me' : null

    const progress = ((currentIndex + 1) / quizGenres.length) * 100

    if (!isOpen || !mounted) return null

    const modalContent = (
        <div className="fixed inset-0 z-modal flex items-center justify-center p-2 sm:p-4">
            {/* Background overlay */}
            <div
                className="fixed inset-0 transition-opacity bg-black/90 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Modal panel */}
            <div className="relative w-full max-w-md overflow-hidden transition-all transform bg-[#0a0a0a] border border-gray-700/50 rounded-xl shadow-2xl max-h-[95vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-700/50 shrink-0">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <SparklesIcon className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
                        <div>
                            <h2 className="text-base sm:text-lg font-bold text-white">
                                Rate Genres
                            </h2>
                            <p className="text-xs text-gray-400">
                                {currentIndex + 1} of {quizGenres.length}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-white transition-colors duration-200 p-2 rounded-full hover:bg-white/10 -mr-2"
                    >
                        <XMarkIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden p-3 sm:p-4">
                    {/* Progress bar */}
                    <div className="h-1 bg-gray-800 rounded-full mb-4">
                        <div
                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>

                    {currentGenre && (
                        <div
                            ref={cardRef}
                            className={`relative select-none ${
                                isDragging ? '' : 'transition-all duration-300 ease-out'
                            } ${
                                animatingVote
                                    ? animatingVote === 'love'
                                        ? 'scale-90 opacity-0 translate-x-full'
                                        : 'scale-90 opacity-0 -translate-x-full'
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

                            <div className="flex flex-col items-center text-center">
                                {/* Genre name */}
                                <h3 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                                    {currentGenre.name}
                                </h3>

                                {/* Preview posters */}
                                <div className="flex justify-center gap-2 mb-6">
                                    {isLoadingPreviews && currentPreviews.length === 0 ? (
                                        <div className="flex gap-2">
                                            {[1, 2, 3].map((i) => (
                                                <div
                                                    key={i}
                                                    className="w-20 sm:w-24 aspect-[2/3] rounded-lg bg-gray-800 animate-pulse"
                                                />
                                            ))}
                                        </div>
                                    ) : currentPreviews.length > 0 ? (
                                        currentPreviews.map((content, idx) => (
                                            <div
                                                key={content.id}
                                                className={`relative w-20 sm:w-24 aspect-[2/3] rounded-lg overflow-hidden bg-gray-900 shadow-lg transition-transform ${
                                                    idx === 1 ? 'scale-110 z-10' : 'opacity-80'
                                                }`}
                                            >
                                                {content.poster_path ? (
                                                    <Image
                                                        src={`https://image.tmdb.org/t/p/w300${content.poster_path}`}
                                                        alt={content.title || content.name || ''}
                                                        fill
                                                        className="object-cover"
                                                    />
                                                ) : (
                                                    <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                                                        <SparklesIcon className="w-8 h-8 text-gray-600" />
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex gap-2">
                                            {[1, 2, 3].map((i) => (
                                                <div
                                                    key={i}
                                                    className={`w-20 sm:w-24 aspect-[2/3] rounded-lg bg-gray-800 flex items-center justify-center ${
                                                        i === 2 ? 'scale-110 z-10' : 'opacity-80'
                                                    }`}
                                                >
                                                    <SparklesIcon className="w-8 h-8 text-gray-600" />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Vote animation overlay */}
                                {animatingVote && (
                                    <div
                                        className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 rounded-lg ${
                                            animatingVote === 'love'
                                                ? 'bg-pink-500/30'
                                                : 'bg-red-500/30'
                                        }`}
                                    >
                                        {animatingVote === 'love' ? (
                                            <HeartIcon className="w-20 h-20 text-pink-500 animate-pulse" />
                                        ) : (
                                            <HandThumbDownIcon className="w-20 h-20 text-red-500 animate-pulse" />
                                        )}
                                    </div>
                                )}

                                {/* Vote buttons */}
                                <div
                                    className="flex justify-center gap-6 mt-4"
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
                                            preferences[currentGenre.id] === 'not_for_me'
                                                ? 'scale-110'
                                                : 'hover:scale-105'
                                        }`}
                                    >
                                        <div
                                            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center border-2 transition-all ${
                                                preferences[currentGenre.id] === 'not_for_me'
                                                    ? 'bg-red-600 border-red-600'
                                                    : 'bg-transparent border-gray-500 hover:border-red-500 hover:bg-red-500/10'
                                            }`}
                                        >
                                            <HandThumbDownIcon
                                                className={`w-6 h-6 sm:w-7 sm:h-7 ${
                                                    preferences[currentGenre.id] === 'not_for_me'
                                                        ? 'text-white'
                                                        : 'text-gray-300'
                                                }`}
                                            />
                                        </div>
                                        <span className="text-[10px] text-gray-400 font-medium">
                                            Not for me
                                        </span>
                                    </button>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleVote('love')
                                        }}
                                        disabled={!!animatingVote}
                                        className={`flex flex-col items-center gap-1 transition-all duration-200 active:scale-95 ${
                                            preferences[currentGenre.id] === 'love'
                                                ? 'scale-110'
                                                : 'hover:scale-105'
                                        }`}
                                    >
                                        <div
                                            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center border-2 transition-all ${
                                                preferences[currentGenre.id] === 'love'
                                                    ? 'bg-green-600 border-green-600'
                                                    : 'bg-transparent border-gray-500 hover:border-green-500 hover:bg-green-500/10'
                                            }`}
                                        >
                                            <HeartIcon
                                                className={`w-6 h-6 sm:w-7 sm:h-7 ${
                                                    preferences[currentGenre.id] === 'love'
                                                        ? 'text-white'
                                                        : 'text-gray-300'
                                                }`}
                                            />
                                        </div>
                                        <span className="text-[10px] text-gray-400 font-medium">
                                            Love it
                                        </span>
                                    </button>
                                </div>

                                {/* Hint for mobile */}
                                <p className="text-center text-[10px] text-gray-500 mt-4 sm:hidden">
                                    Tap buttons or swipe to vote
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )

    // Render via portal to escape stacking contexts
    return createPortal(modalContent, document.body)
}

// Export PreviewContent type for prefetching
export type { PreviewContent }
