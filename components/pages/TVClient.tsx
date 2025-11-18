'use client'

import { useEffect, useMemo } from 'react'
import Header from '../layout/Header'
import Banner from '../layout/Banner'
import { HomeData } from '../../lib/serverData'
import { useAppStore } from '../../stores/appStore'
import { useModalStore } from '../../stores/modalStore'
import { useSessionStore } from '../../stores/sessionStore'
import { CollectionRowLoader } from '../collections/CollectionRowLoader'
import { autoMigrateIfNeeded } from '../../utils/migrations/customRowsToCollections'
import { getSystemCollectionsForPage } from '../../constants/systemCollections'
import { useAuthStore } from '../../stores/authStore'
import { useGuestStore } from '../../stores/guestStore'
import { useCustomRowsStore } from '../../stores/customRowsStore'
import { Cog6ToothIcon } from '@heroicons/react/24/solid'

interface TVClientProps {
    data: HomeData
}

export default function TVClient({ data }: TVClientProps) {
    const { modal } = useAppStore()
    const showModal = modal.isOpen
    const openRowEditorModal = useModalStore((state) => state.openRowEditorModal)
    const getUserId = useSessionStore((state) => state.getUserId)
    const sessionType = useSessionStore((state) => state.sessionType)
    const isInitialized = useSessionStore((state) => state.isInitialized)
    const userId = getUserId()
    const isGuest = sessionType === 'guest'

    // Get collections from appropriate store
    const authCollections = useAuthStore((state) => state.userCreatedWatchlists)
    const guestCollections = useGuestStore((state) => state.userCreatedWatchlists)

    // Get system row preferences from customRowsStore
    const systemRowPreferencesMap = useCustomRowsStore((state) => state.systemRowPreferences)

    // Memoize the system row preferences to avoid infinite loop
    const systemRowPreferences = useMemo(() => {
        return userId ? systemRowPreferencesMap.get(userId) || {} : {}
    }, [userId, systemRowPreferencesMap])

    const { trending } = data

    // Auto-migrate custom rows to collections on first load
    // Skip migration for guest users (they don't have Firebase data to migrate)
    useEffect(() => {
        if (!userId || !isInitialized || isGuest) return

        autoMigrateIfNeeded(userId).catch((error) => {
            console.error('Error during auto-migration:', error)
        })
    }, [userId, isInitialized, isGuest])

    // Combine system collections with user collections
    const allCollections = useMemo(() => {
        const systemCollections = getSystemCollectionsForPage('tv')
        const userCollections = sessionType === 'authenticated' ? authCollections : guestCollections

        // Apply custom preferences to system collections
        const enhancedSystemCollections = systemCollections.map((c) => {
            const pref = systemRowPreferences[c.id]
            return {
                ...c,
                name: pref?.customName || c.name, // Apply custom name if set
                enabled: pref?.enabled ?? c.enabled, // Apply custom enabled state if set
                order: pref?.order ?? c.order, // Apply custom order if set
                genres: pref?.customGenres || c.genres, // Apply custom genres if set
                genreLogic: pref?.customGenreLogic || c.genreLogic, // Apply custom genre logic if set
            }
        })

        // User collections that should display as rows
        const userRows = userCollections.filter((c) => c.displayAsRow && c.mediaType === 'tv')

        // Combine and sort by order
        return [...enhancedSystemCollections, ...userRows].sort((a, b) => a.order - b.order)
    }, [sessionType, authCollections, guestCollections, systemRowPreferences])

    // Filter to enabled collections only
    const enabledCollections = allCollections.filter((c) => c.enabled)

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
                    {/* Manage Page Button - Floating in top right */}
                    <div className="sticky top-20 z-20 flex justify-end px-4 sm:px-6 md:px-8 lg:px-16">
                        <button
                            onClick={() => openRowEditorModal('tv')}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-800/90 hover:bg-gray-700/90 text-white rounded-lg transition-colors shadow-lg backdrop-blur-sm border border-gray-700"
                            title="Manage page layout"
                        >
                            <Cog6ToothIcon className="w-5 h-5" />
                            <span className="hidden sm:inline">Manage Page</span>
                        </button>
                    </div>

                    <div className="pt-8 sm:pt-12 md:pt-16">
                        {/* Dynamic collections (system + user) sorted by order */}
                        {enabledCollections.map((collection) => (
                            <CollectionRowLoader
                                key={collection.id}
                                collection={collection}
                                pageType="tv"
                            />
                        ))}
                    </div>
                </section>
            </main>
        </div>
    )
}
