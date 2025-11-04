'use client'

import React, { useState } from 'react'
import {
    ChevronDownIcon,
    ChevronUpIcon,
    SparklesIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline'
import { AdvancedFilters } from '../../types/customRows'

interface AdvancedFiltersSectionProps {
    filters: AdvancedFilters
    onChange: (filters: AdvancedFilters) => void
}

// Popularity scale mapping (user-friendly labels -> TMDB values)
const POPULARITY_SCALE = [
    { label: 'Any', value: 0 },
    { label: 'Low', value: 10 },
    { label: 'Medium', value: 50 },
    { label: 'High', value: 100 },
    { label: 'Very High', value: 200 },
]

// Vote count scale mapping (user-friendly labels -> actual counts)
// Based on research: Starship Troopers (cult classic) has ~5,227 votes
const VOTE_COUNT_SCALE = [
    { label: 'Any', value: 0 },
    { label: 'Few (100+)', value: 100 },
    { label: 'Some (1K+)', value: 1000 },
    { label: 'Many (5K+)', value: 5000 }, // Good for cult classics
    { label: 'Tons (10K+)', value: 10000 },
]

/**
 * AdvancedFiltersSection Component
 *
 * Accordion-style advanced filtering with smooth animations.
 * Features sliders for ratings/popularity, and inputs for cast/directors.
 */
export function AdvancedFiltersSection({ filters, onChange }: AdvancedFiltersSectionProps) {
    const [isExpanded, setIsExpanded] = useState(false)
    const [castInput, setCastInput] = useState('')

    const currentYear = new Date().getFullYear()

    const updateFilter = (key: keyof AdvancedFilters, value: any) => {
        onChange({
            ...filters,
            [key]: value,
        })
    }

    const hasActiveFilters =
        filters.yearMin ||
        filters.yearMax ||
        filters.ratingMin !== undefined ||
        filters.ratingMax !== undefined ||
        filters.popularity !== undefined ||
        filters.voteCount !== undefined ||
        (filters.withCast && filters.withCast.length > 0) ||
        filters.withDirector

    const clearAllFilters = () => {
        onChange({})
    }

    // Add cast member
    const addCast = () => {
        if (!castInput.trim()) return
        const currentCast = filters.withCast || []
        updateFilter('withCast', [...currentCast, castInput.trim()])
        setCastInput('')
    }

    // Remove cast member
    const removeCast = (index: number) => {
        const currentCast = filters.withCast || []
        updateFilter(
            'withCast',
            currentCast.filter((_, i) => i !== index)
        )
    }

    return (
        <div className="border border-gray-700 rounded-lg overflow-hidden">
            {/* Header */}
            <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-4 bg-gray-800/50 hover:bg-gray-800 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5 text-red-400" />
                    <span className="font-medium text-white">Advanced Filters</span>
                    {hasActiveFilters && (
                        <span className="px-2 py-0.5 bg-red-600/20 text-red-400 text-xs rounded-full">
                            Active
                        </span>
                    )}
                </div>
                {isExpanded ? (
                    <ChevronUpIcon className="w-5 h-5 text-gray-400" />
                ) : (
                    <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                )}
            </button>

            {/* Content with Accordion Animation */}
            <div
                className={`
                    grid transition-all duration-300 ease-in-out
                    ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}
                `}
            >
                <div className="overflow-hidden">
                    <div className="p-6 space-y-6 bg-[#1a1a1a]">
                        {/* Year Range */}
                        <div>
                            <label className="block text-sm font-medium text-gray-200 mb-3">
                                Release Year
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-gray-400 mb-1.5 block">
                                        From
                                    </label>
                                    <input
                                        type="number"
                                        min="1900"
                                        max={currentYear}
                                        placeholder="1990"
                                        value={filters.yearMin || ''}
                                        onChange={(e) =>
                                            updateFilter(
                                                'yearMin',
                                                e.target.value
                                                    ? parseInt(e.target.value)
                                                    : undefined
                                            )
                                        }
                                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 mb-1.5 block">To</label>
                                    <input
                                        type="number"
                                        min="1900"
                                        max={currentYear}
                                        placeholder={currentYear.toString()}
                                        value={filters.yearMax || ''}
                                        onChange={(e) =>
                                            updateFilter(
                                                'yearMax',
                                                e.target.value
                                                    ? parseInt(e.target.value)
                                                    : undefined
                                            )
                                        }
                                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Rating Range (Sliders) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-200 mb-3">
                                Rating Range
                            </label>
                            <div className="space-y-4">
                                {/* Min Rating Slider */}
                                <div>
                                    <div className="flex justify-between text-xs text-gray-400 mb-2">
                                        <span>Minimum</span>
                                        <span className="text-red-400 font-medium">
                                            {filters.ratingMin !== undefined
                                                ? `${filters.ratingMin}/10`
                                                : 'Any'}
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="10"
                                        step="1"
                                        value={filters.ratingMin ?? 0}
                                        onChange={(e) =>
                                            updateFilter(
                                                'ratingMin',
                                                parseInt(e.target.value) || undefined
                                            )
                                        }
                                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-600 [&::-webkit-slider-thumb]:cursor-pointer"
                                    />
                                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                                        <span>0</span>
                                        <span>10</span>
                                    </div>
                                </div>

                                {/* Max Rating Slider */}
                                <div>
                                    <div className="flex justify-between text-xs text-gray-400 mb-2">
                                        <span>Maximum</span>
                                        <span className="text-red-400 font-medium">
                                            {filters.ratingMax !== undefined
                                                ? `${filters.ratingMax}/10`
                                                : 'Any'}
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="10"
                                        step="1"
                                        value={filters.ratingMax ?? 10}
                                        onChange={(e) =>
                                            updateFilter(
                                                'ratingMax',
                                                parseInt(e.target.value) || undefined
                                            )
                                        }
                                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-600 [&::-webkit-slider-thumb]:cursor-pointer"
                                    />
                                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                                        <span>0</span>
                                        <span>10</span>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                    💡 Tip: 2-5 rating for "so bad they're good" movies
                                </p>
                            </div>
                        </div>

                        {/* Popularity Slider */}
                        <div>
                            <div className="flex justify-between text-sm font-medium text-gray-200 mb-3">
                                <span>Popularity</span>
                                <span className="text-red-400">
                                    {POPULARITY_SCALE[filters.popularity ?? 0]?.label}
                                </span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="4"
                                step="1"
                                value={filters.popularity ?? 0}
                                onChange={(e) =>
                                    updateFilter('popularity', parseInt(e.target.value))
                                }
                                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-600 [&::-webkit-slider-thumb]:cursor-pointer"
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-2">
                                {POPULARITY_SCALE.map((scale, idx) => (
                                    <span key={idx}>{scale.label}</span>
                                ))}
                            </div>
                        </div>

                        {/* Vote Count Slider */}
                        <div>
                            <div className="flex justify-between text-sm font-medium text-gray-200 mb-3">
                                <span>Vote Count</span>
                                <span className="text-red-400">
                                    {VOTE_COUNT_SCALE[filters.voteCount ?? 0]?.label}
                                </span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="4"
                                step="1"
                                value={filters.voteCount ?? 3} // Default to "Many (5K+)" - good for cult classics
                                onChange={(e) =>
                                    updateFilter('voteCount', parseInt(e.target.value))
                                }
                                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-600 [&::-webkit-slider-thumb]:cursor-pointer"
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-2">
                                <span>Any</span>
                                <span>Tons</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                Default "Many (5K+)" is great for cult classics like Starship
                                Troopers
                            </p>
                        </div>

                        {/* Cast Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-200 mb-3">
                                With Actors
                            </label>
                            <div className="flex gap-2 mb-2">
                                <input
                                    type="text"
                                    placeholder="e.g., Tom Hanks"
                                    value={castInput}
                                    onChange={(e) => setCastInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault()
                                            addCast()
                                        }
                                    }}
                                    className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                                />
                                <button
                                    type="button"
                                    onClick={addCast}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                >
                                    Add
                                </button>
                            </div>
                            {filters.withCast && filters.withCast.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {filters.withCast.map((actor, idx) => (
                                        <span
                                            key={idx}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 text-red-400 rounded-full text-sm"
                                        >
                                            {actor}
                                            <button
                                                type="button"
                                                onClick={() => removeCast(idx)}
                                                className="hover:text-red-300"
                                            >
                                                <XMarkIcon className="w-4 h-4" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Director Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-200 mb-3">
                                Director
                            </label>
                            <input
                                type="text"
                                placeholder="e.g., Christopher Nolan"
                                value={filters.withDirector || ''}
                                onChange={(e) =>
                                    updateFilter('withDirector', e.target.value || undefined)
                                }
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                            />
                        </div>

                        {/* Clear Filters Button */}
                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={clearAllFilters}
                                className="w-full px-4 py-2.5 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
                            >
                                Clear All Filters
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
