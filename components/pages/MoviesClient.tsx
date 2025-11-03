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

interface MoviesClientProps {
    data: HomeData
}

export default function MoviesClient({ data }: MoviesClientProps) {
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

    // Get display rows for movies page (includes 'movie' media type)
    const displayRows = userId ? getDisplayRowsForPage(userId, 'movies') : []
    const enabledRows = displayRows.filter((row) => row.enabled)

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

                    {/* Dynamic rows (system + custom) sorted by user preferences */}
                    {enabledRows.map((row) => (
                        <CustomRowLoader key={row.id} row={row} />
                    ))}
                </section>
            </main>
        </div>
    )
}
