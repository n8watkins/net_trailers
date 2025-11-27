import React, { useRef, useEffect } from 'react'
import { XMarkIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import {
    FilmIcon,
    UserGroupIcon,
    VideoCameraIcon,
    PencilSquareIcon,
} from '@heroicons/react/24/solid'
import { useSearchStore } from '../../stores/searchStore'
import type { SearchFilters, DepartmentFilter } from '../../stores/searchStore'

interface SearchFiltersDropdownProps {
    isOpen: boolean
    onClose: () => void
    filterButtonRef?: React.RefObject<HTMLButtonElement | null>
}

export default function SearchFiltersDropdown({
    isOpen,
    onClose,
    filterButtonRef,
}: SearchFiltersDropdownProps) {
    const filters = useSearchStore((state) => state.filters)
    const searchMode = useSearchStore((state) => state.searchMode)
    const peopleFilters = useSearchStore((state) => state.peopleFilters)
    const setSearch = useSearchStore((state) => state.setSearch)
    const setSearchMode = useSearchStore((state) => state.setSearchMode)
    const setPeopleFilters = useSearchStore((state) => state.setPeopleFilters)
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node
            // Don't close if clicking inside the dropdown or on the filter button
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(target) &&
                !(filterButtonRef?.current && filterButtonRef.current.contains(target))
            ) {
                onClose()
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
            return () => document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen, onClose, filterButtonRef])

    // Immediately apply filter changes
    const updateFilter = (key: keyof SearchFilters, value: string) => {
        setSearch((prev) => ({
            ...prev,
            filters: { ...prev.filters, [key]: value },
            hasAllResults: false,
            isLoadingAll: false,
        }))
    }

    const updatePeopleFilter = (key: 'department', value: DepartmentFilter) => {
        setPeopleFilters({ [key]: value })
    }

    const handleModeChange = (mode: 'content' | 'people') => {
        if (mode !== searchMode) {
            setSearchMode(mode)
        }
    }

    if (!isOpen) return null

    return (
        <div className="absolute top-full right-0 mt-2 w-[90vw] sm:w-80 md:w-96 max-w-[384px] bg-[#181818] border border-gray-600/50 rounded-lg shadow-2xl z-[110] overflow-hidden">
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
                    {/* Search Mode Toggle */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-3">
                            Search For
                        </label>
                        <div className="flex bg-[#0a0a0a] border border-gray-600/30 rounded-lg p-1">
                            <button
                                onClick={() => handleModeChange('content')}
                                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-md transition-all duration-200 ${
                                    searchMode === 'content'
                                        ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                                        : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                                }`}
                            >
                                <FilmIcon className="w-4 h-4" />
                                Titles
                            </button>
                            <button
                                onClick={() => handleModeChange('people')}
                                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-md transition-all duration-200 ${
                                    searchMode === 'people'
                                        ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                                        : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                                }`}
                            >
                                <UserGroupIcon className="w-4 h-4" />
                                People
                            </button>
                        </div>
                    </div>

                    {/* Conditional Filters based on mode */}
                    {searchMode === 'content' ? (
                        <>
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
                                                filters.contentType === type
                                                    ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                                                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                                            }`}
                                        >
                                            {type === 'all'
                                                ? 'All'
                                                : type === 'movie'
                                                  ? 'Movies'
                                                  : 'TV'}
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
                                        value={filters.rating}
                                        onChange={(e) => updateFilter('rating', e.target.value)}
                                        className={`w-full bg-[#0a0a0a] text-white rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none appearance-none transition-all duration-200 border ${
                                            filters.rating !== 'all'
                                                ? 'border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)] hover:shadow-[0_0_12px_rgba(239,68,68,0.5)] focus:shadow-[0_0_12px_rgba(239,68,68,0.5)]'
                                                : 'border-gray-600/50 focus:ring-2 focus:ring-red-500 focus:border-red-500'
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
                                            value={filters.year}
                                            onChange={(e) => updateFilter('year', e.target.value)}
                                            className={`w-full bg-[#0a0a0a] text-white rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none appearance-none transition-all duration-200 border ${
                                                filters.year !== 'all'
                                                    ? 'border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)] hover:shadow-[0_0_12px_rgba(239,68,68,0.5)] focus:shadow-[0_0_12px_rgba(239,68,68,0.5)]'
                                                    : 'border-gray-600/50 focus:ring-2 focus:ring-red-500 focus:border-red-500'
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
                                            value={filters.sortBy}
                                            onChange={(e) => updateFilter('sortBy', e.target.value)}
                                            className={`w-full bg-[#0a0a0a] text-white rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none appearance-none transition-all duration-200 border ${
                                                filters.sortBy !== 'popularity.desc'
                                                    ? 'border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)] hover:shadow-[0_0_12px_rgba(239,68,68,0.5)] focus:shadow-[0_0_12px_rgba(239,68,68,0.5)]'
                                                    : 'border-gray-600/50 focus:ring-2 focus:ring-red-500 focus:border-red-500'
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
                        </>
                    ) : (
                        /* People Mode Filters */
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-3">
                                Department
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => updatePeopleFilter('department', 'all')}
                                    className={`flex items-center justify-center gap-2 px-3 py-2.5 text-sm rounded-lg transition-all duration-200 border ${
                                        peopleFilters.department === 'all'
                                            ? 'bg-red-600 text-white shadow-lg shadow-red-600/30 border-red-600'
                                            : 'bg-[#0a0a0a] text-gray-400 hover:text-white hover:bg-gray-700/50 border-gray-600/30'
                                    }`}
                                >
                                    <UserGroupIcon className="w-4 h-4" />
                                    All
                                </button>
                                <button
                                    onClick={() => updatePeopleFilter('department', 'acting')}
                                    className={`flex items-center justify-center gap-2 px-3 py-2.5 text-sm rounded-lg transition-all duration-200 border ${
                                        peopleFilters.department === 'acting'
                                            ? 'bg-red-600 text-white shadow-lg shadow-red-600/30 border-red-600'
                                            : 'bg-[#0a0a0a] text-gray-400 hover:text-white hover:bg-gray-700/50 border-gray-600/30'
                                    }`}
                                >
                                    <span className="text-base">🎭</span>
                                    Actors
                                </button>
                                <button
                                    onClick={() => updatePeopleFilter('department', 'directing')}
                                    className={`flex items-center justify-center gap-2 px-3 py-2.5 text-sm rounded-lg transition-all duration-200 border ${
                                        peopleFilters.department === 'directing'
                                            ? 'bg-red-600 text-white shadow-lg shadow-red-600/30 border-red-600'
                                            : 'bg-[#0a0a0a] text-gray-400 hover:text-white hover:bg-gray-700/50 border-gray-600/30'
                                    }`}
                                >
                                    <VideoCameraIcon className="w-4 h-4" />
                                    Directors
                                </button>
                                <button
                                    onClick={() => updatePeopleFilter('department', 'writing')}
                                    className={`flex items-center justify-center gap-2 px-3 py-2.5 text-sm rounded-lg transition-all duration-200 border ${
                                        peopleFilters.department === 'writing'
                                            ? 'bg-red-600 text-white shadow-lg shadow-red-600/30 border-red-600'
                                            : 'bg-[#0a0a0a] text-gray-400 hover:text-white hover:bg-gray-700/50 border-gray-600/30'
                                    }`}
                                >
                                    <PencilSquareIcon className="w-4 h-4" />
                                    Writers
                                </button>
                            </div>
                            <p className="mt-3 text-xs text-gray-500">
                                Search for actors, directors, or writers by name
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
