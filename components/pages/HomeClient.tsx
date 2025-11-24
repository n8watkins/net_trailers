'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import Header from '../layout/Header'
import Banner from '../layout/Banner'
import { HomeData } from '../../lib/serverData'
import { useModalStore } from '../../stores/modalStore'
import { useSessionStore } from '../../stores/sessionStore'
import { CollectionRowLoader } from '../collections/CollectionRowLoader'
import RecommendedForYouRow from '../recommendations/RecommendedForYouRow'
import { TrendingRow, TopRatedRow } from '../recommendations/SystemRecommendationRow'
import TrendingActorsRow from '../actors/TrendingActorsRow'
import ActorContentModal from '../actors/ActorContentModal'
import { useAuthStore } from '../../stores/authStore'
import { useGuestStore } from '../../stores/guestStore'
import { useCacheStore } from '../../stores/cacheStore'
import { processTrendingUpdates } from '../../utils/trendingNotifications'
import NetflixLoader from '../common/NetflixLoader'
import { Cog6ToothIcon, PlusIcon } from '@heroicons/react/24/solid'

interface HomeClientProps {
    data: HomeData
}

export default function HomeClient({ data }: HomeClientProps) {
    const { modal } = useModalStore()
    const showModal = modal.isOpen
    const openRowEditorModal = useModalStore((state) => state.openRowEditorModal)
    const openCollectionBuilderModal = useModalStore((state) => state.openCollectionBuilderModal)
    const getUserId = useSessionStore((state) => state.getUserId)
    const sessionType = useSessionStore((state) => state.sessionType)
    const isInitialized = useSessionStore((state) => state.isInitialized)
    const userId = getUserId()
    const isGuest = sessionType === 'guest'

    // Track hero image loading state
    const [heroImageLoaded, setHeroImageLoaded] = useState(false)

    // Track system recommendation rows loading state
    // We need to wait for all enabled rows to load before showing the page
    const [rowsLoadingState, setRowsLoadingState] = useState<Record<string, boolean>>({
        trending: false,
        'top-rated': false,
        'recommended-for-you': false,
        'trending-actors': false,
    })

    // Create stable callback handlers for each row
    const handleTrendingLoaded = useCallback(() => {
        setRowsLoadingState((prev) => ({ ...prev, trending: true }))
    }, [])

    const handleTopRatedLoaded = useCallback(() => {
        setRowsLoadingState((prev) => ({ ...prev, 'top-rated': true }))
    }, [])

    const handleRecommendedLoaded = useCallback(() => {
        setRowsLoadingState((prev) => ({ ...prev, 'recommended-for-you': true }))
    }, [])

    const handleTrendingActorsLoaded = useCallback(() => {
        setRowsLoadingState((prev) => ({ ...prev, 'trending-actors': true }))
    }, [])

    // Get collections from appropriate store
    // After unification, all collections (including defaults) are in userCreatedWatchlists
    const authCollections = useAuthStore((state) => state.userCreatedWatchlists)
    const guestCollections = useGuestStore((state) => state.userCreatedWatchlists)

    // Get system recommendations from appropriate store
    const authSystemRecommendations = useAuthStore((state) => state.systemRecommendations)
    const guestSystemRecommendations = useGuestStore((state) => state.systemRecommendations)
    const systemRecommendations =
        sessionType === 'authenticated' ? authSystemRecommendations : guestSystemRecommendations

    // Sort system recommendations by order
    const sortedSystemRecommendations = useMemo(() => {
        return [...systemRecommendations].sort((a, b) => a.order - b.order)
    }, [systemRecommendations])

    // Check if all enabled system rows have finished loading
    const allSystemRowsLoaded = useMemo(() => {
        return sortedSystemRecommendations.every((rec) => {
            // If disabled, consider it "loaded"
            if (!rec.enabled) return true
            // Otherwise check the loading state
            return rowsLoadingState[rec.id] === true
        })
    }, [sortedSystemRecommendations, rowsLoadingState])

    // Page is ready when hero image is loaded AND all system rows are loaded
    const pageReady = heroImageLoaded && allSystemRowsLoaded

    const { trending } = data
    const trendingSignature = useMemo(
        () => trending.map((item) => `${item.id}-${item.media_type ?? ''}`).join('|'),
        [trending]
    )

    // Get cached trending data and notification preferences
    const mainPageData = useCacheStore((state) => state.mainPageData)
    const authNotificationPreferences = useAuthStore((state) => state.notifications)
    const guestNotificationPreferences = useGuestStore((state) => state.notifications)
    const notificationPreferences =
        sessionType === 'authenticated' ? authNotificationPreferences : guestNotificationPreferences

    // Use ref to track if we've already processed this trending data
    const hasProcessedRef = useRef(false)

    // Reset processing flag when relevant inputs change
    useEffect(() => {
        hasProcessedRef.current = false
    }, [
        trendingSignature,
        userId,
        sessionType,
        notificationPreferences?.inApp,
        notificationPreferences?.types?.trending_update,
    ])

    // Check for trending changes and create notifications
    useEffect(() => {
        // Only process for authenticated users who are initialized and haven't processed this data yet
        if (
            !userId ||
            !isInitialized ||
            isGuest ||
            sessionType !== 'authenticated' ||
            hasProcessedRef.current
        ) {
            return
        }

        // Check if user has trending notifications enabled
        const trendingNotificationsEnabled =
            notificationPreferences?.inApp && notificationPreferences?.types?.trending_update

        // Process trending updates
        const checkTrendingUpdates = async () => {
            try {
                const oldTrending = mainPageData?.trending || null

                await processTrendingUpdates(
                    userId,
                    oldTrending,
                    trending,
                    trendingNotificationsEnabled || false
                )

                // Mark as processed
                hasProcessedRef.current = true
            } catch (_error) {
                // Silently fail - trending updates are non-critical
            }
        }

        checkTrendingUpdates()
    }, [
        userId,
        isInitialized,
        isGuest,
        sessionType,
        trending,
        mainPageData,
        notificationPreferences,
    ])

    // Get all collections - now unified (all collections including defaults are in userCreatedWatchlists)
    const allCollections = useMemo(() => {
        const userCollections = sessionType === 'authenticated' ? authCollections : guestCollections

        // Filter to collections that should display as rows and sort by order
        return userCollections
            .filter((c) => c.displayAsRow !== false) // Show if displayAsRow is true or undefined
            .sort((a, b) => a.order - b.order)
    }, [sessionType, authCollections, guestCollections])

    // Filter to enabled collections only
    const enabledCollections = allCollections.filter((c) => c.enabled)

    return (
        <>
            {/* Show loader until page is fully ready (hero + all system rows loaded) */}
            {!pageReady && <NetflixLoader message="Loading NetTrailer..." />}

            <div
                className={`relative min-h-screen overflow-x-clip ${showModal && `overflow-y-hidden`} ${
                    !pageReady ? 'opacity-0' : 'opacity-100'
                }`}
            >
                <Header />

                <main id="content" className="relative">
                    <div className="relative h-screen w-full">
                        <Banner
                            trending={trending}
                            onHeroImageLoaded={() => setHeroImageLoaded(true)}
                        />
                    </div>
                    <section className="relative z-10 pb-52 space-y-8">
                        {/* Manage Page Button - Floating in top right */}
                        <div className="sticky top-20 z-20 flex justify-end px-4 sm:px-6 md:px-8 lg:px-16">
                            <button
                                onClick={() => openRowEditorModal('home')}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-800/90 hover:bg-gray-700/90 text-white rounded-lg transition-colors shadow-lg backdrop-blur-sm border border-gray-700"
                                title="Manage page layout"
                            >
                                <Cog6ToothIcon className="w-5 h-5" />
                                <span className="hidden sm:inline">Manage Page</span>
                            </button>
                        </div>

                        {/* System Recommendation Rows (Trending, Top Rated, Recommended For You) */}
                        {/* Rendered in user-defined order based on systemRecommendations settings */}
                        {sortedSystemRecommendations.map((rec) => {
                            if (!rec.enabled) return null
                            switch (rec.id) {
                                case 'trending':
                                    return (
                                        <TrendingRow
                                            key="trending"
                                            onLoadComplete={handleTrendingLoaded}
                                        />
                                    )
                                case 'top-rated':
                                    return (
                                        <TopRatedRow
                                            key="top-rated"
                                            onLoadComplete={handleTopRatedLoaded}
                                        />
                                    )
                                case 'recommended-for-you':
                                    return (
                                        <RecommendedForYouRow
                                            key="recommended-for-you"
                                            onLoadComplete={handleRecommendedLoaded}
                                        />
                                    )
                                case 'trending-actors':
                                    return (
                                        <TrendingActorsRow
                                            key="trending-actors"
                                            onLoadComplete={handleTrendingActorsLoaded}
                                        />
                                    )
                                default:
                                    return null
                            }
                        })}

                        {/* User Collections (genre-based + manual) sorted by order */}
                        {enabledCollections.map((collection) => (
                            <CollectionRowLoader
                                key={collection.id}
                                collection={collection}
                                pageType="home"
                            />
                        ))}

                        {/* Create Your Own Collection Button */}
                        <div className="flex justify-center pt-12 pb-8 px-4">
                            <button
                                onClick={() => openCollectionBuilderModal()}
                                className="create-collection-btn group relative flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-red-600/60 via-red-900/65 to-black/70 backdrop-blur-sm text-white rounded-lg transition-all duration-300 shadow-[0_0_30px_rgba(220,38,38,0.3)] hover:shadow-[0_0_50px_rgba(220,38,38,0.5)] hover:scale-105 font-bold text-xl tracking-wide border border-red-500/30 overflow-hidden"
                            >
                                <PlusIcon className="w-7 h-7 transition-transform duration-300 group-hover:rotate-90 relative z-20" />
                                <span className="relative z-20">Create Your Own Collection</span>
                            </button>
                        </div>
                        <style jsx>{`
                            @keyframes shimmer-wave-1 {
                                0% {
                                    transform: translateX(-100%);
                                }
                                100% {
                                    transform: translateX(200%);
                                }
                            }
                            @keyframes shimmer-wave-2 {
                                0% {
                                    transform: translateX(-100%);
                                }
                                100% {
                                    transform: translateX(200%);
                                }
                            }
                            .create-collection-btn::before {
                                content: '';
                                position: absolute;
                                inset: 0;
                                width: 100%;
                                height: 100%;
                                background: linear-gradient(
                                    110deg,
                                    transparent 0%,
                                    transparent 30%,
                                    rgba(248, 113, 113, 0.3) 45%,
                                    rgba(252, 165, 165, 0.5) 50%,
                                    rgba(248, 113, 113, 0.3) 55%,
                                    transparent 70%,
                                    transparent 100%
                                );
                                animation: shimmer-wave-1 8s ease-in-out infinite;
                                pointer-events: none;
                                z-index: 10;
                            }
                            .create-collection-btn::after {
                                content: '';
                                position: absolute;
                                inset: 0;
                                width: 100%;
                                height: 100%;
                                background: linear-gradient(
                                    135deg,
                                    transparent 0%,
                                    transparent 35%,
                                    rgba(248, 113, 113, 0.25) 45%,
                                    rgba(252, 165, 165, 0.4) 50%,
                                    rgba(248, 113, 113, 0.25) 55%,
                                    transparent 65%,
                                    transparent 100%
                                );
                                animation: shimmer-wave-2 10s ease-in-out infinite 3s;
                                pointer-events: none;
                                z-index: 10;
                            }
                        `}</style>
                    </section>
                </main>
            </div>

            {/* Actor Content Modal */}
            <ActorContentModal />
        </>
    )
}
