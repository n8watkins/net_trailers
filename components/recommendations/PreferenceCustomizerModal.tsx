/**
 * Preference Customizer Modal
 *
 * Netflix-style preference customization experience with two tabs:
 * - Genres: Rate genre preferences (love/not for me)
 * - Titles: Rate top-rated content to improve recommendations
 *
 * Mobile-friendly with touch gestures and responsive design.
 */

'use client'

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import Image from 'next/image'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { HeartIcon, HandThumbDownIcon, SparklesIcon } from '@heroicons/react/24/solid'
import { UNIFIED_GENRES, UnifiedGenre } from '../../constants/unifiedGenres'
import { Content, getTitle, getYear } from '../../typings'
import { GenrePreference, ContentPreference, ShownPreferenceContent } from '../../types/shared'

type PreferenceValue = 'love' | 'not_for_me'

interface PreferenceCustomizerModalProps {
    isOpen: boolean
    onClose: () => void
    onSave: (data: {
        genrePreferences: GenrePreference[]
        contentPreferences: ContentPreference[]
        shownPreferenceContent: ShownPreferenceContent[]
    }) => Promise<void>
    existingGenrePreferences?: GenrePreference[]
    existingContentPreferences?: ContentPreference[]
    existingShownContent?: ShownPreferenceContent[]
    // Content to exclude (already in user's collections)
    excludeContentIds?: number[]
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

type TabType = 'genres' | 'titles'

export default function PreferenceCustomizerModal({
    isOpen,
    onClose,
    onSave,
    existingGenrePreferences = [],
    existingContentPreferences = [],
    existingShownContent = [],
    excludeContentIds = [],
}: PreferenceCustomizerModalProps) {
    const [activeTab, setActiveTab] = useState<TabType>('genres')
    const [isSaving, setIsSaving] = useState(false)

    // Genre state
    const [genrePreferences, setGenrePreferences] = useState<Record<string, PreferenceValue>>(
        () => {
            const initial: Record<string, PreferenceValue> = {}
            existingGenrePreferences.forEach((pref) => {
                initial[pref.genreId] = pref.preference
            })
            return initial
        }
    )
    const [currentGenreIndex, setCurrentGenreIndex] = useState(0)

    // Content state
    const [contentPreferences, setContentPreferences] = useState<
        Record<string, { preference: PreferenceValue; mediaType: 'movie' | 'tv' }>
    >(() => {
        const initial: Record<string, { preference: PreferenceValue; mediaType: 'movie' | 'tv' }> =
            {}
        existingContentPreferences.forEach((pref) => {
            initial[pref.contentId] = { preference: pref.preference, mediaType: pref.mediaType }
        })
        return initial
    })
    const [shownContent, setShownContent] = useState<ShownPreferenceContent[]>(existingShownContent)
    const [availableContent, setAvailableContent] = useState<Content[]>([])
    const [currentContentIndex, setCurrentContentIndex] = useState(0)
    const [isLoadingContent, setIsLoadingContent] = useState(false)
    const [contentError, setContentError] = useState<string | null>(null)

    // Get genres for display
    const quizGenres = useMemo(
        () => UNIFIED_GENRES.filter((g) => PREFERENCE_GENRES.includes(g.id)),
        []
    )

    // Fetch top-rated content when titles tab is active
    useEffect(() => {
        if (activeTab === 'titles' && availableContent.length === 0 && !isLoadingContent) {
            fetchPreferenceContent()
        }
    }, [activeTab, availableContent.length, isLoadingContent])

    const fetchPreferenceContent = async () => {
        setIsLoadingContent(true)
        setContentError(null)

        try {
            // Get IDs to exclude (already shown + already in collections + already rated)
            const excludeIds = [
                ...excludeContentIds,
                ...shownContent.map((c) => c.contentId),
                ...Object.keys(contentPreferences).map((id) => parseInt(id, 10)),
            ]

            const response = await fetch('/api/recommendations/preference-content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    excludeIds,
                    limit: 20,
                }),
            })

            if (!response.ok) {
                throw new Error('Failed to fetch content')
            }

