import React, { useState, useRef, useEffect } from 'react'
import { XMarkIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import { useAppStore } from '../stores/appStore'
import type { SearchFilters } from '../stores/appStore'

interface SearchFiltersDropdownProps {
    isOpen: boolean
    onClose: () => void
}

export default function SearchFiltersDropdown({ isOpen, onClose }: SearchFiltersDropdownProps) {
    const searchFilters = useAppStore((state) => state.search.filters)
    const setSearch = useAppStore((state) => state.setSearch)
    const [localFilters, setLocalFilters] = useState<SearchFilters>(searchFilters)
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        setLocalFilters(searchFilters)
    }, [searchFilters])

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                onClose()
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
            return () => document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen, onClose])

    const updateFilter = (key: keyof SearchFilters, value: string) => {
        setLocalFilters((prev) => ({ ...prev, [key]: value }))
    }

    const applyFilters = () => {
        setSearch((prev) => ({
            ...prev,
            filters: localFilters,
            hasAllResults: false,
            isLoadingAll: false,
        }))
        onClose()
    }

    const resetFilters = () => {
        const defaultFilters: SearchFilters = {
            contentType: 'all',
            rating: 'all',
            year: 'all',
            sortBy: 'popularity.desc',
            genres: [],
            releaseYear: 'all',
        }
        setLocalFilters(defaultFilters)
        setSearch((prev) => ({
            ...prev,
            filters: defaultFilters,
            hasAllResults: false,
            isLoadingAll: false,
        }))
        onClose()
    }

    if (!isOpen) return null

    return (
        <div className="absolute top-full right-0 mt-2 w-96 bg-[#181818] border border-gray-600/50 rounded-lg shadow-2xl z-[110] overflow-hidden">
            <div ref={dropdownRef}>
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-600/50">
                    <h3 className="text-white font-semibold text-lg">Search Filters</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-full hover:bg-red-900/20"
                    >
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Content Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-3">
                            Content Type
                        </label>
                        <div className="flex bg-[#0a0a0a] border border-gray-600/30 rounded-lg p-1">
                            {(['all', 'movie', 'tv'] as const).map((type) => (
                                <button
                                    key={type}
                                    onClick={() => updateFilter('contentType', type)}
                                    className={`flex-1 px-3 py-2 text-sm rounded-md transition-all duration-200 ${
                                        localFilters.contentType === type
                                            ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                                            : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                                    }`}
                                >
                                    {type === 'all' ? 'All' : type === 'movie' ? 'Movies' : 'TV'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Rating */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-3">
                            Rating
                        </label>
                        <div className="relative">
                            <select
                                value={localFilters.rating}
                                onChange={(e) => updateFilter('rating', e.target.value)}
                                className={`w-full bg-[#0a0a0a] text-white rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none appearance-none transition-all duration-200 ${
                                    localFilters.rating !== 'all'
                                        ? 'border-[0.5px] border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)] hover:shadow-[0_0_12px_rgba(239,68,68,0.5)] focus:shadow-[0_0_12px_rgba(239,68,68,0.5)]'
                                        : 'border border-gray-600/50 focus:ring-2 focus:ring-red-500 focus:border-red-500'
                                }`}
                            >
                                <option value="all">All Ratings</option>
                                <option value="7.0+">7.0+ ⭐</option>
                                <option value="8.0+">8.0+ ⭐</option>
                                <option value="9.0+">9.0+ ⭐</option>
                            </select>
                            <ChevronDownIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* Year and Sort By */}
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-3">
                                Year
                            </label>
                            <div className="relative">
                                <select
                                    value={localFilters.year}
                                    onChange={(e) => updateFilter('year', e.target.value)}
                                    className={`w-full bg-[#0a0a0a] text-white rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none appearance-none transition-all duration-200 ${
                                        localFilters.year !== 'all'
                                            ? 'border-[0.5px] border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)] hover:shadow-[0_0_12px_rgba(239,68,68,0.5)] focus:shadow-[0_0_12px_rgba(239,68,68,0.5)]'
                                            : 'border border-gray-600/50 focus:ring-2 focus:ring-red-500 focus:border-red-500'
                                    }`}
                                >
                                    <option value="all">All Years</option>
                                    <option value="2020s">2020s</option>
                                    <option value="2010s">2010s</option>
                                    <option value="2000s">2000s</option>
                                    <option value="1990s">1990s</option>
                                </select>
                                <ChevronDownIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-3">
                                Sort By
                            </label>
                            <div className="relative">
                                <select
                                    value={localFilters.sortBy}
                                    onChange={(e) => updateFilter('sortBy', e.target.value)}
                                    className={`w-full bg-[#0a0a0a] text-white rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none appearance-none transition-all duration-200 ${
                                        localFilters.sortBy !== 'popularity.desc'
                                            ? 'border-[0.5px] border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)] hover:shadow-[0_0_12px_rgba(239,68,68,0.5)] focus:shadow-[0_0_12px_rgba(239,68,68,0.5)]'
                                            : 'border border-gray-600/50 focus:ring-2 focus:ring-red-500 focus:border-red-500'
                                    }`}
                                >
                                    <option value="popularity.desc">Most Popular</option>
                                    <option value="revenue.desc">Highest Revenue</option>
                                    <option value="vote_average.desc">Most Voted</option>
                                </select>
                                <ChevronDownIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 p-6 border-t border-gray-600/50">
                    <button
                        onClick={resetFilters}
                        className="flex-1 px-4 py-2.5 text-sm bg-gray-700 text-gray-300 hover:bg-gray-600 rounded-lg transition-all duration-200 font-medium border border-transparent hover:border-gray-500/50"
                    >
                        Reset Filters
                    </button>
                    <button
                        onClick={applyFilters}
                        className="flex-1 px-4 py-2.5 text-sm bg-red-600 text-white hover:bg-red-700 rounded-lg transition-all duration-200 font-medium shadow-lg hover:shadow-xl hover:shadow-red-600/30"
                    >
                        Apply Filters
                    </button>
                </div>
            </div>
        </div>
    )
}
