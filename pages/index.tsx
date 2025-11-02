import Header from '../components/layout/Header'
import Banner from '../components/layout/Banner'
import Row from '../components/content/Row'
import useAuth from '../hooks/useAuth'
import NetflixLoader from '../components/common/NetflixLoader'
import NetflixError from '../components/common/NetflixError'
import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAppStore } from '../stores/appStore'
import { useCacheStore } from '../stores/cacheStore'
import Head from 'next/head'
import { useHomeData } from '../hooks/useHomeData'
import { useChildSafety } from '../hooks/useChildSafety'
import { NextPage } from 'next'

interface Props {
    onOpenAboutModal?: () => void
    onOpenTutorial?: () => void
    onOpenKeyboardShortcuts?: () => void
}

const Home: NextPage<Props> = ({ onOpenAboutModal, onOpenTutorial, onOpenKeyboardShortcuts }) => {
    const { loading: authLoading, wasRecentlyAuthenticated } = useAuth()
    const router = useRouter()
    const { modal, setContentLoadedSuccessfully } = useAppStore()
    const showModal = modal.isOpen
    const { filter } = router.query
    const { setMainPageData, setHasVisitedMainPage } = useCacheStore()
    const { isEnabled: childSafetyEnabled } = useChildSafety()

    // ✅ FIXED: Child Safety filtering now works for BOTH movies AND TV shows
    // Data is fetched client-side from API routes that perform server-side filtering
    // when childSafetyMode=true is passed
    const {
        data,
        loading: dataLoading,
        error: dataError,
    } = useHomeData(filter as string | undefined)

    const {
        trending,
        topRated,
        genre1: action,
        genre2: comedy,
        genre3: horror,
        genre4: romance,
        documentaries,
    } = data

    // Content is already filtered server-side, no need for client-side filtering
    const filteredTrending = trending
    const filteredTopRated = topRated
    const filteredAction = action
    const filteredComedy = comedy
    const filteredHorror = horror
    const filteredRomance = romance
    const filteredDocumentaries = documentaries

    // Check if we have any content at all
    const hasAnyContent =
        trending.length > 0 ||
        topRated.length > 0 ||
        action.length > 0 ||
        comedy.length > 0 ||
        horror.length > 0 ||
        romance.length > 0 ||
        documentaries.length > 0

    useEffect(() => {
        // Guard: Only cache when data has actually loaded
        // Prevent caching empty arrays from initial state or failed fetches
        if (dataLoading || dataError || !hasAnyContent) {
            return // Don't cache empty/loading/error states
        }

        // Store main page data in cache for future navigations
        const currentData = {
            trending,
            topRated,
            action,
            comedy,
            horror,
            romance,
            documentaries,
            lastFetched: Date.now(),
        }

        setMainPageData(currentData)
        setHasVisitedMainPage(true)

        // Set content loaded successfully
        setContentLoadedSuccessfully(true)
    }, [
        trending,
        topRated,
        action,
        comedy,
        horror,
        romance,
        documentaries,
        dataLoading,
        dataError,
        hasAnyContent,
        setMainPageData,
        setHasVisitedMainPage,
        setContentLoadedSuccessfully,
        // Note: Zustand setters are stable and should NOT be in dependencies
        // Including them causes infinite loops
    ])

    // Show loading screen during data fetch or auth initialization
    if (dataLoading || (authLoading && !wasRecentlyAuthenticated)) {
        return <NetflixLoader message="Loading NetTrailer..." />
    }

    // Show error screen if no content is available or there was an error
    if (dataError || !hasAnyContent) {
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
                                      : 'Top Rated'
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
                                      ? childSafetyEnabled
                                          ? 'Animated Movies'
                                          : 'Action Movies'
                                      : childSafetyEnabled
                                        ? 'Animation'
                                        : 'Action & Adventure'
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
                                      ? childSafetyEnabled
                                          ? 'Family Movies'
                                          : 'Comedy Movies'
                                      : childSafetyEnabled
                                        ? 'Family & Comedy'
                                        : 'Comedy'
                            }
                            content={filteredComedy}
                        />
                    )}
                    {filteredHorror.length > 0 && (
                        <Row
                            title={
                                filter === 'tv'
                                    ? 'Sci-Fi & Fantasy TV Shows'
                                    : filter === 'movies'
                                      ? childSafetyEnabled
                                          ? 'Adventure Movies'
                                          : 'Horror Movies'
                                      : childSafetyEnabled
                                        ? 'Adventure'
                                        : 'Horror & Sci-Fi'
                            }
                            content={filteredHorror}
                        />
                    )}
                    {filteredRomance.length > 0 && (
                        <Row
                            title={
                                filter === 'tv'
                                    ? 'Animation TV Shows'
                                    : filter === 'movies'
                                      ? childSafetyEnabled
                                          ? 'Fantasy Movies'
                                          : 'Romance Movies'
                                      : childSafetyEnabled
                                        ? 'Fantasy'
                                        : 'Romance & Animation'
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
                                      ? 'Documentary Movies'
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

// getServerSideProps removed - page now uses client-side data fetching with useHomeData hook
// This allows passing childSafetyMode parameter to API routes for proper server-side filtering
