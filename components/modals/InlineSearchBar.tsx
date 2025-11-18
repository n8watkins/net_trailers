'use client'

import React, { useState, useRef, useEffect } from 'react'
import {
    MagnifyingGlassIcon,
    XMarkIcon,
    PlusIcon,
    MicrophoneIcon,
} from '@heroicons/react/24/outline'
import Image from 'next/image'
import { Content, getTitle, isMovie } from '../../typings'
import { useVoiceInput } from '../../hooks/useVoiceInput'
import { useToast } from '../../hooks/useToast'
import { useSessionData } from '../../hooks/useSessionData'
import { filterDislikedContent } from '../../utils/contentFilter'

interface InlineSearchBarProps {
    onAddContent: (content: Content) => void
    existingContentIds: number[]
    placeholder?: string
}

export default function InlineSearchBar({
    onAddContent,
    existingContentIds,
    placeholder = 'Search to add movies or TV shows...',
}: InlineSearchBarProps) {
    const { showError } = useToast()
    const { hiddenMovies } = useSessionData()
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<Content[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [showResults, setShowResults] = useState(false)
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    // Voice input
    const { isListening, isSupported, transcript, startListening, stopListening } = useVoiceInput({
        onResult: (finalTranscript) => {
            setQuery(finalTranscript)
        },
        onError: (error) => {
            showError('Voice input error', error)
        },
    })

    // Show live transcript while listening
    useEffect(() => {
        if (isListening && transcript) {
            setQuery(transcript)
        }
    }, [transcript, isListening])

    // Debounced search
    useEffect(() => {
        if (query.trim().length < 2) {
            setResults([])
            setShowResults(false)
            return
        }

        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current)
        }

        searchTimeoutRef.current = setTimeout(async () => {
            setIsLoading(true)
            try {
                const response = await fetch(
                    `/api/search?query=${encodeURIComponent(query)}&page=1`
                )
                if (response.ok) {
                    const data = await response.json()
                    // Filter out hidden content
                    const withoutHidden = filterDislikedContent(data.results, hiddenMovies)
                    // Filter out already added content
                    const filtered = withoutHidden.filter(
                        (item: Content) => !existingContentIds.includes(item.id)
                    )
                    setResults(filtered.slice(0, 10)) // Limit to 10 results
                    setShowResults(true)
                }
            } catch (error) {
                console.error('Search error:', error)
            } finally {
                setIsLoading(false)
            }
        }, 300)

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current)
            }
        }
    }, [query, existingContentIds])

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node) &&
                inputRef.current &&
                !inputRef.current.contains(event.target as Node)
            ) {
                setShowResults(false)
            }
        }

        if (showResults) {
            document.addEventListener('mousedown', handleClickOutside)
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [showResults])

    const handleAddContent = (content: Content) => {
        onAddContent(content)
        setQuery('')
        setResults([])
        setShowResults(false)
        inputRef.current?.focus()
    }

    const handleClear = () => {
        setQuery('')
        setResults([])
        setShowResults(false)
        inputRef.current?.focus()
    }

    const handleVoiceToggle = async () => {
        if (isListening) {
            stopListening()
        } else {
            await startListening()
        }
    }

    return (
        <div className="relative">
            {/* Screen reader announcements for accessibility */}
            <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
                {isListening && 'Voice input active. Listening for search.'}
                {!isListening && transcript && 'Voice input stopped. Transcript captured.'}
            </div>

            {/* Search Input */}
            <div className="relative">
                <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => query.length >= 2 && setShowResults(true)}
                    placeholder={placeholder}
                    className="w-full h-12 pl-12 pr-24 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {/* Listening Indicator */}
                    {isListening && (
                        <span className="text-xs text-blue-400 mr-1 animate-pulse font-medium">
                            Listening...
                        </span>
                    )}
                    {/* Voice Input Button */}
                    {isSupported && (
                        <button
                            onClick={handleVoiceToggle}
                            className={`transition-all duration-200 ${
                                isListening ? 'text-blue-500' : 'text-gray-400 hover:text-white'
                            }`}
                            title={isListening ? 'Stop voice input' : 'Start voice input'}
                            aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
                            aria-pressed={isListening}
                        >
                            <div className="relative">
                                {/* Animated pulsing rings when listening */}
                                {isListening && (
                                    <>
                                        <span className="absolute inset-0 rounded-full bg-blue-500/40 animate-ping" />
                                        <span
                                            className="absolute inset-0 rounded-full bg-blue-500/30 animate-pulse"
                                            style={{ animationDuration: '1s' }}
                                        />
                                        <span
                                            className="absolute inset-0 rounded-full bg-blue-500/20 animate-pulse"
                                            style={{
                                                animationDuration: '1.5s',
                                                animationDelay: '0.3s',
                                            }}
                                        />
                                    </>
                                )}
                                <MicrophoneIcon
                                    className={`h-5 w-5 relative z-10 transition-all ${
                                        isListening
                                            ? 'scale-110 drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]'
                                            : ''
                                    }`}
                                />
                            </div>
                        </button>
                    )}
                    {/* Clear Button */}
                    {query && !isListening && (
                        <button
                            onClick={handleClear}
                            className="text-gray-400 hover:text-white transition-colors"
                        >
                            <XMarkIcon className="h-5 w-5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Search Results Dropdown */}
            {showResults && (
                <div
                    ref={dropdownRef}
                    className="absolute top-full mt-2 w-full bg-gray-900 border border-gray-700 rounded-lg shadow-2xl max-h-96 overflow-y-auto z-50"
                >
                    {isLoading && <div className="p-4 text-center text-gray-400">Searching...</div>}

                    {!isLoading && results.length === 0 && (
                        <div className="p-4 text-center text-gray-400">
                            No results found for "{query}"
                        </div>
                    )}

                    {!isLoading && results.length > 0 && (
                        <div className="p-2">
                            {results.map((content) => (
                                <div
                                    key={content.id}
                                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800 cursor-pointer group transition-colors"
                                    onClick={() => handleAddContent(content)}
                                >
                                    {/* Poster */}
                                    <div className="flex-shrink-0 w-12 h-16 bg-gray-800 rounded overflow-hidden relative">
                                        {content.poster_path ? (
                                            <Image
                                                src={`https://image.tmdb.org/t/p/w92${content.poster_path}`}
                                                alt={getTitle(content)}
                                                fill
                                                className="object-cover"
                                                sizes="48px"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">
                                                No Image
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-sm font-medium text-white truncate">
                                                {getTitle(content)}
                                            </h4>
                                            <span
                                                className={`flex-shrink-0 px-2 py-0.5 text-xs rounded-full ${
                                                    isMovie(content)
                                                        ? 'bg-blue-600 text-white'
                                                        : 'bg-purple-600 text-white'
                                                }`}
                                            >
                                                {isMovie(content) ? 'Movie' : 'TV'}
                                            </span>
                                        </div>
                                        {content.vote_average > 0 && (
                                            <div className="flex items-center gap-1 mt-1">
                                                <span className="text-yellow-400 text-xs">⭐</span>
                                                <span className="text-gray-400 text-xs">
                                                    {content.vote_average.toFixed(1)}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Add Button */}
                                    <button className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <PlusIcon className="h-5 w-5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
