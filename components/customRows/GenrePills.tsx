'use client'

import React from 'react'
import { CheckIcon } from '@heroicons/react/24/solid'
import { getUnifiedGenresByMediaType } from '../../constants/unifiedGenres'
import { CUSTOM_ROW_CONSTRAINTS } from '../../types/customRows'

interface GenrePillsProps {
    selectedGenres: string[] // Array order = priority: index 0 = priority 1, index 1 = priority 2, etc.
    onChange: (genres: string[]) => void
    mediaType: 'movie' | 'tv' | 'both'
    maxGenres?: number
    childSafeMode?: boolean
}

/**
 * GenrePills Component
 *
 * Displays unified genres as clickable pills with priority numbering.
 * Click order determines priority (1 = most important, 3 = least important).
 * Array order is preserved - index 0 = priority 1, index 1 = priority 2, etc.
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
        // Special handling for "All Genres"
        if (genreId === 'all') {
            // Selecting "All Genres" clears all other selections
            onChange([])
            return
        }

        const isSelected = selectedGenres.includes(genreId)

        if (isSelected) {
            // Remove genre and maintain order (all higher priorities shift down)
            onChange(selectedGenres.filter((id) => id !== genreId))
        } else {
            // Add genre to end (max 3 for prioritization)
            if (selectedGenres.length < maxGenres) {
                onChange([...selectedGenres, genreId])
            }
        }
    }

    const getGenrePriority = (genreId: string): number | null => {
        const index = selectedGenres.indexOf(genreId)
        return index >= 0 ? index + 1 : null // 1-based priority
    }

    const getPriorityBadgeStyle = (priority: number) => {
        // Visual hierarchy: Priority 1 = gold, 2 = silver, 3 = bronze
        if (priority === 1) {
            return {
                size: 'w-5 h-5 text-xs',
                color: 'bg-yellow-500',
                textColor: 'text-gray-900',
                ring: 'ring-2 ring-yellow-400',
            }
        } else if (priority === 2) {
            return {
                size: 'w-5 h-5 text-xs',
                color: 'bg-gray-300',
                textColor: 'text-gray-900',
                ring: 'ring-2 ring-gray-200',
            }
        } else {
            return {
                size: 'w-5 h-5 text-xs',
                color: 'bg-orange-600',
                textColor: 'text-white',
                ring: 'ring-2 ring-orange-500',
            }
        }
    }

    const atMaxGenres = selectedGenres.length >= maxGenres
    const isAllGenresSelected = selectedGenres.length === 0

    return (
        <div className="space-y-3">
            {/* Genre Pills Grid */}
            <div className="flex flex-wrap gap-2">
                {/* All Genres Option - only show as selected when no genres are selected */}
                <button
                    type="button"
                    onClick={() => handleToggleGenre('all')}
                    className={`relative px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        isAllGenresSelected
                            ? 'bg-red-600 text-white border-2 border-red-600 hover:bg-red-700 hover:border-red-700'
                            : 'bg-gray-800 text-gray-300 border-2 border-gray-700 hover:border-gray-600 hover:bg-gray-750'
                    }`}
                >
                    <span className="flex items-center gap-1.5">
                        {isAllGenresSelected && <CheckIcon className="w-4 h-4" />}
                        All Genres
                    </span>
                </button>

                {/* Regular Genre Pills */}
                {availableGenres.map((genre) => {
                    const priority = getGenrePriority(genre.id)
                    const isSelected = priority !== null
                    const isDisabled = !isSelected && atMaxGenres
                    const badgeStyle = priority ? getPriorityBadgeStyle(priority) : null

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
                            {/* Priority badge in top-right corner */}
                            {isSelected && badgeStyle && (
                                <span
                                    className={`absolute -top-1 -right-1 ${badgeStyle.size} ${badgeStyle.color} ${badgeStyle.textColor} ${badgeStyle.ring} rounded-full flex items-center justify-center font-bold shadow-lg`}
                                >
                                    {priority}
                                </span>
                            )}
                            <span>{genre.name}</span>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
