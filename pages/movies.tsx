import Header from '../components/Header'
import { Content } from '../typings'
import Banner from '../components/Banner'
import Row from '../components/Row'
import useAuth from '../hooks/useAuth'
import NetflixLoader from '../components/NetflixLoader'
import NetflixError from '../components/NetflixError'
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

const Movies: NextPage<Props> = ({ onOpenAboutModal, onOpenTutorial, onOpenKeyboardShortcuts }) => {
    const { loading: authLoading, error: authError, user } = useAuth()
    const router = useRouter()
    const { modal, setContentLoadedSuccessfully } = useAppStore()
    const showModal = modal.isOpen
    const { setMainPageData, setHasVisitedMainPage } = useCacheStore()
    const { isEnabled: childSafetyEnabled } = useChildSafety()

    // ✅ FIXED: Child Safety filtering now works for BOTH movies AND TV shows
    // Data is fetched client-side from API routes that perform server-side filtering
    const { data, loading: dataLoading, error: dataError } = useHomeData('movies')

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
        setContentLoadedSuccessfully,
        setMainPageData,
        setHasVisitedMainPage,
    ])

    // Show loading screen during data fetch or auth initialization
    if (dataLoading || authLoading) {
        return <NetflixLoader message="Loading Movies..." />
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
                    {filteredHorror.length > 0 && !childSafetyEnabled && (
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

// getServerSideProps removed - page now uses client-side data fetching with useHomeData hook
// This allows passing childSafetyMode parameter to API routes for proper server-side filtering
