'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { XMarkIcon, SparklesIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline'
import { WizardStep4Confirmation } from '../WizardStep4Confirmation'
import NetflixLoader from '../../common/NetflixLoader'
import { SmartInput } from '../../common/SmartInput'
import type { CustomRowFormData } from '@/types/customRows'
import { Content } from '@/typings'
import { useToast } from '@/hooks/useToast'
import { authenticatedFetch, AuthRequiredError } from '@/lib/authenticatedFetch'
import { inferMediaTypeFromContent, inferTopGenresFromContent } from '@/utils/collectionGenreUtils'

interface SimplifiedSmartBuilderProps {
    onClose: () => void
    onComplete: (data: CustomRowFormData) => Promise<void>
    isAuthenticated: boolean
    onSignIn: () => void
    mode?: 'smart' | 'traditional'
    onModeChange?: (mode: 'smart' | 'traditional') => void
}

interface GeneratedMovie {
    title: string
    year: number
    tmdbId: number
    posterPath: string | null
    rating: number
    reason: string
}

interface GeneratedRow {
    movies: GeneratedMovie[]
    rowName: string
    mediaType: 'movie' | 'tv' | 'both'
    genreFallback: string[] // Unified genre IDs like 'action', 'fantasy'
}

/**
 * SimplifiedSmartBuilder - 2-step AI-powered row creation
 *
 * Step 1: Input → Instant Preview
 * Step 2: Success Confirmation
 */
