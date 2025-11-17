'use client'

import React from 'react'
import { CheckIcon } from '@heroicons/react/24/solid'
import { getUnifiedGenresByMediaType } from '../../constants/unifiedGenres'
import { CUSTOM_ROW_CONSTRAINTS } from '../../types/customRows'

interface GenrePillsProps {
    selectedGenres: string[] // Now uses unified genre IDs like 'action', 'fantasy'
    onChange: (genres: string[]) => void
    mediaType: 'movie' | 'tv' | 'both'
    maxGenres?: number
    childSafeMode?: boolean
}

/**
 * GenrePills Component
 *
 * Displays unified genres as clickable pills that can be selected/deselected.
 * Automatically maps to correct TMDB genre IDs behind the scenes.
 * More professional and visual than a dropdown.
 */
export function GenrePills({
    selectedGenres,
    onChange,
    mediaType,
    maxGenres = CUSTOM_ROW_CONSTRAINTS.MAX_GENRES_PER_ROW,
    childSafeMode = false,
}: GenrePillsProps) {
    // Get unified genres filtered by media type and child safety
    const availableGenres = getUnifiedGenresByMediaType(mediaType, childSafeMode)

    const handleToggleGenre = (genreId: string) => {
        if (selectedGenres.includes(genreId)) {
            // Remove genre
            onChange(selectedGenres.filter((id) => id !== genreId))
        } else {
            // Add genre if not at max
            if (selectedGenres.length < maxGenres) {
                onChange([...selectedGenres, genreId])
            }
        }
    }

    const isGenreSelected = (genreId: string) => selectedGenres.includes(genreId)
    const atMaxGenres = selectedGenres.length >= maxGenres

    return (
        <div className="space-y-3">
            {/* Genre Pills Grid */}
            <div className="flex flex-wrap gap-2">
                {availableGenres.map((genre) => {
                    const isSelected = isGenreSelected(genre.id)
                    const isDisabled = !isSelected && atMaxGenres

                    return (
                        <button
                            key={genre.id}
                            type="button"
                            onClick={() => handleToggleGenre(genre.id)}
                            disabled={isDisabled}
                            className={`
                                relative px-4 py-2 rounded-full text-sm font-medium transition-all
                                ${
                                    isSelected
                                        ? 'bg-red-600 text-white border-2 border-red-600 hover:bg-red-700 hover:border-red-700'
                                        : isDisabled
                                          ? 'bg-gray-800 text-gray-500 border-2 border-gray-700 cursor-not-allowed opacity-50'
                                          : 'bg-gray-800 text-gray-300 border-2 border-gray-700 hover:border-gray-600 hover:bg-gray-750'
                                }
                            `}
                        >
                            <span className="flex items-center gap-1.5">
                                {isSelected && <CheckIcon className="w-4 h-4" />}
                                {genre.name}
                            </span>
                        </button>
                    )
                })}
            </div>

            {/* Helper Text */}
            <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">
                    {selectedGenres.length === 0 ? (
                        <>Select at least {CUSTOM_ROW_CONSTRAINTS.MIN_GENRES_PER_ROW} genre</>
                    ) : (
                        <>
                            {selectedGenres.length} of {maxGenres} selected
                        </>
                    )}
                </span>
                {atMaxGenres && <span className="text-yellow-500">Maximum genres reached</span>}
            </div>
        </div>
    )
}
