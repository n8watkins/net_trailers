/**
 * Profile Page
 *
 * User profile with viewing statistics and activity
 */

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import SubPageLayout from '../../components/layout/SubPageLayout'
import {
    UserIcon,
    ClockIcon,
    HeartIcon,
    EyeSlashIcon,
    RectangleStackIcon,
    ChartBarIcon,
    FilmIcon,
    TvIcon,
    SparklesIcon,
    TrashIcon,
    BookmarkIcon,
    TrophyIcon,
} from '@heroicons/react/24/outline'
import useAuth from '../../hooks/useAuth'
import useUserData from '../../hooks/useUserData'
import { useWatchHistory } from '../../hooks/useWatchHistory'
import { seedUserData } from '../../utils/seedData'
import { useSessionStore } from '../../stores/sessionStore'
import { useDebugSettings } from '../../components/debug/DebugControls'
import NetflixLoader from '../../components/common/NetflixLoader'
import { GuestModeNotification } from '../../components/auth/GuestModeNotification'
import { useAuthStatus } from '../../hooks/useAuthStatus'
import { useRankingStore } from '../../stores/rankingStore'

export default function ProfilePage() {
    const { user, loading: authLoading } = useAuth()
    const userData = useUserData()
    const { totalWatched, history: watchHistory, isLoading: isLoadingHistory } = useWatchHistory()
    const { isGuest } = useAuthStatus()
    const debugSettings = useDebugSettings()
    const [isSeeding, setIsSeeding] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const sessionType = useSessionStore((state) => state.sessionType)
    const isInitialized = useSessionStore((state) => state.isInitialized)
    const { rankings, loadUserRankings } = useRankingStore()

    // Show loading state while data is being fetched
    const isLoading = !isInitialized || isLoadingHistory || authLoading

    useEffect(() => {
        document.title = 'Profile - NetTrailers'
    }, [])

    // Load user rankings
    useEffect(() => {
        const getUserId = useSessionStore.getState().getUserId
        const userId = getUserId()

        if (userId && isInitialized) {
            loadUserRankings(userId)
        }
    }, [isInitialized, loadUserRankings])

    const handleSeedData = async () => {
        const getUserId = useSessionStore.getState().getUserId
        const userId = getUserId()

        if (!userId) {
            console.error('No user ID found')
            return
        }

        setIsSeeding(true)
        try {
            await seedUserData(userId, {
                likedCount: 15,
                hiddenCount: 8,
                watchLaterCount: 12,
                watchHistoryCount: 20,
                createCollections: true,
                notificationCount: 8,
            })
            // Force a page reload to show the new data
            window.location.reload()
        } catch (error) {
            console.error('Failed to seed data:', error)
            setIsSeeding(false)
        }
    }

    const handleQuickDelete = async () => {
        if (!confirm('🗑️ Delete all data? This will clear everything for the current session.')) {
            return
        }

        setIsDeleting(true)
        try {
            console.log('[Profile] 🗑️ Starting quick delete...')
            await userData.clearAccountData()
            console.log('[Profile] ✅ Quick delete completed')

            // Force a page reload to show empty state
            window.location.reload()
        } catch (error) {
            console.error('[Profile] ❌ Failed to delete data:', error)
            alert('Failed to delete data. Please try again or use Settings > Clear All Data.')
            setIsDeleting(false)
        }
    }

    // Calculate stats
    const stats = {
        totalWatched,
        watchLater: userData.defaultWatchlist.length, // Separate Watch Later from collections
        totalCollections: userData.userCreatedWatchlists.length, // Only user-created collections
        totalRankings: rankings.length, // User's rankings
        totalLiked: userData.likedMovies.length,
        totalHidden: userData.hiddenMovies.length,
        moviesLiked: userData.likedMovies.filter((item) => item.media_type === 'movie').length,
        tvShowsLiked: userData.likedMovies.filter((item) => item.media_type === 'tv').length,
        moviesWatched: watchHistory.filter((item) => item.mediaType === 'movie').length,
        tvShowsWatched: watchHistory.filter((item) => item.mediaType === 'tv').length,
    }

    const userName = isGuest ? 'Guest' : user?.displayName || user?.email?.split('@')[0] || 'User'
    const userEmail = user?.email || ''
    const userInitials = userName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)

    const profileHeader = (
        <div className="space-y-6">
            {/* Guest Mode Notification */}
            {isInitialized && isGuest && <GuestModeNotification align="left" />}

            <div className="flex items-center gap-6">
                {/* Avatar */}
                <div className="flex-shrink-0">
                    {user?.photoURL ? (
                        <img
                            src={user.photoURL}
                            alt={userName}
                            className="w-24 h-24 rounded-full ring-4 ring-blue-500/30 object-cover"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                                // Fallback to initials if image fails to load
                                e.currentTarget.style.display = 'none'
                                const fallbackDiv = e.currentTarget
                                    .nextElementSibling as HTMLElement
                                if (fallbackDiv) fallbackDiv.style.display = 'flex'
                            }}
                        />
                    ) : null}
                    <div
                        className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center ring-4 ring-blue-500/30"
                        style={{ display: user?.photoURL ? 'none' : 'flex' }}
                    >
                        <span className="text-3xl font-bold text-white">{userInitials}</span>
                    </div>
                </div>

                {/* User Info */}
                <div className="flex-1">
                    <h1 className="text-3xl font-bold text-white mb-2">{userName}</h1>
                    <p className="text-gray-400">{userEmail}</p>
                    <div className="mt-3 flex items-center gap-3">
                        <Link
                            href="/settings"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800/50 hover:bg-gray-700/50 text-white rounded-lg transition-colors text-sm font-medium"
                        >
                            Edit Profile
                        </Link>

                        {/* Dev Tools - Controlled by debug console toggle */}
                        {process.env.NODE_ENV === 'development' && debugSettings.showSeedButton && (
                            <div className="flex items-center gap-2">
                                {/* Seed Data Button */}
                                <button
                                    onClick={handleSeedData}
                                    disabled={isSeeding || isDeleting}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600/20 to-pink-600/20 hover:from-purple-600/30 hover:to-pink-600/30 text-purple-400 border border-purple-500/30 rounded-lg transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Populate with test data (15 liked, 8 hidden, 12 watch later, 20 watch history, 8 collections, 8 notifications)"
                                >
                                    <SparklesIcon className="w-4 h-4" />
                                    {isSeeding ? 'Seeding...' : 'Seed Test Data'}
                                </button>

                                {/* Quick Delete Button */}
                                <button
                                    onClick={handleQuickDelete}
                                    disabled={isSeeding || isDeleting}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600/20 to-orange-600/20 hover:from-red-600/30 hover:to-orange-600/30 text-red-400 border border-red-500/30 rounded-lg transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Clear all data for current session (collections, ratings, watch history, notifications)"
                                >
                                    <TrashIcon className="w-4 h-4" />
                                    {isDeleting ? 'Deleting...' : 'Quick Delete'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {/* Watch Later */}
                <Link
                    href="/watch-later"
                    className="bg-gradient-to-br from-amber-900/30 to-yellow-800/20 border border-amber-700/30 rounded-xl p-6 hover:border-amber-600/50 transition-all duration-200 group"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <BookmarkIcon className="w-6 h-6 text-amber-400 group-hover:scale-110 transition-transform" />
                        <h3 className="text-sm font-medium text-gray-400">Watch Later</h3>
                    </div>
                    <p className="text-3xl font-bold text-white">{stats.watchLater}</p>
                </Link>

                {/* Liked */}
                <Link
                    href="/liked"
                    className="bg-gradient-to-br from-green-900/30 to-green-800/20 border border-green-700/30 rounded-xl p-6 hover:border-green-600/50 transition-all duration-200 group"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <HeartIcon className="w-6 h-6 text-green-400 group-hover:scale-110 transition-transform" />
                        <h3 className="text-sm font-medium text-gray-400">Liked</h3>
                    </div>
                    <p className="text-3xl font-bold text-white">{stats.totalLiked}</p>
                </Link>

                {/* Hidden */}
                <Link
                    href="/hidden"
                    className="bg-gradient-to-br from-red-900/30 to-red-800/20 border border-red-700/30 rounded-xl p-6 hover:border-red-600/50 transition-all duration-200 group"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <EyeSlashIcon className="w-6 h-6 text-red-400 group-hover:scale-110 transition-transform" />
                        <h3 className="text-sm font-medium text-gray-400">Hidden</h3>
                    </div>
                    <p className="text-3xl font-bold text-white">{stats.totalHidden}</p>
                </Link>

                {/* Watch History */}
                <Link
                    href="/watch-history"
                    className="bg-gradient-to-br from-purple-900/30 to-purple-800/20 border border-purple-700/30 rounded-xl p-6 hover:border-purple-600/50 transition-all duration-200 group"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <ClockIcon className="w-6 h-6 text-purple-400 group-hover:scale-110 transition-transform" />
                        <h3 className="text-sm font-medium text-gray-400">Watch History</h3>
                    </div>
                    <p className="text-3xl font-bold text-white">{stats.totalWatched}</p>
                </Link>

                {/* Collections */}
                <Link
                    href="/collections"
                    className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 border border-blue-700/30 rounded-xl p-6 hover:border-blue-600/50 transition-all duration-200 group"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <RectangleStackIcon className="w-6 h-6 text-blue-400 group-hover:scale-110 transition-transform" />
                        <h3 className="text-sm font-medium text-gray-400">Collections</h3>
                    </div>
                    <p className="text-3xl font-bold text-white">{stats.totalCollections}</p>
                </Link>

                {/* Rankings */}
                <Link
                    href="/rankings"
                    className="bg-gradient-to-br from-yellow-900/30 to-yellow-800/20 border border-yellow-700/30 rounded-xl p-6 hover:border-yellow-600/50 transition-all duration-200 group"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <TrophyIcon className="w-6 h-6 text-yellow-400 group-hover:scale-110 transition-transform" />
                        <h3 className="text-sm font-medium text-gray-400">Rankings</h3>
                    </div>
                    <p className="text-3xl font-bold text-white">{stats.totalRankings}</p>
                </Link>
            </div>

            {/* Content Breakdown */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                    <ChartBarIcon className="w-6 h-6 text-gray-400" />
                    <h2 className="text-xl font-semibold text-white">Content Breakdown</h2>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-4 bg-gray-800/50 rounded-lg p-4">
                        <FilmIcon className="w-8 h-8 text-blue-400" />
                        <div>
                            <p className="text-sm text-gray-400">Movies Liked</p>
                            <p className="text-2xl font-bold text-white">{stats.moviesLiked}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 bg-gray-800/50 rounded-lg p-4">
                        <TvIcon className="w-8 h-8 text-purple-400" />
                        <div>
                            <p className="text-sm text-gray-400">TV Shows Liked</p>
                            <p className="text-2xl font-bold text-white">{stats.tvShowsLiked}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 bg-gray-800/50 rounded-lg p-4">
                        <FilmIcon className="w-8 h-8 text-green-400" />
                        <div>
                            <p className="text-sm text-gray-400">Movies Watched</p>
                            <p className="text-2xl font-bold text-white">{stats.moviesWatched}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 bg-gray-800/50 rounded-lg p-4">
                        <TvIcon className="w-8 h-8 text-orange-400" />
                        <div>
                            <p className="text-sm text-gray-400">TV Shows Watched</p>
                            <p className="text-2xl font-bold text-white">{stats.tvShowsWatched}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Links */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Quick Links</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <Link
                        href="/watch-history"
                        className="flex items-center gap-3 p-3 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg transition-colors"
                    >
                        <ClockIcon className="w-5 h-5 text-purple-400" />
                        <span className="text-white font-medium">Watch History</span>
                    </Link>
                    <Link
                        href="/collections"
                        className="flex items-center gap-3 p-3 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg transition-colors"
                    >
                        <RectangleStackIcon className="w-5 h-5 text-blue-400" />
                        <span className="text-white font-medium">My Collections</span>
                    </Link>
                    <Link
                        href="/rankings"
                        className="flex items-center gap-3 p-3 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg transition-colors"
                    >
                        <TrophyIcon className="w-5 h-5 text-yellow-400" />
                        <span className="text-white font-medium">My Rankings</span>
                    </Link>
                    <Link
                        href="/settings"
                        className="flex items-center gap-3 p-3 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg transition-colors"
                    >
                        <UserIcon className="w-5 h-5 text-green-400" />
                        <span className="text-white font-medium">Account Settings</span>
                    </Link>
                </div>
            </div>
        </div>
    )

    // Show loading screen while data is being fetched
    if (isLoading) {
        return (
            <SubPageLayout title="Profile" icon={<UserIcon />} iconColor="text-blue-400">
                <NetflixLoader inline message="Loading your profile data..." />
            </SubPageLayout>
        )
    }

    return (
        <SubPageLayout
            title="Profile"
            icon={<UserIcon />}
            iconColor="text-blue-400"
            headerActions={profileHeader}
        >
            {/* Page content handled by header */}
        </SubPageLayout>
    )
}
