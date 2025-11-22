'use client'

import React from 'react'
import { FilmIcon, TvIcon } from '@heroicons/react/24/outline'
import { GenrePills } from './GenrePills'
import { CustomRowFormData } from '../../types/customRows'

interface WizardStep1BasicProps {
    formData: CustomRowFormData
    onChange: (updates: Partial<CustomRowFormData>) => void
    onNext: () => void
    canProgress: boolean
}

/**
 * WizardStep1Basic Component
 *
 * First step of custom row creation wizard.
 * Handles media type selection, genre selection, and genre logic.
 */
export function WizardStep1Basic({
    formData,
    onChange,
    onNext,
    canProgress,
}: WizardStep1BasicProps) {
    // Handler for multi-select media type buttons
    const handleMediaTypeToggle = (type: 'movie' | 'tv') => {
        const currentType = formData.mediaType
        let newType: 'movie' | 'tv' | 'both'

        if (currentType === 'both') {
            // If both selected, switch to the opposite type
            newType = type === 'movie' ? 'tv' : 'movie'
        } else if (currentType === type) {
            // If clicking the already selected type, do nothing
            return
        } else {
            // If different type selected, set to both
            newType = 'both'
        }

        onChange({ mediaType: newType, genres: [] })
    }

    const isMovieSelected = formData.mediaType === 'movie' || formData.mediaType === 'both'
    const isTVSelected = formData.mediaType === 'tv' || formData.mediaType === 'both'

    return (
        <div className="space-y-6">
            {/* Media Type Selection */}
            <div>
                <label className="block text-sm font-medium text-gray-200 mb-3">Media Type *</label>
                <div className="grid grid-cols-2 gap-3">
                    <button
                        type="button"
                        onClick={() => handleMediaTypeToggle('movie')}
                        className={`flex flex-col items-center justify-center gap-2 px-4 py-4 rounded-lg border-2 transition-all ${
                            isMovieSelected
                                ? 'border-red-600 bg-red-600/20 text-white'
                                : 'border-gray-700 bg-[#1a1a1a] text-gray-400 hover:border-gray-600'
                        }`}
                    >
                        <FilmIcon className="w-6 h-6" />
                        <span className="text-sm font-medium">Movies</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => handleMediaTypeToggle('tv')}
                        className={`flex flex-col items-center justify-center gap-2 px-4 py-4 rounded-lg border-2 transition-all ${
                            isTVSelected
                                ? 'border-red-600 bg-red-600/20 text-white'
                                : 'border-gray-700 bg-[#1a1a1a] text-gray-400 hover:border-gray-600'
                        }`}
                    >
                        <TvIcon className="w-6 h-6" />
                        <span className="text-sm font-medium">TV Shows</span>
                    </button>
                </div>
            </div>

            {/* Genres Selection */}
            <div>
                <label className="block text-sm font-medium text-gray-200 mb-3">
                    Genres * (Select 1-3)
                </label>
                <GenrePills
                    selectedGenres={formData.genres}
                    onChange={(genres) => onChange({ genres })}
                    mediaType={formData.mediaType}
                />
            </div>

            {/* Genre Matching - Always visible */}
            <div>
                <label className="block text-sm font-medium text-gray-200 mb-3">
                    Genre Matching
                </label>
                <div className="grid grid-cols-2 gap-3">
                    <button
                        type="button"
                        onClick={() => onChange({ genreLogic: 'AND' })}
                        disabled={formData.genres.length < 2}
                        className={`px-4 py-4 rounded-lg border-2 transition-all text-left ${
                            formData.genreLogic === 'AND'
                                ? 'border-red-600 bg-red-600/20 text-white'
                                : 'border-gray-700 bg-[#1a1a1a] text-gray-400 hover:border-gray-600'
                        } ${formData.genres.length < 2 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <div className="font-semibold mb-1">Match ALL</div>
                        <div className="text-xs opacity-80">
                            Content must have all selected genres
                        </div>
                    </button>
                    <button
                        type="button"
                        onClick={() => onChange({ genreLogic: 'OR' })}
                        disabled={formData.genres.length < 2}
                        className={`px-4 py-4 rounded-lg border-2 transition-all text-left ${
                            formData.genreLogic === 'OR'
                                ? 'border-red-600 bg-red-600/20 text-white'
                                : 'border-gray-700 bg-[#1a1a1a] text-gray-400 hover:border-gray-600'
                        } ${formData.genres.length < 2 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <div className="font-semibold mb-1">Match ANY</div>
                        <div className="text-xs opacity-80">Content with any selected genre</div>
                    </button>
                </div>
            </div>

            {/* Action Button */}
            <div className="flex justify-end pt-6">
                <button
                    type="button"
                    onClick={onNext}
                    disabled={!canProgress}
                    className="px-8 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                    Next →
                </button>
            </div>

            {/* Helper text */}
            {!canProgress && (
                <p className="text-sm text-gray-400 text-center">
                    Select at least one genre to continue
                </p>
            )}
        </div>
    )
}
