'use client'

import React from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { Genre, MOVIE_GENRES, TV_GENRES } from '../../constants/genres'
import { CUSTOM_ROW_CONSTRAINTS } from '../../types/customRows'

interface GenreMultiSelectProps {
    selectedGenres: number[]
    onChange: (genres: number[]) => void
    mediaType: 'movie' | 'tv' | 'both'
    maxGenres?: number
}

/**
 * GenreMultiSelect Component
 *
 * Allows users to select multiple genres for custom rows.
 * Displays selected genres as chips that can be removed.
 * Enforces max genre limit from constraints.
 * For "both" media type, shows genres that exist in both movies and TV.
 */
export function GenreMultiSelect({
    selectedGenres,
    onChange,
    mediaType,
    maxGenres = CUSTOM_ROW_CONSTRAINTS.MAX_GENRES_PER_ROW,
}: GenreMultiSelectProps) {
    // For "both", use genres that exist in both movie and TV genre lists
    const availableGenres =
        mediaType === 'both'
            ? MOVIE_GENRES.filter((mg) => TV_GENRES.some((tg) => tg.id === mg.id))
            : mediaType === 'movie'
              ? MOVIE_GENRES
              : TV_GENRES

    // Filter out already selected genres
    const unselectedGenres = availableGenres.filter((g) => !selectedGenres.includes(g.id))

    const handleAddGenre = (genreId: number) => {
        if (selectedGenres.length < maxGenres) {
            onChange([...selectedGenres, genreId])
        }
    }

    const handleRemoveGenre = (genreId: number) => {
        onChange(selectedGenres.filter((id) => id !== genreId))
    }

    const getGenreName = (genreId: number): string => {
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
                                handleAddGenre(parseInt(e.target.value))
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
