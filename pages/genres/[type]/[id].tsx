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
    const { type, id, name, title } = router.query
    const [content, setContent] = useState<Content[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [page, setPage] = useState(1)
    const [hasMore, setHasMore] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [maxPages, setMaxPages] = useState(10)
    const observerRef = useRef<IntersectionObserver | null>(null)
    const loadMoreRef = useRef<HTMLDivElement | null>(null)

    const [loadingCounter, setLoadingCounter] = useState(0)
    const [loadingMessage, setLoadingMessage] = useState('')

    // Filter states
    const [filters, setFilters] = useState({
        sort_by: 'popularity.desc',
        rating: 'all',
        year: 'all',
    })

    const genreId = Array.isArray(id) ? id[0] : id
    const mediaType = Array.isArray(type) ? type[0] : type
    const genreName = Array.isArray(name) ? name[0] : name
    const pageTitle = Array.isArray(title) ? title[0] : title

    const contentToRender = useMemo(() => {
        return content
    }, [content])

    // Load genre content with traditional infinite scroll
    const loadGenreContent = useCallback(
        async (pageToLoad = 1) => {
            if (!genreId || !mediaType) return

            const isFirstPage = pageToLoad === 1
            if (isFirstPage) {
                setLoading(true)
            } else {
                setLoadingMore(true)
            }
            setError(null)

            try {
                const filterParams = new URLSearchParams()
                filterParams.append('page', pageToLoad.toString())
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

                const response = await fetch(
                    `/api/genres/${mediaType}/${genreId}?${filterParams.toString()}`
                )

                if (!response.ok) {
                    throw new Error(`Failed to fetch ${mediaType} content for genre ${genreId}`)
                }

                const data = await response.json()

                // Add media_type to each item
                const enrichedResults = data.results.map((item: Content) => ({
                    ...item,
                    media_type: mediaType,
                }))

                setContent((prev) => {
                    if (isFirstPage) {
                        return enrichedResults
                    } else {
                        const existingIds = new Set(prev.map((item) => item.id))
                        const newItems = enrichedResults.filter((item) => !existingIds.has(item.id))
                        return [...prev, ...newItems]
                    }
                })

                setHasMore(pageToLoad < data.total_pages && pageToLoad < maxPages)

                // Check if no content found and we're using problematic filters
                if (
                    isFirstPage &&
                    enrichedResults.length === 0 &&
                    (filters.sort_by === 'popularity.asc' || filters.sort_by === 'vote_average.asc')
                ) {
                    setError(
                        `No content found for "${filters.sort_by === 'popularity.asc' ? 'Least Popular' : 'Lowest Rated'}" sorting. Try "Most Popular" or other filters instead.`
                    )
                }
            } catch (err) {
                console.error('Error loading genre content:', err)
                setError(err instanceof Error ? err.message : 'Failed to load content')
            } finally {
                setLoading(false)
                setLoadingMore(false)
            }
        },
        [genreId, mediaType, maxPages, filters]
    )

    useEffect(() => {
        loadGenreContent(1)
    }, [genreId, mediaType, filters, loadGenreContent])

    useEffect(() => {
        if (page > 1) {
            loadGenreContent(page)
        }
    }, [page, loadGenreContent])

    // Counter animation for loading
    useEffect(() => {
        if (loading && page === 1) {
            setLoadingCounter(0)
            setLoadingMessage('🎬 Finding your favorite movies...')

            // Counter animation - faster to reach 100% before loading completes
            const counterInterval = setInterval(() => {
                setLoadingCounter((prev) => {
                    if (prev >= 100) {
                        clearInterval(counterInterval)
                        return 100
                    }
                    return prev + 2 // Increment by 2 for faster animation
                })
            }, 15) // Faster interval - completes in ~750ms

            // Message rotation - independent of counter
            const messages = [
                '🎬 Finding favorites...',
                '🍿 Popping corn...',
                '🎭 Auditioning films...',
                '📽️ Rolling carpet...',
                '🌟 Polishing Oscars...',
                '🎪 Setting up...',
                '🎨 Creating magic...',
                '🚀 Almost there...',
                '🎉 Ready to binge...',
                '✨ Movies await!',
            ]

            let messageIndex = 0
            const messageInterval = setInterval(() => {
                messageIndex = (messageIndex + 1) % messages.length
                setLoadingMessage(messages[messageIndex])
            }, 500) // Change message every half second

            return () => {
                clearInterval(counterInterval)
                clearInterval(messageInterval)
            }
        }
    }, [loading, page])

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
                <main className="relative">
                    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                        <div className="text-center max-w-md px-6">
                            <div className="flex space-x-3 justify-center mb-6">
                                <div className="w-6 h-6 bg-red-600 rounded-full animate-bounce"></div>
                                <div
                                    className="w-6 h-6 bg-red-600 rounded-full animate-bounce"
                                    style={{ animationDelay: '0.1s' }}
                                ></div>
                                <div
                                    className="w-6 h-6 bg-red-600 rounded-full animate-bounce"
                                    style={{ animationDelay: '0.2s' }}
                                ></div>
                            </div>
                            <div className="text-2xl font-bold text-white mb-6 font-mono">
                                {loadingCounter}%
                            </div>
                            <p className="text-white text-xl mb-2 min-h-[3rem] flex items-center justify-center">
                                {loadingMessage}
                            </p>
                            <p className="text-gray-400 text-sm">Loading {genreName} content</p>
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
                    {pageTitle ||
                        (genreName
                            ? `${genreName} ${mediaType === 'movie' ? 'Movies' : 'TV Shows'}`
                            : 'Genre')}{' '}
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
                            {pageTitle ||
                                `${genreName} ${mediaType === 'movie' ? 'Movies' : 'TV Shows'}`}
                        </h1>
                        <p className="text-gray-300 text-lg">
                            Discover the best {genreName?.toLowerCase()}{' '}
                            {mediaType === 'movie' ? 'movies' : 'TV shows'}
                        </p>
                    </div>

                    {/* Content Section */}
                    {content.length > 0 ? (
                        <div className="space-y-8">
                            {/* Flex Layout */}
                            <div className="flex flex-wrap gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-10 md:gap-x-8 md:gap-y-12">
                                {contentToRender.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex-shrink-0 mb-12 sm:mb-16 md:mb-20"
                                    >
                                        <Thumbnail content={item} />
                                    </div>
                                ))}
                            </div>

                            {/* Loading indicator for pagination */}
                            {(loading || loadingMore) && (
                                <div className="flex justify-center pt-8">
                                    <div className="text-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2"></div>
                                        <p className="text-gray-400 text-sm">Loading more...</p>
                                    </div>
                                </div>
                            )}

                            {/* Spacer with clear messaging about footer */}
                            {hasMore && !loading && !loadingMore && (
                                <div className="h-32 flex items-center justify-center">
                                    <div className="text-gray-500 text-sm text-center">
                                        <div className="mb-2">📖 Footer content below</div>
                                        <div>Keep scrolling for more movies...</div>
                                    </div>
                                </div>
                            )}

                            {/* Hidden trigger element positioned much further down */}
                            {hasMore && !loading && !loadingMore && (
                                <div ref={loadMoreRef} className="h-32" />
                            )}

                            {/* Load More Button */}
                            {!hasMore && content.length > 0 && (
                                <div className="flex justify-center pt-8">
                                    <button
                                        onClick={() => {
                                            setMaxPages((prev) => prev + 10)
                                            setHasMore(true)
                                        }}
                                        className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200 text-lg"
                                    >
                                        Load More Results
                                    </button>
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
