import React, { useState, useRef, useEffect } from 'react'
import { XMarkIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import { useRecoilState } from 'recoil'
import { searchState, SearchFilters } from '../atoms/searchAtom'

interface Genre {
    id: number
    name: string
}

const movieGenres: Genre[] = [
    { id: 28, name: 'Action' },
    { id: 12, name: 'Adventure' },
    { id: 16, name: 'Animation' },
    { id: 35, name: 'Comedy' },
    { id: 80, name: 'Crime' },
    { id: 99, name: 'Documentary' },
    { id: 18, name: 'Drama' },
    { id: 10751, name: 'Family' },
    { id: 14, name: 'Fantasy' },
    { id: 36, name: 'History' },
    { id: 27, name: 'Horror' },
    { id: 10402, name: 'Music' },
    { id: 9648, name: 'Mystery' },
    { id: 10749, name: 'Romance' },
    { id: 878, name: 'Science Fiction' },
    { id: 10770, name: 'TV Movie' },
    { id: 53, name: 'Thriller' },
    { id: 10752, name: 'War' },
    { id: 37, name: 'Western' }
]

const tvGenres: Genre[] = [
    { id: 10759, name: 'Action & Adventure' },
    { id: 16, name: 'Animation' },
    { id: 35, name: 'Comedy' },
    { id: 80, name: 'Crime' },
    { id: 99, name: 'Documentary' },
    { id: 18, name: 'Drama' },
    { id: 10751, name: 'Family' },
    { id: 10762, name: 'Kids' },
    { id: 9648, name: 'Mystery' },
    { id: 10763, name: 'News' },
    { id: 10764, name: 'Reality' },
    { id: 10765, name: 'Sci-Fi & Fantasy' },
    { id: 10766, name: 'Soap' },
    { id: 10767, name: 'Talk' },
    { id: 10768, name: 'War & Politics' },
    { id: 37, name: 'Western' }
]

const allGenres: Genre[] = [
    ...movieGenres,
    ...tvGenres.filter(tvGenre => !movieGenres.some(movieGenre => movieGenre.id === tvGenre.id))
].sort((a, b) => a.name.localeCompare(b.name))

interface SearchFiltersDropdownProps {
    isOpen: boolean
    onClose: () => void
}

export default function SearchFiltersDropdown({ isOpen, onClose }: SearchFiltersDropdownProps) {
    const [search, setSearch] = useRecoilState(searchState)
    const [localFilters, setLocalFilters] = useState<SearchFilters>(search.filters)
    const [minRating, setMinRating] = useState(4)
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        setLocalFilters(search.filters)
    }, [search.filters])

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

    const updateFilter = (key: keyof SearchFilters, value: any) => {
        setLocalFilters(prev => ({ ...prev, [key]: value }))
    }

    const applyFilters = () => {
        setSearch(prev => ({
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
        }
        setLocalFilters(defaultFilters)
        setMinRating(4)
        setSearch(prev => ({
            ...prev,
            filters: defaultFilters,
            hasAllResults: false,
            isLoadingAll: false,
        }))
        onClose()
    }

    const getAvailableGenres = () => {
        if (localFilters.contentType === 'movie') return movieGenres
        if (localFilters.contentType === 'tv') return tvGenres
        return allGenres
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
                        <label className="block text-sm font-medium text-gray-300 mb-3">Content Type</label>
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

                    {/* Release Year and Sort By */}
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-3">Release Year</label>
                            <div className="relative">
                                <select
                                    value={localFilters.year}
                                    onChange={(e) => updateFilter('year', e.target.value)}
                                    className="w-full bg-[#0a0a0a] border border-gray-600/50 text-white rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 appearance-none transition-all duration-200"
                                >
                                    <option value="all">All Years</option>
                                    <option value="2024">2024</option>
                                    <option value="2023">2023</option>
                                    <option value="2022">2022</option>
                                    <option value="2021">2021</option>
                                    <option value="2020">2020</option>
                                    <option value="2020s">2020-2029</option>
                                    <option value="2019">2019</option>
                                    <option value="2018">2018</option>
                                    <option value="2017">2017</option>
                                    <option value="2016">2016</option>
                                    <option value="2015">2015</option>
                                    <option value="2014">2014</option>
                                    <option value="2013">2013</option>
                                    <option value="2012">2012</option>
                                    <option value="2011">2011</option>
                                    <option value="2010">2010</option>
                                    <option value="2010s">2010-2019</option>
                                    <option value="2009">2009</option>
                                    <option value="2008">2008</option>
                                    <option value="2007">2007</option>
                                    <option value="2006">2006</option>
                                    <option value="2005">2005</option>
                                    <option value="2004">2004</option>
                                    <option value="2003">2003</option>
                                    <option value="2002">2002</option>
                                    <option value="2001">2001</option>
                                    <option value="2000">2000</option>
                                    <option value="2000s">2000-2009</option>
                                    <option value="1999">1999</option>
                                    <option value="1998">1998</option>
                                    <option value="1997">1997</option>
                                    <option value="1996">1996</option>
                                    <option value="1995">1995</option>
                                    <option value="1994">1994</option>
                                    <option value="1993">1993</option>
                                    <option value="1992">1992</option>
                                    <option value="1991">1991</option>
                                    <option value="1990">1990</option>
                                    <option value="1990s">1990-1999</option>
                                    <option value="1989">1989</option>
                                    <option value="1988">1988</option>
                                    <option value="1987">1987</option>
                                    <option value="1986">1986</option>
                                    <option value="1985">1985</option>
                                    <option value="1984">1984</option>
                                    <option value="1983">1983</option>
                                    <option value="1982">1982</option>
                                    <option value="1981">1981</option>
                                    <option value="1980">1980</option>
                                    <option value="1980s">1980-1989</option>
                                    <option value="1970s">1970-1979</option>
                                    <option value="1960s">1960-1969</option>
                                    <option value="1950s">1950-1959</option>
                                    <option value="1940s">1940-1949</option>
                                    <option value="1930s">1930-1939</option>
                                    <option value="1920s">1920-1929</option>
                                    <option value="1910s">1910-1919</option>
                                    <option value="1900s">1900-1909</option>
                                </select>
                                <ChevronDownIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-3">Sort By</label>
                            <div className="relative">
                                <select
                                    value={localFilters.sortBy}
                                    onChange={(e) => updateFilter('sortBy', e.target.value)}
                                    className="w-full bg-[#0a0a0a] border border-gray-600/50 text-white rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 appearance-none transition-all duration-200"
                                >
                                    <option value="popularity.desc">Most Popular</option>
                                    <option value="vote_average.desc">Highest Rated</option>
                                    <option value="release_date.desc">Newest First</option>
                                    <option value="release_date.asc">Oldest First</option>
                                    <option value="revenue.desc">Highest Revenue</option>
                                    <option value="vote_count.desc">Most Voted</option>
                                </select>
                                <ChevronDownIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {/* Minimum Rating */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-3">Minimum Rating</label>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm text-gray-400">
                                <span>Any</span>
                                <span className="text-white font-medium">{minRating}+</span>
                                <span>9+</span>
                            </div>
                            <div className="relative">
                                <input
                                    type="range"
                                    min="0"
                                    max="9"
                                    step="1"
                                    value={minRating}
                                    onChange={(e) => {
                                        const value = parseInt(e.target.value)
                                        setMinRating(value)
                                        updateFilter('rating', value === 0 ? 'all' : `${value}+`)
                                    }}
                                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                                    style={{
                                        background: `linear-gradient(to right, #dc2626 0%, #dc2626 ${(minRating / 9) * 100}%, #374151 ${(minRating / 9) * 100}%, #374151 100%)`
                                    }}
                                />
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