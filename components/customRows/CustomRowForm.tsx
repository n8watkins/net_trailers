'use client'

import React, { useState } from 'react'
import { GenreMultiSelect } from './GenreMultiSelect'
import { CustomRowFormData, CUSTOM_ROW_CONSTRAINTS, CustomRow } from '../../types/customRows'
import { FilmIcon, TvIcon } from '@heroicons/react/24/outline'

interface CustomRowFormProps {
    initialData?: CustomRow
    onSubmit: (data: CustomRowFormData) => Promise<void>
    onCancel: () => void
    isLoading?: boolean
}

/**
 * CustomRowForm Component
 *
 * Form for creating or editing custom rows.
 * Handles validation and provides user feedback.
 */
export function CustomRowForm({ initialData, onSubmit, onCancel, isLoading }: CustomRowFormProps) {
    const [formData, setFormData] = useState<CustomRowFormData>({
        name: initialData?.name || '',
        genres: initialData?.genres || [],
        genreLogic: initialData?.genreLogic || 'AND',
        mediaType: initialData?.mediaType || 'movie',
        enabled: initialData?.enabled ?? true,
    })

    const [errors, setErrors] = useState<Record<string, string>>({})

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {}

        // Name validation
        if (formData.name.length < CUSTOM_ROW_CONSTRAINTS.MIN_NAME_LENGTH) {
            newErrors.name = `Name must be at least ${CUSTOM_ROW_CONSTRAINTS.MIN_NAME_LENGTH} characters`
        }
        if (formData.name.length > CUSTOM_ROW_CONSTRAINTS.MAX_NAME_LENGTH) {
            newErrors.name = `Name must be at most ${CUSTOM_ROW_CONSTRAINTS.MAX_NAME_LENGTH} characters`
        }

        // Genres validation
        if (formData.genres.length < CUSTOM_ROW_CONSTRAINTS.MIN_GENRES_PER_ROW) {
            newErrors.genres = `Select at least ${CUSTOM_ROW_CONSTRAINTS.MIN_GENRES_PER_ROW} genre`
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!validate()) {
            return
        }

        try {
            await onSubmit(formData)
        } catch (error) {
            console.error('Form submission error:', error)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Row Name */}
            <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-200 mb-2">
                    Row Name *
                </label>
                <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Musical Anime, Action Comedies"
                    className="w-full px-4 py-2 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600"
                    maxLength={CUSTOM_ROW_CONSTRAINTS.MAX_NAME_LENGTH}
                />
                <div className="flex justify-between mt-1">
                    {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                    <p className="text-sm text-gray-400 ml-auto">
                        {formData.name.length}/{CUSTOM_ROW_CONSTRAINTS.MAX_NAME_LENGTH}
                    </p>
                </div>
            </div>

            {/* Media Type */}
            <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Media Type *</label>
                <div className="grid grid-cols-3 gap-3">
                    <button
                        type="button"
                        onClick={() => setFormData({ ...formData, mediaType: 'movie', genres: [] })}
                        className={`flex flex-col items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                            formData.mediaType === 'movie'
                                ? 'border-red-600 bg-red-600/20 text-white'
                                : 'border-gray-700 bg-[#1a1a1a] text-gray-400 hover:border-gray-600'
                        }`}
                    >
                        <FilmIcon className="w-5 h-5" />
                        <span className="text-sm">Movies</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setFormData({ ...formData, mediaType: 'tv', genres: [] })}
                        className={`flex flex-col items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                            formData.mediaType === 'tv'
                                ? 'border-red-600 bg-red-600/20 text-white'
                                : 'border-gray-700 bg-[#1a1a1a] text-gray-400 hover:border-gray-600'
                        }`}
                    >
                        <TvIcon className="w-5 h-5" />
                        <span className="text-sm">TV Shows</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setFormData({ ...formData, mediaType: 'both', genres: [] })}
                        className={`flex flex-col items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                            formData.mediaType === 'both'
                                ? 'border-red-600 bg-red-600/20 text-white'
                                : 'border-gray-700 bg-[#1a1a1a] text-gray-400 hover:border-gray-600'
                        }`}
                    >
                        <div className="flex gap-1">
                            <FilmIcon className="w-4 h-4" />
                            <TvIcon className="w-4 h-4" />
                        </div>
                        <span className="text-sm">Both</span>
                    </button>
                </div>
            </div>

            {/* Genres */}
            <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                    Genres * (1-{CUSTOM_ROW_CONSTRAINTS.MAX_GENRES_PER_ROW})
                </label>
                <GenreMultiSelect
                    selectedGenres={formData.genres}
                    onChange={(genres) => setFormData({ ...formData, genres })}
                    mediaType={formData.mediaType}
                />
                {errors.genres && <p className="text-sm text-red-500 mt-1">{errors.genres}</p>}
            </div>

            {/* Genre Logic */}
            {formData.genres.length > 1 && (
                <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">
                        Genre Matching
                    </label>
                    <div className="flex gap-4">
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, genreLogic: 'AND' })}
                            className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                                formData.genreLogic === 'AND'
                                    ? 'border-red-600 bg-red-600/20 text-white'
                                    : 'border-gray-700 bg-[#1a1a1a] text-gray-400 hover:border-gray-600'
                            }`}
                        >
                            <div className="font-medium">Match ALL</div>
                            <div className="text-xs text-gray-400 mt-1">
                                Content must have all selected genres
                            </div>
                        </button>
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, genreLogic: 'OR' })}
                            className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                                formData.genreLogic === 'OR'
                                    ? 'border-red-600 bg-red-600/20 text-white'
                                    : 'border-gray-700 bg-[#1a1a1a] text-gray-400 hover:border-gray-600'
                            }`}
                        >
                            <div className="font-medium">Match ANY</div>
                            <div className="text-xs text-gray-400 mt-1">
                                Content with any selected genre
                            </div>
                        </button>
                    </div>
                </div>
            )}

            {/* Form Actions */}
            <div className="flex gap-3 pt-4">
                <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? 'Saving...' : initialData ? 'Update Row' : 'Create Row'}
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={isLoading}
                    className="flex-1 bg-gray-700 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Cancel
                </button>
            </div>
        </form>
    )
}
