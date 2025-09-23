import React, { useState, useRef, useEffect } from 'react'
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
    { id: 878, name: 'Sci-Fi' },
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

interface GenreDropdownProps {
    className?: string
}

export default function GenreDropdown({ className = '' }: GenreDropdownProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [selectedContentType, setSelectedContentType] = useState<'movie' | 'tv'>('movie')
    const [selectedGenres, setSelectedGenres] = useState<number[]>([])
    const dropdownRef = useRef<HTMLDivElement>(null)
    const router = useRouter()

    const getCurrentGenres = () => {
        return selectedContentType === 'movie' ? movieGenres : tvGenres
    }

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
                setSelectedGenres([])
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])


    const toggleGenre = (genreId: number) => {
        setSelectedGenres(prev => {
            if (prev.includes(genreId)) {
                return prev.filter(id => id !== genreId)
            } else {
                return [...prev, genreId]
            }
        })
    }

    const handleSearch = () => {
        if (selectedGenres.length === 0) return

        const genreNames = selectedGenres.map(id => {
            const genre = getCurrentGenres().find(g => g.id === id)
            return genre?.name || ''
        }).filter(Boolean)

        const genreNamesStr = genreNames.join(', ')
        const title = `Most Popular ${genreNamesStr}`

        router.push(`/genres/${selectedContentType}/${selectedGenres.join(',')}?title=${encodeURIComponent(title)}`)
        setIsOpen(false)
        setSelectedGenres([])
    }

    const isGenreSelected = (genreId: number) => selectedGenres.includes(genreId)

    return (
        <div ref={dropdownRef} className={`relative ${className}`}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="headerLink cursor-pointer flex items-center space-x-1"
            >
                <span>Genres</span>
                <ChevronDownIcon className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-[250px] bg-[#0a0a0a] border border-gray-600/50 rounded-lg shadow-xl z-50 animate-dropdown-enter">
                    <div className="p-3">
                        {/* Content Type Selection */}
                        <div className="flex gap-1 mb-3">
                            <button
                                onClick={() => {
                                    setSelectedContentType('movie')
                                    setSelectedGenres([])
                                }}
                                className={`flex items-center space-x-1 px-2 py-1 rounded text-xs transition-colors ${
                                    selectedContentType === 'movie'
                                        ? 'bg-red-600 text-white'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                }`}
                            >
                                <FilmIcon className="h-3 w-3" />
                                <span>Movies</span>
                            </button>
                            <button
                                onClick={() => {
                                    setSelectedContentType('tv')
                                    setSelectedGenres([])
                                }}
                                className={`flex items-center space-x-1 px-2 py-1 rounded text-xs transition-colors ${
                                    selectedContentType === 'tv'
                                        ? 'bg-red-600 text-white'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                }`}
                            >
                                <TvIcon className="h-3 w-3" />
                                <span>TV Shows</span>
                            </button>
                        </div>

                        {/* Genre Selection */}
                        <div className="mb-3">
                            <div className="grid grid-cols-2 gap-1 max-h-40 overflow-y-auto">
                                {getCurrentGenres().map((genre) => (
                                    <button
                                        key={genre.id}
                                        onClick={() => toggleGenre(genre.id)}
                                        className={`text-center px-1.5 py-1 text-sm rounded transition-colors ${
                                            isGenreSelected(genre.id)
                                                ? 'bg-red-600 text-white'
                                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        }`}
                                    >
                                        {genre.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Search Button */}
                        <div className="pt-2 border-t border-gray-600/50">
                            <button
                                onClick={handleSearch}
                                disabled={selectedGenres.length === 0}
                                className={`w-full px-2 py-1 text-xs rounded transition-colors ${
                                    selectedGenres.length > 0
                                        ? 'bg-red-600 text-white hover:bg-red-700'
                                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                }`}
                            >
                                Search ({selectedGenres.length})
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}