            const data = await response.json()
            if (data.success && data.content) {
                setAvailableContent(data.content)
                // Track that these have been shown
                const newShown: ShownPreferenceContent[] = data.content.map((c: Content) => ({
                    contentId: c.id,
                    mediaType: c.media_type || 'movie',
                    shownAt: Date.now(),
                }))
                setShownContent((prev) => [...prev, ...newShown])
            }
        } catch (error) {
            console.error('Error fetching preference content:', error)
            setContentError('Unable to load titles. Please try again.')
        } finally {
            setIsLoadingContent(false)
        }
    }

    // Genre preference handler
    const handleGenrePreference = useCallback(
        (genreId: string, value: PreferenceValue) => {
            setGenrePreferences((prev) => ({
                ...prev,
                [genreId]: value,
            }))

            // Auto-advance to next genre
            if (currentGenreIndex < quizGenres.length - 1) {
                setTimeout(() => setCurrentGenreIndex((prev) => prev + 1), 200)
            }
        },
        [currentGenreIndex, quizGenres.length]
    )

    // Content preference handler
    const handleContentPreference = useCallback(
        (content: Content, value: PreferenceValue) => {
            setContentPreferences((prev) => ({
                ...prev,
                [content.id]: {
                    preference: value,
                    mediaType: (content.media_type as 'movie' | 'tv') || 'movie',
                },
            }))

            // Auto-advance to next content
            if (currentContentIndex < availableContent.length - 1) {
                setTimeout(() => setCurrentContentIndex((prev) => prev + 1), 200)
            } else if (availableContent.length > 0) {
                // Fetch more content if we're at the end
                fetchPreferenceContent()
            }
        },
        [currentContentIndex, availableContent.length]
    )

    // Save handler
    const handleSave = async () => {
        setIsSaving(true)
        try {
            const genrePrefsToSave: GenrePreference[] = Object.entries(genrePreferences).map(
                ([genreId, preference]) => ({
                    genreId,
                    preference,
                    updatedAt: Date.now(),
                })
            )

            const contentPrefsToSave: ContentPreference[] = Object.entries(contentPreferences).map(
                ([contentId, { preference, mediaType }]) => ({
                    contentId: parseInt(contentId, 10),
                    mediaType,
                    preference,
                    shownAt: Date.now(),
                })
            )

            await onSave({
                genrePreferences: genrePrefsToSave,
                contentPreferences: contentPrefsToSave,
                shownPreferenceContent: shownContent,
            })
            onClose()
        } catch (error) {
            console.error('Failed to save preferences:', error)
        } finally {
            setIsSaving(false)
        }
    }

    const currentGenre = quizGenres[currentGenreIndex]
    const currentContent = availableContent[currentContentIndex]
    const genreProgress = ((currentGenreIndex + 1) / quizGenres.length) * 100
    const genreAnsweredCount = Object.keys(genrePreferences).length
    const contentAnsweredCount = Object.keys(contentPreferences).length
    const totalAnswered = genreAnsweredCount + contentAnsweredCount

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[50000] flex items-center justify-center p-2 sm:p-4">
            {/* Background overlay */}
            <div
                className="fixed inset-0 transition-opacity bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal panel - mobile optimized */}
            <div className="relative w-full max-w-lg h-[90vh] sm:h-auto sm:max-h-[85vh] overflow-hidden transition-all transform bg-[#0a0a0a] border border-gray-700/50 rounded-xl shadow-2xl flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-700/50 flex-shrink-0">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <SparklesIcon className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400" />
                        <div>
                            <h2 className="text-base sm:text-lg font-bold text-white">
                                Improve Your Recommendations
                            </h2>
                            <p className="text-xs text-gray-400 hidden sm:block">
                                Tell us what you like for better suggestions
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors duration-200 p-2 rounded-full hover:bg-white/10 -mr-2"
                    >
                        <XMarkIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-700/50 flex-shrink-0">
                    <button
                        onClick={() => setActiveTab('genres')}
                        className={`flex-1 py-3 sm:py-4 text-sm font-medium transition-colors relative ${
                            activeTab === 'genres'
                                ? 'text-white'
                                : 'text-gray-400 hover:text-gray-300'
                        }`}
                    >
                        Genres
                        {genreAnsweredCount > 0 && (
                            <span className="ml-1.5 text-xs bg-purple-600 text-white px-1.5 py-0.5 rounded-full">
                                {genreAnsweredCount}
                            </span>
                        )}
                        {activeTab === 'genres' && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('titles')}
                        className={`flex-1 py-3 sm:py-4 text-sm font-medium transition-colors relative ${
                            activeTab === 'titles'
                                ? 'text-white'
                                : 'text-gray-400 hover:text-gray-300'
                        }`}
                    >
                        Titles
                        {contentAnsweredCount > 0 && (
                            <span className="ml-1.5 text-xs bg-purple-600 text-white px-1.5 py-0.5 rounded-full">
                                {contentAnsweredCount}
                            </span>
                        )}
                        {activeTab === 'titles' && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
                        )}
                    </button>
                </div>

                {/* Content area - scrollable on mobile */}
                <div className="flex-1 overflow-y-auto">
                    {activeTab === 'genres' ? (
                        <GenreTab
                            currentGenre={currentGenre}
                            currentIndex={currentGenreIndex}
                            totalGenres={quizGenres.length}
                            preferences={genrePreferences}
                            onPreference={handleGenrePreference}
                            onNavigate={setCurrentGenreIndex}
                            progress={genreProgress}
                            allGenres={quizGenres}
                        />
                    ) : (
                        <TitlesTab
                            currentContent={currentContent}
                            currentIndex={currentContentIndex}
                            totalContent={availableContent.length}
                            preferences={contentPreferences}
                            onPreference={handleContentPreference}
                            onNavigate={setCurrentContentIndex}
                            isLoading={isLoadingContent}
                            error={contentError}
                            onRetry={fetchPreferenceContent}
                        />
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gray-800/30 border-t border-gray-700/50 flex-shrink-0">
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-lg font-medium transition-all duration-200 hover:bg-gray-600 text-sm sm:text-base"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving || totalAnswered === 0}
                            className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all duration-200 text-sm sm:text-base ${
                                totalAnswered > 0
                                    ? 'bg-purple-600 hover:bg-purple-500 text-white'
                                    : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                            }`}
                        >
                            {isSaving ? 'Saving...' : `Update (${totalAnswered})`}
                        </button>
                    </div>
                    <p className="text-xs text-gray-500 text-center mt-2">
                        Personalizes your &quot;Recommended For You&quot; section
                    </p>
                </div>
            </div>
        </div>
    )
}

// Genre Tab Component
interface GenreTabProps {
    currentGenre: UnifiedGenre
    currentIndex: number
    totalGenres: number
    preferences: Record<string, PreferenceValue>
    onPreference: (genreId: string, value: PreferenceValue) => void
    onNavigate: (index: number) => void
    progress: number
    allGenres: UnifiedGenre[]
}

function GenreTab({
    currentGenre,
    currentIndex,
    totalGenres,
    preferences,
    onPreference,
    onNavigate,
    progress,
    allGenres,
}: GenreTabProps) {
    return (
        <div className="p-4 sm:p-6">
            {/* Progress bar */}
            <div className="h-1 bg-gray-800 rounded-full mb-4 sm:mb-6">
                <div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* Prompt */}
            <p className="text-gray-400 text-sm text-center mb-4 sm:mb-6">
                What kind of content do you enjoy?
            </p>

            {/* Current genre card */}
            <div className="text-center mb-6 sm:mb-8">
                <div className="inline-block bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-2xl px-8 sm:px-12 py-6 sm:py-8 border border-purple-500/30">
                    <h3 className="text-2xl sm:text-3xl font-bold text-white mb-1">
                        {currentGenre?.name}
                    </h3>
                    <p className="text-gray-400 text-sm">
                        {currentIndex + 1} of {totalGenres}
                    </p>
                </div>
            </div>

            {/* Preference buttons - large touch targets for mobile */}
            <div className="flex justify-center gap-4 sm:gap-6 mb-6">
                <button
                    onClick={() => onPreference(currentGenre.id, 'not_for_me')}
                    className={`flex flex-col items-center gap-2 p-4 sm:p-5 rounded-xl transition-all duration-200 min-w-[100px] sm:min-w-[120px] active:scale-95 ${
                        preferences[currentGenre?.id] === 'not_for_me'
                            ? 'bg-red-500/20 border-2 border-red-500 scale-105'
                            : 'bg-gray-800/50 border-2 border-transparent hover:bg-gray-700/50'
                    }`}
                >
                    <HandThumbDownIcon
                        className={`w-8 h-8 sm:w-10 sm:h-10 ${
                            preferences[currentGenre?.id] === 'not_for_me'
                                ? 'text-red-500'
                                : 'text-gray-400'
                        }`}
                    />
                    <span
                        className={`text-xs sm:text-sm font-medium ${
                            preferences[currentGenre?.id] === 'not_for_me'
                                ? 'text-red-400'
                                : 'text-gray-400'
                        }`}
                    >
                        Not for me
                    </span>
                </button>

                <button
                    onClick={() => onPreference(currentGenre.id, 'love')}
                    className={`flex flex-col items-center gap-2 p-4 sm:p-5 rounded-xl transition-all duration-200 min-w-[100px] sm:min-w-[120px] active:scale-95 ${
                        preferences[currentGenre?.id] === 'love'
                            ? 'bg-pink-500/20 border-2 border-pink-500 scale-105'
                            : 'bg-gray-800/50 border-2 border-transparent hover:bg-gray-700/50'
                    }`}
                >
                    <HeartIcon
                        className={`w-8 h-8 sm:w-10 sm:h-10 ${
                            preferences[currentGenre?.id] === 'love'
                                ? 'text-pink-500'
                                : 'text-gray-400'
                        }`}
                    />
                    <span
                        className={`text-xs sm:text-sm font-medium ${
                            preferences[currentGenre?.id] === 'love'
                                ? 'text-pink-400'
                                : 'text-gray-400'
                        }`}
                    >
                        Love it
                    </span>
                </button>
            </div>

            {/* Genre navigation dots */}
            <div className="flex justify-center gap-1.5 flex-wrap max-w-xs mx-auto">
                {allGenres.map((genre, index) => (
                    <button
                        key={genre.id}
                        onClick={() => onNavigate(index)}
                        className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full transition-all duration-200 ${
                            index === currentIndex
                                ? 'bg-purple-500 w-4 sm:w-5'
                                : preferences[genre.id]
                                  ? preferences[genre.id] === 'love'
                                      ? 'bg-pink-500/60'
                                      : 'bg-red-500/60'
                                  : 'bg-gray-700'
                        }`}
                    />
                ))}
            </div>
        </div>
    )
}

