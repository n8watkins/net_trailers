'use client'

import { useEffect } from 'react'
import Header from '../layout/Header'
import Banner from '../layout/Banner'
import Row from '../content/Row'
import { HomeData } from '../../lib/serverData'
import { useAppStore } from '../../stores/appStore'
import { getChildSafetyModeClient } from '../../lib/childSafetyCookieClient'
import { useSessionStore } from '../../stores/sessionStore'
import { CustomRowLoader } from '../customRows/CustomRowLoader'
import { CustomRowsFirestore } from '../../utils/firestore/customRows'
import { useCustomRowsStore } from '../../stores/customRowsStore'

interface HomeClientProps {
    data: HomeData
    filter?: string
}

export default function HomeClient({ data, filter }: HomeClientProps) {
    const { modal } = useAppStore()
    const showModal = modal.isOpen
    const childSafetyEnabled = getChildSafetyModeClient()
    const getUserId = useSessionStore((state) => state.getUserId)
    const isInitialized = useSessionStore((state) => state.isInitialized)
    const userId = getUserId()

    // Get display rows from store (includes both system and custom rows)
    const { getDisplayRowsForPage, setRows, setSystemRowPreferences } = useCustomRowsStore()

    const { trending, topRated, genre1, genre2, genre3, genre4, documentaries } = data

    // Load custom rows and system preferences on mount (client-side Firestore)
    useEffect(() => {
        if (!userId || !isInitialized) return

        const loadRows = async () => {
            try {
                const [customRows, systemPrefs] = await Promise.all([
                    CustomRowsFirestore.getUserCustomRows(userId),
                    CustomRowsFirestore.getSystemRowPreferences(userId),
                ])
                setRows(userId, customRows)
                setSystemRowPreferences(userId, systemPrefs)
            } catch (error) {
                console.error('Error loading rows:', error)
            }
        }

        loadRows()
    }, [userId, isInitialized, setRows, setSystemRowPreferences])

    // Get display rows for home page (includes 'both' media type)
    const displayRows = userId ? getDisplayRowsForPage(userId, 'home') : []
    const enabledRows = displayRows.filter((row) => row.enabled)

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

                    {/* Dynamic rows (system + custom) sorted by user preferences */}
                    {enabledRows.map((row) => (
                        <CustomRowLoader key={row.id} row={row} />
                    ))}
                </section>
            </main>
        </div>
    )
}
