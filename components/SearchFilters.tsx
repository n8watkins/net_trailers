import React, { useCallback } from 'react'
import { useAppStore, SearchFilters as SearchFiltersType } from '../stores/appStore'
import { ChevronDownIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface SearchFiltersProps {
    className?: string
    isOpen?: boolean
    onClose?: () => void
}

export default function SearchFilters({ className = '', isOpen, onClose }: SearchFiltersProps) {
    const { search, setSearchFilters } = useAppStore()

    const updateFilter = useCallback(
        (key: keyof SearchFiltersType, value: any) => {
            setSearchFilters({
                ...search.filters,
                [key]: value,
            })
        },
        [search.filters, setSearchFilters]
    )

    const clearAllFilters = () => {
        setSearchFilters({
            contentType: 'all',
            rating: 'all',
            year: 'all',
            sortBy: 'popularity.desc',
        })
    }

    const removeFilter = useCallback(
        (filterKey: keyof SearchFiltersType) => {
            if (filterKey === 'sortBy') {
                updateFilter(filterKey, 'popularity.desc')
            } else {
                updateFilter(filterKey, 'all')
            }
        },
        [updateFilter]
    )

    const hasActiveFilters = Object.entries(search.filters).some(([key, value]) => {
        if (key === 'sortBy') return value !== 'popularity.desc'
        return value !== 'all'
    })

    const FilterDropdown = React.memo(function FilterDropdown({
        label,
        value,
        onChange,
        options,
        isActive,
    }: {
        label: string
        value: string
        onChange: (value: string) => void
        options: { value: string; label: string }[]
        isActive?: boolean
    }) {
        const handleChange = useCallback(
            (e: React.ChangeEvent<HTMLSelectElement>) => {
                e.preventDefault()
                onChange(e.target.value)
            },
            [onChange]
        )

        return (
            <div className="relative">
                <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
                <div className="relative">
                    <select
                        value={value}
                        onChange={handleChange}
                        className={`appearance-none bg-gray-800 text-white rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors min-w-[120px] ${
                            isActive
                                ? 'border-2 border-red-500 hover:border-red-400'
                                : 'border border-gray-600 hover:border-gray-500'
                        }`}
                    >
                        {options.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    <ChevronDownIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
            </div>
        )
    })

    const contentTypeOptions = [
        { value: 'all', label: 'All Content' },
        { value: 'movie', label: 'Movies' },
        { value: 'tv', label: 'TV Shows' },
    ]

    const ratingOptions = [
        { value: 'all', label: 'All Ratings' },
        { value: '7.0+', label: '7.0+ ⭐' },
        { value: '8.0+', label: '8.0+ ⭐' },
        { value: '9.0+', label: '9.0+ ⭐' },
    ]

    const yearOptions = [
        { value: 'all', label: 'All Years' },
        { value: '2020s', label: '2020s' },
        { value: '2010s', label: '2010s' },
        { value: '2000s', label: '2000s' },
        { value: '1990s', label: '1990s' },
    ]

    const sortOptions = [
        { value: 'popularity.desc', label: 'Most Popular' },
        { value: 'revenue.desc', label: 'Highest Revenue' },
        { value: 'vote_average.desc', label: 'Most Voted' },
    ]

    return (
        <div className={`${className}`}>
            <div className="flex flex-col space-y-4 lg:flex-row lg:space-y-0 lg:space-x-6 lg:items-end">
                <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-4 sm:space-y-0">
                    <FilterDropdown
                        label="Content Type"
                        value={search.filters.contentType}
                        onChange={(value) => updateFilter('contentType', value)}
                        options={contentTypeOptions}
                        isActive={search.filters.contentType !== 'all'}
                    />

                    <FilterDropdown
                        label="Rating"
                        value={search.filters.rating}
                        onChange={(value) => updateFilter('rating', value)}
                        options={ratingOptions}
                        isActive={search.filters.rating !== 'all'}
                    />

                    <FilterDropdown
                        label="Year"
                        value={search.filters.year}
                        onChange={(value) => updateFilter('year', value)}
                        options={yearOptions}
                        isActive={search.filters.year !== 'all'}
                    />

                    <FilterDropdown
                        label="Sort By"
                        value={search.filters.sortBy}
                        onChange={(value) => updateFilter('sortBy', value)}
                        options={sortOptions}
                        isActive={search.filters.sortBy !== 'popularity.desc'}
                    />
                </div>

                {hasActiveFilters && (
                    <button
                        onClick={clearAllFilters}
                        className="self-start lg:self-end px-4 py-2 text-sm text-red-400 hover:text-red-300 border border-red-600 hover:border-red-500 rounded-lg transition-colors"
                    >
                        Clear Filters
                    </button>
                )}
            </div>

            {hasActiveFilters && (
                <div className="mt-4 flex flex-wrap gap-2">
                    {search.filters.contentType !== 'all' && (
                        <button
                            onClick={() => removeFilter('contentType')}
                            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer group"
                            title="Click to remove Content Type filter"
                        >
                            <span>
                                {
                                    contentTypeOptions.find(
                                        (opt) => opt.value === search.filters.contentType
                                    )?.label
                                }
                            </span>
                            <XMarkIcon className="ml-1 w-3 h-3 group-hover:text-gray-200" />
                        </button>
                    )}
                    {search.filters.rating !== 'all' && (
                        <button
                            onClick={() => removeFilter('rating')}
                            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-600 hover:bg-yellow-700 text-white transition-colors cursor-pointer group"
                            title="Click to remove Rating filter"
                        >
                            <span>
                                {
                                    ratingOptions.find((opt) => opt.value === search.filters.rating)
                                        ?.label
                                }
                            </span>
                            <XMarkIcon className="ml-1 w-3 h-3 group-hover:text-gray-200" />
                        </button>
                    )}
                    {search.filters.year !== 'all' && (
                        <button
                            onClick={() => removeFilter('year')}
                            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-600 hover:bg-green-700 text-white transition-colors cursor-pointer group"
                            title="Click to remove Year filter"
                        >
                            <span>
                                {
                                    yearOptions.find((opt) => opt.value === search.filters.year)
                                        ?.label
                                }
                            </span>
                            <XMarkIcon className="ml-1 w-3 h-3 group-hover:text-gray-200" />
                        </button>
                    )}
                    {search.filters.sortBy !== 'popularity.desc' && (
                        <button
                            onClick={() => removeFilter('sortBy')}
                            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-600 hover:bg-orange-700 text-white transition-colors cursor-pointer group"
                            title="Click to remove Sort filter"
                        >
                            <span>
                                {
                                    sortOptions.find((opt) => opt.value === search.filters.sortBy)
                                        ?.label
                                }
                            </span>
                            <XMarkIcon className="ml-1 w-3 h-3 group-hover:text-gray-200" />
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}
