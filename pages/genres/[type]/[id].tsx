import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { ChevronDownIcon } from '@heroicons/react/24/outline'
import { NextPage } from 'next'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Header from '../../../components/Header'
import Modal from '../../../components/Modal'
import Thumbnail from '../../../components/Thumbnail'
import { Content } from '../../../typings'
import { movieCache } from '../../../utils/apiCache'

interface GenrePageProps {}

const GenrePage: NextPage<GenrePageProps> = () => {
    const router = useRouter()
    const { type, id, name } = router.query
    const [content, setContent] = useState<Content[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [page, setPage] = useState(1)
    const [hasMore, setHasMore] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [maxPages] = useState(10)
    const observerRef = useRef<IntersectionObserver | null>(null)
    const loadMoreRef = useRef<HTMLDivElement | null>(null)

    // Progressive loading states
    const [isStreaming, setIsStreaming] = useState(false)
    const [streamingProgress, setStreamingProgress] = useState({
        checked: 0,
        withTrailers: 0,
        currentBatch: 0,
    })

    // Filter states
    const [filters, setFilters] = useState({
        sort_by: 'popularity.desc',
        rating: 'all',
        year: 'all',
    })

    const genreId = Array.isArray(id) ? id[0] : id
    const mediaType = Array.isArray(type) ? type[0] : type
    const genreName = Array.isArray(name) ? name[0] : name

    const getColumnsPerRow = () => {
        if (typeof window === 'undefined') return 6
        const width = window.innerWidth
        if (width >= 1280) return 6 // xl
        if (width >= 1024) return 5 // lg
        if (width >= 768) return 4 // md
        if (width >= 640) return 3 // sm
        return 2 // default
    }

    const [columnsPerRow, setColumnsPerRow] = useState(6)

    useEffect(() => {
        const updateColumns = () => setColumnsPerRow(getColumnsPerRow())
        updateColumns()
        window.addEventListener('resize', updateColumns)
        return () => window.removeEventListener('resize', updateColumns)
    }, [])

    const contentToRender = useMemo(() => {
        const totalCompleteRows = Math.floor(content.length / columnsPerRow)
        return content.slice(0, totalCompleteRows * columnsPerRow)
    }, [content, columnsPerRow])

    // Progressive content streaming with batch processing
    const streamGenreContent = useCallback(async () => {
        if (!genreId || !mediaType) return

        setLoading(page === 1)
        setError(null)
        setIsStreaming(true)
        setStreamingProgress({ checked: 0, withTrailers: 0, currentBatch: 0 })

        try {
            const batchSize = 6
            let currentPage = page
            let totalPages = 1
            let contentAdded = 0
            const targetBatches = 3 // Process 3 batches initially

            console.log(`🎬 Starting progressive streaming for ${mediaType} genre ${genreId}`)

            for (
                let batchIndex = 0;
                batchIndex < targetBatches && currentPage <= totalPages;
                batchIndex++
            ) {
                setStreamingProgress((prev) => ({ ...prev, currentBatch: batchIndex + 1 }))

                const filterParams = new URLSearchParams()
                filterParams.append('page', currentPage.toString())
                filterParams.append('sort_by', filters.sort_by)

                // Convert rating filter to API format
                if (filters.rating !== 'all') {
                    const ratingValue = filters.rating.replace('+', '')
                    filterParams.append('vote_average_gte', ratingValue)
                }

                // Convert year filter to API format
                if (filters.year !== 'all') {
                    if (filters.year.endsWith('s')) {
                        const decade = parseInt(filters.year)
                        const yearParam =
                            mediaType === 'movie' ? 'primary_release_year' : 'first_air_date_year'
                        filterParams.append(yearParam, decade.toString())
                    } else {
                        const yearParam =
                            mediaType === 'movie' ? 'primary_release_year' : 'first_air_date_year'
                        filterParams.append(yearParam, filters.year)
                    }
                }

                console.log(`📡 Streaming batch ${batchIndex + 1}, page ${currentPage}...`)
                const response = await fetch(
                    `/api/genres/${mediaType}/${genreId}?${filterParams.toString()}`
                )

                if (!response.ok) {
                    throw new Error(`Failed to fetch ${mediaType} content for genre ${genreId}`)
                }

                const data = await response.json()
                totalPages = data.total_pages

                // Add media_type to each item
                const enrichedResults = data.results.map((item: any) => ({
                    ...item,
                    media_type: mediaType,
                }))

                // Process items in smaller chunks for progressive display
                for (let i = 0; i < enrichedResults.length; i += batchSize) {
                    const chunk = enrichedResults.slice(i, i + batchSize)

                    console.log(`🎬 Processing chunk of ${chunk.length} items...`)

                    // Check trailers for this chunk
                    const trailerChecks = await Promise.allSettled(
                        chunk.map(async (item: Content, index) => {
                            try {
                                const mediaTypeForApi = item.media_type === 'tv' ? 'tv' : 'movie'
                                const detailResponse = await fetch(
                                    `/api/movies/details/${item.id}?media_type=${mediaTypeForApi}`
                                )

                                setStreamingProgress((prev) => ({
                                    ...prev,
                                    checked: prev.checked + 1,
                                }))

                                if (!detailResponse.ok) {
                                    return null
                                }

                                const detailData = await detailResponse.json()
                                const hasTrailer =
                                    detailData?.videos?.results?.some(
                                        (video: any) => video.type === 'Trailer'
                                    ) || false

                                if (hasTrailer) {
                                    setStreamingProgress((prev) => ({
                                        ...prev,
                                        withTrailers: prev.withTrailers + 1,
                                    }))
                                }

                                return hasTrailer ? item : null
                            } catch (error) {
                                setStreamingProgress((prev) => ({
                                    ...prev,
                                    checked: prev.checked + 1,
                                }))
                                console.warn(
                                    `Error checking trailer for ${item.media_type} ${item.id}:`,
                                    error
                                )
                                return null
                            }
                        })
                    )

                    // Collect items with trailers from this chunk
                    const itemsWithTrailers = trailerChecks
                        .filter(
                            (result): result is PromiseFulfilledResult<Content | null> =>
                                result.status === 'fulfilled' && result.value !== null
                        )
                        .map((result) => result.value as Content)

                    // Immediately add found items to display
                    if (itemsWithTrailers.length > 0) {
                        setContent((prev) =>
                            page === 1 && contentAdded === 0
                                ? itemsWithTrailers
                                : [...prev, ...itemsWithTrailers]
                        )
                        contentAdded += itemsWithTrailers.length
                        console.log(
                            `✅ Found ${itemsWithTrailers.length} items with trailers in chunk. Total displayed: ${contentAdded}`
                        )
                    }

                    // Small delay between chunks to show progress
                    await new Promise((resolve) => setTimeout(resolve, 200))
                }

                currentPage++
            }

            setHasMore(currentPage <= totalPages && currentPage <= maxPages)
            setPage(currentPage)

            console.log(
                `🎬 Streaming batch complete: ${contentAdded} items with trailers displayed`
            )

            // Check if no content found and we're using problematic filters
            if (
                contentAdded === 0 &&
                (filters.sort_by === 'popularity.asc' || filters.sort_by === 'vote_average.asc')
            ) {
                setError(
                    `No content with trailers found for "${filters.sort_by === 'popularity.asc' ? 'Least Popular' : 'Lowest Rated'}" sorting. Try "Most Popular" or other filters instead.`
                )
            }
        } catch (err) {
            console.error('Error streaming genre content:', err)
            setError(err instanceof Error ? err.message : 'Failed to load content')
        } finally {
            setLoading(false)
            setIsStreaming(false)
        }
    }, [genreId, mediaType, page, maxPages, filters])

    useEffect(() => {
        streamGenreContent()
    }, [streamGenreContent])

    // Reset filters when changing genre/type
    useEffect(() => {
        setFilters({
            sort_by: 'popularity.desc',
            rating: 'all',
            year: 'all',
        })
        setPage(1)
        setContent([])
    }, [genreId, mediaType])

    const handleFilterChange = (key: string, value: string) => {
        setFilters((prev) => ({ ...prev, [key]: value }))
        setPage(1)
        setContent([])
    }

    const clearFilters = () => {
        setFilters({
            sort_by: 'popularity.desc',
            rating: 'all',
            year: 'all',
        })
        setPage(1)
        setContent([])
    }

    const hasActiveFilters = filters.rating !== 'all' || filters.year !== 'all'

    const loadMore = useCallback(() => {
        if (hasMore && !loading && !loadingMore) {
            setLoadingMore(true)
            setPage((prev) => prev + 1)
        }
    }, [hasMore, loading, loadingMore])

    useEffect(() => {
        if (loadingMore && !loading) {
            setLoadingMore(false)
        }
    }, [loading, loadingMore])

    useEffect(() => {
        const currentObserver = observerRef.current
        const currentLoadMoreRef = loadMoreRef.current

        if (currentLoadMoreRef && hasMore) {
            const rootMargin =
                typeof window !== 'undefined' ? `${window.innerHeight * 1.5}px` : '500px'

            const observer = new IntersectionObserver(
                (entries) => {
                    if (entries[0].isIntersecting) {
                        loadMore()
                    }
                },
                { threshold: 1.0, rootMargin }
            )

            observer.observe(currentLoadMoreRef)
            observerRef.current = observer

            return () => {
                if (currentObserver) {
                    currentObserver.disconnect()
                }
            }
        }

        return () => {
            if (currentObserver) {
                currentObserver.disconnect()
            }
        }
    }, [hasMore, loadMore])

    if (loading && page === 1) {
        return (
            <div className="relative min-h-screen bg-gradient-to-b">
                <Head>
                    <title>Loading... - NetTrailer</title>
                </Head>
                <Header />
                <main className="relative pl-4 pb-16 lg:space-y-24 lg:pl-16">
                    <div className="flex items-center justify-center h-96">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
                            <p className="text-white">Loading {genreName} content...</p>
                        </div>
                    </div>
                </main>
            </div>
        )
    }

    if (error) {
        return (
            <div className="relative min-h-screen bg-gradient-to-b">
                <Head>
                    <title>Error - NetTrailer</title>
                </Head>
                <Header />
                <main className="relative pl-4 pb-16 lg:space-y-24 lg:pl-16">
                    <div className="flex items-center justify-center h-96">
                        <div className="text-center">
                            <div className="text-6xl mb-4">😵</div>
                            <h2 className="text-2xl font-semibold text-white mb-2">
                                Something went wrong
                            </h2>
                            <p className="text-gray-400 mb-4">{error}</p>
                            <button
                                onClick={() => router.reload()}
                                className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                            >
                                Try Again
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        )
    }

    return (
        <div className="relative min-h-screen bg-gradient-to-b">
            <Head>
                <title>
                    {genreName
                        ? `${genreName} ${mediaType === 'movie' ? 'Movies' : 'TV Shows'}`
                        : 'Genre'}{' '}
                    - NetTrailer
                </title>
                <meta
                    name="description"
                    content={`Discover ${genreName} ${mediaType === 'movie' ? 'movies' : 'TV shows'}`}
                />
            </Head>

            <Header />

            <main className="relative pl-4 pb-16 lg:space-y-24 lg:pl-16">
                <div className="flex flex-col space-y-8 py-16 md:space-y-12 md:py-20 lg:py-24">
                    {/* Header Section */}
                    <div className="space-y-6">
                        <h1 className="text-3xl font-bold text-white md:text-4xl lg:text-5xl">
                            {genreName} {mediaType === 'movie' ? 'Movies' : 'TV Shows'}
                        </h1>
                        <p className="text-gray-300 text-lg">
                            Discover the best {genreName?.toLowerCase()}{' '}
                            {mediaType === 'movie' ? 'movies' : 'TV shows'}
                        </p>
                    </div>

                    {/* Filter Section */}
                    <div className="flex flex-col space-y-4 lg:flex-row lg:space-y-0 lg:space-x-6 lg:items-end">
                        <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-4 sm:space-y-0">
                            {/* Sort By */}
                            <div className="relative">
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    Sort By
                                </label>
                                <div className="relative">
                                    <select
                                        value={filters.sort_by}
                                        onChange={(e) =>
                                            handleFilterChange('sort_by', e.target.value)
                                        }
                                        className="appearance-none bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 hover:border-gray-500 transition-colors min-w-[120px]"
                                    >
                                        <option value="popularity.desc">Most Popular</option>
                                        <option value="popularity.asc">Least Popular</option>
                                        <option value="vote_average.desc">Highest Rated</option>
                                        <option value="vote_average.asc">Lowest Rated</option>
                                        <option
                                            value={
                                                mediaType === 'movie'
                                                    ? 'release_date.desc'
                                                    : 'first_air_date.desc'
                                            }
                                        >
                                            Newest
                                        </option>
                                        <option
                                            value={
                                                mediaType === 'movie'
                                                    ? 'release_date.asc'
                                                    : 'first_air_date.asc'
                                            }
                                        >
                                            Oldest
                                        </option>
                                        <option value="revenue.desc">Highest Revenue</option>
                                        <option value="vote_count.desc">Most Voted</option>
                                    </select>
                                    <ChevronDownIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                </div>
                            </div>

                            {/* Rating */}
                            <div className="relative">
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    Rating
                                </label>
                                <div className="relative">
                                    <select
                                        value={filters.rating}
                                        onChange={(e) =>
                                            handleFilterChange('rating', e.target.value)
                                        }
                                        className="appearance-none bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 hover:border-gray-500 transition-colors min-w-[120px]"
                                    >
                                        <option value="all">All Ratings</option>
                                        <option value="7.0+">7.0+ ⭐</option>
                                        <option value="8.0+">8.0+ ⭐</option>
                                        <option value="9.0+">9.0+ ⭐</option>
                                    </select>
                                    <ChevronDownIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                </div>
                            </div>

                            {/* Year */}
                            <div className="relative">
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    Year
                                </label>
                                <div className="relative">
                                    <select
                                        value={filters.year}
                                        onChange={(e) => handleFilterChange('year', e.target.value)}
                                        className="appearance-none bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 hover:border-gray-500 transition-colors min-w-[120px]"
                                    >
                                        <option value="all">All Years</option>
                                        <option value="2020s">2020s</option>
                                        <option value="2010s">2010s</option>
                                        <option value="2000s">2000s</option>
                                        <option value="1990s">1990s</option>
                                    </select>
                                    <ChevronDownIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        {hasActiveFilters && (
                            <button
                                onClick={clearFilters}
                                className="self-start lg:self-end px-4 py-2 text-sm text-red-400 hover:text-red-300 border border-red-600 hover:border-red-500 rounded-lg transition-colors"
                            >
                                Clear Filters
                            </button>
                        )}
                    </div>

                    {/* Content Section */}
                    {content.length > 0 || isStreaming ? (
                        <div className="space-y-8">
                            {/* Streaming Progress Notice */}
                            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-gray-300 text-sm">
                                        🎬 Progressive loading - only content with trailers shown
                                        {filters.sort_by === 'popularity.asc' && (
                                            <span className="text-yellow-400 ml-2">
                                                ⚠️ Least popular content may lack trailers
                                            </span>
                                        )}
                                    </p>
                                    {isStreaming && (
                                        <div className="text-xs text-gray-400">
                                            Batch {streamingProgress.currentBatch} • Checked:{' '}
                                            {streamingProgress.checked} • Found:{' '}
                                            {streamingProgress.withTrailers}
                                        </div>
                                    )}
                                </div>
                                {isStreaming && (
                                    <div className="mt-2 w-full bg-gray-700 rounded-full h-2">
                                        <div
                                            className="bg-red-600 h-2 rounded-full transition-all duration-300"
                                            style={{
                                                width: `${Math.min((streamingProgress.withTrailers / 18) * 100, 100)}%`,
                                            }}
                                        ></div>
                                    </div>
                                )}
                            </div>

                            {/* Grid Layout */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6 md:gap-8">
                                {contentToRender.map((item) => (
                                    <div key={item.id} className="flex-shrink-0">
                                        <Thumbnail content={item} hideTitles={false} />
                                    </div>
                                ))}

                                {/* Loading placeholders while streaming */}
                                {isStreaming &&
                                    Array.from({ length: 6 }).map((_, index) => (
                                        <div key={`placeholder-${index}`} className="animate-pulse">
                                            <div className="bg-gray-800 rounded-md aspect-[2/3] flex items-center justify-center">
                                                <div className="text-center">
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mx-auto mb-1"></div>
                                                    <div className="text-xs text-gray-400">
                                                        Checking...
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                            </div>

                            {/* Streaming status indicator */}
                            {isStreaming && (
                                <div className="flex justify-center pt-8">
                                    <div className="text-center">
                                        <div className="animate-pulse rounded-full h-8 w-8 bg-red-600 mb-2 mx-auto"></div>
                                        <p className="text-gray-400 text-sm">
                                            Streaming content with trailers... (
                                            {streamingProgress.withTrailers} found)
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Regular loading indicator for pagination */}
                            {(loading || loadingMore) && !isStreaming && (
                                <div className="flex justify-center pt-8">
                                    <div className="text-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2"></div>
                                        <p className="text-gray-400 text-sm">Loading more...</p>
                                    </div>
                                </div>
                            )}

                            {/* Spacer with clear messaging about footer */}
                            {hasMore && !loading && !isStreaming && (
                                <div className="h-32 flex items-center justify-center">
                                    <div className="text-gray-500 text-sm text-center">
                                        <div className="mb-2">📖 Footer content below</div>
                                        <div>Keep scrolling for more movies...</div>
                                    </div>
                                </div>
                            )}

                            {/* Hidden trigger element positioned much further down */}
                            {hasMore && !loading && !isStreaming && (
                                <div ref={loadMoreRef} className="h-32" />
                            )}

                            {/* End of content indicator */}
                            {!hasMore && content.length > 0 && (
                                <div className="flex justify-center pt-8">
                                    <div className="text-center max-w-md mx-auto">
                                        <p className="text-gray-400 text-sm mb-4">
                                            If you&apos;d like to see more options, please use our
                                            filters above and/or do a specific movie search.
                                        </p>
                                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                            <button
                                                onClick={() =>
                                                    window.scrollTo({ top: 0, behavior: 'smooth' })
                                                }
                                                className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded transition-colors duration-200"
                                            >
                                                Back to Top
                                            </button>
                                            <button
                                                onClick={() => {
                                                    window.scrollTo({ top: 0, behavior: 'smooth' })
                                                    setTimeout(() => {
                                                        const searchInput = document.querySelector(
                                                            'input[type="search"]'
                                                        ) as HTMLInputElement
                                                        if (searchInput) {
                                                            searchInput.focus()
                                                        }
                                                    }, 500)
                                                }}
                                                className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded transition-colors duration-200"
                                            >
                                                Search Movies
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-16">
                            <div className="text-6xl mb-4">🔍</div>
                            <h2 className="text-2xl font-semibold text-white mb-2">
                                No {genreName} {mediaType === 'movie' ? 'movies' : 'TV shows'} found
                            </h2>
                            <p className="text-gray-400">
                                Try browsing other genres or check back later for new content.
                            </p>
                        </div>
                    )}
                </div>
            </main>

            <Modal />
        </div>
    )
}

export default GenrePage
