import React, { useState, useRef, useEffect } from 'react'
import {
    MagnifyingGlassIcon,
    XMarkIcon,
    FunnelIcon,
    MicrophoneIcon,
} from '@heroicons/react/24/outline'
import { useRouter, usePathname } from 'next/navigation'
import { useAppStore } from '../../stores/appStore'
import { useSearch } from '../../hooks/useSearch'
import { useTypewriter } from '../../hooks/useTypewriter'
import { useVoiceInput } from '../../hooks/useVoiceInput'
import { useToast } from '../../hooks/useToast'
import { Content } from '../../typings'
import SearchFiltersDropdown from './SearchFiltersDropdown'
import SearchSuggestionsDropdown from './SearchSuggestionsDropdown'

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
    const pathname = usePathname()
    const isOnSearchPage = pathname === '/search'
    const {
        query,
        suggestions,
        results,
        isLoading,
        hasSearched,
        totalResults,
        filters,
        updateQuery,
        clearSearch,
    } = useSearch()

    const openModal = useAppStore((state) => state.openModal)
    const { showError } = useToast()

    // Voice input
    const { isListening, isSupported, startListening, stopListening } = useVoiceInput({
        onResult: (transcript) => {
            updateQuery(transcript)
        },
        onError: (error) => {
            showError('Voice input error', error)
        },
    })

    const [isFocused, setIsFocused] = useState(false)
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [selectedIndex, setSelectedIndex] = useState(-1)
    const [selectedResultIndex, setSelectedResultIndex] = useState(-1)
    const [isSeeAllButtonSelected, setIsSeeAllButtonSelected] = useState(false)
    const [isMobileExpanded, setIsMobileExpanded] = useState(false)
    const [showFilters, setShowFilters] = useState(false)
    const [isTyping, setIsTyping] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)
    const suggestionsRef = useRef<HTMLDivElement>(null)
    const resultRefs = useRef<(HTMLDivElement | null)[]>([])
    const seeAllButtonRef = useRef<HTMLButtonElement>(null)
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

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

    // Cleanup typing timeout on unmount
    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current)
            }
        }
    }, [])

    // Close suggestions when clicking outside
    useEffect(() => {
        let mouseDownPos = { x: 0, y: 0 }
        let isDragging = false

        function handleMouseDown(event: MouseEvent) {
            mouseDownPos = { x: event.clientX, y: event.clientY }
            isDragging = false
        }

        function handleMouseMove(event: MouseEvent) {
            const distance = Math.sqrt(
                Math.pow(event.clientX - mouseDownPos.x, 2) +
                    Math.pow(event.clientY - mouseDownPos.y, 2)
            )
            if (distance > 5) {
                // 5px threshold for drag detection
                isDragging = true
            }
        }

        function handleClickOutside(event: MouseEvent) {
            // Don't close if this was a drag operation
            if (isDragging) {
                isDragging = false
                return
            }

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

        document.addEventListener('mousedown', handleMouseDown)
        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('click', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleMouseDown)
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('click', handleClickOutside)
        }
    }, [])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        updateQuery(value)
        setShowSuggestions(value.length > 0)
        setSelectedIndex(-1) // Reset selection when typing
        setSelectedResultIndex(-1) // Reset result selection when typing
        setIsSeeAllButtonSelected(false) // Reset button selection when typing

        // Show typing indicator
        if (value.length >= 2) {
            setIsTyping(true)

            // Clear existing timeout
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current)
            }

            // Hide typing indicator after debounce time (300ms)
            typingTimeoutRef.current = setTimeout(() => {
                setIsTyping(false)
            }, 300)
        } else {
            setIsTyping(false)
        }
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
        openModal(content, true, false) // autoPlay=true, autoPlayWithSound=false (More info mode - starts muted)
    }

    const handleClearSearch = (e?: React.MouseEvent) => {
        e?.preventDefault()
        e?.stopPropagation()
        clearSearch()
        setShowSuggestions(false)
        setIsTyping(false)
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current)
        }
        inputRef.current?.focus()
    }

    const handleVoiceToggle = () => {
        if (isListening) {
            stopListening()
        } else {
            startListening()
        }
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

    // Check if any filters are active
    const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
        if (key === 'sortBy') return value !== 'popularity.desc'
        return value !== 'all'
    })

    return (
        <div
            className={`relative transition-all duration-300 ease-in-out w-full mx-auto ${className}`}
        >
            {/* Unified Mobile/Desktop Search Container */}
            <div
                className={`relative transition-all duration-300 ease-in-out ${
                    // Mobile: starts at icon width (48px), expands to full width when active
                    // Desktop: always at full width
                    isMobileExpanded
                        ? 'md:max-w-4xl md:w-full max-w-full w-full opacity-100'
                        : 'md:max-w-4xl md:w-full w-12 opacity-100'
                }`}
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
                        type="button"
                        aria-label="Open search"
                    >
                        <MagnifyingGlassIcon className="h-6 w-6 text-gray-400" aria-hidden="true" />
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
                        {isLoading || isTyping ? (
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
                        id="main-search-input"
                        type="search"
                        value={query}
                        onChange={handleInputChange}
                        onFocus={handleInputFocus}
                        onBlur={handleInputBlur}
                        onKeyDown={handleKeyDown}
                        placeholder={!isFocused && !query ? typewriterText : placeholder}
                        autoComplete="off"
                        aria-label="Search for movies and TV shows"
                        aria-autocomplete="list"
                        aria-controls={
                            showSuggestions && quickResults.length > 0
                                ? 'search-suggestions'
                                : undefined
                        }
                        aria-expanded={showSuggestions && quickResults.length > 0}
                        className={`
                            block w-full pl-10 pr-12 py-4
                            bg-[#0a0a0a] border border-gray-600/50 rounded-lg
                            text-white placeholder-gray-400
                            focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent
                            transition-all duration-300 ease-in-out
                            placeholder:text-ellipsis placeholder:overflow-hidden placeholder:whitespace-nowrap
                            text-base sm:text-lg select-none
                            autofill:bg-[#0a0a0a] autofill:text-white
                            autofill:shadow-[inset_0_0_0_1000px_#0a0a0a]
                            ${isFocused ? 'bg-[#0a0a0a] shadow-xl shadow-red-500/30 border-red-500/50' : 'bg-[#0a0a0a]'}
                        `}
                    />

                    {/* Filter Button and Clear Button */}
                    <div className="absolute inset-y-0 right-0 flex items-center">
                        {/* Filter Button */}
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`px-3 py-2 transition-colors ${
                                showFilters || hasActiveFilters
                                    ? 'text-red-400 hover:text-red-300'
                                    : 'text-gray-400 hover:text-white'
                            }`}
                            type="button"
                            title={hasActiveFilters ? 'Active Filters' : 'Search Filters'}
                            aria-label={
                                hasActiveFilters ? 'Active search filters' : 'Search filters'
                            }
                        >
                            <FunnelIcon className="h-5 w-5" aria-hidden="true" />
                        </button>

                        {/* Voice Input Button */}
                        {isSupported && (
                            <button
                                onClick={handleVoiceToggle}
                                className={`px-3 py-2 transition-all ${
                                    isListening
                                        ? 'text-red-400 animate-pulse'
                                        : 'text-gray-400 hover:text-white'
                                }`}
                                type="button"
                                title={isListening ? 'Stop voice input' : 'Start voice input'}
                                aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
                            >
                                <MicrophoneIcon className="h-5 w-5" aria-hidden="true" />
                            </button>
                        )}

                        {/* Clear Button */}
                        {query && (
                            <button
                                onClick={handleClearSearch}
                                className="pr-3 py-2 text-gray-400 hover:text-white transition-colors"
                                type="button"
                                aria-label="Clear search"
                            >
                                <XMarkIcon className="h-5 w-5" aria-hidden="true" />
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
                                aria-label="Close search"
                            >
                                <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Search Filters Dropdown */}
            <SearchFiltersDropdown isOpen={showFilters} onClose={() => setShowFilters(false)} />

            {/* Search Results Dropdown */}
            <SearchSuggestionsDropdown
                isVisible={
                    showSuggestions && quickResults.length > 0 && !isOnSearchPage && !showFilters
                }
                suggestionsRef={suggestionsRef}
                query={query}
                totalResults={totalResults}
                filteredCount={results.length}
                hasActiveFilters={hasActiveFilters}
                quickResults={quickResults}
                hasMoreResults={hasMoreResults}
                selectedResultIndex={selectedResultIndex}
                isSeeAllButtonSelected={isSeeAllButtonSelected}
                resultRefs={resultRefs}
                seeAllButtonRef={seeAllButtonRef}
                onQuickResultClick={handleQuickResultClick}
                onSeeAllResults={handleSeeAllResults}
                onMouseDown={(e) => {
                    e.preventDefault() // Prevents input from losing focus
                }}
            />
        </div>
    )
}
