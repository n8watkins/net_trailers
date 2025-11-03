'use client'

import React, { useState } from 'react'
import { ChevronDownIcon, ChevronUpIcon, SparklesIcon } from '@heroicons/react/24/outline'
import { AdvancedFilters } from '../../types/customRows'

interface AdvancedFiltersSectionProps {
    filters: AdvancedFilters
    onChange: (filters: AdvancedFilters) => void
}

/**
 * AdvancedFiltersSection Component
 *
 * Collapsible section for advanced filtering options.
 * Allows users to filter by year, rating, popularity, and vote count.
 * Perfect for finding "popular bad movies" and other niche collections.
 */
export function AdvancedFiltersSection({ filters, onChange }: AdvancedFiltersSectionProps) {
    const [isExpanded, setIsExpanded] = useState(false)

    const currentYear = new Date().getFullYear()

    const updateFilter = (key: keyof AdvancedFilters, value: number | undefined) => {
        onChange({
            ...filters,
            [key]: value,
        })
    }

    const hasActiveFilters =
        filters.yearMin ||
        filters.yearMax ||
        filters.ratingMin ||
        filters.ratingMax ||
        filters.popularityMin ||
        filters.voteCountMin

    // Preset filter combinations
    const applyPreset = (preset: 'bad_popular' | 'hidden_gems' | 'recent_hits' | 'classics') => {
        switch (preset) {
            case 'bad_popular':
                // Popular movies with low ratings (so bad they're good)
                onChange({
                    ratingMin: 2.0,
                    ratingMax: 5.5,
                    voteCountMin: 5000, // Ensure it's actually popular
                    popularityMin: 50,
                })
                break
            case 'hidden_gems':
                // High rated but not very popular
                onChange({
                    ratingMin: 7.5,
                    ratingMax: 10,
                    popularityMin: 1,
                    voteCountMin: 100,
                    voteCountMin: 500, // Not too many votes
                })
                break
            case 'recent_hits':
                // Recent popular movies
                onChange({
                    yearMin: currentYear - 3,
                    yearMax: currentYear,
                    ratingMin: 7.0,
                    popularityMin: 100,
                })
                break
            case 'classics':
                // Older highly-rated movies
                onChange({
                    yearMin: 1950,
                    yearMax: 2000,
                    ratingMin: 7.5,
                    voteCountMin: 1000,
                })
                break
        }
    }

    const clearAllFilters = () => {
        onChange({})
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
                    <SparklesIcon className="w-5 h-5 text-purple-400" />
                    <span className="font-medium text-white">Advanced Filters</span>
                    {hasActiveFilters && (
                        <span className="px-2 py-0.5 bg-purple-600/20 text-purple-400 text-xs rounded-full">
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

            {/* Content */}
            {isExpanded && (
                <div className="p-4 space-y-6 bg-[#1a1a1a]">
                    {/* Quick Presets */}
                    <div>
                        <label className="block text-sm font-medium text-gray-200 mb-2">
                            Quick Presets
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => applyPreset('bad_popular')}
                                className="px-3 py-2 bg-yellow-600/20 text-yellow-400 border border-yellow-600/30 rounded-lg text-sm hover:bg-yellow-600/30 transition-colors"
                            >
                                💀 Popular Bad Movies
                            </button>
                            <button
                                type="button"
                                onClick={() => applyPreset('hidden_gems')}
                                className="px-3 py-2 bg-blue-600/20 text-blue-400 border border-blue-600/30 rounded-lg text-sm hover:bg-blue-600/30 transition-colors"
                            >
                                💎 Hidden Gems
                            </button>
                            <button
                                type="button"
                                onClick={() => applyPreset('recent_hits')}
                                className="px-3 py-2 bg-green-600/20 text-green-400 border border-green-600/30 rounded-lg text-sm hover:bg-green-600/30 transition-colors"
                            >
                                🔥 Recent Hits
                            </button>
                            <button
                                type="button"
                                onClick={() => applyPreset('classics')}
                                className="px-3 py-2 bg-purple-600/20 text-purple-400 border border-purple-600/30 rounded-lg text-sm hover:bg-purple-600/30 transition-colors"
                            >
                                ⭐ Classics
                            </button>
                        </div>
                    </div>

                    {/* Year Range */}
                    <div>
                        <label className="block text-sm font-medium text-gray-200 mb-2">
                            Year Range
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">From</label>
                                <input
                                    type="number"
                                    min="1900"
                                    max={currentYear}
                                    placeholder="1990"
                                    value={filters.yearMin || ''}
                                    onChange={(e) =>
                                        updateFilter(
                                            'yearMin',
                                            e.target.value ? parseInt(e.target.value) : undefined
                                        )
                                    }
                                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">To</label>
                                <input
                                    type="number"
                                    min="1900"
                                    max={currentYear}
                                    placeholder={currentYear.toString()}
                                    value={filters.yearMax || ''}
                                    onChange={(e) =>
                                        updateFilter(
                                            'yearMax',
                                            e.target.value ? parseInt(e.target.value) : undefined
                                        )
                                    }
                                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Rating Range */}
                    <div>
                        <label className="block text-sm font-medium text-gray-200 mb-2">
                            Rating Range (0-10)
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">
                                    Min Rating
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="10"
                                    step="0.1"
                                    placeholder="0.0"
                                    value={filters.ratingMin || ''}
                                    onChange={(e) =>
                                        updateFilter(
                                            'ratingMin',
                                            e.target.value ? parseFloat(e.target.value) : undefined
                                        )
                                    }
                                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">
                                    Max Rating
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="10"
                                    step="0.1"
                                    placeholder="10.0"
                                    value={filters.ratingMax || ''}
                                    onChange={(e) =>
                                        updateFilter(
                                            'ratingMax',
                                            e.target.value ? parseFloat(e.target.value) : undefined
                                        )
                                    }
                                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600"
                                />
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            💡 Tip: Use 2.0-5.5 to find "so bad they're good" movies
                        </p>
                    </div>

                    {/* Popularity */}
                    <div>
                        <label className="block text-sm font-medium text-gray-200 mb-2">
                            Minimum Popularity
                        </label>
                        <input
                            type="number"
                            min="0"
                            step="10"
                            placeholder="e.g., 50"
                            value={filters.popularityMin || ''}
                            onChange={(e) =>
                                updateFilter(
                                    'popularityMin',
                                    e.target.value ? parseFloat(e.target.value) : undefined
                                )
                            }
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Higher values = more popular content
                        </p>
                    </div>

                    {/* Vote Count */}
                    <div>
                        <label className="block text-sm font-medium text-gray-200 mb-2">
                            Minimum Vote Count
                        </label>
                        <input
                            type="number"
                            min="0"
                            step="100"
                            placeholder="e.g., 1000"
                            value={filters.voteCountMin || ''}
                            onChange={(e) =>
                                updateFilter(
                                    'voteCountMin',
                                    e.target.value ? parseInt(e.target.value) : undefined
                                )
                            }
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Ensures content has enough ratings for credibility
                        </p>
                    </div>

                    {/* Clear Filters Button */}
                    {hasActiveFilters && (
                        <button
                            type="button"
                            onClick={clearAllFilters}
                            className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                        >
                            Clear All Filters
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}
