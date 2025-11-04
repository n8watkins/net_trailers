'use client'

import React, { useState } from 'react'
import { SparklesIcon, EyeIcon } from '@heroicons/react/24/outline'
import { CustomRowFormData, CUSTOM_ROW_CONSTRAINTS } from '../../types/customRows'
import { MOVIE_GENRES, TV_GENRES } from '../../constants/genres'

interface WizardStep3NamePreviewProps {
    formData: CustomRowFormData
    onChange: (updates: Partial<CustomRowFormData>) => void
    onBack: () => void
    onCreate: () => void
    isCreating: boolean
    isAuthenticated: boolean
    onSignIn: () => void
}

/**
 * WizardStep3NamePreview Component
 *
 * Third step of custom row creation wizard.
 * Handles name input, AI generation, and content preview.
 */
export function WizardStep3NamePreview({
    formData,
    onChange,
    onBack,
    onCreate,
    isCreating,
    isAuthenticated,
    onSignIn,
}: WizardStep3NamePreviewProps) {
    const [isGeneratingName, setIsGeneratingName] = useState(false)
    const [isLoadingPreview, setIsLoadingPreview] = useState(false)
    const [nameError, setNameError] = useState<string | null>(null)

    // Get genre names for display
    const genreList = formData.mediaType === 'tv' ? TV_GENRES : MOVIE_GENRES
    const selectedGenreNames = formData.genres
        .map((id) => genreList.find((g) => g.id === id)?.name)
        .filter(Boolean)

    // Check if name is valid
    const isNameValid =
        formData.name.trim().length >= CUSTOM_ROW_CONSTRAINTS.MIN_NAME_LENGTH &&
        formData.name.trim().length <= CUSTOM_ROW_CONSTRAINTS.MAX_NAME_LENGTH

    // Handle AI name generation
    const handleGenerateName = async () => {
        if (!isAuthenticated) {
            onSignIn()
            return
        }

        setIsGeneratingName(true)
        setNameError(null)

        try {
            const response = await fetch('/api/generate-row-name', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    genres: formData.genres,
                    genreLogic: formData.genreLogic,
                    mediaType: formData.mediaType,
                    advancedFilters: formData.advancedFilters,
                }),
            })

            if (!response.ok) {
                throw new Error('Failed to generate name')
            }

            const data = await response.json()
            onChange({ name: data.name })
        } catch (error) {
            console.error('Error generating name:', error)
            setNameError('Failed to generate name. Please try again or enter one manually.')
        } finally {
            setIsGeneratingName(false)
        }
    }

    // Handle preview (placeholder for now)
    const handlePreview = async () => {
        if (!isAuthenticated) {
            onSignIn()
            return
        }

        setIsLoadingPreview(true)
        try {
            // TODO: Implement preview API call
            await new Promise((resolve) => setTimeout(resolve, 1000))
            // Will open ContentPreviewModal
        } catch (error) {
            console.error('Error loading preview:', error)
        } finally {
            setIsLoadingPreview(false)
        }
    }

    // Count active advanced filters
    const activeFilterCount = formData.advancedFilters
        ? Object.keys(formData.advancedFilters).filter((key) => {
              const value = formData.advancedFilters![key as keyof typeof formData.advancedFilters]
              return value !== undefined && value !== null && value !== ''
          }).length
        : 0

    return (
        <div className="space-y-6">
            {/* Filter Summary Card */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                <h4 className="text-white font-medium mb-3">Your Selection</h4>

                <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-400">Media Type:</span>
                        <span className="text-white capitalize">{formData.mediaType}</span>
                    </div>

                    <div className="flex justify-between">
                        <span className="text-gray-400">Genres:</span>
                        <span className="text-white text-right max-w-xs">
                            {selectedGenreNames.join(', ')}
                        </span>
                    </div>

                    {formData.genres.length > 1 && (
                        <div className="flex justify-between">
                            <span className="text-gray-400">Logic:</span>
                            <span className="text-white">Match {formData.genreLogic}</span>
                        </div>
                    )}

                    {activeFilterCount > 0 && (
                        <>
                            <div className="border-t border-gray-700 my-2 pt-2">
                                <span className="text-red-400 font-medium text-xs">
                                    {activeFilterCount} Advanced Filter
                                    {activeFilterCount > 1 ? 's' : ''} Applied
                                </span>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Name Input */}
            <div>
                <label htmlFor="rowName" className="block text-sm font-medium text-gray-200 mb-2">
                    Row Name *
                </label>

                <input
                    type="text"
                    id="rowName"
                    value={formData.name}
                    onChange={(e) => {
                        onChange({ name: e.target.value })
                        setNameError(null)
                    }}
                    placeholder="e.g., Epic Sci-Fi Adventures"
                    maxLength={CUSTOM_ROW_CONSTRAINTS.MAX_NAME_LENGTH}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                />

                <div className="flex justify-between items-center mt-2">
                    <div>
                        {nameError && <p className="text-sm text-red-500">{nameError}</p>}
                        {!isNameValid && formData.name.length > 0 && (
                            <p className="text-sm text-yellow-500">
                                {formData.name.length < CUSTOM_ROW_CONSTRAINTS.MIN_NAME_LENGTH
                                    ? `At least ${CUSTOM_ROW_CONSTRAINTS.MIN_NAME_LENGTH} characters required`
                                    : 'Name too long'}
                            </p>
                        )}
                    </div>
                    <p className="text-sm text-gray-400">
                        {formData.name.length}/{CUSTOM_ROW_CONSTRAINTS.MAX_NAME_LENGTH}
                    </p>
                </div>
            </div>

            {/* AI Generate Button */}
            <div className="flex gap-3">
                <button
                    type="button"
                    onClick={handleGenerateName}
                    disabled={isGeneratingName}
                    className="flex items-center gap-2 px-4 py-2.5 bg-purple-600/20 border border-purple-500/30 text-purple-400 rounded-lg hover:bg-purple-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <SparklesIcon className="w-5 h-5" />
                    <span className="font-medium">
                        {isGeneratingName ? 'Generating...' : 'AI Generate Name'}
                    </span>
                </button>

                {isAuthenticated && (
                    <button
                        type="button"
                        onClick={handlePreview}
                        disabled={isLoadingPreview}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <EyeIcon className="w-5 h-5" />
                        <span className="font-medium">
                            {isLoadingPreview ? 'Loading...' : 'Preview Content'}
                        </span>
                    </button>
                )}
            </div>

            {!isAuthenticated && (
                <div className="bg-yellow-600/10 border border-yellow-500/30 rounded-lg p-3">
                    <p className="text-yellow-200 text-sm">
                        💡 <strong>Sign in</strong> to use AI name generation and content preview
                    </p>
                </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex gap-3 pt-4">
                <button
                    type="button"
                    onClick={onBack}
                    className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
                >
                    ← Back
                </button>
                <button
                    type="button"
                    onClick={onCreate}
                    disabled={!isNameValid || isCreating}
                    className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                    {isCreating ? 'Creating Row...' : 'Create Row'}
                </button>
            </div>
        </div>
    )
}
