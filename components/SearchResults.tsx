import React from 'react'
import { useSearch } from '../hooks/useSearch'
import Thumbnail from './Thumbnail'
import { Content, isMovie, getTitle } from '../typings'

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
        query
    } = useSearch()

    if (!hasSearched && !isLoading) {
        return null
    }

    if (error) {
        return (
            <div className={`${className} flex flex-col items-center justify-center py-12`}>
                <div className="text-center">
                    <div className="text-red-400 text-lg font-medium mb-2">Search Error</div>
                    <div className="text-gray-400">{error}</div>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                        Try Again
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
                            Searched for: <span className="text-white font-medium">"{query}"</span>
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
                                {' '}for "{query}"
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

            {/* Results Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {results.map((item: Content, index) => (
                    <div key={`${item.id}-${index}`} className="relative group">
                        <Thumbnail content={item} />

                        {/* Media Type Badge */}
                        <div className="absolute top-2 left-2 z-10">
                            <span className={`
                                px-2 py-1 text-xs font-medium rounded
                                ${isMovie(item)
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-green-600 text-white'
                                }
                            `}>
                                {isMovie(item) ? 'Movie' : 'TV'}
                            </span>
                        </div>

                        {/* Title Overlay */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                            <h3 className="text-white text-sm font-medium line-clamp-2">
                                {getTitle(item)}
                            </h3>
                            <div className="text-gray-300 text-xs mt-1">
                                {isMovie(item)
                                    ? item.release_date?.split('-')[0]
                                    : item.first_air_date?.split('-')[0]
                                }
                                {item.vote_average > 0 && (
                                    <span className="ml-2">
                                        ⭐ {item.vote_average.toFixed(1)}
                                    </span>
                                )}
                            </div>
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