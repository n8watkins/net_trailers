'use client'

import React from 'react'
import { FilmIcon, TvIcon } from '@heroicons/react/24/outline'
import { GenrePills } from './GenrePills'
import { PremiumFeatureGate } from './PremiumFeatureGate'
import { CustomRowFormData } from '../../types/customRows'

interface WizardStep1BasicProps {
    formData: CustomRowFormData
    onChange: (updates: Partial<CustomRowFormData>) => void
    onQuickCreate: () => void
    onUseAdvanced: () => void
    canProgress: boolean
    isAuthenticated: boolean
    onSignIn: () => void
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
    onQuickCreate,
    onUseAdvanced,
    canProgress,
    isAuthenticated,
    onSignIn,
}: WizardStep1BasicProps) {
    return (
        <div className="space-y-6">
            {/* Media Type Selection */}
            <div>
                <label className="block text-sm font-medium text-gray-200 mb-3">Media Type *</label>
                <div className="grid grid-cols-3 gap-3">
                    <button
                        type="button"
                        onClick={() => onChange({ mediaType: 'movie', genres: [] })}
                        className={`flex flex-col items-center justify-center gap-2 px-4 py-4 rounded-lg border-2 transition-all ${
                            formData.mediaType === 'movie'
                                ? 'border-red-600 bg-red-600/20 text-white'
                                : 'border-gray-700 bg-[#1a1a1a] text-gray-400 hover:border-gray-600'
                        }`}
                    >
                        <FilmIcon className="w-6 h-6" />
                        <span className="text-sm font-medium">Movies</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => onChange({ mediaType: 'tv', genres: [] })}
                        className={`flex flex-col items-center justify-center gap-2 px-4 py-4 rounded-lg border-2 transition-all ${
                            formData.mediaType === 'tv'
                                ? 'border-red-600 bg-red-600/20 text-white'
                                : 'border-gray-700 bg-[#1a1a1a] text-gray-400 hover:border-gray-600'
                        }`}
                    >
                        <TvIcon className="w-6 h-6" />
                        <span className="text-sm font-medium">TV Shows</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => onChange({ mediaType: 'both', genres: [] })}
                        className={`flex flex-col items-center justify-center gap-2 px-4 py-4 rounded-lg border-2 transition-all ${
                            formData.mediaType === 'both'
                                ? 'border-red-600 bg-red-600/20 text-white'
                                : 'border-gray-700 bg-[#1a1a1a] text-gray-400 hover:border-gray-600'
                        }`}
                    >
                        <div className="flex gap-1">
                            <FilmIcon className="w-5 h-5" />
                            <TvIcon className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-medium">Both</span>
                    </button>
                </div>
            </div>

            {/* Genres Selection */}
            <div>
                <label className="block text-sm font-medium text-gray-200 mb-3">
                    Genres * (Select 1-5)
                </label>
                <GenrePills
                    selectedGenres={formData.genres}
                    onChange={(genres) => onChange({ genres })}
                    mediaType={formData.mediaType}
                />
            </div>

            {/* Genre Logic (only show if 2+ genres selected) */}
            {formData.genres.length > 1 && (
                <div>
                    <label className="block text-sm font-medium text-gray-200 mb-3">
                        Genre Matching
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => onChange({ genreLogic: 'AND' })}
                            className={`px-4 py-4 rounded-lg border-2 transition-all text-left ${
                                formData.genreLogic === 'AND'
                                    ? 'border-red-600 bg-red-600/20 text-white'
                                    : 'border-gray-700 bg-[#1a1a1a] text-gray-400 hover:border-gray-600'
                            }`}
                        >
                            <div className="font-semibold mb-1">Match ALL</div>
                            <div className="text-xs opacity-80">
                                Content must have all selected genres
                            </div>
                        </button>
                        <button
                            type="button"
                            onClick={() => onChange({ genreLogic: 'OR' })}
                            className={`px-4 py-4 rounded-lg border-2 transition-all text-left ${
                                formData.genreLogic === 'OR'
                                    ? 'border-red-600 bg-red-600/20 text-white'
                                    : 'border-gray-700 bg-[#1a1a1a] text-gray-400 hover:border-gray-600'
                            }`}
                        >
                            <div className="font-semibold mb-1">Match ANY</div>
                            <div className="text-xs opacity-80">
                                Content with any selected genre
                            </div>
                        </button>
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-6">
                <button
                    type="button"
                    onClick={onQuickCreate}
                    disabled={!canProgress}
                    className="flex-1 px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                    Quick Create →
                </button>

                {isAuthenticated ? (
                    <button
                        type="button"
                        onClick={onUseAdvanced}
                        disabled={!canProgress}
                        className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                        Use Advanced Features →
                    </button>
                ) : (
                    <div className="flex-1">
                        <PremiumFeatureGate
                            isLocked={true}
                            feature="advanced_filters"
                            onUnlockClick={onSignIn}
                            showBadge={false}
                        >
                            <button
                                type="button"
                                className="w-full px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                            >
                                Use Advanced Features →
                            </button>
                        </PremiumFeatureGate>
                    </div>
                )}
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
