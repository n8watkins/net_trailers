import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
    ChevronDownIcon,
    FilmIcon,
    TvIcon,
    Squares2X2Icon,
    CheckIcon,
} from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'
import { getUnifiedGenresByMediaType, UnifiedGenre } from '../../constants/unifiedGenres'
import { useChildSafety } from '../../hooks/useChildSafety'

function GenresDropdown() {
    const [isOpen, setIsOpen] = useState(false)
    const [movieSelected, setMovieSelected] = useState(true)
    const [tvSelected, setTvSelected] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)
    const router = useRouter()
    const { isEnabled: childSafetyEnabled } = useChildSafety()

    // Determine the media type for API calls based on selections
    const mediaType: 'movie' | 'tv' | 'both' = useMemo(() => {
        if (movieSelected && tvSelected) return 'both'
        if (movieSelected) return 'movie'
        return 'tv'
    }, [movieSelected, tvSelected])

    // Toggle handlers that ensure at least one is always selected
    const toggleMovie = () => {
        if (movieSelected && !tvSelected) {
            // If movie is the only one selected, switch to TV instead
            setTvSelected(true)
            setMovieSelected(false)
        } else {
            setMovieSelected(!movieSelected)
        }
    }

    const toggleTv = () => {
        if (tvSelected && !movieSelected) {
            // If TV is the only one selected, switch to movie instead
            setMovieSelected(true)
            setTvSelected(false)
        } else {
            setTvSelected(!tvSelected)
        }
    }

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Handle clicking on a unified genre - translates to TMDB ID for the selected media type
    const handleGenreClick = (genre: UnifiedGenre) => {
        if (mediaType === 'both') {
            // For "both", we need to pass both movie and TV genre IDs
            const movieIds = genre.movieIds.join(',')
            const tvIds = genre.tvIds.join(',')
            router.push(
                `/genres/both/${movieIds}?tvGenres=${tvIds}&name=${encodeURIComponent(genre.name)}`
            )
        } else {
            // Get the primary TMDB ID for the selected media type
            const tmdbIds = mediaType === 'movie' ? genre.movieIds : genre.tvIds
            const primaryId = tmdbIds[0] // Use the first/primary ID
            router.push(`/genres/${mediaType}/${primaryId}?name=${encodeURIComponent(genre.name)}`)
        }
        setIsOpen(false)
    }

    const handleMouseEnter = () => {
        // Clear any pending close timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
        }
        // Add delay before opening dropdown
        timeoutRef.current = setTimeout(() => {
            setIsOpen(true)
        }, 300) // Delay before opening
    }

    const handleMouseLeave = () => {
        // Clear any pending open timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
        }
        // Add delay before closing dropdown
        timeoutRef.current = setTimeout(() => {
            setIsOpen(false)
        }, 300) // Delay before closing
    }

    // Get unified genres filtered by child safety mode
    // Unified genres provide consistent names across movie/tv while mapping to correct TMDB IDs
    const currentGenres = useMemo(() => {
        const genres = getUnifiedGenresByMediaType(mediaType, childSafetyEnabled)
        // Sort alphabetically by name for consistent display
        return [...genres].sort((a, b) => a.name.localeCompare(b.name))
    }, [mediaType, childSafetyEnabled])

    return (
        <div
            className="relative"
            ref={dropdownRef}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <button
                className="headerLink cursor-pointer flex items-center space-x-1 hover:text-white transition-colors select-none"
                onClick={() => setIsOpen(!isOpen)}
            >
                <Squares2X2Icon className="h-5 w-5" />
                <span>Genres</span>
                <ChevronDownIcon
                    className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-[85vw] sm:w-72 md:w-80 max-w-[320px] bg-[#0f0f0f]/95 backdrop-blur-sm border border-red-500/40 rounded-lg shadow-xl shadow-red-500/20 z-[110] max-h-96 overflow-hidden animate-dropdown-enter">
                    {/* Type Selector - Toggle style with checkboxes */}
                    <div className="flex border-b border-gray-700">
                        <button
                            className={`flex-1 px-4 py-3 text-sm font-medium transition-all flex items-center justify-center gap-2 select-none ${
                                movieSelected
                                    ? 'bg-red-600/90 text-white'
                                    : 'text-gray-400 hover:text-white hover:bg-white/10'
                            }`}
                            onClick={toggleMovie}
                        >
                            <div
                                className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                                    movieSelected
                                        ? 'bg-white border-white'
                                        : 'border-gray-500 hover:border-gray-400'
                                }`}
                            >
                                {movieSelected && (
                                    <CheckIcon className="w-3 h-3 text-red-600 stroke-[3]" />
                                )}
                            </div>
                            <FilmIcon className="h-4 w-4" />
                            Movies
                        </button>
                        <button
                            className={`flex-1 px-4 py-3 text-sm font-medium transition-all flex items-center justify-center gap-2 select-none ${
                                tvSelected
                                    ? 'bg-red-600/90 text-white'
                                    : 'text-gray-400 hover:text-white hover:bg-white/10'
                            }`}
                            onClick={toggleTv}
                        >
                            <div
                                className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                                    tvSelected
                                        ? 'bg-white border-white'
                                        : 'border-gray-500 hover:border-gray-400'
                                }`}
                            >
                                {tvSelected && (
                                    <CheckIcon className="w-3 h-3 text-red-600 stroke-[3]" />
                                )}
                            </div>
                            <TvIcon className="h-4 w-4" />
                            TV Shows
                        </button>
                    </div>

                    {/* Genres Grid */}
                    {/* SCROLLBAR: Track transparent to match dropdown background, thumb is red */}
                    <div className="max-h-80 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-red-600 hover:scrollbar-thumb-red-500 scrollbar-thumb-rounded-full scrollbar-track-rounded-full p-4">
                        <div className="grid grid-cols-2 gap-2">
                            {currentGenres.map((genre) => (
                                <button
                                    key={genre.id}
                                    className="text-left px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded-md transition-colors select-none"
                                    onClick={() => handleGenreClick(genre)}
                                >
                                    {genre.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default GenresDropdown
