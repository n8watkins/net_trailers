import Header from '../components/Header'
import requests from '../utils/requests'
import { Content, isMovie, isTVShow } from '../typings'
import Banner from '../components/Banner'
import Row from '../components/Row'
import useAuth from '../hooks/useAuth'
import NetflixLoader from '../components/NetflixLoader'
import NetflixError from '../components/NetflixError'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/router'
import { useAppStore } from '../stores/appStore'
import { mainPageCache, cachedFetch } from '../utils/apiCache'
import { useCacheStore } from '../stores/cacheStore'
import Head from 'next/head'
import { useChildSafety } from '../hooks/useChildSafety'
import { filterContentByAdultFlag } from '../utils/contentFilter'
interface Props {
    trending: Content[]
    topRatedMovies: Content[]
    actionMovies: Content[]
    comedyMovies: Content[]
    horrorMovies: Content[]
    romanceMovies: Content[]
    documentaries: Content[]
    hasDataError?: boolean
    onOpenAboutModal?: () => void
    onOpenTutorial?: () => void
    onOpenKeyboardShortcuts?: () => void
}
const Home = ({
    trending,
    topRatedMovies,
    actionMovies,
    comedyMovies,
    horrorMovies,
    romanceMovies,
    documentaries,
    hasDataError = false,
    onOpenAboutModal,
    onOpenTutorial,
    onOpenKeyboardShortcuts,
}: Props) => {
    const { loading: authLoading, error, user, wasRecentlyAuthenticated } = useAuth()
    const router = useRouter()
    const { modal, setContentLoadedSuccessfully } = useAppStore()
    const showModal = modal.isOpen
    const { filter } = router.query
    const { setMainPageData, setHasVisitedMainPage } = useCacheStore()
    const { isEnabled: childSafetyEnabled } = useChildSafety()

    // Apply client-side Child Safety filtering to all content
    const filteredTrending = useMemo(
        () => filterContentByAdultFlag(trending, childSafetyEnabled),
        [trending, childSafetyEnabled]
    )
    const filteredTopRated = useMemo(
        () => filterContentByAdultFlag(topRatedMovies, childSafetyEnabled),
        [topRatedMovies, childSafetyEnabled]
    )
    const filteredAction = useMemo(
        () => filterContentByAdultFlag(actionMovies, childSafetyEnabled),
        [actionMovies, childSafetyEnabled]
    )
    const filteredComedy = useMemo(
        () => filterContentByAdultFlag(comedyMovies, childSafetyEnabled),
        [comedyMovies, childSafetyEnabled]
    )
    const filteredHorror = useMemo(
        () => filterContentByAdultFlag(horrorMovies, childSafetyEnabled),
        [horrorMovies, childSafetyEnabled]
    )
    const filteredRomance = useMemo(
        () => filterContentByAdultFlag(romanceMovies, childSafetyEnabled),
        [romanceMovies, childSafetyEnabled]
    )
    const filteredDocumentaries = useMemo(
        () => filterContentByAdultFlag(documentaries, childSafetyEnabled),
        [documentaries, childSafetyEnabled]
    )

    // Check if we have any content at all
    const hasAnyContent =
        trending.length > 0 ||
        topRatedMovies.length > 0 ||
        actionMovies.length > 0 ||
        comedyMovies.length > 0 ||
        horrorMovies.length > 0 ||
        romanceMovies.length > 0 ||
        documentaries.length > 0

    useEffect(() => {
        // Store main page data in cache for future navigations
        const currentData = {
            trending,
            topRatedMovies,
            actionMovies,
            comedyMovies,
            horrorMovies,
            romanceMovies,
            documentaries,
            lastFetched: Date.now(),
        }

        setMainPageData(currentData)
        setHasVisitedMainPage(true)

        // Set content loaded successfully
        setContentLoadedSuccessfully(true)
    }, [
        trending,
        topRatedMovies,
        actionMovies,
        comedyMovies,
        horrorMovies,
        romanceMovies,
        documentaries,
        // Note: Zustand setters are stable and should NOT be in dependencies
        // Including them causes infinite loops
    ])

    // Show loading screen during auth initialization
    // BUT: Skip loading screen if we have cached auth (optimistic loading)
    if (authLoading && !wasRecentlyAuthenticated) {
        return <NetflixLoader message="Loading NetTrailer..." />
    }

    // Show error screen if no content is available
    if (!hasAnyContent || hasDataError) {
        return <NetflixError />
    }

    // Generate dynamic page title and description based on filter
    const getPageTitle = () => {
        if (filter === 'tv') return 'NetTrailer - TV Shows Discovery Platform'
        if (filter === 'movies') return 'NetTrailer - Movies Discovery Platform'
        return 'NetTrailer - Movie & TV Show Discovery Platform'
    }

    const getPageDescription = () => {
        if (filter === 'tv')
            return 'Discover trending TV shows, watch trailers, and manage your watchlist with NetTrailer'
        if (filter === 'movies')
            return 'Discover trending movies, watch trailers, and manage your watchlist with NetTrailer'
        return "Browse trending movies and TV shows, watch trailers, and manage your watchlist with NetTrailer's secure streaming platform"
    }

    return (
        <div
            className={`relative min-h-screen overflow-x-clip ${showModal && `overflow-y-hidden`} `}
        >
            <Head>
                <title>{getPageTitle()}</title>
                <meta name="description" content={getPageDescription()} />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <Header
                onOpenAboutModal={onOpenAboutModal}
                onOpenTutorial={onOpenTutorial}
                onOpenKeyboardShortcuts={onOpenKeyboardShortcuts}
            />
            <main id="content" className="relative">
                <div className="relative h-screen w-full">
                    <Banner trending={filteredTrending} />
                </div>
                <section className="relative -mt-48 z-10 pb-52 space-y-8">
                    {filteredTrending.length > 0 && (
                        <div className="pt-8 sm:pt-12 md:pt-16">
                            <Row
                                title={
                                    filter === 'tv'
                                        ? 'Trending TV Shows'
                                        : filter === 'movies'
                                          ? 'Trending Movies'
                                          : 'Trending'
                                }
                                content={filteredTrending}
                            />
                        </div>
                    )}
                    {filteredTopRated.length > 0 && (
                        <Row
                            title={
                                filter === 'tv'
                                    ? 'Top Rated TV Shows'
                                    : filter === 'movies'
                                      ? 'Top Rated Movies'
                                      : 'Top Rated Movies'
                            }
                            content={filteredTopRated}
                        />
                    )}
                    {filteredAction.length > 0 && (
                        <Row
                            title={
                                filter === 'tv'
                                    ? 'Action & Adventure TV Shows'
                                    : filter === 'movies'
                                      ? 'Action Movies'
                                      : 'Action Movies'
                            }
                            content={filteredAction}
                        />
                    )}
                    {filteredComedy.length > 0 && (
                        <Row
                            title={
                                filter === 'tv'
                                    ? 'Comedy TV Shows'
                                    : filter === 'movies'
                                      ? 'Comedy Movies'
                                      : 'Comedy Movies'
                            }
                            content={filteredComedy}
                        />
                    )}
                    {filteredHorror.length > 0 && (
                        <Row
                            title={
                                filter === 'tv'
                                    ? 'Crime TV Shows'
                                    : filter === 'movies'
                                      ? 'Horror Movies'
                                      : 'Horror Movies'
                            }
                            content={filteredHorror}
                        />
                    )}
                    {filteredRomance.length > 0 && (
                        <Row
                            title={
                                filter === 'tv'
                                    ? 'Drama TV Shows'
                                    : filter === 'movies'
                                      ? 'Romance Movies'
                                      : 'Romance Movies'
                            }
                            content={filteredRomance}
                        />
                    )}
                    {filteredDocumentaries.length > 0 && (
                        <Row
                            title={
                                filter === 'tv'
                                    ? 'Documentary TV Shows'
                                    : filter === 'movies'
                                      ? 'Documentaries'
                                      : 'Documentaries'
                            }
                            content={filteredDocumentaries}
                        />
                    )}
                </section>
            </main>
        </div>
    )
}

