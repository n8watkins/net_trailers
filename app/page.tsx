'use client'

import Header from '../components/layout/Header'
import Banner from '../components/layout/Banner'
import Row from '../components/content/Row'
import useAuth from '../hooks/useAuth'
import NetflixLoader from '../components/common/NetflixLoader'
import NetflixError from '../components/common/NetflixError'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import { useAppStore } from '../stores/appStore'
import { useCacheStore } from '../stores/cacheStore'
import { useHomeData } from '../hooks/useHomeData'
import { useChildSafety } from '../hooks/useChildSafety'

export default function Home() {
    const { loading: authLoading, wasRecentlyAuthenticated } = useAuth()
    const router = useRouter()
    const searchParams = useSearchParams()
    const { modal, setContentLoadedSuccessfully } = useAppStore()
    const showModal = modal.isOpen
    const filter = searchParams.get('filter')
    const { setMainPageData, setHasVisitedMainPage } = useCacheStore()
    const { isEnabled: childSafetyEnabled } = useChildSafety()

    // ✅ FIXED: Child Safety filtering now works for BOTH movies AND TV shows
    // Data is fetched client-side from API routes that perform server-side filtering
    // when childSafetyMode=true is passed
    const { data, loading: dataLoading, error: dataError } = useHomeData(filter ?? undefined)

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

    return (
        <div
            className={`relative min-h-screen overflow-x-clip ${showModal && `overflow-y-hidden`} `}
        >
            <Header />
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
