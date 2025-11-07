'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { XMarkIcon, SparklesIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { WizardStep4Confirmation } from '../WizardStep4Confirmation'
import type { CustomRowFormData } from '@/types/customRows'

interface SimplifiedSmartBuilderProps {
    onClose: () => void
    onComplete: (data: CustomRowFormData) => Promise<void>
    isAuthenticated: boolean
    onSignIn: () => void
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
    genreFallback: number[]
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
}: SimplifiedSmartBuilderProps) {
    const [query, setQuery] = useState('')
    const [isGenerating, setIsGenerating] = useState(false)
    const [isCreating, setIsCreating] = useState(false)
    const [generatedRow, setGeneratedRow] = useState<GeneratedRow | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [currentStep, setCurrentStep] = useState<1 | 2>(1)
    const [enableInfiniteContent, setEnableInfiniteContent] = useState(false)

    const handleGenerate = async () => {
        if (query.trim().length < 3) {
            setError('Please enter at least 3 characters')
            return
        }

        setIsGenerating(true)
        setError(null)

        try {
            const response = await fetch('/api/generate-row', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: query.trim() }),
            })

            if (!response.ok) {
                throw new Error('Failed to generate recommendations')
            }

            const data: GeneratedRow = await response.json()

            if (!data.movies || data.movies.length === 0) {
                throw new Error('No movies found for your query')
            }

            setGeneratedRow(data)
        } catch (err) {
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
            const formData: CustomRowFormData = {
                name: generatedRow.rowName,
                // Only include genres if infinite content is enabled (for fallback pagination)
                genres: enableInfiniteContent ? generatedRow.genreFallback : [],
                genreLogic: 'OR',
                mediaType: generatedRow.mediaType,
                enabled: true,
                advancedFilters: {
                    contentIds: generatedRow.movies.map((m) => m.tmdbId),
                },
            }

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
    }

    // Step 2: Success confirmation
    if (currentStep === 2 && generatedRow) {
        return (
            <div className="fixed inset-0 z-50 overflow-y-auto">
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
                <div className="relative min-h-screen flex items-center justify-center p-4">
                    <div className="relative bg-[#181818] rounded-lg shadow-2xl max-w-4xl w-full border border-gray-700">
                        <div className="p-6">
                            <WizardStep4Confirmation
                                rowName={generatedRow.rowName}
                                onViewHomepage={onClose}
                                onCreateAnother={handleReset}
                            />
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // Step 1: Input + Preview
    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative min-h-screen flex items-center justify-center p-4">
                <div className="relative bg-[#181818] rounded-lg shadow-2xl max-w-4xl w-full border border-gray-700">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-700">
                        <div className="flex-1">
                            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                <SparklesIcon className="w-6 h-6 text-yellow-400" />
                                AI Row Builder
                            </h2>
                            <p className="text-gray-400 text-sm mt-1">
                                Describe what you want to watch and let AI do the rest
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            className="text-gray-400 hover:text-white transition-colors"
                        >
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        {/* Query Input */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                What do you want to watch?
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                                    placeholder='e.g., "dark scifi thriller", "best denzel movies", "comedy of errors"'
                                    className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600"
                                    disabled={isGenerating}
                                />
                                <button
                                    onClick={handleGenerate}
                                    disabled={isGenerating || query.trim().length < 3}
                                    className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                                >
                                    {isGenerating ? (
                                        <>
                                            <ArrowPathIcon className="w-5 h-5 animate-spin" />
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <SparklesIcon className="w-5 h-5" />
                                            Generate
                                        </>
                                    )}
                                </button>
                            </div>

                            {error && (
                                <p className="mt-2 text-sm text-red-400 flex items-center gap-1">
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
                                            {generatedRow.movies.length} titles •{' '}
                                            {generatedRow.mediaType === 'both'
                                                ? 'Movies & TV'
                                                : generatedRow.mediaType === 'tv'
                                                  ? 'TV Shows'
                                                  : 'Movies'}
                                        </p>
                                    </div>
                                </div>

                                {/* Infinite Content Toggle */}
                                <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                                    <div className="flex-1">
                                        <label className="text-sm font-medium text-white flex items-center gap-2">
                                            <span>♾️</span>
                                            Enable Infinite Content
                                        </label>
                                        <p className="text-xs text-gray-400 mt-1">
                                            After these {generatedRow.movies.length} curated titles,
                                            show more similar content based on genres
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setEnableInfiniteContent(!enableInfiniteContent)
                                        }
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                            enableInfiniteContent ? 'bg-red-600' : 'bg-gray-600'
                                        }`}
                                    >
                                        <span
                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                enableInfiniteContent
                                                    ? 'translate-x-6'
                                                    : 'translate-x-1'
                                            }`}
                                        />
                                    </button>
                                </div>

                                {/* Movie Grid */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-h-[400px] overflow-y-auto p-2">
                                    {generatedRow.movies.map((movie) => (
                                        <div
                                            key={movie.tmdbId}
                                            className="group relative rounded-lg overflow-hidden bg-gray-800 hover:ring-2 hover:ring-red-600 transition-all"
                                        >
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
                                <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                                    <button
                                        onClick={handleGenerate}
                                        disabled={isGenerating}
                                        className="text-gray-400 hover:text-white transition-colors text-sm flex items-center gap-1"
                                    >
                                        <ArrowPathIcon className="w-4 h-4" />
                                        Regenerate
                                    </button>

                                    <div className="flex gap-3">
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
                                            {isCreating ? 'Creating...' : 'Create Row'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Empty state */}
                        {!generatedRow && !isGenerating && (
                            <div className="text-center py-12">
                                <SparklesIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                                <p className="text-gray-400">Enter a query above to get started</p>
                                <div className="mt-4 space-y-2 text-sm text-gray-500">
                                    <p>Try queries like:</p>
                                    <p>"dark scifi thriller"</p>
                                    <p>"best denzel washington movies"</p>
                                    <p>"comedy of errors"</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
