'use client'

import { useEffect, useMemo } from 'react'
import Header from '../layout/Header'
import Banner from '../layout/Banner'
import { HomeData } from '../../lib/serverData'
import { useAppStore } from '../../stores/appStore'
import { useSessionStore } from '../../stores/sessionStore'
import { CollectionRowLoader } from '../collections/CollectionRowLoader'
import { autoMigrateIfNeeded } from '../../utils/migrations/customRowsToCollections'
import { getSystemCollectionsForPage } from '../../constants/systemCollections'
import RecommendedForYouRow from '../recommendations/RecommendedForYouRow'
import { useAuthStore } from '../../stores/authStore'
import { useGuestStore } from '../../stores/guestStore'

interface HomeClientProps {
    data: HomeData
    filter?: string
}

export default function HomeClient({ data, filter }: HomeClientProps) {
    const { modal } = useAppStore()
    const showModal = modal.isOpen
    const getUserId = useSessionStore((state) => state.getUserId)
    const sessionType = useSessionStore((state) => state.sessionType)
    const isInitialized = useSessionStore((state) => state.isInitialized)
    const userId = getUserId()

    // Get collections from appropriate store
    const authCollections = useAuthStore((state) => state.userCreatedWatchlists)
    const guestCollections = useGuestStore((state) => state.userCreatedWatchlists)

    const { trending } = data

    // Auto-migrate custom rows to collections on first load
    useEffect(() => {
        if (!userId || !isInitialized) return

        autoMigrateIfNeeded(userId).catch((error) => {
            console.error('Error during auto-migration:', error)
        })
    }, [userId, isInitialized])

    // Combine system collections with user collections
    const allCollections = useMemo(() => {
        const systemCollections = getSystemCollectionsForPage('home')
        const userCollections = sessionType === 'auth' ? authCollections : guestCollections

        // User collections that should display as rows
        const userRows = userCollections.filter((c) => c.displayAsRow && c.mediaType === 'both')

        // Combine and sort by order
        return [...systemCollections, ...userRows].sort((a, b) => a.order - b.order)
    }, [sessionType, authCollections, guestCollections])

    // Filter to enabled collections only
    const enabledCollections = allCollections.filter((c) => c.enabled)

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
                    {/* Personalized Recommendations Row */}
                    <RecommendedForYouRow />

                    {/* Dynamic collections (system + user) sorted by order */}
                    {enabledCollections.map((collection) => (
                        <CollectionRowLoader
                            key={collection.id}
                            collection={collection}
                            pageType="home"
                        />
                    ))}
                </section>
            </main>
        </div>
    )
}
