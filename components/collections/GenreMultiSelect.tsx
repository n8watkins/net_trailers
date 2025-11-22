'use client'

import React from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { getUnifiedGenresByMediaType } from '../../constants/unifiedGenres'
import { CUSTOM_ROW_CONSTRAINTS } from '../../types/collections'

interface GenreMultiSelectProps {
    selectedGenres: string[] // Now uses unified genre IDs like 'action', 'fantasy'
    onChange: (genres: string[]) => void
    mediaType: 'movie' | 'tv' | 'both'
    maxGenres?: number
    childSafeMode?: boolean
}

/**
 * GenreMultiSelect Component
 *
 * Allows users to select multiple unified genres for custom rows.
 * Displays selected genres as chips that can be removed.
 * Automatically maps to correct TMDB genre IDs behind the scenes.
 * Enforces max genre limit from constraints.
 */
export function GenreMultiSelect({
    selectedGenres,
    onChange,
    mediaType,
    maxGenres = CUSTOM_ROW_CONSTRAINTS.MAX_GENRES_PER_ROW,
    childSafeMode = false,
}: GenreMultiSelectProps) {
    // Get unified genres filtered by media type and child safety
    const availableGenres = getUnifiedGenresByMediaType(mediaType, childSafeMode)

    // Filter out already selected genres
    const unselectedGenres = availableGenres.filter((g) => !selectedGenres.includes(g.id))

    const handleAddGenre = (genreId: string) => {
        if (selectedGenres.length < maxGenres) {
            onChange([...selectedGenres, genreId])
        }
    }

    const handleRemoveGenre = (genreId: string) => {
        onChange(selectedGenres.filter((id) => id !== genreId))
    }

    const getGenreName = (genreId: string): string => {
        return availableGenres.find((g) => g.id === genreId)?.name || 'Unknown'
    }

    const atMaxGenres = selectedGenres.length >= maxGenres

    return (
        <div className="space-y-3">
            {/* Selected Genres */}
            {selectedGenres.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {selectedGenres.map((genreId) => (
                        <button
                            key={genreId}
                            type="button"
                            onClick={() => handleRemoveGenre(genreId)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 text-red-400 rounded-full text-sm font-medium hover:bg-red-600/30 transition-colors"
                        >
                            <span>{getGenreName(genreId)}</span>
                            <XMarkIcon className="w-4 h-4" />
                        </button>
                    ))}
                </div>
            )}

            {/* Genre Selector */}
            {!atMaxGenres && unselectedGenres.length > 0 && (
                <div>
                    <select
                        value=""
                        onChange={(e) => {
                            if (e.target.value) {
                                handleAddGenre(e.target.value)
                                e.target.value = '' // Reset select
                            }
                        }}
                        className="w-full px-4 py-2 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600"
                    >
                        <option value="">
                            {selectedGenres.length === 0
                                ? 'Select genres...'
                                : `Add another genre (${selectedGenres.length}/${maxGenres})`}
                        </option>
                        {unselectedGenres.map((genre) => (
                            <option key={genre.id} value={genre.id}>
                                {genre.name}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {/* Max Genres Reached Message */}
            {atMaxGenres && (
                <p className="text-sm text-gray-400">
                    Maximum {maxGenres} genres selected. Remove one to add another.
                </p>
            )}

            {/* Minimum Genres Warning */}
            {selectedGenres.length === 0 && (
                <p className="text-sm text-gray-400">
                    Select at least {CUSTOM_ROW_CONSTRAINTS.MIN_GENRES_PER_ROW} genre to continue.
                </p>
            )}
        </div>
    )
}
