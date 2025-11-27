import React, { useState, useEffect, useRef, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useSearch } from '../../hooks/useSearch'
import { Content, TrendingPerson } from '../../typings'
import { useAppStore } from '../../stores/appStore'
import { useSearchStore } from '../../stores/searchStore'
import useUserData from '../../hooks/useUserData'
import { filterDislikedContent } from '../../utils/contentFilter'
import ContentCard from '../common/ContentCard'
import ActorCard from '../actors/ActorCard'
import { getRoleFilterForDepartment } from '../../utils/personRole'

interface SearchResultsProps {
    className?: string
}

export default function SearchResults({ className = '' }: SearchResultsProps) {
    const pathname = usePathname()
    const router = useRouter()
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

    // Get people search state from store
    const searchMode = useSearchStore((state) => state.searchMode)
    const peopleResults = useSearchStore((state) => state.filteredPeopleResults)

    const modal = useAppStore((state) => state.modal)
    const { hiddenMovies } = useUserData()

    // Filter out disliked content from search results (only for content mode)
    const filteredResults =
        searchMode === 'content' ? filterDislikedContent(results, hiddenMovies) : []

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

    // Get the current results based on search mode
    const currentResults = searchMode === 'content' ? filteredResults : peopleResults
    const currentResultsLength = currentResults.length

    // Handle person click
    const handlePersonClick = useCallback(
        (person: TrendingPerson) => {
            const role = getRoleFilterForDepartment(person.known_for_department)
            const url = role ? `/person/${person.id}?role=${role}` : `/person/${person.id}`
            router.push(url)
        },
        [router]
    )

    // Keyboard navigation handler
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            // Don't handle keyboard events if modal is open or not on search page
            if (!isOnSearchPage || currentResultsLength === 0 || modal.isOpen) return

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
                    const newIndex = prev < currentResultsLength - 1 ? prev + 1 : prev
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
                if (searchMode === 'people' && peopleResults[selectedIndex]) {
                    handlePersonClick(peopleResults[selectedIndex])
                } else {
                    triggerCardClick(selectedIndex)
                }
            } else if (e.key === 'Escape') {
                e.preventDefault()
                setSelectedIndex(-1)
            }
        },
        [
            isOnSearchPage,
            currentResultsLength,
            selectedIndex,
            modal.isOpen,
            triggerCardClick,
            searchMode,
            peopleResults,
            handlePersonClick,
        ]
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
    }, [currentResults])

    // Determine if we should show results based on mode
    const hasResults = searchMode === 'content' ? results.length > 0 : peopleResults.length > 0
    const showEmptyState =
        searchMode === 'content'
            ? isEmpty || (hasSearched && filteredResults.length === 0 && results.length > 0)
            : hasSearched && peopleResults.length === 0 && !isLoading

    if (!hasSearched && !isLoading && !hasResults) {
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

    if (showEmptyState) {
        return (
            <div className={`${className} flex flex-col items-center justify-center py-12`}>
                <div className="text-center">
                    {searchMode === 'people' ? (
                        <>
                            <div className="text-gray-400 text-lg mb-2">No people found</div>
                            <div className="text-gray-500">
                                Try adjusting your search terms or department filter
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
                    ) : isEmpty ? (
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
            {hasSearched && !isLoading && currentResultsLength > 0 && (
                <div className="mb-6 animate-fade-in">
                    <h2 className="text-xl font-semibold text-white mb-2">
                        {searchMode === 'people' ? 'People Results' : 'Search Results'}
                        {query && (
                            <span className="text-gray-400 font-normal">
                                {' '}
                                for &quot;{query}&quot;
                            </span>
                        )}
                    </h2>
                    <div className="text-gray-400 text-sm">
                        {searchMode === 'people' ? (
                            <>Showing {peopleResults.length} people</>
                        ) : (
                            totalResults > 0 && (
                                <>
                                    {/* Check if any filters are active */}
                                    {Object.entries(filters).some(([key, value]) => {
                                        if (key === 'sortBy') return value !== 'popularity.desc'
                                        if (key === 'genres')
                                            return Array.isArray(value) && value.length > 0
                                        return value !== 'all'
                                    }) ? (
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
                            )
                        )}
                    </div>
                </div>
            )}

            {/* Results Grid - Conditional based on search mode */}
            {searchMode === 'people' ? (
                /* People Results Grid */
                <div
                    className="flex flex-wrap gap-6 animate-fade-in justify-center sm:justify-start"
                    ref={containerRef}
                >
                    {peopleResults.map((person: TrendingPerson, index) => (
                        <div
                            key={`person-${person.id}-${index}`}
                            ref={(el) => {
                                resultRefs.current[index] = el
                            }}
                            className={`relative ${
                                isOnSearchPage && selectedIndex === index
                                    ? 'ring-2 ring-red-500 rounded-full'
                                    : ''
                            }`}
                        >
                            <ActorCard
                                actor={person}
                                defaultRole={getRoleFilterForDepartment(
                                    person.known_for_department
                                )}
                            />
                        </div>
                    ))}
                </div>
            ) : (
                /* Content Results Grid */
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
                            <ContentCard content={item} size="normal" />
                        </div>
                    ))}
                </div>
            )}

            {/* Loading More (content mode only) */}
            {searchMode === 'content' &&
                (isLoading || isLoadingAll) &&
                filteredResults.length > 0 && (
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

            {/* Load More Button (content mode only) */}
            {searchMode === 'content' && hasMore && !isLoading && !isLoadingAll && (
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
            {isLoading && currentResultsLength === 0 && (
                <div className="flex flex-col items-center justify-center py-12">
                    <div className="animate-spin h-8 w-8 border-2 border-red-500 border-t-transparent rounded-full mb-4"></div>
                    <div className="text-gray-400">
                        {searchMode === 'people' ? 'Searching for people...' : 'Searching...'}
                    </div>
                </div>
            )}
        </div>
    )
}
