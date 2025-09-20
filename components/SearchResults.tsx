import React from 'react'
import { useSearch } from '../hooks/useSearch'
import { Content, isMovie, getTitle, getYear, getContentType } from '../typings'
import { useRecoilState } from 'recoil'
import { modalState, movieState, autoPlayWithSoundState } from '../atoms/modalAtom'

interface SearchResultsProps {
    className?: string
}

export default function SearchResults({ className = "" }: SearchResultsProps) {
    const {
        results,
        isLoading,
        error,
        hasSearched,
        isEmpty,
        totalResults,
        hasMore,
        loadMore,
        query,
        performSearch
    } = useSearch()

    const [showModal, setShowModal] = useRecoilState(modalState)
    const [currentContent, setCurrentContent] = useRecoilState(movieState)
    const [autoPlayWithSound, setAutoPlayWithSound] = useRecoilState(autoPlayWithSoundState)

    const handleContentClick = (content: Content) => {
        setAutoPlayWithSound(false) // More info mode - starts muted
        setShowModal(true)
        setCurrentContent(content)
    }

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

    if (isEmpty) {
        return (
            <div className={`${className} flex flex-col items-center justify-center py-12`}>
                <div className="text-center">
                    <div className="text-gray-400 text-lg mb-2">No results found</div>
                    <div className="text-gray-500">
                        Try adjusting your search terms or filters
                    </div>
                    {query && (
                        <div className="mt-4 text-sm text-gray-400">
                            Searched for: <span className="text-white font-medium">&quot;{query}&quot;</span>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className={className}>
            {/* Results Header */}
            {hasSearched && !isLoading && results.length > 0 && (
                <div className="mb-6">
                    <h2 className="text-xl font-semibold text-white mb-2">
                        Search Results
                        {query && (
                            <span className="text-gray-400 font-normal">
                                {' '}for &quot;{query}&quot;
                            </span>
                        )}
                    </h2>
                    <div className="text-gray-400 text-sm">
                        {totalResults > 0 && (
                            <>
                                Showing {results.length} of {totalResults} results
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Results List - Horizontal Row Layout */}
            <div className="space-y-4">
                {results.map((item: Content, index) => (
                    <div
                        key={`${item.id}-${index}`}
                        className="flex items-center bg-gray-800/50 hover:bg-gray-700/50 rounded-lg p-4 transition-all duration-200 cursor-pointer group"
                        onClick={() => handleContentClick(item)}
                    >
                        {/* Movie Poster */}
                        <div className="flex-shrink-0 w-16 h-24 sm:w-20 sm:h-30 md:w-24 md:h-36 relative rounded-lg overflow-hidden bg-gray-700">
                            {item.poster_path ? (
                                <img
                                    src={`https://image.tmdb.org/t/p/w200${item.poster_path}`}
                                    alt={getTitle(item)}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
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
                                    <p className="text-gray-400 text-sm">
                                        {getYear(item)}
                                    </p>
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
                                <span className={`
                                    px-2 py-1 text-xs font-medium rounded-full
                                    ${isMovie(item)
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-green-600 text-white'
                                    }
                                `}>
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
            {isLoading && results.length > 0 && (
                <div className="flex justify-center py-8">
                    <div className="animate-spin h-8 w-8 border-2 border-red-500 border-t-transparent rounded-full"></div>
                </div>
            )}

            {/* Load More Button */}
            {hasMore && !isLoading && (
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
            {isLoading && results.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12">
                    <div className="animate-spin h-8 w-8 border-2 border-red-500 border-t-transparent rounded-full mb-4"></div>
                    <div className="text-gray-400">Searching...</div>
                </div>
            )}
        </div>
    )
}