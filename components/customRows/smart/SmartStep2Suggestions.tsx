'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { ArrowPathIcon, PlusIcon, XMarkIcon, SparklesIcon } from '@heroicons/react/24/solid'
import type { Entity } from './SmartInput'

interface SmartStep2SuggestionsProps {
    inputData: {
        entities: Entity[]
        rawText: string
    }
    onBack: () => void
    onContinue: (data: {
        selectedSuggestions: any[]
        selectedRowName: string
        mediaType: 'movie' | 'tv' | 'both'
    }) => void
}

// TMDB Genre mapping
const GENRE_MAP: Record<number, string> = {
    28: 'Action',
    12: 'Adventure',
    16: 'Animation',
    35: 'Comedy',
    80: 'Crime',
    99: 'Documentary',
    18: 'Drama',
    10751: 'Family',
    14: 'Fantasy',
    36: 'History',
    27: 'Horror',
    10402: 'Music',
    9648: 'Mystery',
    10749: 'Romance',
    878: 'Science Fiction',
    53: 'Thriller',
    10752: 'War',
    37: 'Western',
    10759: 'Action & Adventure',
    10762: 'Kids',
    10763: 'News',
    10764: 'Reality',
    10765: 'Sci-Fi & Fantasy',
    10766: 'Soap',
    10767: 'Talk',
    10768: 'War & Politics',
}

/**
 * SmartStep2Suggestions - Editable AI-powered recommendations preview
 */
