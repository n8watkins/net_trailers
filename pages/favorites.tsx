import { useState, useEffect } from 'react'
import { NextPage } from 'next'
import Head from 'next/head'
import Header from '../components/Header'
import Modal from '../components/Modal'
import useUserData from '../hooks/useUserData'
import { HeartIcon, HandThumbUpIcon, HandThumbDownIcon, EyeIcon, MagnifyingGlassIcon } from '@heroicons/react/24/solid'
import { Content } from '../typings'
import { getTitle, getYear } from '../typings'
import Image from 'next/image'
import { useSetRecoilState } from 'recoil'
import { modalState, movieState } from '../atoms/modalAtom'
import { movieCache } from '../utils/apiCache'

const Favorites: NextPage = () => {
    const { ratings, watchlist, isGuest } = useUserData()
    const [selectedFilter, setSelectedFilter] = useState<'all' | 'loved' | 'liked' | 'disliked' | 'watchlist'>('all')
    const [fetchedContent, setFetchedContent] = useState<Record<number, Content>>({})
    const [loadingContent, setLoadingContent] = useState<Record<number, boolean>>({})
    const [searchQuery, setSearchQuery] = useState('')
    const setShowModal = useSetRecoilState(modalState)
    const setCurrentMovie = useSetRecoilState(movieState)

    // Filter content based on selected filter
    const getFilteredContent = () => {
        switch (selectedFilter) {
            case 'loved':
                return ratings.filter(r => r.rating === 'loved')
            case 'liked':
                return ratings.filter(r => r.rating === 'liked')
            case 'disliked':
                return ratings.filter(r => r.rating === 'disliked')
            case 'watchlist':
                return watchlist.map(item => ({ contentId: item.id, rating: 'watchlist' as const, timestamp: 0, content: item }))
            case 'all':
            default:
                const allRated = ratings.map(r => ({ ...r, content: null }))
                const watchlistItems = watchlist.map(item => ({ contentId: item.id, rating: 'watchlist' as const, timestamp: 0, content: item }))
                return [...allRated, ...watchlistItems]
        }
    }

    const baseFilteredContent = getFilteredContent()

    // Apply search filter
    const filteredContent = searchQuery.trim()
        ? baseFilteredContent.filter(item => {
            const content = 'content' in item && item.content
                ? item.content
                : fetchedContent[item.contentId]

            if (!content) return false

            const title = getTitle(content).toLowerCase()
            const query = searchQuery.toLowerCase()
            return title.includes(query)
        })
        : baseFilteredContent

    // Function to fetch content details by ID
    const fetchContentById = async (contentId: number): Promise<Content | null> => {
        // Check cache first
        const cacheKey = `/api/content/${contentId}`
        const cached = movieCache.get<Content>(cacheKey)
        if (cached) {
            return cached
        }

        try {
            const response = await fetch(`/api/content/${contentId}`)
            if (!response.ok) {
                console.error(`Failed to fetch content ${contentId}:`, response.statusText)
                return null
            }

            const content = await response.json()

            // Cache the result
            movieCache.set(cacheKey, content)

            return content
        } catch (error) {
            console.error(`Error fetching content ${contentId}:`, error)
            return null
        }
    }

    // Effect to fetch missing content data
    useEffect(() => {
        const fetchMissingContent = async () => {
            const missingContentIds: number[] = []

            // Find ratings without content data
            ratings.forEach(rating => {
                if (!rating.content && !fetchedContent[rating.contentId] && !loadingContent[rating.contentId]) {
                    missingContentIds.push(rating.contentId)
                }
            })

            if (missingContentIds.length === 0) return

            // Set loading state for these IDs
            setLoadingContent(prev => {
                const newLoading = { ...prev }
                missingContentIds.forEach(id => {
                    newLoading[id] = true
                })
                return newLoading
            })

            // Fetch content data for missing IDs
            const fetchPromises = missingContentIds.map(async (contentId) => {
                const content = await fetchContentById(contentId)
                return { contentId, content }
            })

            try {
                const results = await Promise.all(fetchPromises)

                // Update state with fetched content
                setFetchedContent(prev => {
                    const newFetched = { ...prev }
                    results.forEach(({ contentId, content }) => {
                        if (content) {
                            newFetched[contentId] = content
                        }
                    })
                    return newFetched
                })

                // Clear loading state
                setLoadingContent(prev => {
                    const newLoading = { ...prev }
                    missingContentIds.forEach(id => {
                        delete newLoading[id]
                    })
                    return newLoading
                })
            } catch (error) {
                console.error('Error fetching missing content:', error)
                // Clear loading state on error
                setLoadingContent(prev => {
                    const newLoading = { ...prev }
                    missingContentIds.forEach(id => {
                        delete newLoading[id]
                    })
                    return newLoading
                })
            }
        }

        fetchMissingContent()
    }, [ratings, fetchedContent, loadingContent])

    const handleContentClick = (content: Content) => {
        setCurrentMovie(content)
        setShowModal(true)
    }

    const getFilterIcon = (filter: string) => {
        switch (filter) {
            case 'loved':
                return <HeartIcon className="w-5 h-5 text-red-400" />
            case 'liked':
                return <HandThumbUpIcon className="w-5 h-5 text-white" />
            case 'disliked':
                return <HandThumbDownIcon className="w-5 h-5 text-white" />
            case 'watchlist':
                return <EyeIcon className="w-5 h-5 text-white" />
            default:
                return null
        }
    }

    const getFilterCount = (filter: string) => {
        switch (filter) {
            case 'loved':
                return ratings.filter(r => r.rating === 'loved').length
            case 'liked':
                return ratings.filter(r => r.rating === 'liked').length
            case 'disliked':
                return ratings.filter(r => r.rating === 'disliked').length
            case 'watchlist':
                return watchlist.length
            case 'all':
                return ratings.length + watchlist.length
            default:
                return 0
        }
    }

    return (
        <div className="relative min-h-screen bg-gradient-to-b">
            <Head>
                <title>My Favorites - NetTrailer</title>
                <meta name="description" content="View your liked, loved, and watchlist content" />
            </Head>

            <Header />

            <main className="relative pl-4 pb-24 lg:space-y-24 lg:pl-16">
                <div className="flex flex-col space-y-8 py-16 md:space-y-12 md:py-20 lg:py-24">
                    {/* Header Section */}
                    <div className="space-y-6">
                        <h1 className="text-3xl font-bold text-white md:text-4xl lg:text-5xl">
                            My Favorites
                        </h1>

                        {isGuest && (
                            <div className="bg-gray-800/50 p-4 rounded-lg max-w-2xl">
                                <p className="text-sm text-gray-300">
                                    📱 You&apos;re browsing as a guest. Your preferences are saved locally.
                                    Sign up to sync across devices!
                                </p>
                            </div>
                        )}

                        {/* Filter Buttons */}
                        <div className="flex flex-wrap gap-3">
                            {[
                                { key: 'all', label: 'All' },
                                { key: 'loved', label: 'Loved' },
                                { key: 'liked', label: 'Liked' },
                                { key: 'disliked', label: 'Not For Me' },
                                { key: 'watchlist', label: 'My List' },
                            ].map(filter => (
                                <button
                                    key={filter.key}
                                    onClick={() => setSelectedFilter(filter.key as any)}
                                    className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                                        selectedFilter === filter.key
                                            ? 'bg-white text-black'
                                            : 'bg-gray-800/50 text-white hover:bg-gray-700/50'
                                    }`}
                                >
                                    {getFilterIcon(filter.key)}
                                    <span>{filter.label}</span>
                                    <span className="bg-gray-600 text-xs px-2 py-1 rounded-full ml-2">
                                        {getFilterCount(filter.key)}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {/* Search Bar */}
                        <div className="max-w-md">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search your favorites..."
                                    className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-all duration-200"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Content Grid */}
                    {filteredContent.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="text-6xl mb-4">🍿</div>
                            <h2 className="text-2xl font-semibold text-white mb-2">
                                No {selectedFilter === 'all' ? 'favorites' : selectedFilter} content yet
                            </h2>
                            <p className="text-gray-400">
                                Start rating movies and TV shows to see them here!
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {filteredContent.map((item) => {
                                // Check if we have content data (from watchlist, ratings, or fetched data)
                                const content = 'content' in item && item.content
                                    ? item.content
                                    : fetchedContent[item.contentId]
                                const hasContentData = !!content
                                const isLoading = loadingContent[item.contentId]

                                return (
                                    <div
                                        key={`${item.contentId}-${item.rating}`}
                                        className="relative group cursor-pointer transition-transform duration-200 hover:scale-105"
                                        onClick={() => hasContentData && handleContentClick(content)}
                                    >
                                        <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-gray-800">
                                            {isLoading ? (
                                                <div className="flex items-center justify-center h-full">
                                                    <div className="text-center">
                                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2"></div>
                                                        <p className="text-xs text-gray-300">Loading...</p>
                                                    </div>
                                                </div>
                                            ) : hasContentData && content.poster_path ? (
                                                <Image
                                                    src={`https://image.tmdb.org/t/p/w500${content.poster_path}`}
                                                    alt={getTitle(content)}
                                                    fill
                                                    sizes="(max-width: 640px) 140px, (max-width: 768px) 160px, (max-width: 1024px) 180px, 240px"
                                                    className="object-cover transition-transform duration-200 group-hover:scale-110"
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center h-full">
                                                    <div className="text-center">
                                                        <div className="text-4xl mb-2">
                                                            {getFilterIcon(item.rating)}
                                                        </div>
                                                        <p className="text-xs text-gray-300">
                                                            {hasContentData && content ? 'No Poster' : `Content ID: ${item.contentId}`}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Rating badge */}
                                            <div className="absolute top-2 right-2 bg-black/70 rounded-full p-1">
                                                {getFilterIcon(item.rating)}
                                            </div>
                                        </div>

                                        {/* Content info */}
                                        <div className="mt-2">
                                            {isLoading ? (
                                                <>
                                                    <div className="h-4 bg-gray-700 rounded animate-pulse mb-1"></div>
                                                    <div className="h-3 bg-gray-700 rounded animate-pulse w-2/3"></div>
                                                </>
                                            ) : hasContentData ? (
                                                <>
                                                    <h3 className="text-sm font-medium text-white truncate">
                                                        {getTitle(content)}
                                                    </h3>
                                                    <p className="text-xs text-gray-400">
                                                        {getYear(content)}
                                                    </p>
                                                </>
                                            ) : (
                                                <>
                                                    <h3 className="text-sm font-medium text-white">
                                                        {item.rating === 'loved' ? 'Loved Content' :
                                                         item.rating === 'liked' ? 'Liked Content' :
                                                         'Disliked Content'}
                                                    </h3>
                                                    <p className="text-xs text-gray-400">
                                                        ID: {item.contentId}
                                                    </p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </main>

            <Modal />
        </div>
    )
}

export default Favorites