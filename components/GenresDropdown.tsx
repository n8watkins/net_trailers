import React, { useState, useEffect, useRef } from 'react'
import { ChevronDownIcon, FilmIcon, TvIcon } from '@heroicons/react/24/outline'
import { useRouter } from 'next/router'

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

function GenresDropdown() {
    const [isOpen, setIsOpen] = useState(false)
    const [selectedType, setSelectedType] = useState<'movie' | 'tv'>('movie')
    const dropdownRef = useRef<HTMLDivElement>(null)
    const router = useRouter()

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

    const currentGenres = selectedType === 'movie' ? movieGenres : tvGenres

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                className="headerLink cursor-pointer flex items-center space-x-1 hover:text-white transition-colors"
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
                            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                                selectedType === 'movie'
                                    ? 'bg-red-600 text-white'
                                    : 'text-gray-300 hover:text-white hover:bg-gray-800'
                            }`}
                            onClick={() => setSelectedType('movie')}
                        >
                            <FilmIcon className="h-4 w-4" />
                            Movies
                        </button>
                        <button
                            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                                selectedType === 'tv'
                                    ? 'bg-red-600 text-white'
                                    : 'text-gray-300 hover:text-white hover:bg-gray-800'
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
                                    className="text-left px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-md transition-colors"
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