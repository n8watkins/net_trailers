import React, { useState, useRef, useEffect } from 'react'
import { MagnifyingGlassIcon, XMarkIcon, ArrowRightIcon } from '@heroicons/react/24/outline'
import { useRouter } from 'next/router'
import { useRecoilState } from 'recoil'
import { useSearch } from '../hooks/useSearch'
import { useTypewriter } from '../hooks/useTypewriter'
import { modalState, movieState, autoPlayWithSoundState } from '../atoms/modalAtom'
import { Content, getTitle, getYear, getContentType, isMovie } from '../typings'

interface SearchBarProps {
    placeholder?: string
    className?: string
    showFilters?: boolean
    onFocus?: () => void
    onBlur?: () => void
}

export default function SearchBar({
    placeholder = "Search movies and TV shows...",
    className = "",
    showFilters = false,
    onFocus,
    onBlur
}: SearchBarProps) {
    // Popular titles for typewriter effect
    const popularTitles = [
        "Stranger Things",
        "The Witcher",
        "Wednesday",
        "Breaking Bad",
        "Squid Game",
        "The Crown",
        "Ozark",
        "House of Cards",
        "Narcos",
        "Black Mirror",
        "Money Heist",
        "Dark",
        "The Queen's Gambit",
        "Bridgerton",
        "Cobra Kai"
    ]

    const typewriterText = useTypewriter({
        words: popularTitles,
        typeSpeed: 80,
        deleteSpeed: 40,
        delayBetweenWords: 2000,
        loop: true,
        maxLength: 20 // Limit for cleaner display on larger devices
    })
    const router = useRouter()
    const {
        query,
        suggestions,
        searchHistory,
        results,
        isLoading,
        hasSearched,
        updateQuery,
        clearSearch,
        performSearch
    } = useSearch()

    const [showModal, setShowModal] = useRecoilState(modalState)
    const [currentContent, setCurrentContent] = useRecoilState(movieState)
    const [autoPlayWithSound, setAutoPlayWithSound] = useRecoilState(autoPlayWithSoundState)

    const [isFocused, setIsFocused] = useState(false)
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [selectedIndex, setSelectedIndex] = useState(-1)
    const [isMobileExpanded, setIsMobileExpanded] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)
    const suggestionsRef = useRef<HTMLDivElement>(null)

    // Close suggestions when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                suggestionsRef.current &&
                !suggestionsRef.current.contains(event.target as Node) &&
                !inputRef.current?.contains(event.target as Node)
            ) {
                setShowSuggestions(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        updateQuery(value)
        setShowSuggestions(value.length > 0)
        setSelectedIndex(-1) // Reset selection when typing
    }

    const handleInputFocus = () => {
        setIsFocused(true)
        setIsMobileExpanded(true)
        setShowSuggestions(query.length > 0 || (hasSearched && results.length > 0))
        onFocus?.()
    }

    const handleInputBlur = () => {
        setIsFocused(false)
        // Delay hiding suggestions to allow clicking on them
        setTimeout(() => {
            setShowSuggestions(false)
            if (!query) {
                setIsMobileExpanded(false)
            }
        }, 150)
        onBlur?.()
    }

    const handleMobileSearchClick = () => {
        setIsMobileExpanded(true)
        setTimeout(() => {
            inputRef.current?.focus()
        }, 100)
    }

    const handleSuggestionClick = (suggestion: string) => {
        updateQuery(suggestion)
        setShowSuggestions(false)
        inputRef.current?.blur()
    }

    const handleSeeAllResults = () => {
        setShowSuggestions(false)
        inputRef.current?.blur()
        router.push(`/search?q=${encodeURIComponent(query)}`)
    }

    const handleQuickResultClick = (content: Content) => {
        setShowSuggestions(false)
        inputRef.current?.blur()
        setAutoPlayWithSound(false) // More info mode - starts muted
        setShowModal(true)
        setCurrentContent(content)
    }

    const handleClearSearch = (e?: React.MouseEvent) => {
        e?.preventDefault()
        e?.stopPropagation()
        clearSearch()
        setShowSuggestions(false)
        inputRef.current?.focus()
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            if (selectedIndex >= 0 && allSuggestions[selectedIndex]) {
                // Select the highlighted suggestion
                const suggestion = allSuggestions[selectedIndex]
                handleSuggestionClick(suggestion)
            } else if (query.trim()) {
                // Navigate to full search results
                handleSeeAllResults()
            }
            return
        }

        if (e.key === 'Escape') {
            setShowSuggestions(false)
            setSelectedIndex(-1)
            inputRef.current?.blur()
            return
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault()
            if (showSuggestions && allSuggestions.length > 0) {
                setSelectedIndex(prev =>
                    prev < allSuggestions.length - 1 ? prev + 1 : 0
                )
            }
            return
        }

        if (e.key === 'ArrowUp') {
            e.preventDefault()
            if (showSuggestions && allSuggestions.length > 0) {
                setSelectedIndex(prev =>
                    prev > 0 ? prev - 1 : allSuggestions.length - 1
                )
            }
            return
        }

        // Allow all other keys (including Backspace) to work normally
    }

    // Only show live search suggestions, no search history
    const allSuggestions = query.length > 0 ? suggestions : []

    // Quick results to show (first 4 results)
    const quickResults = hasSearched && results.length > 0 ? results.slice(0, 4) : []
    const hasMoreResults = results.length > 4

    return (
        <div className={`relative transition-all duration-300 ease-in-out w-full mx-auto ${className}`}>
            {/* Unified Mobile/Desktop Search Container */}
            <div className={`relative transition-all duration-300 ease-in-out ${
                // Mobile: starts at icon width (48px), expands to full width when active
                // Desktop: always visible with responsive width
                isMobileExpanded || 'md:block'
                    ? 'md:max-w-4xl md:w-full max-w-full w-full opacity-100'
                    : 'md:max-w-xl md:w-full w-12 opacity-100'
            } ${isFocused && 'md:max-w-4xl'}`}>

                {/* Mobile Search Icon (overlays on collapsed state) */}
                <div className={`md:hidden absolute inset-0 transition-opacity duration-300 ease-in-out ${
                    isMobileExpanded ? 'opacity-0 pointer-events-none' : 'opacity-100'
                }`}>
                    <button
                        onClick={handleMobileSearchClick}
                        className="w-12 h-12 flex items-center justify-center bg-[#0a0a0a] border border-gray-600/50 rounded-lg hover:border-red-500/50 transition-colors"
                    >
                        <MagnifyingGlassIcon className="h-6 w-6 text-gray-400" />
                    </button>
                </div>
                {/* Search Input Container (visible when expanded on mobile, always on desktop) */}
                <div className={`transition-opacity duration-300 ease-in-out ${
                    isMobileExpanded ? 'opacity-100 md:opacity-100' : 'opacity-0 md:opacity-100 pointer-events-none md:pointer-events-auto'
                }`}>
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        {isLoading ? (
                            <div className="animate-spin h-5 w-5 text-gray-400">
                                <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                    />
                                </svg>
                            </div>
                        ) : (
                            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                        )}
                    </div>

                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={handleInputChange}
                        onFocus={handleInputFocus}
                        onBlur={handleInputBlur}
                        onKeyDown={handleKeyDown}
                        placeholder={!isFocused && !query ? typewriterText : placeholder}
                        className={`
                            block w-full pl-10 pr-12 py-4
                            bg-[#0a0a0a] border border-gray-600/50 rounded-lg
                            text-white placeholder-gray-400
                            focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent
                            transition-all duration-300 ease-in-out
                            placeholder:text-ellipsis placeholder:overflow-hidden placeholder:whitespace-nowrap
                            text-base sm:text-lg
                            ${isFocused ? 'bg-[#0a0a0a] shadow-xl shadow-red-500/30 border-red-500/50' : 'bg-[#0a0a0a]'}
                        `}
                    />

                    {/* Clear Button */}
                    {query && (
                        <button
                            onClick={handleClearSearch}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white transition-colors"
                            type="button"
                        >
                            <XMarkIcon className="h-5 w-5" />
                        </button>
                    )}

                    {/* Mobile Close Button */}
                    <div className="md:hidden">
                        {isMobileExpanded && (
                            <button
                                onClick={() => {
                                    setIsMobileExpanded(false)
                                    setIsFocused(false)
                                    setShowSuggestions(false)
                                }}
                                className="absolute inset-y-0 right-10 pr-3 flex items-center text-gray-400 hover:text-white transition-colors"
                                type="button"
                            >
                                <XMarkIcon className="h-5 w-5" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Hybrid Search Dropdown */}
            {showSuggestions && (allSuggestions.length > 0 || quickResults.length > 0) && (
                <div
                    ref={suggestionsRef}
                    className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-600/50 rounded-lg shadow-lg max-h-96 overflow-y-auto scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-red-600 hover:scrollbar-thumb-red-500 scrollbar-thumb-rounded-full scrollbar-track-rounded-full"
                >
                    {/* Quick Results Section */}
                    {quickResults.length > 0 && (
                        <>
                            <div className="px-4 py-2 text-xs text-gray-400 uppercase tracking-wide border-b border-gray-600/50">
                                Quick Results
                            </div>
                            <div className="p-2">
                                <div className="space-y-2">
                                    {quickResults.map((item: Content, index) => (
                                        <div
                                            key={`${item.id}-${index}`}
                                            className="flex items-center bg-gray-700/30 hover:bg-gray-600/30 rounded-lg p-3 transition-all duration-200 cursor-pointer group"
                                            onClick={() => handleQuickResultClick(item)}
                                        >
                                            {/* Movie Poster */}
                                            <div className="flex-shrink-0 w-12 h-18 relative rounded overflow-hidden bg-gray-600">
                                                {item.poster_path ? (
                                                    <img
                                                        src={`https://image.tmdb.org/t/p/w200${item.poster_path}`}
                                                        alt={getTitle(item)}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                                                        </svg>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Content Details */}
                                            <div className="flex-1 ml-3 min-w-0">
                                                {/* Title and Year */}
                                                <div className="flex items-start justify-between mb-1">
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-white font-medium text-sm truncate group-hover:text-red-400 transition-colors">
                                                            {getTitle(item)}
                                                        </h4>
                                                        <p className="text-gray-400 text-xs">
                                                            {getYear(item)}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Rating and Media Type */}
                                                <div className="flex items-center gap-2">
                                                    {/* Rating */}
                                                    {item.vote_average > 0 && (
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-yellow-400 text-xs">⭐</span>
                                                            <span className="text-white text-xs font-medium">
                                                                {item.vote_average.toFixed(1)}
                                                            </span>
                                                        </div>
                                                    )}

                                                    {/* Media Type Badge */}
                                                    <span className={`
                                                        px-1.5 py-0.5 text-xs font-medium rounded
                                                        ${isMovie(item)
                                                            ? 'bg-blue-600 text-white'
                                                            : 'bg-green-600 text-white'
                                                        }
                                                    `}>
                                                        {isMovie(item) ? 'Movie' : 'TV'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* See All Results Button */}
                                {(hasMoreResults || quickResults.length > 0) && (
                                    <button
                                        onClick={handleSeeAllResults}
                                        className="w-full mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                                    >
                                        <span>See all {results.length} results</span>
                                        <ArrowRightIcon className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        </>
                    )}

                    {/* Suggestions Section */}
                    {allSuggestions.length > 0 && (
                        <>
                            {quickResults.length > 0 && <div className="border-t border-gray-600/50" />}

                            {allSuggestions.map((suggestion, index) => (
                                <button
                                    key={`${suggestion}-${index}`}
                                    onClick={() => handleSuggestionClick(suggestion)}
                                    className={`w-full px-4 py-3 text-left text-white transition-colors flex items-center space-x-3 group ${
                                        selectedIndex === index
                                            ? 'bg-gray-700'
                                            : 'hover:bg-gray-700'
                                    }`}
                                >
                                    <MagnifyingGlassIcon className="h-4 w-4 text-gray-400 group-hover:text-gray-300" />
                                    <span className="flex-1 truncate">
                                        {/* Highlight matching parts */}
                                        <>
                                            {suggestion.split(new RegExp(`(${query})`, 'gi')).map((part, i) =>
                                                part.toLowerCase() === query.toLowerCase() ? (
                                                    <span key={i} className="text-red-400 font-medium">
                                                        {part}
                                                    </span>
                                                ) : (
                                                    <span key={i}>{part}</span>
                                                )
                                            )}
                                        </>
                                    </span>
                                </button>
                            ))}
                        </>
                    )}
                </div>
            )}
        </div>
    )
}