'use client'

import React from 'react'
import { CheckIcon } from '@heroicons/react/24/solid'
import { MOVIE_GENRES, TV_GENRES } from '../../constants/genres'
import { CUSTOM_ROW_CONSTRAINTS } from '../../types/customRows'

interface GenrePillsProps {
    selectedGenres: number[]
    onChange: (genres: number[]) => void
    mediaType: 'movie' | 'tv' | 'both'
    maxGenres?: number
}

/**
 * GenrePills Component
 *
 * Displays genres as clickable pills that can be selected/deselected.
 * More professional and visual than a dropdown.
 */
export function GenrePills({
    selectedGenres,
    onChange,
    mediaType,
    maxGenres = CUSTOM_ROW_CONSTRAINTS.MAX_GENRES_PER_ROW,
}: GenrePillsProps) {
    // For "both", use genres that exist in both movie and TV genre lists
    const availableGenres =
        mediaType === 'both'
            ? MOVIE_GENRES.filter((mg) => TV_GENRES.some((tg) => tg.id === mg.id))
            : mediaType === 'movie'
              ? MOVIE_GENRES
              : TV_GENRES

    const handleToggleGenre = (genreId: number) => {
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

    const isGenreSelected = (genreId: number) => selectedGenres.includes(genreId)
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
