import React, { useState, useRef, useEffect } from 'react'
import { MagnifyingGlassIcon, XMarkIcon, ClockIcon } from '@heroicons/react/24/outline'
import { useSearch } from '../hooks/useSearch'

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
    const {
        query,
        suggestions,
        searchHistory,
        isLoading,
        updateQuery,
        clearSearch,
        performSearch
    } = useSearch()

    const [isFocused, setIsFocused] = useState(false)
    const [showSuggestions, setShowSuggestions] = useState(false)
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
    }

    const handleInputFocus = () => {
        setIsFocused(true)
        setShowSuggestions(query.length > 0 || searchHistory.length > 0)
        onFocus?.()
    }

    const handleInputBlur = () => {
        setIsFocused(false)
        // Delay hiding suggestions to allow clicking on them
        setTimeout(() => setShowSuggestions(false), 150)
        onBlur?.()
    }

    const handleSuggestionClick = (suggestion: string) => {
        updateQuery(suggestion)
        performSearch(suggestion)
        setShowSuggestions(false)
        inputRef.current?.blur()
    }

    const handleClearSearch = () => {
        clearSearch()
        setShowSuggestions(false)
        inputRef.current?.focus()
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            if (query.trim()) {
                performSearch(query.trim())
                setShowSuggestions(false)
                inputRef.current?.blur()
            }
        }

        if (e.key === 'Escape') {
            setShowSuggestions(false)
            inputRef.current?.blur()
        }
    }

    // Combine suggestions and search history
    const allSuggestions = query.length > 0 ? suggestions : searchHistory.slice(0, 5)

    return (
        <div className={`relative ${className}`}>
            {/* Search Input */}
            <div className="relative">
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
                    placeholder={placeholder}
                    className={`
                        block w-full pl-10 pr-12 py-3
                        bg-gray-900/90 border border-gray-600/50 rounded-lg
                        text-white placeholder-gray-400
                        focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent
                        transition-all duration-200
                        ${isFocused ? 'bg-gray-800/95' : 'bg-gray-900/90'}
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
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && allSuggestions.length > 0 && (
                <div
                    ref={suggestionsRef}
                    className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-600/50 rounded-lg shadow-lg max-h-64 overflow-y-auto"
                >
                    {query.length === 0 && searchHistory.length > 0 && (
                        <div className="px-4 py-2 text-xs text-gray-400 uppercase tracking-wide border-b border-gray-600/50">
                            Recent Searches
                        </div>
                    )}

                    {allSuggestions.map((suggestion, index) => (
                        <button
                            key={`${suggestion}-${index}`}
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="w-full px-4 py-3 text-left text-white hover:bg-gray-700 transition-colors flex items-center space-x-3 group"
                        >
                            {query.length === 0 ? (
                                <ClockIcon className="h-4 w-4 text-gray-400 group-hover:text-gray-300" />
                            ) : (
                                <MagnifyingGlassIcon className="h-4 w-4 text-gray-400 group-hover:text-gray-300" />
                            )}
                            <span className="flex-1 truncate">
                                {query.length > 0 ? (
                                    // Highlight matching parts
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
                                ) : (
                                    suggestion
                                )}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}