export function SmartStep2Suggestions({
    inputData,
    onBack,
    onContinue,
}: SmartStep2SuggestionsProps) {
    const [rowName, setRowName] = useState('')
    const [genreIds, setGenreIds] = useState<number[]>([])
    const [mediaType, setMediaType] = useState<'movie' | 'tv' | 'both'>('both')
    const [previewContent, setPreviewContent] = useState<any[]>([])
    const [totalResults, setTotalResults] = useState(0)
    const [isLoading, setIsLoading] = useState(true)
    const [isRefreshingName, setIsRefreshingName] = useState(false)
    const [isRefreshingPreview, setIsRefreshingPreview] = useState(false)
    const [showGenreModal, setShowGenreModal] = useState(false)
    const [nameSeed, setNameSeed] = useState(0)

    useEffect(() => {
        loadInitialData()
    }, [])

    useEffect(() => {
        if (genreIds.length > 0) {
            fetchPreview()
        }
    }, [genreIds, mediaType])

    const loadInitialData = async () => {
        setIsLoading(true)
        try {
            // Call Gemini to analyze and get genre IDs
            const response = await fetch('/api/smart-suggestions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...inputData, seed: 0 }),
            })

            if (!response.ok) throw new Error('Failed to generate suggestions')

            const data = await response.json()

            // Extract genre IDs from suggestions
            const genreSuggestion = data.suggestions?.find((s: any) => s.type === 'genre')
            const ids = genreSuggestion?.value || []

            setRowName(data.rowNames?.[0] || 'My Custom Row')
            setGenreIds(ids)
            setMediaType(data.mediaType || 'both')
        } catch (error) {
            console.error('Load error:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const fetchPreview = async () => {
        setIsRefreshingPreview(true)
        try {
            const response = await fetch('/api/smart-suggestions/preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    suggestions: [{ type: 'genre', value: genreIds }],
                    mediaType,
                }),
            })

            if (!response.ok) throw new Error('Failed to fetch preview')

            const data = await response.json()
            setPreviewContent(data.content || [])
            setTotalResults(data.totalResults || data.content?.length || 0)
        } catch (error) {
            console.error('Preview error:', error)
            setPreviewContent([])
            setTotalResults(0)
        } finally {
            setIsRefreshingPreview(false)
        }
    }

    const refreshName = async () => {
        setIsRefreshingName(true)
        const newSeed = nameSeed + 1
        setNameSeed(newSeed)

        try {
            const response = await fetch('/api/smart-suggestions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...inputData, seed: newSeed }),
            })

            if (!response.ok) throw new Error('Failed to generate name')

            const data = await response.json()
            setRowName(data.rowNames?.[0] || rowName)
        } catch (error) {
            console.error('Name refresh error:', error)
        } finally {
            setIsRefreshingName(false)
        }
    }

    const addGenre = (genreId: number) => {
        if (!genreIds.includes(genreId)) {
            setGenreIds([...genreIds, genreId])
        }
        setShowGenreModal(false)
    }

    const removeGenre = (genreId: number) => {
        setGenreIds(genreIds.filter((id) => id !== genreId))
    }

    const handleContinue = () => {
        onContinue({
            selectedSuggestions: [{ type: 'genre', value: genreIds, confidence: 95 }],
            selectedRowName: rowName,
            mediaType,
        })
    }

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-16">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-red-600 mb-4"></div>
                <p className="text-white text-lg font-medium">Creating your recommendations...</p>
                <p className="text-gray-400 text-sm mt-2">Using AI to find the perfect matches</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header with Title and AI Rename */}
            <div className="space-y-4">
                <div className="flex items-center justify-center gap-3">
                    <h2 className="text-3xl font-bold text-white text-center">{rowName}</h2>
                    <button
                        onClick={refreshName}
                        disabled={isRefreshingName}
                        className="p-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Generate new name"
                    >
                        <SparklesIcon
                            className={`w-5 h-5 ${isRefreshingName ? 'animate-spin' : ''}`}
                        />
                    </button>
                </div>

                {/* Editable Filters */}
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 space-y-4">
                    {/* Media Type Selector */}
                    <div>
                        <label className="block text-sm font-medium text-gray-200 mb-2">
                            Media Type:
                        </label>
                        <div className="flex gap-2">
                            {(['movie', 'tv', 'both'] as const).map((type) => (
                                <button
                                    key={type}
                                    onClick={() => setMediaType(type)}
                                    className={`px-4 py-2 rounded-lg transition-colors ${
                                        mediaType === type
                                            ? 'bg-red-600 text-white'
                                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                    }`}
                                >
                                    {type === 'movie'
                                        ? '🎬 Movies'
                                        : type === 'tv'
                                          ? '📺 TV Shows'
                                          : '🎭 Both'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Genre Bubbles */}
                    <div>
                        <label className="block text-sm font-medium text-gray-200 mb-2">
                            Genres:
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {genreIds.map((id) => (
                                <span
                                    key={id}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-600/20 text-red-400 rounded-full border border-red-600/50"
                                >
                                    {GENRE_MAP[id] || `Genre ${id}`}
                                    <button
                                        onClick={() => removeGenre(id)}
                                        className="hover:text-red-300 transition-colors"
                                    >
                                        <XMarkIcon className="w-4 h-4" />
                                    </button>
                                </span>
                            ))}
                            <button
                                onClick={() => setShowGenreModal(true)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-700 text-gray-300 rounded-full hover:bg-gray-600 transition-colors"
                            >
                                <PlusIcon className="w-4 h-4" />
                                Add Genre
                            </button>
                        </div>
                    </div>

                    {/* Result Count */}
                    {totalResults > 0 && (
                        <div className="text-sm text-gray-400">
                            📊 ~{totalResults} results found
                        </div>
                    )}
                </div>
            </div>

            {/* Content Preview */}
            {isRefreshingPreview ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
                </div>
            ) : previewContent.length > 0 ? (
                <div>
                    <h4 className="text-sm font-medium text-gray-300 mb-3 text-center">Preview:</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                        {previewContent.slice(0, 10).map((item, idx) => (
                            <div
                                key={idx}
                                className="group cursor-pointer"
                                title={item.title || item.name}
                            >
                                <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-gray-800 shadow-lg group-hover:shadow-2xl transition-shadow">
                                    {item.poster_path ? (
                                        <Image
                                            src={`https://image.tmdb.org/t/p/w342${item.poster_path}`}
                                            alt={item.title || item.name}
                                            fill
                                            className="object-cover group-hover:scale-105 transition-transform duration-200"
                                            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 20vw"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs p-2 text-center">
                                            {item.title || item.name}
                                        </div>
                                    )}
                                    {item.vote_average && item.vote_average > 0 && (
                                        <div className="absolute top-2 right-2 bg-black/80 px-2 py-1 rounded text-xs font-bold text-white">
                                            ⭐ {item.vote_average.toFixed(1)}
                                        </div>
                                    )}
                                </div>
                                <p className="text-white text-sm mt-2 line-clamp-2 text-center">
                                    {item.title || item.name}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="py-12 text-center">
                    <p className="text-gray-500">No results found. Try adding more genres.</p>
                </div>
            )}

            {/* Navigation */}
            <div className="flex gap-3 pt-4">
                <button
                    onClick={onBack}
                    className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
                >
                    ← Back
                </button>
                <button
                    onClick={handleContinue}
                    disabled={genreIds.length === 0 || previewContent.length === 0}
                    className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg"
                >
                    Create Row →
                </button>
            </div>

            {/* Genre Selection Modal */}
            {showGenreModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-900 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-white">Add Genre</h3>
                            <button
                                onClick={() => setShowGenreModal(false)}
                                className="text-gray-400 hover:text-white"
                            >
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {Object.entries(GENRE_MAP)
                                .filter(([id]) => !genreIds.includes(Number(id)))
                                .map(([id, name]) => (
                                    <button
                                        key={id}
                                        onClick={() => addGenre(Number(id))}
                                        className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-red-600 hover:text-white transition-colors text-sm"
                                    >
                                        {name}
                                    </button>
                                ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