export default Home

export const getServerSideProps = async (context: any) => {
    const { filter } = context.query
    const API_KEY = process.env.TMDB_API_KEY
    const TMDB_BASE_URL = 'https://api.themoviedb.org/3'

    if (!API_KEY) {
        console.error('TMDB API key not configured')
        return {
            props: {
                trending: [],
                topRatedMovies1: [],
                topRatedMovies2: [],
                actionMovies: [],
                comedyMovies: [],
                horrorMovies: [],
                romanceMovies: [],
                documentaries: [],
            },
        }
    }

    try {
        // Different cache keys for different content types
        const cacheKey = filter ? `main-page-content-${filter}` : 'main-page-content'
        const cached = mainPageCache.get(cacheKey)

        if (cached) {
            return { props: cached }
        }

        let fetchPromises: Promise<any>[]

        if (filter === 'tv') {
            // Fetch TV-specific content directly from TMDB
            fetchPromises = [
                fetch(
                    `${TMDB_BASE_URL}/trending/tv/week?api_key=${API_KEY}&language=en-US&page=1`
                ).then((res) => res.json()),
                fetch(
                    `${TMDB_BASE_URL}/tv/top_rated?api_key=${API_KEY}&language=en-US&page=1`
                ).then((res) => res.json()),
                fetch(
                    `${TMDB_BASE_URL}/tv/top_rated?api_key=${API_KEY}&language=en-US&page=2`
                ).then((res) => res.json()),
                fetch(
                    `${TMDB_BASE_URL}/discover/tv?api_key=${API_KEY}&language=en-US&with_genres=10759&page=1`
                ).then((res) => res.json()), // Action & Adventure
                fetch(
                    `${TMDB_BASE_URL}/discover/tv?api_key=${API_KEY}&language=en-US&with_genres=35&page=1`
                ).then((res) => res.json()), // Comedy
                fetch(
                    `${TMDB_BASE_URL}/discover/tv?api_key=${API_KEY}&language=en-US&with_genres=80&page=1`
                ).then((res) => res.json()), // Crime
                fetch(
                    `${TMDB_BASE_URL}/discover/tv?api_key=${API_KEY}&language=en-US&with_genres=18&page=1`
                ).then((res) => res.json()), // Drama
                fetch(
                    `${TMDB_BASE_URL}/discover/tv?api_key=${API_KEY}&language=en-US&with_genres=99&page=1`
                ).then((res) => res.json()), // Documentary
            ]
        } else if (filter === 'movies') {
            // Fetch movie-specific content directly from TMDB
            fetchPromises = [
                fetch(
                    `${TMDB_BASE_URL}/trending/movie/week?api_key=${API_KEY}&language=en-US&page=1`
                ).then((res) => res.json()),
                fetch(
                    `${TMDB_BASE_URL}/movie/top_rated?api_key=${API_KEY}&language=en-US&page=1`
                ).then((res) => res.json()),
                fetch(
                    `${TMDB_BASE_URL}/movie/top_rated?api_key=${API_KEY}&language=en-US&page=2`
                ).then((res) => res.json()),
                fetch(
                    `${TMDB_BASE_URL}/discover/movie?api_key=${API_KEY}&language=en-US&with_genres=28&page=1`
                ).then((res) => res.json()), // Action
                fetch(
                    `${TMDB_BASE_URL}/discover/movie?api_key=${API_KEY}&language=en-US&with_genres=35&page=1`
                ).then((res) => res.json()), // Comedy
                fetch(
                    `${TMDB_BASE_URL}/discover/movie?api_key=${API_KEY}&language=en-US&with_genres=27&page=1`
                ).then((res) => res.json()), // Horror
                fetch(
                    `${TMDB_BASE_URL}/discover/movie?api_key=${API_KEY}&language=en-US&with_genres=10749&page=1`
                ).then((res) => res.json()), // Romance
                fetch(
                    `${TMDB_BASE_URL}/discover/movie?api_key=${API_KEY}&language=en-US&with_genres=99&page=1`
                ).then((res) => res.json()), // Documentary
            ]
        } else {
            // Default mixed content (original behavior) directly from TMDB
            fetchPromises = [
                fetch(
                    `${TMDB_BASE_URL}/trending/all/week?api_key=${API_KEY}&language=en-US&page=1`
                ).then((res) => res.json()),
                fetch(
                    `${TMDB_BASE_URL}/movie/top_rated?api_key=${API_KEY}&language=en-US&page=1`
                ).then((res) => res.json()),
                fetch(
                    `${TMDB_BASE_URL}/movie/top_rated?api_key=${API_KEY}&language=en-US&page=2`
                ).then((res) => res.json()),
                fetch(
                    `${TMDB_BASE_URL}/discover/movie?api_key=${API_KEY}&language=en-US&with_genres=28&page=1`
                ).then((res) => res.json()), // Action Movies
                fetch(
                    `${TMDB_BASE_URL}/discover/movie?api_key=${API_KEY}&language=en-US&with_genres=35&page=1`
                ).then((res) => res.json()), // Comedy Movies
                fetch(
                    `${TMDB_BASE_URL}/discover/movie?api_key=${API_KEY}&language=en-US&with_genres=27&page=1`
                ).then((res) => res.json()), // Horror Movies
                fetch(
                    `${TMDB_BASE_URL}/discover/movie?api_key=${API_KEY}&language=en-US&with_genres=10749&page=1`
                ).then((res) => res.json()), // Romance Movies
                fetch(
                    `${TMDB_BASE_URL}/discover/movie?api_key=${API_KEY}&language=en-US&with_genres=99&page=1`
                ).then((res) => res.json()), // Documentary Movies
            ]
        }

        const [
            trending,
            topRatedMovies1,
            topRatedMovies2,
            actionMovies,
            comedyMovies,
            horrorMovies,
            romanceMovies,
            documentaries,
        ] = await Promise.all(fetchPromises)

        // Proper Fisher-Yates shuffle algorithm (unbiased randomization)
        const randomizeArray = (arr: Content[]) => {
            const shuffled = [...arr] // Create copy to avoid mutating original
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1))
                ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
            }
            return shuffled
        }

        // Helper function to add media_type to content items
        const addMediaType = (items: any[], mediaType: 'movie' | 'tv') =>
            items.map((item) => ({ ...item, media_type: mediaType }))

        // Determine the media type for this page
        const pageMediaType = filter === 'tv' ? 'tv' : filter === 'movies' ? 'movie' : null

        const props = {
            trending: randomizeArray(
                pageMediaType
                    ? addMediaType(trending.results || [], pageMediaType)
                    : trending.results || []
            ),
            topRatedMovies: randomizeArray(
                addMediaType(
                    [...(topRatedMovies1.results || []), ...(topRatedMovies2.results || [])],
                    pageMediaType || 'movie'
                )
            ),
            actionMovies: randomizeArray(
                addMediaType(actionMovies.results || [], pageMediaType || 'movie')
            ),
            comedyMovies: randomizeArray(
                addMediaType(comedyMovies.results || [], pageMediaType || 'movie')
            ),
            horrorMovies: randomizeArray(
                addMediaType(horrorMovies.results || [], pageMediaType || 'movie')
            ),
            romanceMovies: randomizeArray(
                addMediaType(romanceMovies.results || [], pageMediaType || 'movie')
            ),
            documentaries: randomizeArray(
                addMediaType(documentaries.results || [], pageMediaType || 'movie')
            ),
        }

        // Cache the processed props for future requests with appropriate cache key
        mainPageCache.set(cacheKey, props)

        return { props }
    } catch (error) {
        console.error('Failed to fetch movie data:', error)

        // Return empty data with error flag
        return {
            props: {
                trending: [],
                topRatedMovies: [],
                actionMovies: [],
                comedyMovies: [],
                horrorMovies: [],
                romanceMovies: [],
                documentaries: [],
                hasDataError: true,
            },
        }
    }
}
