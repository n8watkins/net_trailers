import Header from '../components/Header'
import requests from '../utils/requests'
import { Content, isMovie, isTVShow } from '../typings'
import Banner from '../components/Banner'
import Row from '../components/Row'
import useAuth from '../hooks/useAuth'
import Modal from '../components/Modal'
import NetflixLoader from '../components/NetflixLoader'
import NetflixError from '../components/NetflixError'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil'
import { modalState } from '../atoms/modalAtom'
import { contentLoadedSuccessfullyState } from '../atoms/userDataAtom'
import { mainPageDataState, hasVisitedMainPageState, cacheStatusState } from '../atoms/cacheAtom'
import { mainPageCache, cachedFetch } from '../utils/apiCache'
import Head from 'next/head'
interface Props {
    trending: Content[]
    topRatedMovies: Content[]
    actionMovies: Content[]
    comedyMovies: Content[]
    horrorMovies: Content[]
    romanceMovies: Content[]
    documentaries: Content[]
    hasDataError?: boolean
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
}: Props) => {
    const { loading, error, user } = useAuth()
    const router = useRouter()
    const showModal = useRecoilValue(modalState)
    const { filter } = router.query
    const [isPageLoading, setIsPageLoading] = useState(true)
    const setContentLoadedSuccessfully = useSetRecoilState(contentLoadedSuccessfullyState)
    const [mainPageData, setMainPageData] = useRecoilState(mainPageDataState)
    const [hasVisitedMainPage, setHasVisitedMainPage] = useRecoilState(hasVisitedMainPageState)
    const [cacheStatus, setCacheStatus] = useRecoilState(cacheStatusState)

    // Check if we have any content at all
    const hasAnyContent = trending.length > 0 ||
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
            lastFetched: Date.now()
        }

        setMainPageData(currentData)
        setHasVisitedMainPage(true)
        setCacheStatus(prev => ({
            ...prev,
            mainPageCached: true,
            lastCacheUpdate: Date.now()
        }))

        // Realistic loading with API health check
        const checkApiHealth = async () => {
            try {
                // Quick health check on trending endpoint (3 second timeout)
                const controller = new AbortController()
                const timeoutId = setTimeout(() => controller.abort(), 3000)

                const response = await fetch('/api/movies/trending', {
                    signal: controller.signal
                })

                clearTimeout(timeoutId)

                if (!response.ok) {
                    throw new Error(`API responded with ${response.status}`)
                }

                // Success - show content after brief loading
                setTimeout(() => {
                    setIsPageLoading(false)
                    setContentLoadedSuccessfully(true)
                    // Prefetch login page in background for instant access
                    if (typeof window !== 'undefined') {
                        import('next/router').then(({ default: Router }) => {
                            Router.prefetch('/login')
                        })
                    }
                }, hasVisitedMainPage ? 500 : 1500) // Faster loading if returning to cached page

            } catch (error) {
                // Fail fast - show error after 2 seconds max
                setTimeout(() => {
                    setIsPageLoading(false)
                    setContentLoadedSuccessfully(false)
                }, 2000)
            }
        }

        checkApiHealth()
    }, [trending, topRatedMovies, actionMovies, comedyMovies, horrorMovies, romanceMovies, documentaries, hasVisitedMainPage, setContentLoadedSuccessfully, setMainPageData, setHasVisitedMainPage, setCacheStatus])

    // Show loading screen during initial page load
    if (isPageLoading) {
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
        if (filter === 'tv') return 'Discover trending TV shows, watch trailers, and manage your watchlist with NetTrailer'
        if (filter === 'movies') return 'Discover trending movies, watch trailers, and manage your watchlist with NetTrailer'
        return 'Browse trending movies and TV shows, watch trailers, and manage your watchlist with NetTrailer\'s secure streaming platform'
    }

    return (
        <div
            className={`relative h-screen overflow-x-clip ${
                showModal && `overflow-y-hidden`
            } `}
        >
            <Head>
                <title>{getPageTitle()}</title>
                <meta name="description" content={getPageDescription()} />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <Header />
            <main id="content" className="relative min-h-screen">
                <div className="relative h-[95vh] w-full">
                    <Banner trending={trending} />
                </div>
                <section className="relative -mt-48 z-10 pb-52 space-y-8">
                    {trending.length > 0 && (
                        <Row
                            title={filter === 'tv' ? 'Trending TV Shows' : filter === 'movies' ? 'Trending Movies' : 'Trending'}
                            content={trending}
                            hideTitles={true}
                        />
                    )}
                    {topRatedMovies.length > 0 && (
                        <Row
                            title={filter === 'tv' ? 'Top Rated TV Shows' : filter === 'movies' ? 'Top Rated Movies' : 'Top Rated Movies'}
                            content={topRatedMovies}
                        />
                    )}
                    {actionMovies.length > 0 && (
                        <Row
                            title={filter === 'tv' ? 'Action & Adventure TV Shows' : filter === 'movies' ? 'Action Movies' : 'Action Movies'}
                            content={actionMovies}
                        />
                    )}
                    {comedyMovies.length > 0 && (
                        <Row
                            title={filter === 'tv' ? 'Comedy TV Shows' : filter === 'movies' ? 'Comedy Movies' : 'Comedy Movies'}
                            content={comedyMovies}
                        />
                    )}
                    {horrorMovies.length > 0 && (
                        <Row
                            title={filter === 'tv' ? 'Crime TV Shows' : filter === 'movies' ? 'Horror Movies' : 'Horror Movies'}
                            content={horrorMovies}
                        />
                    )}
                    {romanceMovies.length > 0 && (
                        <Row
                            title={filter === 'tv' ? 'Drama TV Shows' : filter === 'movies' ? 'Romance Movies' : 'Romance Movies'}
                            content={romanceMovies}
                        />
                    )}
                    {documentaries.length > 0 && (
                        <Row
                            title={filter === 'tv' ? 'Documentary TV Shows' : filter === 'movies' ? 'Documentaries' : 'Documentaries'}
                            content={documentaries}
                        />
                    )}
                </section>
                {showModal && <Modal />}
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
        return { props: { trending: [], topRatedMovies1: [], topRatedMovies2: [], actionMovies: [], comedyMovies: [], horrorMovies: [], romanceMovies: [], documentaries: [] } }
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
                fetch(`${TMDB_BASE_URL}/trending/tv/week?api_key=${API_KEY}&language=en-US&page=1`).then((res) => res.json()),
                fetch(`${TMDB_BASE_URL}/tv/top_rated?api_key=${API_KEY}&language=en-US&page=1`).then((res) => res.json()),
                fetch(`${TMDB_BASE_URL}/tv/top_rated?api_key=${API_KEY}&language=en-US&page=2`).then((res) => res.json()),
                fetch(`${TMDB_BASE_URL}/discover/tv?api_key=${API_KEY}&language=en-US&with_genres=10759&page=1`).then((res) => res.json()), // Action & Adventure
                fetch(`${TMDB_BASE_URL}/discover/tv?api_key=${API_KEY}&language=en-US&with_genres=35&page=1`).then((res) => res.json()), // Comedy
                fetch(`${TMDB_BASE_URL}/discover/tv?api_key=${API_KEY}&language=en-US&with_genres=80&page=1`).then((res) => res.json()), // Crime
                fetch(`${TMDB_BASE_URL}/discover/tv?api_key=${API_KEY}&language=en-US&with_genres=18&page=1`).then((res) => res.json()), // Drama
                fetch(`${TMDB_BASE_URL}/discover/tv?api_key=${API_KEY}&language=en-US&with_genres=99&page=1`).then((res) => res.json()), // Documentary
            ]
        } else if (filter === 'movies') {
            // Fetch movie-specific content directly from TMDB
            fetchPromises = [
                fetch(`${TMDB_BASE_URL}/trending/movie/week?api_key=${API_KEY}&language=en-US&page=1`).then((res) => res.json()),
                fetch(`${TMDB_BASE_URL}/movie/top_rated?api_key=${API_KEY}&language=en-US&page=1`).then((res) => res.json()),
                fetch(`${TMDB_BASE_URL}/movie/top_rated?api_key=${API_KEY}&language=en-US&page=2`).then((res) => res.json()),
                fetch(`${TMDB_BASE_URL}/discover/movie?api_key=${API_KEY}&language=en-US&with_genres=28&page=1`).then((res) => res.json()), // Action
                fetch(`${TMDB_BASE_URL}/discover/movie?api_key=${API_KEY}&language=en-US&with_genres=35&page=1`).then((res) => res.json()), // Comedy
                fetch(`${TMDB_BASE_URL}/discover/movie?api_key=${API_KEY}&language=en-US&with_genres=27&page=1`).then((res) => res.json()), // Horror
                fetch(`${TMDB_BASE_URL}/discover/movie?api_key=${API_KEY}&language=en-US&with_genres=10749&page=1`).then((res) => res.json()), // Romance
                fetch(`${TMDB_BASE_URL}/discover/movie?api_key=${API_KEY}&language=en-US&with_genres=99&page=1`).then((res) => res.json()), // Documentary
            ]
        } else {
            // Default mixed content (original behavior) directly from TMDB
            fetchPromises = [
                fetch(`${TMDB_BASE_URL}/trending/all/week?api_key=${API_KEY}&language=en-US&page=1`).then((res) => res.json()),
                fetch(`${TMDB_BASE_URL}/movie/top_rated?api_key=${API_KEY}&language=en-US&page=1`).then((res) => res.json()),
                fetch(`${TMDB_BASE_URL}/movie/top_rated?api_key=${API_KEY}&language=en-US&page=2`).then((res) => res.json()),
                fetch(`${TMDB_BASE_URL}/discover/movie?api_key=${API_KEY}&language=en-US&with_genres=28&page=1`).then((res) => res.json()), // Action Movies
                fetch(`${TMDB_BASE_URL}/discover/movie?api_key=${API_KEY}&language=en-US&with_genres=35&page=1`).then((res) => res.json()), // Comedy Movies
                fetch(`${TMDB_BASE_URL}/discover/movie?api_key=${API_KEY}&language=en-US&with_genres=27&page=1`).then((res) => res.json()), // Horror Movies
                fetch(`${TMDB_BASE_URL}/discover/movie?api_key=${API_KEY}&language=en-US&with_genres=10749&page=1`).then((res) => res.json()), // Romance Movies
                fetch(`${TMDB_BASE_URL}/discover/movie?api_key=${API_KEY}&language=en-US&with_genres=99&page=1`).then((res) => res.json()), // Documentary Movies
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
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
            }
            return shuffled
        }

        const props = {
            trending: randomizeArray(trending.results || []),
            topRatedMovies: randomizeArray([
                ...(topRatedMovies1.results || []),
                ...(topRatedMovies2.results || []),
            ]),
            actionMovies: randomizeArray(actionMovies.results || []),
            comedyMovies: randomizeArray(comedyMovies.results || []),
            horrorMovies: randomizeArray(horrorMovies.results || []),
            romanceMovies: randomizeArray(romanceMovies.results || []),
            documentaries: randomizeArray(documentaries.results || []),
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
