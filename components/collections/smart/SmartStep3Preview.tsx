'use client'

import React, { useState, useEffect } from 'react'
import { SparklesIcon } from '@heroicons/react/24/solid'
import type { CustomRowFormData } from '@/types/customRows'

interface SmartStep3PreviewProps {
    selectedSuggestions: any[]
    selectedRowName: string
    mediaType: 'movie' | 'tv' | 'both'
    formData: CustomRowFormData
    onChange: (updates: Partial<CustomRowFormData>) => void
    onBack: () => void
    onCreate: () => Promise<void>
    isCreating: boolean
    isAuthenticated: boolean
    onSignIn: () => void
}

/**
 * SmartStep3Preview - Show actual content preview before creating row
 */
// Simple in-memory cache for preview data (persists during session)
const previewCache = new Map<string, { content: any[]; totalResults: number }>()

export function SmartStep3Preview({
    selectedSuggestions,
    selectedRowName,
    mediaType,
    formData: _formData,
    onChange,
    onBack,
    onCreate,
    isCreating,
    isAuthenticated,
    onSignIn,
}: SmartStep3PreviewProps) {
    const [previewContent, setPreviewContent] = useState<any[]>([])
    const [totalResults, setTotalResults] = useState(0)
    const [isLoadingPreview, setIsLoadingPreview] = useState(true)
    const [rowName, setRowName] = useState(selectedRowName)

    useEffect(() => {
        loadPreview()
    }, [])

    const loadPreview = async () => {
        // Create cache key from suggestions + mediaType
        const cacheKey = JSON.stringify({ selectedSuggestions, mediaType })

        // Check cache first
        const cached = previewCache.get(cacheKey)
        if (cached) {
            setPreviewContent(cached.content)
            setTotalResults(cached.totalResults)
            setIsLoadingPreview(false)
            return
        }

        setIsLoadingPreview(true)
        try {
            const response = await fetch('/api/smart-suggestions/preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    suggestions: selectedSuggestions,
                    mediaType,
                }),
            })

            if (!response.ok) throw new Error('Failed to load preview')

            const data = await response.json()
            const content = data.content || []
            const total = data.totalResults || 0

            // Cache the results
            previewCache.set(cacheKey, { content, totalResults: total })

            setPreviewContent(content)
            setTotalResults(total)
        } catch (error) {
            console.error('Preview load error:', error)
        } finally {
            setIsLoadingPreview(false)
        }
    }

    const handleRowNameChange = (newName: string) => {
        setRowName(newName)
        onChange({ name: newName })
    }

    const handleCreate = async () => {
        if (!isAuthenticated) {
            onSignIn()
            return
        }

        await onCreate()
    }

    if (isLoadingPreview) {
        return (
            <div className="flex flex-col items-center justify-center py-16">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-red-600 mb-4"></div>
                <p className="text-white text-lg font-medium">Loading preview...</p>
                <p className="text-gray-400 text-sm mt-2">Fetching content from TMDB</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Row Name Section */}
            <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-300">Row Name:</label>
                <div className="flex items-center gap-3">
                    <input
                        type="text"
                        value={rowName}
                        onChange={(e) => handleRowNameChange(e.target.value)}
                        className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
                        placeholder="Enter row name..."
                    />
                    <SparklesIcon className="w-5 h-5 text-yellow-400" />
                </div>
            </div>

            {/* Total Results */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-gray-400 text-sm">Total Results Found:</p>
                        <p className="text-white text-2xl font-bold">
                            {totalResults.toLocaleString()}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-gray-400 text-sm">Showing Preview:</p>
                        <p className="text-white text-lg font-semibold">
                            {previewContent.length} items
                        </p>
                    </div>
                </div>
            </div>

            {/* Preview Content */}
            <div>
                <h3 className="text-xl font-bold text-white mb-4">Preview Content</h3>
                {previewContent.length === 0 ? (
                    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-8 text-center">
                        <p className="text-gray-400">No content found matching your filters.</p>
                        <p className="text-gray-500 text-sm mt-2">
                            Try adjusting your selections in the previous step.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {previewContent.map((item) => (
                            <div
                                key={item.id}
                                className="group relative aspect-[2/3] rounded-lg overflow-hidden bg-gray-800 hover:ring-2 hover:ring-red-500 transition-all cursor-pointer"
                            >
                                {item.poster_path ? (
                                    <img
                                        src={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
                                        alt={item.title || item.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-700">
                                        <span className="text-gray-500 text-xs text-center px-2">
                                            No Image
                                        </span>
                                    </div>
                                )}

                                {/* Hover overlay with title */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                                    <div>
                                        <p className="text-white text-sm font-semibold line-clamp-2">
                                            {item.title || item.name}
                                        </p>
                                        {item.vote_average > 0 && (
                                            <p className="text-yellow-400 text-xs mt-1">
                                                ⭐ {item.vote_average.toFixed(1)}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Authentication Notice */}
            {!isAuthenticated && (
                <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4 text-center">
                    <p className="text-blue-300 text-sm">
                        <strong>Sign in required:</strong> You need to be signed in to create custom
                        rows.
                    </p>
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
                    onClick={handleCreate}
                    disabled={isCreating || !rowName.trim() || previewContent.length === 0}
                    className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg flex items-center justify-center gap-2"
                >
                    {isCreating ? (
                        <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            Creating...
                        </>
                    ) : !isAuthenticated ? (
                        'Sign In to Create'
                    ) : (
                        'Create Row'
                    )}
                </button>
            </div>
        </div>
    )
}
