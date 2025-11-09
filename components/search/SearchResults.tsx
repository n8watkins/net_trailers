import React, { useState, useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { useSearch } from '../../hooks/useSearch'
import { Content } from '../../typings'
import { useAppStore } from '../../stores/appStore'
import useUserData from '../../hooks/useUserData'
import { filterDislikedContent } from '../../utils/contentFilter'
import ContentCard from '../common/ContentCard'

interface SearchResultsProps {
    className?: string
}

export default function SearchResults({ className = '' }: SearchResultsProps) {
    const pathname = usePathname()
    const isOnSearchPage = pathname === '/search'

    const {
        results,
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

    const modal = useAppStore((state) => state.modal)
    const { hiddenMovies } = useUserData()

    // Filter out disliked content from search results
    const filteredResults = filterDislikedContent(results, hiddenMovies)

    // Keyboard navigation state (only for search page)
    const [selectedIndex, setSelectedIndex] = useState(-1)
    const resultRefs = useRef<(HTMLDivElement | null)[]>([])
    const containerRef = useRef<HTMLDivElement>(null)

    // Trigger click on selected card (for keyboard navigation)
    const triggerCardClick = useCallback((index: number) => {
        const cardElement = resultRefs.current[index]
        if (cardElement) {
            // Find and click the ContentCard within the wrapper
            const contentCard = cardElement.querySelector('[role="button"]') as HTMLElement
            if (contentCard) {
                contentCard.click()
            }
        }
    }, [])

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
            if (!isOnSearchPage || filteredResults.length === 0 || modal.isOpen) return

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
                triggerCardClick(selectedIndex)
            } else if (e.key === 'Escape') {
                e.preventDefault()
                setSelectedIndex(-1)
            }
        },
        [isOnSearchPage, filteredResults, selectedIndex, modal.isOpen, triggerCardClick]
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

            {/* Results Grid - Card Layout */}
            <div className="flex flex-wrap gap-6 animate-fade-in" ref={containerRef}>
                {filteredResults.map((item: Content, index) => (
                    <div
                        key={`${item.id}-${index}`}
                        ref={(el) => {
                            resultRefs.current[index] = el
                        }}
                        className={`relative ${
                            isOnSearchPage && selectedIndex === index
                                ? 'ring-2 ring-red-500 rounded-lg'
                                : ''
                        }`}
                    >
                        <ContentCard content={item} size="medium" />
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
