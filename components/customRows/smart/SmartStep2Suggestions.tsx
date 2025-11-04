'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { ArrowPathIcon } from '@heroicons/react/24/solid'
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

/**
 * SmartStep2Suggestions - Display AI-powered recommendations in a card format
 *
 * Features:
 * - Gemini-powered genre inference from text
 * - Shockingly cool, witty row names (like "THE GOAT", "Peak Scorsese")
 * - Simple card-based preview of recommended content
 * - One-click continue to create the row
 */
export function SmartStep2Suggestions({
    inputData,
    onBack,
    onContinue,
}: SmartStep2SuggestionsProps) {
    const [rowName, setRowName] = useState('')
    const [alternateNames, setAlternateNames] = useState<string[]>([])
    const [previewContent, setPreviewContent] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [mediaType, setMediaType] = useState<'movie' | 'tv' | 'both'>('both')
    const [suggestions, setSuggestions] = useState<any[]>([])
    const [insight, setInsight] = useState('')
    const [seed, setSeed] = useState(0)

    useEffect(() => {
        loadRecommendations()
    }, [])

    const loadRecommendations = async (newSeed: number = seed) => {
        setIsLoading(true)
        try {
            // Call smart suggestions API (includes Gemini analysis)
            const response = await fetch('/api/smart-suggestions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...inputData, seed: newSeed }),
            })

            if (!response.ok) throw new Error('Failed to generate suggestions')

            const data = await response.json()

            // Extract data
            setRowName(data.rowNames?.[0] || 'My Custom Row')
            setAlternateNames(data.rowNames?.slice(1) || [])
            setMediaType(data.mediaType || 'both')
            setSuggestions(data.suggestions || [])
            setInsight(data.insight || '')

            // Auto-select high-confidence suggestions for preview
            const autoSelected = (data.suggestions || [])
                .filter((s: any) => s.confidence >= 85)
                .slice(0, 5) // Top 5 suggestions

            // Fetch preview content
            if (autoSelected.length > 0) {
                await fetchPreview(autoSelected, data.mediaType || 'both')
            }
        } catch (error) {
            console.error('Recommendation error:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const fetchPreview = async (selectedSuggestions: any[], type: string) => {
        try {
            const response = await fetch('/api/smart-suggestions/preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    suggestions: selectedSuggestions,
                    mediaType: type,
                }),
            })

            if (!response.ok) throw new Error('Failed to fetch preview')

            const data = await response.json()
            setPreviewContent(data.content || [])
        } catch (error) {
            console.error('Preview fetch error:', error)
            setPreviewContent([])
        }
    }

    const refreshName = async () => {
        setIsRefreshing(true)
        const newSeed = seed + 1
        setSeed(newSeed)

        try {
            await loadRecommendations(newSeed)
        } catch (error) {
            console.error('Refresh error:', error)
        } finally {
            setIsRefreshing(false)
        }
    }

    const handleContinue = () => {
        // Use the auto-selected high-confidence suggestions
        const autoSelected = suggestions.filter((s) => s.confidence >= 85)
        onContinue({
            selectedSuggestions: autoSelected,
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
            {/* Header with Witty Title */}
            <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-3">
                    <h2 className="text-3xl font-bold text-white">{rowName}</h2>
                    <button
                        onClick={refreshName}
                        disabled={isRefreshing}
                        className="p-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Generate new name"
                    >
                        <ArrowPathIcon
                            className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`}
                        />
                    </button>
                </div>
                {insight && <p className="text-gray-400 text-sm italic">💡 {insight}</p>}
                <p className="text-gray-500 text-xs">
                    {mediaType === 'movie'
                        ? '🎬 Movies'
                        : mediaType === 'tv'
                          ? '📺 TV Shows'
                          : '🎭 Movies + Shows'}
                </p>
            </div>

            {/* Content Preview Cards */}
            {previewContent.length > 0 ? (
                <div>
                    <h4 className="text-sm font-medium text-gray-300 mb-3 text-center">
                        Here's what we found:
                    </h4>
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
                                    {/* Rating Badge */}
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
                    <p className="text-gray-500">No results found. Try adjusting your search.</p>
                </div>
            )}

            {/* Alternate Names */}
            {alternateNames.length > 0 && (
                <div>
                    <p className="text-sm text-gray-400 text-center mb-2">Other cool names:</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                        {alternateNames.map((name, idx) => (
                            <button
                                key={idx}
                                onClick={() => setRowName(name)}
                                className="px-3 py-1.5 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors text-sm"
                            >
                                {name}
                            </button>
                        ))}
                    </div>
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
                    disabled={previewContent.length === 0}
                    className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg"
                >
                    Create Row →
                </button>
            </div>
        </div>
    )
}
