import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/router'
import Image from 'next/image'
import { useSearch } from '../hooks/useSearch'
import { Content, isMovie, getTitle, getYear, getContentType } from '../typings'
import { useRecoilState, useRecoilValue } from 'recoil'
import { modalState, movieState, autoPlayWithSoundState } from '../atoms/modalAtom'
import { userSessionState } from '../atoms/userDataAtom'
import { filterDislikedContent } from '../utils/contentFilter'

interface SearchResultsProps {
    className?: string
}

export default function SearchResults({ className = '' }: SearchResultsProps) {
    const router = useRouter()
    const isOnSearchPage = router.pathname === '/search'

    const {
        results,
        allResults,
        isLoading,
        error,
        hasSearched,
        isEmpty,
        totalResults,
        filteredTotalResults,
        hasMore,
        loadMore,
        query,
        performSearch,
        filters,
        hasAllResults,
        isLoadingAll,
    } = useSearch()

    const [showModal, setShowModal] = useRecoilState(modalState)
    const [currentContent, setCurrentContent] = useRecoilState(movieState)
    const [autoPlayWithSound, setAutoPlayWithSound] = useRecoilState(autoPlayWithSoundState)
    const userSession = useRecoilValue(userSessionState)

    // Filter out disliked content from search results
    const filteredResults = filterDislikedContent(results, userSession.preferences.hiddenMovies)

    // Keyboard navigation state (only for search page)
    const [selectedIndex, setSelectedIndex] = useState(-1)
    const resultRefs = useRef<(HTMLDivElement | null)[]>([])
    const containerRef = useRef<HTMLDivElement>(null)

    const handleContentClick = useCallback(
        (content: Content) => {
            setAutoPlayWithSound(false) // More info mode - starts muted
            setShowModal(true)
            setCurrentContent(content)
        },
        [setAutoPlayWithSound, setShowModal, setCurrentContent]
    )

    // Scroll selected element into view
    const scrollToSelected = (index: number) => {
        if (resultRefs.current[index]) {
            resultRefs.current[index]?.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'nearest',
            })
        }
    }

    // Keyboard navigation handler
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            // Don't handle keyboard events if modal is open or not on search page
            if (!isOnSearchPage || filteredResults.length === 0 || showModal) return

            // Don't interfere with dropdown/select interactions
            const target = e.target as HTMLElement
            if (
                target &&
                (target.tagName === 'SELECT' ||
                    target.tagName === 'OPTION' ||
                    target.closest('select'))
            ) {
                return
            }

            if (e.key === 'ArrowDown') {
                e.preventDefault()
                setSelectedIndex((prev) => {
                    const newIndex = prev < filteredResults.length - 1 ? prev + 1 : prev
                    if (newIndex !== prev) {
                        scrollToSelected(newIndex)
                    }
                    return newIndex
                })
            } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setSelectedIndex((prev) => {
                    const newIndex = prev > 0 ? prev - 1 : prev
                    if (newIndex !== prev) {
                        scrollToSelected(newIndex)
                    }
                    return newIndex
                })
            } else if (e.key === 'Enter' && selectedIndex >= 0) {
                e.preventDefault()
                const selectedContent = filteredResults[selectedIndex]
                if (selectedContent) {
                    handleContentClick(selectedContent)
                }
            } else if (e.key === 'Escape') {
                e.preventDefault()
                setSelectedIndex(-1)
            }
        },
        [isOnSearchPage, filteredResults, selectedIndex, showModal, handleContentClick]
    )

    // Set up keyboard event listeners
    useEffect(() => {
        if (isOnSearchPage) {
            document.addEventListener('keydown', handleKeyDown)
            return () => document.removeEventListener('keydown', handleKeyDown)
        }
    }, [isOnSearchPage, handleKeyDown])

    // Reset selection when results change
    useEffect(() => {
        setSelectedIndex(-1)
    }, [filteredResults])

    if (!hasSearched && !isLoading && results.length === 0) {
        return null
    }

    if (error) {
        return (
            <div className={`${className} flex flex-col items-center justify-center py-12`}>
                <div className="text-center">
                    <div className="text-red-400 text-lg font-medium mb-2">Search Error</div>
                    <div className="text-gray-400">{error}</div>
                    <button
                        onClick={() => {
                            if (query.trim()) {
                                performSearch(query)
                            }
                        }}
                        className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Retrying...' : 'Try Again'}
                    </button>
                </div>
            </div>
        )
    }

    if (isEmpty || (hasSearched && filteredResults.length === 0 && results.length > 0)) {
        return (
            <div className={`${className} flex flex-col items-center justify-center py-12`}>
                <div className="text-center">
                    {isEmpty ? (
                        <>
                            <div className="text-gray-400 text-lg mb-2">No results found</div>
                            <div className="text-gray-500">
                                Try adjusting your search terms or filters
                            </div>
                            {query && (
                                <div className="mt-4 text-sm text-gray-400">
                                    Searched for:{' '}
                                    <span className="text-white font-medium">
                                        &quot;{query}&quot;
                                    </span>
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            <div className="text-gray-400 text-lg mb-2">
                                All results filtered out
                            </div>
                            <div className="text-gray-500">
                                All search results were previously disliked and have been hidden
                            </div>
                            {query && (
                                <div className="mt-4 text-sm text-gray-400">
                                    Searched for:{' '}
                                    <span className="text-white font-medium">
                                        &quot;{query}&quot;
                                    </span>
                                    <br />
                                    <span className="text-xs">
                                        Found {results.length} results, but all were filtered out
                                    </span>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className={className}>
            {/* Results Header */}
            {hasSearched && !isLoading && filteredResults.length > 0 && (
                <div className="mb-6 animate-fade-in">
                    <h2 className="text-xl font-semibold text-white mb-2">
                        Search Results
                        {query && (
                            <span className="text-gray-400 font-normal">
                                {' '}
                                for &quot;{query}&quot;
                            </span>
                        )}
                    </h2>
                    <div className="text-gray-400 text-sm">
                        {totalResults > 0 && (
                            <>
                                {/* Check if any filters are active */}
                                {Object.values(filters).some((value) => value !== 'all') ? (
                                    /* Filters are active - show filtered count */
                                    hasAllResults ? (
                                        /* We have all results cached */
                                        <>
                                            Showing {filteredTotalResults} results matching your
                                            filters out of {totalResults} total
                                        </>
                                    ) : (
                                        /* Still loading all results */
                                        <>
                                            Showing {filteredTotalResults} filtered results
                                            {isLoadingAll && (
                                                <span className="text-yellow-400">
                                                    {' '}
                                                    (loading more...)
                                                </span>
                                            )}
                                        </>
                                    )
                                ) : (
                                    /* No filters active - show regular pagination count */
                                    <>
                                        Showing {results.length} of {totalResults} results
                                    </>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Results List - Horizontal Row Layout */}
            <div className="space-y-2 animate-fade-in" ref={containerRef}>
                {filteredResults.map((item: Content, index) => (
                    <div
                        key={`${item.id}-${index}`}
                        ref={(el) => {
                            resultRefs.current[index] = el
                        }}
                        className={`flex items-center rounded-lg p-4 cursor-pointer group border transition-all duration-300 ease-in-out ${
                            isOnSearchPage && selectedIndex === index
                                ? 'bg-red-600/30 border-red-500/50 shadow-lg shadow-red-500/20'
                                : 'bg-gray-800/50 hover:bg-gray-700/50 border-transparent'
                        }`}
                        onClick={() => handleContentClick(item)}
                    >
                        {/* Movie Poster - Using standard ContentCard but in horizontal layout */}
                        <div className="flex-shrink-0 w-16 h-24 sm:w-20 sm:h-30 md:w-24 md:h-36 relative rounded-lg overflow-hidden bg-gray-700">
                            {item.poster_path ? (
                                <Image
                                    src={`https://image.tmdb.org/t/p/w200${item.poster_path}`}
                                    alt={getTitle(item)}
                                    width={200}
                                    height={300}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    <svg
                                        className="w-8 h-8"
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
                        <div className="flex-1 ml-4 min-w-0">
                            {/* Title and Year */}
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-white font-semibold text-lg truncate group-hover:text-red-400 transition-colors">
                                        {getTitle(item)}
                                    </h3>
                                    <p className="text-gray-400 text-sm">{getYear(item)}</p>
                                </div>
                            </div>

                            {/* Rating, Media Type, and Overview */}
                            <div className="flex items-center gap-4 mb-2">
                                {/* Rating */}
                                {item.vote_average > 0 && (
                                    <div className="flex items-center gap-1">
                                        <span className="text-yellow-400">⭐</span>
                                        <span className="text-white text-sm font-medium">
                                            {item.vote_average.toFixed(1)}
                                        </span>
                                    </div>
                                )}

                                {/* Media Type Badge */}
                                <span
                                    className={`
                                    px-2 py-1 text-xs font-medium rounded-full
                                    ${
                                        isMovie(item)
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-green-600 text-white'
                                    }
                                `}
                                >
                                    {getContentType(item)}
                                </span>
                            </div>

                            {/* Overview */}
                            {item.overview && (
                                <p className="text-gray-300 text-sm line-clamp-2 md:line-clamp-1">
                                    {item.overview}
                                </p>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Loading More */}
            {(isLoading || isLoadingAll) && filteredResults.length > 0 && (
                <div className="flex justify-center py-8">
                    <div className="flex items-center gap-2">
                        <div className="animate-spin h-8 w-8 border-2 border-red-500 border-t-transparent rounded-full"></div>
                        {isLoadingAll && (
                            <span className="text-gray-400 text-sm">
                                Loading all results for filtering...
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Load More Button */}
            {hasMore && !isLoading && !isLoadingAll && (
                <div className="flex justify-center mt-8">
                    <button
                        onClick={loadMore}
                        className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors border border-gray-600"
                    >
                        Load More Results
                    </button>
                </div>
            )}

            {/* Initial Loading */}
            {isLoading && filteredResults.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12">
                    <div className="animate-spin h-8 w-8 border-2 border-red-500 border-t-transparent rounded-full mb-4"></div>
                    <div className="text-gray-400">Searching...</div>
                </div>
            )}
        </div>
    )
}