// Titles Tab Component
interface TitlesTabProps {
    currentContent: Content | undefined
    currentIndex: number
    totalContent: number
    preferences: Record<string, { preference: PreferenceValue; mediaType: 'movie' | 'tv' }>
    onPreference: (content: Content, value: PreferenceValue) => void
    onNavigate: (index: number) => void
    isLoading: boolean
    error: string | null
    onRetry: () => void
}

function TitlesTab({
    currentContent,
    currentIndex,
    totalContent,
    preferences,
    onPreference,
    isLoading,
    error,
    onRetry,
}: TitlesTabProps) {
    if (isLoading) {
        return (
            <div className="p-6 flex flex-col items-center justify-center min-h-[300px]">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-gray-400 text-sm">Loading titles...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="p-6 flex flex-col items-center justify-center min-h-[300px]">
                <p className="text-red-400 text-sm mb-4">{error}</p>
                <button
                    onClick={onRetry}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-500 transition-colors"
                >
                    Try Again
                </button>
            </div>
        )
    }

    if (!currentContent) {
        return (
            <div className="p-6 flex flex-col items-center justify-center min-h-[300px]">
                <p className="text-gray-400 text-sm mb-2">No more titles to rate</p>
                <p className="text-gray-500 text-xs">Switch to Genres or save your preferences</p>
            </div>
        )
    }

    const posterUrl = currentContent.poster_path
        ? `https://image.tmdb.org/t/p/w342${currentContent.poster_path}`
        : '/placeholder-poster.png'

    return (
        <div className="p-4 sm:p-6">
            {/* Prompt */}
            <p className="text-gray-400 text-sm text-center mb-4">
                Rate titles you&apos;ve seen or are interested in
            </p>

            {/* Content card */}
            <div className="flex flex-col items-center mb-6">
                {/* Poster */}
                <div className="relative w-32 sm:w-40 aspect-[2/3] rounded-lg overflow-hidden shadow-2xl mb-4">
                    <Image
                        src={posterUrl}
                        alt={getTitle(currentContent)}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 128px, 160px"
                    />
                </div>

                {/* Title and info */}
                <h3 className="text-lg sm:text-xl font-bold text-white text-center mb-1">
                    {getTitle(currentContent)}
                </h3>
                <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                    <span>{getYear(currentContent)}</span>
                    <span>•</span>
                    <span className="capitalize">{currentContent.media_type || 'movie'}</span>
                    {currentContent.vote_average && (
                        <>
                            <span>•</span>
                            <span className="text-yellow-500">
                                {currentContent.vote_average.toFixed(1)}
                            </span>
                        </>
                    )}
                </div>

                {/* Overview - truncated */}
                {currentContent.overview && (
                    <p className="text-gray-400 text-xs sm:text-sm text-center line-clamp-2 max-w-sm px-4">
                        {currentContent.overview}
                    </p>
                )}

                {/* Counter */}
                <p className="text-gray-500 text-xs mt-3">
                    {currentIndex + 1} of {totalContent}
                </p>
            </div>

            {/* Preference buttons */}
            <div className="flex justify-center gap-4 sm:gap-6">
                <button
                    onClick={() => onPreference(currentContent, 'not_for_me')}
                    className={`flex flex-col items-center gap-2 p-4 sm:p-5 rounded-xl transition-all duration-200 min-w-[100px] sm:min-w-[120px] active:scale-95 ${
                        preferences[currentContent.id]?.preference === 'not_for_me'
                            ? 'bg-red-500/20 border-2 border-red-500 scale-105'
                            : 'bg-gray-800/50 border-2 border-transparent hover:bg-gray-700/50'
                    }`}
                >
                    <HandThumbDownIcon
                        className={`w-8 h-8 sm:w-10 sm:h-10 ${
                            preferences[currentContent.id]?.preference === 'not_for_me'
                                ? 'text-red-500'
                                : 'text-gray-400'
                        }`}
                    />
                    <span
                        className={`text-xs sm:text-sm font-medium ${
                            preferences[currentContent.id]?.preference === 'not_for_me'
                                ? 'text-red-400'
                                : 'text-gray-400'
                        }`}
                    >
                        Not for me
                    </span>
                </button>

                <button
                    onClick={() => onPreference(currentContent, 'love')}
                    className={`flex flex-col items-center gap-2 p-4 sm:p-5 rounded-xl transition-all duration-200 min-w-[100px] sm:min-w-[120px] active:scale-95 ${
                        preferences[currentContent.id]?.preference === 'love'
                            ? 'bg-pink-500/20 border-2 border-pink-500 scale-105'
                            : 'bg-gray-800/50 border-2 border-transparent hover:bg-gray-700/50'
                    }`}
                >
                    <HeartIcon
                        className={`w-8 h-8 sm:w-10 sm:h-10 ${
                            preferences[currentContent.id]?.preference === 'love'
                                ? 'text-pink-500'
                                : 'text-gray-400'
                        }`}
                    />
                    <span
                        className={`text-xs sm:text-sm font-medium ${
                            preferences[currentContent.id]?.preference === 'love'
                                ? 'text-pink-400'
                                : 'text-gray-400'
                        }`}
                    >
                        Love it
                    </span>
                </button>
            </div>
        </div>
    )
}

// Re-export types for use in parent components
export type { GenrePreference, ContentPreference, ShownPreferenceContent }
