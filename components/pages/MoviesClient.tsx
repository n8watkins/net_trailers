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

interface MoviesClientProps {
    data: HomeData
}

export default function MoviesClient({ data }: MoviesClientProps) {
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
                // Filter enabled rows for movies page
                // Show movie-only rows and "both" rows
                const moviesPageRows = data.rows.filter(
                    (row: CustomRow) =>
                        row.enabled && (row.mediaType === 'movie' || row.mediaType === 'both')
                )
                setCustomRows(moviesPageRows)
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

    return (
        <div
            className={`relative min-h-screen overflow-x-clip ${showModal && `overflow-y-hidden`} `}
        >
            <Header />
            <main id="content" className="relative">
                <div className="relative h-screen w-full">
                    <Banner trending={trending} variant="compact" />
                </div>
                <section className="relative -mt-[55vh] z-10 pb-52 space-y-8">
                    {trending.length > 0 && (
                        <div className="pt-8 sm:pt-12 md:pt-16">
                            <Row
                                title="Trending Movies"
                                content={trending}
                                apiEndpoint={`/api/movies/trending${childSafetyParam}`}
                            />
                        </div>
                    )}
                    {topRated.length > 0 && (
                        <Row
                            title="Top Rated Movies"
                            content={topRated}
                            apiEndpoint={`/api/movies/top-rated${childSafetyParam}`}
                        />
                    )}
                    {genre1.length > 0 && (
                        <Row
                            title={childSafetyEnabled ? 'Animated Movies' : 'Action Movies'}
                            content={genre1}
                            apiEndpoint={
                                childSafetyEnabled
                                    ? `/api/genres/movie/16${childSafetyParam}`
                                    : `/api/genres/movie/28${childSafetyParam}`
                            }
                        />
                    )}
                    {genre2.length > 0 && (
                        <Row
                            title={childSafetyEnabled ? 'Family Movies' : 'Comedy Movies'}
                            content={genre2}
                            apiEndpoint={
                                childSafetyEnabled
                                    ? `/api/genres/movie/10751${childSafetyParam}`
                                    : `/api/genres/movie/35${childSafetyParam}`
                            }
                        />
                    )}
                    {genre3.length > 0 && (
                        <Row
                            title={childSafetyEnabled ? 'Adventure Movies' : 'Horror Movies'}
                            content={genre3}
                            apiEndpoint={
                                childSafetyEnabled
                                    ? `/api/genres/movie/12${childSafetyParam}`
                                    : `/api/genres/movie/27${childSafetyParam}`
                            }
                        />
                    )}
                    {genre4.length > 0 && (
                        <Row
                            title={childSafetyEnabled ? 'Fantasy Movies' : 'Romance Movies'}
                            content={genre4}
                            apiEndpoint={
                                childSafetyEnabled
                                    ? `/api/genres/movie/14${childSafetyParam}`
                                    : `/api/genres/movie/10749${childSafetyParam}`
                            }
                        />
                    )}
                    {documentaries.length > 0 && (
                        <Row
                            title="Documentaries"
                            content={documentaries}
                            apiEndpoint={`/api/genres/movie/99${childSafetyParam}`}
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
