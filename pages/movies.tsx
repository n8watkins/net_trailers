import Header from '../components/Header'
import { Content } from '../typings'
import Banner from '../components/Banner'
import Row from '../components/Row'
import useAuth from '../hooks/useAuth'
import NetflixLoader from '../components/NetflixLoader'
import NetflixError from '../components/NetflixError'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/router'
import { useRecoilValue, useSetRecoilState } from 'recoil'
import { modalState } from '../atoms/modalAtom'
import { contentLoadedSuccessfullyState } from '../atoms/userDataAtom'
import { mainPageCache } from '../utils/apiCache'
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

const Movies = ({
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
    const { loading, error, user } = useAuth()
    const router = useRouter()
    const showModal = useRecoilValue(modalState)
    const setContentLoadedSuccessfully = useSetRecoilState(contentLoadedSuccessfullyState)
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
        setContentLoadedSuccessfully,
        setMainPageData,
        setHasVisitedMainPage,
    ])

    // Show error screen if no content is available
    if (!hasAnyContent || hasDataError) {
        return <NetflixError />
    }

    return (
        <div
            className={`relative min-h-screen overflow-x-clip ${showModal && `overflow-y-hidden`} `}
        >
            <Head>
                <title>NetTrailer - Movies Discovery Platform</title>
                <meta
                    name="description"
                    content="Discover trending movies, watch trailers, and manage your watchlist with NetTrailer"
                />
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
                            <Row title="Trending Movies" content={filteredTrending} />
                        </div>
                    )}
                    {filteredTopRated.length > 0 && (
                        <Row title="Top Rated Movies" content={filteredTopRated} />
                    )}
                    {filteredAction.length > 0 && (
                        <Row title="Action Movies" content={filteredAction} />
                    )}
                    {filteredComedy.length > 0 && (
                        <Row title="Comedy Movies" content={filteredComedy} />
                    )}
                    {filteredHorror.length > 0 && (
                        <Row title="Horror Movies" content={filteredHorror} />
                    )}
                    {filteredRomance.length > 0 && (
                        <Row title="Romance Movies" content={filteredRomance} />
                    )}
                    {filteredDocumentaries.length > 0 && (
                        <Row title="Documentaries" content={filteredDocumentaries} />
                    )}
                </section>
            </main>
        </div>
    )
}

export default Movies

export const getServerSideProps = async () => {
    const API_KEY = process.env.TMDB_API_KEY
    const TMDB_BASE_URL = 'https://api.themoviedb.org/3'

    if (!API_KEY) {
        console.error('TMDB API key not configured')
        return {
            props: {
                trending: [],
                topRatedMovies: [],
                actionMovies: [],
                comedyMovies: [],
                horrorMovies: [],
                romanceMovies: [],
                documentaries: [],
            },
        }
    }

    try {
        const cacheKey = 'main-page-content-movies'
        const cached = mainPageCache.get(cacheKey)

        if (cached) {
            return { props: cached }
        }

        // Fetch movie-specific content directly from TMDB
        const fetchPromises = [
            fetch(
                `${TMDB_BASE_URL}/trending/movie/week?api_key=${API_KEY}&language=en-US&page=1`
            ).then((res) => res.json()),
            fetch(`${TMDB_BASE_URL}/movie/top_rated?api_key=${API_KEY}&language=en-US&page=1`).then(
                (res) => res.json()
            ),
            fetch(`${TMDB_BASE_URL}/movie/top_rated?api_key=${API_KEY}&language=en-US&page=2`).then(
                (res) => res.json()
            ),
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

        // Proper Fisher-Yates shuffle algorithm
        const randomizeArray = (arr: Content[]) => {
            const shuffled = [...arr]
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1))
                ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
            }
            return shuffled
        }

        // Helper function to add media_type to content items
        const addMediaType = (items: any[], mediaType: 'movie' | 'tv') =>
            items.map((item) => ({ ...item, media_type: mediaType }))

        const props = {
            trending: randomizeArray(addMediaType(trending.results || [], 'movie')),
            topRatedMovies: randomizeArray(
                addMediaType(
                    [...(topRatedMovies1.results || []), ...(topRatedMovies2.results || [])],
                    'movie'
                )
            ),
            actionMovies: randomizeArray(addMediaType(actionMovies.results || [], 'movie')),
            comedyMovies: randomizeArray(addMediaType(comedyMovies.results || [], 'movie')),
            horrorMovies: randomizeArray(addMediaType(horrorMovies.results || [], 'movie')),
            romanceMovies: randomizeArray(addMediaType(romanceMovies.results || [], 'movie')),
            documentaries: randomizeArray(addMediaType(documentaries.results || [], 'movie')),
        }

        // Cache the processed props
        mainPageCache.set(cacheKey, props)

        return { props }
    } catch (error) {
        console.error('Failed to fetch movie data:', error)

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
