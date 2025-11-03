'use client'

import { useEffect, useState } from 'react'
import Header from '../layout/Header'
import Banner from '../layout/Banner'
import Row from '../content/Row'
import { HomeData } from '../../lib/serverData'
import { useAppStore } from '../../stores/appStore'
import { useSessionStore } from '../../stores/sessionStore'
import { CustomRowLoader } from '../customRows/CustomRowLoader'
import { CustomRow } from '../../types/customRows'

interface TVClientProps {
    data: HomeData
}

export default function TVClient({ data }: TVClientProps) {
    const { modal } = useAppStore()
    const showModal = modal.isOpen
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
                // Filter enabled rows for TV page
                // Show TV-only rows and "both" rows
                const tvPageRows = data.rows.filter(
                    (row: CustomRow) =>
                        row.enabled && (row.mediaType === 'tv' || row.mediaType === 'both')
                )
                setCustomRows(tvPageRows)
            } catch (error) {
                console.error('Error loading custom rows:', error)
            } finally {
                setIsLoadingCustomRows(false)
            }
        }

        loadCustomRows()
    }, [userId])

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
                                title="Trending TV Shows"
                                content={trending}
                                apiEndpoint="/api/tv/trending"
                            />
                        </div>
                    )}
                    {topRated.length > 0 && (
                        <Row
                            title="Top Rated TV Shows"
                            content={topRated}
                            apiEndpoint="/api/tv/top-rated"
                        />
                    )}
                    {genre1.length > 0 && (
                        <Row
                            title="Action & Adventure TV Shows"
                            content={genre1}
                            apiEndpoint="/api/genres/tv/10759"
                        />
                    )}
                    {genre2.length > 0 && (
                        <Row
                            title="Comedy TV Shows"
                            content={genre2}
                            apiEndpoint="/api/genres/tv/35"
                        />
                    )}
                    {genre3.length > 0 && (
                        <Row
                            title="Sci-Fi & Fantasy TV Shows"
                            content={genre3}
                            apiEndpoint="/api/genres/tv/10765"
                        />
                    )}
                    {genre4.length > 0 && (
                        <Row
                            title="Animation TV Shows"
                            content={genre4}
                            apiEndpoint="/api/genres/tv/16"
                        />
                    )}
                    {documentaries.length > 0 && (
                        <Row
                            title="Documentary TV Shows"
                            content={documentaries}
                            apiEndpoint="/api/genres/tv/99"
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
