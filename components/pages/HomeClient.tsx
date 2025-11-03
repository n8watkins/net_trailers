'use client'

import { useEffect, useState } from 'react'
import Header from '../layout/Header'
import Banner from '../layout/Banner'
import Row from '../content/Row'
import { HomeData } from '../../lib/serverData'
import { useAppStore } from '../../stores/appStore'
import { getChildSafetyModeClient } from '../../lib/childSafetyCookieClient'
import { useSessionStore } from '../../stores/sessionStore'
import { CustomRowLoader } from '../customRows/CustomRowLoader'
import { CustomRow } from '../../types/customRows'

interface HomeClientProps {
    data: HomeData
    filter?: string
}

export default function HomeClient({ data, filter }: HomeClientProps) {
    const { modal } = useAppStore()
    const showModal = modal.isOpen
    const childSafetyEnabled = getChildSafetyModeClient()
    const getUserId = useSessionStore((state) => state.getUserId)
    const userId = getUserId()

    const [customRows, setCustomRows] = useState<CustomRow[]>([])
    const [isLoadingCustomRows, setIsLoadingCustomRows] = useState(false)

    const { trending, topRated, genre1, genre2, genre3, genre4, documentaries } = data

    // Load custom rows on mount
    useEffect(() => {
        if (!userId) return

        const loadCustomRows = async () => {
            setIsLoadingCustomRows(true)
            try {
                const response = await fetch('/api/custom-rows', {
                    headers: {
                        'X-User-ID': userId,
                    },
                })

                if (!response.ok) {
                    throw new Error('Failed to load custom rows')
                }

                const data = await response.json()
                // Filter rows that should display on main page and are enabled
                const mainPageRows = data.rows.filter(
                    (row: CustomRow) => row.enabled && row.displayOn.main
                )
                setCustomRows(mainPageRows)
            } catch (error) {
                console.error('Error loading custom rows:', error)
            } finally {
                setIsLoadingCustomRows(false)
            }
        }

        loadCustomRows()
    }, [userId])

    // Build API endpoints with child safety mode parameter
    const childSafetyParam = childSafetyEnabled ? '?childSafetyMode=true' : ''

    // Determine API endpoints based on filter
    const getTrendingEndpoint = () => {
        if (filter === 'tv') return `/api/tv/trending${childSafetyParam}`
        if (filter === 'movies') return `/api/movies/trending${childSafetyParam}`
        return `/api/movies/trending${childSafetyParam}` // Mixed mode uses movies trending
    }

    const getTopRatedEndpoint = () => {
        if (filter === 'tv') return `/api/tv/top-rated${childSafetyParam}`
        if (filter === 'movies') return `/api/movies/top-rated${childSafetyParam}`
        return `/api/movies/top-rated${childSafetyParam}` // Mixed mode uses movies top rated
    }

    const getGenre1Endpoint = () => {
        if (filter === 'tv') return `/api/genres/tv/10759${childSafetyParam}` // Action & Adventure
        if (filter === 'movies') {
            return childSafetyEnabled
                ? `/api/genres/movie/16${childSafetyParam}` // Animation
                : `/api/genres/movie/28${childSafetyParam}` // Action
        }
        return childSafetyEnabled
            ? `/api/genres/movie/16${childSafetyParam}` // Animation
            : `/api/genres/movie/28${childSafetyParam}` // Action
    }

    const getGenre2Endpoint = () => {
        if (filter === 'tv') return `/api/genres/tv/35${childSafetyParam}` // Comedy
        if (filter === 'movies') {
            return childSafetyEnabled
                ? `/api/genres/movie/10751${childSafetyParam}` // Family
                : `/api/genres/movie/35${childSafetyParam}` // Comedy
        }
        return childSafetyEnabled
            ? `/api/genres/movie/10751${childSafetyParam}` // Family
            : `/api/genres/movie/35${childSafetyParam}` // Comedy
    }

    const getGenre3Endpoint = () => {
        if (filter === 'tv') return `/api/genres/tv/10765${childSafetyParam}` // Sci-Fi & Fantasy
        if (filter === 'movies') {
            return childSafetyEnabled
                ? `/api/genres/movie/12${childSafetyParam}` // Adventure
                : `/api/genres/movie/27${childSafetyParam}` // Horror
        }
        return childSafetyEnabled
            ? `/api/genres/movie/12${childSafetyParam}` // Adventure
            : `/api/genres/movie/27${childSafetyParam}` // Horror
    }

    const getGenre4Endpoint = () => {
        if (filter === 'tv') return `/api/genres/tv/16${childSafetyParam}` // Animation
        if (filter === 'movies') {
            return childSafetyEnabled
                ? `/api/genres/movie/14${childSafetyParam}` // Fantasy
                : `/api/genres/movie/10749${childSafetyParam}` // Romance
        }
        return `/api/genres/movie/16${childSafetyParam}` // Animation
    }

    const getDocumentariesEndpoint = () => {
        if (filter === 'tv') return `/api/genres/tv/99${childSafetyParam}`
        if (filter === 'movies') return `/api/genres/movie/99${childSafetyParam}`
        return `/api/genres/movie/99${childSafetyParam}`
    }

    return (
        <div
            className={`relative min-h-screen overflow-x-clip ${showModal && `overflow-y-hidden`} `}
        >
            <Header />
            <main id="content" className="relative">
                <div className="relative h-screen w-full">
                    <Banner trending={trending} />
                </div>
                <section className="relative z-10 pb-52 space-y-8">
                    {trending.length > 0 && (
                        <Row
                            title={
                                filter === 'tv'
                                    ? 'Trending TV Shows'
                                    : filter === 'movies'
                                      ? 'Trending Movies'
                                      : 'Trending'
                            }
                            content={trending}
                            apiEndpoint={getTrendingEndpoint()}
                        />
                    )}
                    {topRated.length > 0 && (
                        <Row
                            title={
                                filter === 'tv'
                                    ? 'Top Rated TV Shows'
                                    : filter === 'movies'
                                      ? 'Top Rated Movies'
                                      : 'Top Rated'
                            }
                            content={topRated}
                            apiEndpoint={getTopRatedEndpoint()}
                        />
                    )}
                    {genre1.length > 0 && (
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
                            content={genre1}
                            apiEndpoint={getGenre1Endpoint()}
                        />
                    )}
                    {genre2.length > 0 && (
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
                            content={genre2}
                            apiEndpoint={getGenre2Endpoint()}
                        />
                    )}
                    {genre3.length > 0 && (
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
                            content={genre3}
                            apiEndpoint={getGenre3Endpoint()}
                        />
                    )}
                    {genre4.length > 0 && (
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
                                        : 'Animation'
                            }
                            content={genre4}
                            apiEndpoint={getGenre4Endpoint()}
                        />
                    )}
                    {documentaries.length > 0 && (
                        <Row
                            title={
                                filter === 'tv'
                                    ? 'Documentary TV Shows'
                                    : filter === 'movies'
                                      ? 'Documentary Movies'
                                      : 'Documentaries'
                            }
                            content={documentaries}
                            apiEndpoint={getDocumentariesEndpoint()}
                        />
                    )}

                    {/* Custom Rows */}
                    {!isLoadingCustomRows &&
                        customRows.map((row) => (
                            <CustomRowLoader key={row.id} rowId={row.id} rowName={row.name} />
                        ))}
                </section>
            </main>
        </div>
    )
}
