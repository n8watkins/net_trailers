import React, { useState, useEffect, useRef } from 'react'
import { ChevronDownIcon, FilmIcon, TvIcon } from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'
import {
    MOVIE_GENRES as movieGenres,
    TV_GENRES as tvGenres,
    CHILD_SAFE_MOVIE_GENRES as childSafeMovieGenres,
    CHILD_SAFE_TV_GENRES as childSafeTvGenres,
} from '../../constants/genres'
import { useChildSafety } from '../../hooks/useChildSafety'

function GenresDropdown() {
    const [isOpen, setIsOpen] = useState(false)
    const [selectedType, setSelectedType] = useState<'movie' | 'tv'>('movie')
    const dropdownRef = useRef<HTMLDivElement>(null)
    const router = useRouter()
    const { isEnabled: childSafetyEnabled } = useChildSafety()

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleGenreClick = (genreId: number, genreName: string) => {
        router.push(`/genres/${selectedType}/${genreId}?name=${encodeURIComponent(genreName)}`)
        setIsOpen(false)
    }

    // Use child-safe genre lists when child safety mode is enabled
    const currentGenres =
        selectedType === 'movie'
            ? childSafetyEnabled
                ? childSafeMovieGenres
                : movieGenres
            : childSafetyEnabled
              ? childSafeTvGenres
              : tvGenres

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                className="headerLink cursor-pointer flex items-center space-x-1 hover:text-white transition-colors select-none"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span>Genres</span>
                <ChevronDownIcon
                    className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-80 bg-black/95 backdrop-blur-sm border border-red-500/40 rounded-lg shadow-xl shadow-red-500/20 z-[110] max-h-96 overflow-hidden animate-dropdown-enter">
                    {/* Type Selector */}
                    <div className="flex border-b border-gray-700">
                        <button
                            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 select-none ${
                                selectedType === 'movie'
                                    ? 'bg-red-600 text-white'
                                    : 'text-gray-300 hover:text-white hover:bg-white/10'
                            }`}
                            onClick={() => setSelectedType('movie')}
                        >
                            <FilmIcon className="h-4 w-4" />
                            Movies
                        </button>
                        <button
                            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 select-none ${
                                selectedType === 'tv'
                                    ? 'bg-red-600 text-white'
                                    : 'text-gray-300 hover:text-white hover:bg-white/10'
                            }`}
                            onClick={() => setSelectedType('tv')}
                        >
                            <TvIcon className="h-4 w-4" />
                            TV Shows
                        </button>
                    </div>

                    {/* Genres Grid */}
                    <div className="max-h-80 overflow-y-auto scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-red-600 hover:scrollbar-thumb-red-500 scrollbar-thumb-rounded-full scrollbar-track-rounded-full p-4">
                        <div className="grid grid-cols-2 gap-2">
                            {currentGenres.map((genre) => (
                                <button
                                    key={genre.id}
                                    className="text-left px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded-md transition-colors select-none"
                                    onClick={() => handleGenreClick(genre.id, genre.name)}
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
