import React, { useState, useRef, useEffect } from 'react'
import {
    MagnifyingGlassIcon,
    XMarkIcon,
    ArrowRightIcon,
    FunnelIcon,
} from '@heroicons/react/24/outline'
import { useRouter } from 'next/router'
import { useRecoilState } from 'recoil'
import { useSearch } from '../hooks/useSearch'
import { useTypewriter } from '../hooks/useTypewriter'
import { modalState, movieState, autoPlayWithSoundState } from '../atoms/modalAtom'
import { Content, getTitle, getYear, getContentType, isMovie } from '../typings'
import SearchFiltersDropdown from './SearchFiltersDropdown'

interface SearchBarProps {
    placeholder?: string
    className?: string
    onFocus?: () => void
    onBlur?: () => void
}

export default function SearchBar({
    placeholder = 'Search movies and TV shows...',
    className = '',
    onFocus,
    onBlur,
}: SearchBarProps) {
    // Popular titles for typewriter effect
    const popularTitles = [
        'Stranger Things',
        'The Witcher',
        'Wednesday',
        'Breaking Bad',
        'Squid Game',
        'The Crown',
        'Ozark',
        'House of Cards',
        'Narcos',
        'Black Mirror',
        'Money Heist',
        'Dark',
        "The Queen's Gambit",
        'Bridgerton',
        'Cobra Kai',
    ]

    const typewriterText = useTypewriter({
        words: popularTitles,
        typeSpeed: 80,
        deleteSpeed: 40,
        delayBetweenWords: 2000,
        loop: true,
        maxLength: 20, // Limit for cleaner display on larger devices
    })
    const router = useRouter()
    const isOnSearchPage = router.pathname === '/search'
    const {
        query,
        suggestions,
        searchHistory,
        results,
        isLoading,
        hasSearched,
        totalResults,
        updateQuery,
        clearSearch,
        performSearch,
    } = useSearch()

    const [showModal, setShowModal] = useRecoilState(modalState)
    const [currentContent, setCurrentContent] = useRecoilState(movieState)
    const [autoPlayWithSound, setAutoPlayWithSound] = useRecoilState(autoPlayWithSoundState)

    const [isFocused, setIsFocused] = useState(false)
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [selectedIndex, setSelectedIndex] = useState(-1)
    const [selectedResultIndex, setSelectedResultIndex] = useState(-1)
    const [isSeeAllButtonSelected, setIsSeeAllButtonSelected] = useState(false)
    const [isMobileExpanded, setIsMobileExpanded] = useState(false)
    const [showFilters, setShowFilters] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)
    const suggestionsRef = useRef<HTMLDivElement>(null)
    const resultRefs = useRef<(HTMLDivElement | null)[]>([])
    const seeAllButtonRef = useRef<HTMLButtonElement>(null)

    // Scroll selected element into view
    const scrollToSelected = (index: number, isSeeAllButton = false) => {
        if (isSeeAllButton && seeAllButtonRef.current) {
            seeAllButtonRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'nearest',
            })
        } else if (resultRefs.current[index]) {
            resultRefs.current[index]?.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'nearest',
            })
        }
    }

    // Close suggestions when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                suggestionsRef.current &&
                !suggestionsRef.current.contains(event.target as Node) &&
                !inputRef.current?.contains(event.target as Node)
            ) {
                setShowSuggestions(false)
                setSelectedResultIndex(-1) // Reset selection when clicking outside
                setIsSeeAllButtonSelected(false) // Reset button selection when clicking outside
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
        setSelectedResultIndex(-1) // Reset result selection when typing
        setIsSeeAllButtonSelected(false) // Reset button selection when typing
    }

    const handleInputFocus = () => {
        setIsFocused(true)
        setIsMobileExpanded(true)
        setShowSuggestions(query.length > 0 || (hasSearched && results.length > 0))
        setSelectedResultIndex(-1) // Reset selection on focus
        setIsSeeAllButtonSelected(false) // Reset button selection on focus
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
            // Check if "See all results" button is selected
            if (isSeeAllButtonSelected) {
                handleSeeAllResults()
            } else if (selectedResultIndex >= 0 && quickResults[selectedResultIndex]) {
                // Open detailed view for selected result
                const selectedResult = quickResults[selectedResultIndex]
                handleQuickResultClick(selectedResult)
            } else if (selectedIndex >= 0 && allSuggestions[selectedIndex]) {
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
            setSelectedResultIndex(-1)
            setIsSeeAllButtonSelected(false)
            inputRef.current?.blur()
            return
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault()
            if (showSuggestions && quickResults.length > 0) {
                // If currently on "See all results" button, stay there (don't cycle)
                if (isSeeAllButtonSelected) {
                    return
                }
                // If no selection or on a result, move to next result
                if (selectedResultIndex < quickResults.length - 1) {
                    const newIndex = selectedResultIndex + 1
                    setSelectedResultIndex(newIndex)
                    setIsSeeAllButtonSelected(false)
                    setSelectedIndex(-1)
                    scrollToSelected(newIndex)
                } else if (hasMoreResults || quickResults.length > 0) {
                    // Move to "See all results" button
                    setSelectedResultIndex(-1)
                    setIsSeeAllButtonSelected(true)
                    setSelectedIndex(-1)
                    scrollToSelected(-1, true)
                }
            } else if (showSuggestions && allSuggestions.length > 0) {
                if (selectedIndex < allSuggestions.length - 1) {
                    setSelectedIndex(selectedIndex + 1)
                }
            }
            return
        }

        if (e.key === 'ArrowUp') {
            e.preventDefault()
            if (showSuggestions && quickResults.length > 0) {
                // If currently on "See all results" button, move to last result
                if (isSeeAllButtonSelected) {
                    const newIndex = quickResults.length - 1
                    setSelectedResultIndex(newIndex)
                    setIsSeeAllButtonSelected(false)
                    scrollToSelected(newIndex)
                } else if (selectedResultIndex > 0) {
                    // Move to previous result
                    const newIndex = selectedResultIndex - 1
                    setSelectedResultIndex(newIndex)
                    scrollToSelected(newIndex)
                } else if (selectedResultIndex === 0) {
                    // At first result, don't cycle (stay at first)
                    return
                }
            } else if (showSuggestions && allSuggestions.length > 0) {
                if (selectedIndex > 0) {
                    setSelectedIndex(selectedIndex - 1)
                }
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
        <div
            className={`relative transition-all duration-300 ease-in-out w-full mx-auto ${className}`}
        >
            {/* Unified Mobile/Desktop Search Container */}
            <div
                className={`relative transition-all duration-300 ease-in-out ${
                    // Mobile: starts at icon width (48px), expands to full width when active
                    // Desktop: always visible with responsive width
                    isMobileExpanded || 'md:block'
                        ? 'md:max-w-4xl md:w-full max-w-full w-full opacity-100'
                        : 'md:max-w-xl md:w-full w-12 opacity-100'
                } ${isFocused && 'md:max-w-4xl'}`}
            >
                {/* Mobile Search Icon (overlays on collapsed state) */}
                <div
                    className={`md:hidden absolute inset-0 transition-opacity duration-300 ease-in-out ${
                        isMobileExpanded ? 'opacity-0 pointer-events-none' : 'opacity-100'
                    }`}
                >
                    <button
                        onClick={handleMobileSearchClick}
                        className="w-12 h-12 flex items-center justify-center bg-[#0a0a0a] border border-gray-600/50 rounded-lg hover:border-red-500/50 transition-colors"
                    >
                        <MagnifyingGlassIcon className="h-6 w-6 text-gray-400" />
                    </button>
                </div>
                {/* Search Input Container (visible when expanded on mobile, always on desktop) */}
                <div
                    className={`transition-opacity duration-300 ease-in-out ${
                        isMobileExpanded
                            ? 'opacity-100 md:opacity-100'
                            : 'opacity-0 md:opacity-100 pointer-events-none md:pointer-events-auto'
                    }`}
                >
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

                    {/* Filter Button and Clear Button */}
                    <div className="absolute inset-y-0 right-0 flex items-center">
                        {/* Filter Button */}
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`px-3 py-2 text-gray-400 hover:text-white transition-colors ${
                                showFilters ? 'text-red-400' : ''
                            }`}
                            type="button"
                            title="Search Filters"
                        >
                            <FunnelIcon className="h-5 w-5" />
                        </button>

                        {/* Clear Button */}
                        {query && (
                            <button
                                onClick={handleClearSearch}
                                className="pr-3 py-2 text-gray-400 hover:text-white transition-colors"
                                type="button"
                            >
                                <XMarkIcon className="h-5 w-5" />
                            </button>
                        )}
                    </div>

                    {/* Mobile Close Button */}
                    <div className="md:hidden">
                        {isMobileExpanded && (
                            <button
                                onClick={() => {
                                    setIsMobileExpanded(false)
                                    setIsFocused(false)
                                    setShowSuggestions(false)
                                    setShowFilters(false)
                                }}
                                className="absolute inset-y-0 right-20 pr-3 flex items-center text-gray-400 hover:text-white transition-colors"
                                type="button"
                            >
                                <XMarkIcon className="h-5 w-5" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Search Filters Dropdown */}
            <SearchFiltersDropdown isOpen={showFilters} onClose={() => setShowFilters(false)} />

            {/* Search Results Dropdown */}
            {showSuggestions && quickResults.length > 0 && !isOnSearchPage && !showFilters && (
                <div
                    ref={suggestionsRef}
                    className="absolute z-[110] w-full mt-1 bg-[#0a0a0a] border border-gray-600/50 rounded-lg shadow-lg max-h-96 overflow-y-auto scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-red-600 hover:scrollbar-thumb-red-500 scrollbar-thumb-rounded-full scrollbar-track-rounded-full animate-dropdown-enter"
                >
                    {/* Results Count Header */}
                    {totalResults > 0 && (
                        <div className="px-4 py-2 border-b border-gray-600/50 bg-gray-800/30">
                            <div className="text-xs text-gray-400">
                                Found {totalResults.toLocaleString()} result
                                {totalResults !== 1 ? 's' : ''} for &ldquo;{query}&rdquo;
                            </div>
                        </div>
                    )}

                    {/* Quick Results Section */}
                    {quickResults.length > 0 && (
                        <>
                            <div className="p-2">
                                <div className="space-y-2">
                                    {quickResults.map((item: Content, index) => (
                                        <div
                                            key={`${item.id}-${index}`}
                                            ref={(el) => {
                                                resultRefs.current[index] = el
                                            }}
                                            className={`flex items-center rounded-lg p-3 cursor-pointer group border transition-all duration-300 ease-in-out ${
                                                selectedResultIndex === index
                                                    ? 'bg-red-600/30 border-red-500/50 shadow-lg shadow-red-500/20'
                                                    : 'bg-gray-700/30 border-transparent hover:bg-gray-600/30 hover:border-gray-500/30'
                                            }`}
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
                                                        <svg
                                                            className="w-6 h-6"
                                                            fill="currentColor"
                                                            viewBox="0 0 20 20"
                                                        >
                                                            <path
                                                                fillRule="evenodd"
                                                                d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                                                                clipRule="evenodd"
                                                            />
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
                                                            <span className="text-yellow-400 text-xs">
                                                                ⭐
                                                            </span>
                                                            <span className="text-white text-xs font-medium">
                                                                {item.vote_average.toFixed(1)}
                                                            </span>
                                                        </div>
                                                    )}

                                                    {/* Media Type Badge */}
                                                    <span
                                                        className={`
                                                        px-1.5 py-0.5 text-xs font-medium rounded
                                                        ${
                                                            isMovie(item)
                                                                ? 'bg-blue-600 text-white'
                                                                : 'bg-green-600 text-white'
                                                        }
                                                    `}
                                                    >
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
                                        ref={seeAllButtonRef}
                                        onClick={handleSeeAllResults}
                                        className={`w-full mt-3 px-4 py-2 text-white text-sm font-medium rounded-lg transition-all duration-300 ease-in-out flex items-center justify-center gap-2 border ${
                                            isSeeAllButtonSelected
                                                ? 'bg-red-700 border-red-400 border-2 shadow-lg shadow-red-500/30 outline outline-2 outline-red-300 outline-offset-1'
                                                : 'bg-red-600 hover:bg-red-700 border-transparent'
                                        }`}
                                    >
                                        <span>See all {totalResults.toLocaleString()} results</span>
                                        <ArrowRightIcon className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}
