'use client'

import { useEffect } from 'react'
import Header from '../layout/Header'
import Banner from '../layout/Banner'
import Row from '../content/Row'
import { HomeData } from '../../lib/serverData'
import { useAppStore } from '../../stores/appStore'
import { useSessionStore } from '../../stores/sessionStore'
import { CustomRowLoader } from '../customRows/CustomRowLoader'
import { CustomRowsFirestore } from '../../utils/firestore/customRows'
import { useCustomRowsStore } from '../../stores/customRowsStore'

interface TVClientProps {
    data: HomeData
}

export default function TVClient({ data }: TVClientProps) {
    const { modal } = useAppStore()
    const showModal = modal.isOpen
    const getUserId = useSessionStore((state) => state.getUserId)
    const isInitialized = useSessionStore((state) => state.isInitialized)
    const userId = getUserId()

    // Get display rows from store (includes both system and custom rows)
    const { getDisplayRowsForPage, setRows, setSystemRowPreferences } = useCustomRowsStore()

    const { trending } = data

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

    // Get display rows for TV page (includes 'tv' media type)
    const displayRows = userId ? getDisplayRowsForPage(userId, 'tv') : []
    const enabledRows = displayRows.filter((row) => row.enabled)

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
                    <div className="pt-8 sm:pt-12 md:pt-16">
                        {/* Dynamic rows (system + custom) sorted by user preferences */}
                        {enabledRows.map((row) => (
                            <CustomRowLoader key={row.id} row={row} pageType="tv" />
                        ))}
                    </div>
                </section>
            </main>
        </div>
    )
}