export function SimplifiedSmartBuilder({
    onClose,
    onComplete,
    isAuthenticated,
    onSignIn,
    mode = 'smart',
    onModeChange,
}: SimplifiedSmartBuilderProps) {
    const [query, setQuery] = useState('')
    const [isGenerating, setIsGenerating] = useState(false)
    const [isCreating, setIsCreating] = useState(false)
    const [generatedRow, setGeneratedRow] = useState<GeneratedRow | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [currentStep, setCurrentStep] = useState<1 | 2>(1)
    const [enableInfiniteContent, setEnableInfiniteContent] = useState(false)
    const [showInfiniteTooltip, setShowInfiniteTooltip] = useState(false)
    const { showError } = useToast()

    // Collection settings
    const [displayAsRow, setDisplayAsRow] = useState(true)

    // Track all content IDs seen in this session (both removed and kept)
    const [allSeenIds, setAllSeenIds] = useState<Set<number>>(new Set())
    // Track IDs that user explicitly removed
    const [removedIds, setRemovedIds] = useState<Set<number>>(new Set())
    // Store full Content objects for preview
    const [contentMap, setContentMap] = useState<Map<number, Content>>(new Map())

    // Fetch full Content objects from TMDB for given IDs
    const fetchContentObjects = async (
        movies: GeneratedMovie[],
        mediaType: string
    ): Promise<Content[]> => {
        const contents: Content[] = []

        for (const movie of movies) {
            try {
                const endpoint = mediaType === 'tv' ? '/api/tv' : '/api/movies'
                const response = await fetch(`${endpoint}/${movie.tmdbId}`)

                if (response.ok) {
                    const data = await response.json()
                    contents.push(data)

                    // Store in content map
                    setContentMap((prev) => new Map(prev).set(movie.tmdbId, data))
                }
            } catch (error) {
                console.warn(`Failed to fetch content for ${movie.title}:`, error)
            }
        }

        return contents
    }

    // Handle removing a movie from the preview
    const handleRemoveMovie = (tmdbId: number) => {
        setRemovedIds((prev) => new Set(prev).add(tmdbId))
    }

    const handleGenerate = async () => {
        if (query.trim().length < 3) {
            setError('Please enter at least 3 characters')
            return
        }

        if (!isAuthenticated) {
            showError('Sign in required', 'Please sign in to use AI-powered collection tools.')
            onSignIn()
            return
        }

        setIsGenerating(true)
        setError(null)

        try {
            // Include excluded IDs in the request to prevent duplicates
            const excludedIds = [...allSeenIds]

            const response = await authenticatedFetch('/api/generate-ranking-content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: query.trim(),
                    excludedIds: excludedIds.length > 0 ? excludedIds : undefined,
                }),
            })

            if (!response.ok) {
                if (response.status === 429) {
                    const data = await response.json().catch(() => ({}))
                    const message =
                        data.error || 'Daily Gemini limit reached. Please try again tomorrow.'
                    showError('AI limit reached', message)
                    throw new Error(message)
                }
                if (response.status === 401) {
                    showError('Session expired', 'Please sign in again to continue.')
                    onSignIn()
                    throw new Error('Authentication required')
                }
                throw new Error('Failed to generate recommendations')
            }

            const data: GeneratedRow = await response.json()

            if (!data.movies || data.movies.length === 0) {
                throw new Error('No movies found for your query')
            }

            // Track all newly seen IDs
            const newIds = data.movies.map((m) => m.tmdbId)
            setAllSeenIds((prev) => new Set([...prev, ...newIds]))

            // Fetch full Content objects for the movies
            await fetchContentObjects(data.movies, data.mediaType)

            // If we already have a row, append the new movies to it
            if (generatedRow) {
                setGeneratedRow({
                    ...generatedRow,
                    movies: [...generatedRow.movies, ...data.movies],
                })
            } else {
                setGeneratedRow(data)
            }
        } catch (err) {
            if (err instanceof AuthRequiredError) {
                showError('Sign in required', 'Please sign in to use AI-powered collection tools.')
                onSignIn()
            }
            setError((err as Error).message || 'Something went wrong')
        } finally {
            setIsGenerating(false)
        }
    }

    const handleCreate = async () => {
        if (!generatedRow) return

        // Check authentication
        if (!isAuthenticated) {
            onSignIn()
            return
        }

        setIsCreating(true)

        try {
            // Filter out removed movies and get their Content objects
            const activeMovieIds = generatedRow.movies
                .filter((m) => !removedIds.has(m.tmdbId))
                .map((m) => m.tmdbId)

            const previewContent = activeMovieIds
                .map((id) => contentMap.get(id))
                .filter((c): c is Content => c !== undefined)

            const fallbackGenres = Array.isArray(generatedRow.genreFallback)
                ? generatedRow.genreFallback
                : []
            const inferredGenres = inferTopGenresFromContent(previewContent, 2)
            const normalizedGenres = Array.from(
                new Set([...fallbackGenres, ...inferredGenres])
            ).slice(0, 2)
            const inferredMediaType =
                generatedRow.mediaType || inferMediaTypeFromContent(previewContent, 'both')
            const infiniteEnabled = enableInfiniteContent && normalizedGenres.length > 0

            const formData: CustomRowFormData = {
                name: generatedRow.rowName,
                genres: normalizedGenres,
                genreLogic: normalizedGenres.length >= 2 ? 'AND' : 'OR',
                mediaType: inferredMediaType,
                enabled: true,
                advancedFilters: {
                    contentIds: activeMovieIds,
                },
                // Auto-update settings are optional and not exposed in this simplified builder
                autoUpdateEnabled: false,
                updateFrequency: 'never',
                // Include preview content for collection creation
                previewContent,
                // Collection visibility and display settings
                displayAsRow,
                enableInfiniteContent: infiniteEnabled,
            }

            console.log('Creating collection with preview content:', previewContent.length, 'items')

            await onComplete(formData)
            setCurrentStep(2)
        } catch (err) {
            setError((err as Error).message || 'Failed to create row')
        } finally {
            setIsCreating(false)
        }
    }

    const handleReset = () => {
        setQuery('')
        setGeneratedRow(null)
        setError(null)
        setCurrentStep(1)
        setEnableInfiniteContent(false)
        setDisplayAsRow(true)
        setAllSeenIds(new Set())
        setRemovedIds(new Set())
        setContentMap(new Map())
    }

    const handleQueryChange = (value: string) => {
        setQuery(value)
    }

    const handleQuerySubmit = () => {
        handleGenerate()
    }

    // Step 2: Success confirmation
    if (currentStep === 2 && generatedRow) {
        return (
            <div className="p-6">
                <WizardStep4Confirmation
                    rowName={generatedRow.rowName}
                    onViewHomepage={onClose}
                    onCreateAnother={handleReset}
                    type="collection"
                />
            </div>
        )
    }

    // Step 1: Input + Preview
    return (
        <>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
                <div className="flex-1">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <SparklesIcon className="w-6 h-6 text-yellow-400" />
                        Collection Builder
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">Build your collection step by step</p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Mode Toggle */}
                    {onModeChange && (
                        <div className="bg-gray-800 border border-gray-700 rounded-lg p-1 shadow-lg">
                            <div className="flex gap-1">
                                <button
                                    onClick={() => onModeChange('smart')}
                                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                                        mode === 'smart'
                                            ? 'bg-red-600 text-white'
                                            : 'text-gray-400 hover:text-white hover:bg-gray-700'
                                    }`}
                                >
                                    ✨ Smart
                                </button>
                                <button
                                    onClick={() => onModeChange('traditional')}
                                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                                        mode === 'traditional'
                                            ? 'bg-red-600 text-white'
                                            : 'text-gray-400 hover:text-white hover:bg-gray-700'
                                    }`}
                                >
                                    🔧 Traditional
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Close button */}
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="p-6 min-h-[600px] flex flex-col relative">
                {/* Query Input - Centered and Hero-style */}
                <div
                    className={`mb-6 transition-all duration-700 ease-out ${!generatedRow && !isGenerating ? 'w-full mx-auto mt-32' : 'mt-0'}`}
                    style={{
                        opacity: 1,
                        transform: 'translateY(0)',
                    }}
                >
                    <label
                        className={`block text-sm font-medium text-gray-300 mb-4 transition-all duration-500 ${!generatedRow && !isGenerating ? 'text-center' : ''}`}
                    >
                        What do you want to watch?
                    </label>
                    <SmartInput
                        value={query}
                        onChange={handleQueryChange}
                        onSubmit={handleQuerySubmit}
                        disabled={isGenerating}
                        placeholder='e.g., "dark scifi thriller", "best denzel movies", "comedy of errors"'
                        size="large"
                        variant="solid"
                        showSurpriseMe={true}
                        showTypewriter={true}
                        shimmer="wave"
                        surpriseQueryType="collection"
                    />

                    {error && (
                        <p className="mt-3 text-center text-sm text-red-400 flex items-center justify-center gap-1">
                            <span>⚠️</span>
                            {error}
                        </p>
                    )}
                </div>

                {/* Preview */}
                {generatedRow && (
                    <div className="space-y-4">
                        {/* Row Name */}
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-bold text-white">
                                    {generatedRow.rowName}
                                </h3>
                                <p className="text-sm text-gray-400">
                                    {
                                        generatedRow.movies.filter((m) => !removedIds.has(m.tmdbId))
                                            .length
                                    }{' '}
                                    titles •{' '}
                                    {generatedRow.mediaType === 'both'
                                        ? 'Movies & TV'
                                        : generatedRow.mediaType === 'tv'
                                          ? 'TV Shows'
                                          : 'Movies'}
                                    {removedIds.size > 0 && (
                                        <span className="text-gray-500 ml-2">
                                            ({removedIds.size} removed)
                                        </span>
                                    )}
                                </p>
                            </div>
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating}
                                className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                            >
                                <SparklesIcon className="w-4 h-4" />
                                {isGenerating ? 'Generating...' : 'Generate More'}
                            </button>
                        </div>

                        {/* Toggle Settings */}
                        <div className="relative p-3 bg-gray-800/50 rounded-lg border border-gray-700 space-y-3">
                            {/* Infinite Content Toggle */}
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-white flex items-center gap-1.5">
                                    <span>♾️</span>
                                    Infinite Content
                                    <button
                                        type="button"
                                        onMouseEnter={() => setShowInfiniteTooltip(true)}
                                        onMouseLeave={() => setShowInfiniteTooltip(false)}
                                        onClick={() => setShowInfiniteTooltip(!showInfiniteTooltip)}
                                        className="text-gray-400 hover:text-white"
                                    >
                                        <QuestionMarkCircleIcon className="w-4 h-4" />
                                    </button>
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setEnableInfiniteContent(!enableInfiniteContent)}
                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                        enableInfiniteContent ? 'bg-red-600' : 'bg-gray-600'
                                    }`}
                                >
                                    <span
                                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                            enableInfiniteContent
                                                ? 'translate-x-5'
                                                : 'translate-x-0.5'
                                        }`}
                                    />
                                </button>
                            </div>
                            {/* Tooltip */}
                            {showInfiniteTooltip && (
                                <div className="absolute z-10 top-full left-0 mt-1 p-2 bg-gray-900 border border-gray-700 rounded-md shadow-xl max-w-xs">
                                    <p className="text-xs text-gray-300">
                                        After these {generatedRow.movies.length} curated titles,
                                        show more similar content based on genres
                                    </p>
                                </div>
                            )}

                            {/* Display as Row Toggle */}
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-white flex items-center gap-1.5">
                                    <span>🏠</span>
                                    Display as Row
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setDisplayAsRow(!displayAsRow)}
                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                        displayAsRow ? 'bg-blue-600' : 'bg-gray-600'
                                    }`}
                                >
                                    <span
                                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                            displayAsRow ? 'translate-x-5' : 'translate-x-0.5'
                                        }`}
                                    />
                                </button>
                            </div>
                        </div>

                        {/* Movie Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-h-[400px] overflow-y-auto p-2">
                            {generatedRow.movies
                                .filter((movie) => !removedIds.has(movie.tmdbId))
                                .map((movie) => (
                                    <div
                                        key={movie.tmdbId}
                                        className="group relative rounded-lg overflow-hidden bg-gray-800 hover:ring-2 hover:ring-red-600 transition-all"
                                    >
                                        {/* Remove Button - Top center */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleRemoveMovie(movie.tmdbId)
                                            }}
                                            className="
                                                        absolute top-2 left-1/2 -translate-x-1/2 z-50
                                                        w-8 h-8 rounded-full
                                                        bg-white shadow-lg
                                                        border-2 border-black
                                                        opacity-0 group-hover:opacity-100
                                                        transition-all duration-200
                                                        hover:scale-110
                                                        flex items-center justify-center
                                                    "
                                            aria-label="Remove from collection"
                                        >
                                            <XMarkIcon className="h-5 w-5 text-black" />
                                        </button>

                                        {/* Poster */}
                                        <div className="aspect-[2/3] relative">
                                            {movie.posterPath ? (
                                                <Image
                                                    src={`https://image.tmdb.org/t/p/w342${movie.posterPath}`}
                                                    alt={movie.title}
                                                    fill
                                                    className="object-cover"
                                                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 20vw"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gray-700 text-gray-500 text-xs p-2 text-center">
                                                    {movie.title}
                                                </div>
                                            )}
                                        </div>

                                        {/* Hover overlay with info */}
                                        <div className="absolute inset-0 bg-black/90 opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-end">
                                            <p className="text-white text-sm font-semibold line-clamp-2">
                                                {movie.title}
                                            </p>
                                            <p className="text-gray-400 text-xs">
                                                {movie.year} • ⭐ {movie.rating.toFixed(1)}
                                            </p>
                                            <p className="text-gray-300 text-xs mt-1 line-clamp-2">
                                                {movie.reason}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-700">
                            <button
                                onClick={onClose}
                                className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={isCreating}
                                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isCreating ? 'Creating...' : 'Create Collection'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Loading state */}
                {isGenerating && (
                    <div className="absolute top-20 left-0 right-0 flex justify-center">
                        <NetflixLoader inline slowCounter message="Building your collection..." />
                    </div>
                )}
            </div>
        </>
    )
}
