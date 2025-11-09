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
import { useCustomRowsStore } from '../../stores/customRowsStore'
import { SystemRowStorage } from '../../utils/systemRowStorage'

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
    const isGuest = sessionType === 'guest'

    // Get collections from appropriate store
    const authCollections = useAuthStore((state) => state.userCreatedWatchlists)
    const guestCollections = useGuestStore((state) => state.userCreatedWatchlists)

    // Get system row preferences from customRowsStore
    const deletedSystemRowsMap = useCustomRowsStore((state) => state.deletedSystemRows)
    const systemRowPreferencesMap = useCustomRowsStore((state) => state.systemRowPreferences)
    const setDeletedSystemRows = useCustomRowsStore((state) => state.setDeletedSystemRows)

    // Memoize the deleted system rows array to avoid infinite loop
    const deletedSystemRows = useMemo(() => {
        return userId ? deletedSystemRowsMap.get(userId) || [] : []
    }, [userId, deletedSystemRowsMap])

    // Memoize the system row preferences to avoid infinite loop
    const systemRowPreferences = useMemo(() => {
        return userId ? systemRowPreferencesMap.get(userId) || {} : {}
    }, [userId, systemRowPreferencesMap])

    const { trending } = data

    // Load deleted system rows from localStorage/Firebase on mount
    useEffect(() => {
        if (!userId || !isInitialized) return

        const loadDeletedRows = async () => {
            try {
                const deletedRows = await SystemRowStorage.getDeletedSystemRows(userId, isGuest)
                setDeletedSystemRows(userId, deletedRows)
            } catch (error) {
                console.error('Error loading deleted system rows:', error)
            }
        }

        loadDeletedRows()
    }, [userId, isInitialized, isGuest, setDeletedSystemRows])

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
        const systemCollections = getSystemCollectionsForPage('home')
        const userCollections = sessionType === 'auth' ? authCollections : guestCollections

        // Filter out deleted system collections and apply custom preferences
        const activeSystemCollections = systemCollections
            .filter((c) => !deletedSystemRows.includes(c.id))
            .map((c) => {
                const pref = systemRowPreferences[c.id]
                return {
                    ...c,
                    name: pref?.customName || c.name, // Apply custom name if set
                    order: pref?.order ?? c.order, // Apply custom order if set
                    genres: pref?.customGenres || c.genres, // Apply custom genres if set
                    genreLogic: pref?.customGenreLogic || c.genreLogic, // Apply custom genre logic if set
                }
            })

        // User collections that should display as rows
        const userRows = userCollections.filter((c) => c.displayAsRow && c.mediaType === 'both')

        // Combine and sort by order
        return [...activeSystemCollections, ...userRows].sort((a, b) => a.order - b.order)
    }, [sessionType, authCollections, guestCollections, deletedSystemRows, systemRowPreferences])

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
