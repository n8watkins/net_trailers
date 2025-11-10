/**
 * Profile Page
 *
 * User profile with viewing statistics and activity
 */

'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Header from '../../components/layout/Header'
import SubHeader from '../../components/common/SubHeader'
import {
    UserIcon,
    ClockIcon,
    HeartIcon,
    EyeSlashIcon,
    RectangleStackIcon,
    ChartBarIcon,
    FilmIcon,
    TvIcon,
} from '@heroicons/react/24/outline'
import { useAppStore } from '../../stores/appStore'
import useAuth from '../../hooks/useAuth'
import useUserData from '../../hooks/useUserData'

export default function ProfilePage() {
    const { modal } = useAppStore()
    const showModal = modal.isOpen
    const { user } = useAuth()
    const userData = useUserData()

    useEffect(() => {
        document.title = 'Profile - NetTrailers'
    }, [])

    // Calculate stats
    const stats = {
        totalWatched: 0, // TODO: Implement watch history tracking
        totalCollections: userData.getAllLists().length,
        totalLiked: userData.likedMovies.length,
        totalHidden: userData.hiddenMovies.length,
        moviesLiked: userData.likedMovies.filter((item) => item.media_type === 'movie').length,
        tvShowsLiked: userData.likedMovies.filter((item) => item.media_type === 'tv').length,
    }

    const userName = user?.displayName || user?.email?.split('@')[0] || 'User'
    const userEmail = user?.email || ''
    const userInitials = userName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)

    return (
        <div
            className={`relative min-h-screen overflow-x-clip ${showModal && `overflow-y-hidden`} bg-gradient-to-b from-black to-gray-900`}
        >
            <Header />
            <SubHeader />

            <main className="relative pb-24 px-4 sm:px-6 lg:px-8">
                <div className="max-w-[1600px] mx-auto flex flex-col space-y-6 py-8">
                    {/* Profile Header */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-6">
                            {/* Avatar */}
                            <div className="flex-shrink-0">
                                {user?.photoURL ? (
                                    <img
                                        src={user.photoURL}
                                        alt={userName}
                                        className="w-24 h-24 rounded-full ring-4 ring-blue-500/30"
                                    />
                                ) : (
                                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center ring-4 ring-blue-500/30">
                                        <span className="text-3xl font-bold text-white">
                                            {userInitials}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* User Info */}
                            <div className="flex-1">
                                <h1 className="text-3xl font-bold text-white mb-2">{userName}</h1>
                                <p className="text-gray-400">{userEmail}</p>
                                <div className="mt-3">
                                    <Link
                                        href="/settings"
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800/50 hover:bg-gray-700/50 text-white rounded-lg transition-colors text-sm font-medium"
                                    >
                                        Edit Profile
                                    </Link>
                                </div>
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {/* Total Watched */}
                            <Link
                                href="/watch-history"
                                className="bg-gradient-to-br from-purple-900/30 to-purple-800/20 border border-purple-700/30 rounded-xl p-6 hover:border-purple-600/50 transition-all duration-200 group"
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <ClockIcon className="w-6 h-6 text-purple-400 group-hover:scale-110 transition-transform" />
                                    <h3 className="text-sm font-medium text-gray-400">Watched</h3>
                                </div>
                                <p className="text-3xl font-bold text-white">
                                    {stats.totalWatched}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">Coming soon</p>
                            </Link>

                            {/* Total Collections */}
                            <Link
                                href="/collections"
                                className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 border border-blue-700/30 rounded-xl p-6 hover:border-blue-600/50 transition-all duration-200 group"
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <RectangleStackIcon className="w-6 h-6 text-blue-400 group-hover:scale-110 transition-transform" />
                                    <h3 className="text-sm font-medium text-gray-400">
                                        Collections
                                    </h3>
                                </div>
                                <p className="text-3xl font-bold text-white">
                                    {stats.totalCollections}
                                </p>
                            </Link>

                            {/* Total Liked */}
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

                            {/* Total Hidden */}
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
                        </div>

                        {/* Content Breakdown */}
                        <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <ChartBarIcon className="w-6 h-6 text-gray-400" />
                                <h2 className="text-xl font-semibold text-white">
                                    Content Breakdown
                                </h2>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-center gap-4 bg-gray-800/50 rounded-lg p-4">
                                    <FilmIcon className="w-8 h-8 text-blue-400" />
                                    <div>
                                        <p className="text-sm text-gray-400">Movies Liked</p>
                                        <p className="text-2xl font-bold text-white">
                                            {stats.moviesLiked}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 bg-gray-800/50 rounded-lg p-4">
                                    <TvIcon className="w-8 h-8 text-purple-400" />
                                    <div>
                                        <p className="text-sm text-gray-400">TV Shows Liked</p>
                                        <p className="text-2xl font-bold text-white">
                                            {stats.tvShowsLiked}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Quick Links */}
                        <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-6">
                            <h2 className="text-xl font-semibold text-white mb-4">Quick Links</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
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
                                    href="/settings"
                                    className="flex items-center gap-3 p-3 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg transition-colors"
                                >
                                    <UserIcon className="w-5 h-5 text-green-400" />
                                    <span className="text-white font-medium">Account Settings</span>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
