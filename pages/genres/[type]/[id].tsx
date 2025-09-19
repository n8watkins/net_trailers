import { useState, useEffect, useCallback, useRef } from 'react'
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

    const genreId = Array.isArray(id) ? id[0] : id
    const mediaType = Array.isArray(type) ? type[0] : type
    const genreName = Array.isArray(name) ? name[0] : name

    useEffect(() => {
        if (!genreId || !mediaType) return

        const fetchGenreContent = async () => {
            setLoading(true)
            setError(null)

            try {
                const cacheKey = `/api/genres/${mediaType}/${genreId}/page/${page}`
                const cached = movieCache.get<{ results: Content[] }>(cacheKey)

                if (cached && page === 1) {
                    setContent(cached.results)
                    setLoading(false)
                    return
                }

                const response = await fetch(`/api/genres/${mediaType}/${genreId}?page=${page}`)

                if (!response.ok) {
                    throw new Error(`Failed to fetch ${mediaType} content for genre ${genreId}`)
                }

                const data = await response.json()

                // Add media_type to each item
                const enrichedResults = data.results.map((item: any) => ({
                    ...item,
                    media_type: mediaType
                }))

                if (page === 1) {
                    setContent(enrichedResults)
                    movieCache.set(cacheKey, { results: enrichedResults })
                } else {
                    setContent(prev => [...prev, ...enrichedResults])
                }

                setHasMore(data.page < data.total_pages && data.page < maxPages)

            } catch (err) {
                console.error('Error fetching genre content:', err)
                setError(err instanceof Error ? err.message : 'Failed to load content')
            } finally {
                setLoading(false)
            }
        }

        fetchGenreContent()
    }, [genreId, mediaType, page, maxPages])

    const loadMore = useCallback(() => {
        if (hasMore && !loading && !loadingMore) {
            setLoadingMore(true)
            setPage(prev => prev + 1)
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
            const observer = new IntersectionObserver(
                (entries) => {
                    if (entries[0].isIntersecting) {
                        loadMore()
                    }
                },
                { threshold: 0.1 }
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
            <div className="relative h-screen bg-gradient-to-b lg:h-[140vh]">
                <Head>
                    <title>Loading... - NetTrailer</title>
                </Head>
                <Header />
                <main className="relative pl-4 pb-24 lg:space-y-24 lg:pl-16">
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
            <div className="relative h-screen bg-gradient-to-b lg:h-[140vh]">
                <Head>
                    <title>Error - NetTrailer</title>
                </Head>
                <Header />
                <main className="relative pl-4 pb-24 lg:space-y-24 lg:pl-16">
                    <div className="flex items-center justify-center h-96">
                        <div className="text-center">
                            <div className="text-6xl mb-4">😵</div>
                            <h2 className="text-2xl font-semibold text-white mb-2">Something went wrong</h2>
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
        <div className="relative h-screen bg-gradient-to-b lg:h-[140vh]">
            <Head>
                <title>{genreName ? `${genreName} ${mediaType === 'movie' ? 'Movies' : 'TV Shows'}` : 'Genre'} - NetTrailer</title>
                <meta name="description" content={`Discover ${genreName} ${mediaType === 'movie' ? 'movies' : 'TV shows'}`} />
            </Head>

            <Header />

            <main className="relative pl-4 pb-24 lg:space-y-24 lg:pl-16">
                <div className="flex flex-col space-y-8 py-16 md:space-y-12 md:py-20 lg:py-24">
                    {/* Header Section */}
                    <div className="space-y-6">
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => router.back()}
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                ← Back
                            </button>
                        </div>
                        <h1 className="text-3xl font-bold text-white md:text-4xl lg:text-5xl">
                            {genreName} {mediaType === 'movie' ? 'Movies' : 'TV Shows'}
                        </h1>
                        <p className="text-gray-300 text-lg">
                            Discover the best {genreName?.toLowerCase()} {mediaType === 'movie' ? 'movies' : 'TV shows'}
                        </p>
                    </div>

                    {/* Content Section */}
                    {content.length > 0 ? (
                        <div className="space-y-8">
                            {/* Grid Layout */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6 md:gap-8">
                                {content.map((item) => (
                                    <div key={item.id} className="flex-shrink-0">
                                        <Thumbnail content={item} hideTitles={false} />
                                    </div>
                                ))}
                            </div>

                            {/* Loading indicator */}
                            {(loading || loadingMore) && (
                                <div className="flex justify-center pt-8">
                                    <div className="text-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2"></div>
                                        <p className="text-gray-400 text-sm">Loading more...</p>
                                    </div>
                                </div>
                            )}

                            {/* Infinite scroll trigger */}
                            {hasMore && !loading && (
                                <div ref={loadMoreRef} className="h-20 flex items-center justify-center">
                                    <div className="text-gray-500 text-sm">Scroll for more content...</div>
                                </div>
                            )}

                            {/* End of content indicator */}
                            {!hasMore && content.length > 0 && (
                                <div className="flex justify-center pt-8">
                                    <div className="text-center">
                                        <p className="text-gray-400 text-sm">You&apos;ve reached the end of {genreName} content</p>
                                        <p className="text-gray-500 text-xs mt-1">Limited to {maxPages} pages for performance</p>
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