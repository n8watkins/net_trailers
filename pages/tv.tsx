import Header from '../components/Header'
import Banner from '../components/Banner'
import Row from '../components/Row'
import useAuth from '../hooks/useAuth'
import NetflixLoader from '../components/NetflixLoader'
import NetflixError from '../components/NetflixError'
import { useEffect } from 'react'
import { useAppStore } from '../stores/appStore'
import { useCacheStore } from '../stores/cacheStore'
import Head from 'next/head'
import { useHomeData } from '../hooks/useHomeData'
import { NextPage } from 'next'

interface Props {
    onOpenAboutModal?: () => void
    onOpenTutorial?: () => void
    onOpenKeyboardShortcuts?: () => void
}

const TVShows: NextPage<Props> = ({
    onOpenAboutModal,
    onOpenTutorial,
    onOpenKeyboardShortcuts,
}) => {
    const { loading: authLoading } = useAuth()
    const { modal, setContentLoadedSuccessfully } = useAppStore()
    const showModal = modal.isOpen
    const { setMainPageData, setHasVisitedMainPage } = useCacheStore()

    // ✅ FIXED: Child Safety filtering now works for BOTH movies AND TV shows
    // Data is fetched client-side from API routes that perform server-side filtering
    const { data, loading: dataLoading, error: dataError } = useHomeData('tv')

    const {
        trending,
        topRated,
        genre1: actionAdventure,
        genre2: comedy,
        genre3: sciFiFantasy,
        genre4: animation,
        documentaries,
    } = data

    // Content is already filtered server-side, no need for client-side filtering
    const filteredTrending = trending
    const filteredTopRated = topRated
    const filteredActionAdventure = actionAdventure
    const filteredComedy = comedy
    const filteredSciFiFantasy = sciFiFantasy
    const filteredAnimation = animation
    const filteredDocumentaries = documentaries

    // Check if we have any content at all
    const hasAnyContent =
        trending.length > 0 ||
        topRated.length > 0 ||
        actionAdventure.length > 0 ||
        comedy.length > 0 ||
        sciFiFantasy.length > 0 ||
        animation.length > 0 ||
        documentaries.length > 0

    useEffect(() => {
        // Store main page data in cache for future navigations
        const currentData = {
            trending,
            topRated,
            actionAdventure,
            comedy,
            sciFiFantasy,
            animation,
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
        actionAdventure,
        comedy,
        sciFiFantasy,
        animation,
        documentaries,
        setContentLoadedSuccessfully,
        setMainPageData,
        setHasVisitedMainPage,
    ])

    // Show loading screen during data fetch or auth initialization
    if (dataLoading || authLoading) {
        return <NetflixLoader message="Loading TV Shows..." />
    }

    // Show error screen if no content is available or there was an error
    if (dataError || !hasAnyContent) {
        return <NetflixError />
    }

    return (
        <div
            className={`relative min-h-screen overflow-x-clip ${showModal && `overflow-y-hidden`} `}
        >
            <Head>
                <title>NetTrailer - TV Shows Discovery Platform</title>
                <meta
                    name="description"
                    content="Discover trending TV shows, watch trailers, and manage your watchlist with NetTrailer"
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
                            <Row title="Trending TV Shows" content={filteredTrending} />
                        </div>
                    )}
                    {filteredTopRated.length > 0 && (
                        <Row title="Top Rated TV Shows" content={filteredTopRated} />
                    )}
                    {filteredActionAdventure.length > 0 && (
                        <Row
                            title="Action & Adventure TV Shows"
                            content={filteredActionAdventure}
                        />
                    )}
                    {filteredComedy.length > 0 && (
                        <Row title="Comedy TV Shows" content={filteredComedy} />
                    )}
                    {filteredSciFiFantasy.length > 0 && (
                        <Row title="Sci-Fi & Fantasy TV Shows" content={filteredSciFiFantasy} />
                    )}
                    {filteredAnimation.length > 0 && (
                        <Row title="Animation TV Shows" content={filteredAnimation} />
                    )}
                    {filteredDocumentaries.length > 0 && (
                        <Row title="Documentary TV Shows" content={filteredDocumentaries} />
                    )}
                </section>
            </main>
        </div>
    )
}

export default TVShows

// getServerSideProps removed - page now uses client-side data fetching with useHomeData hook
// This allows passing childSafetyMode parameter to API routes for proper server-side filtering
