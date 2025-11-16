/**
 * Profile Page
 *
 * User profile with viewing statistics and activity
 */

'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import SubPageLayout from '../../components/layout/SubPageLayout'
import { UserIcon, EyeIcon, SparklesIcon, TrashIcon } from '@heroicons/react/24/outline'
import useAuth from '../../hooks/useAuth'
import useUserData from '../../hooks/useUserData'
import NetflixLoader from '../../components/common/NetflixLoader'
import { GuestModeNotification } from '../../components/auth/GuestModeNotification'
import { useAuthStatus } from '../../hooks/useAuthStatus'
import { useRankingStore } from '../../stores/rankingStore'
import { useForumStore } from '../../stores/forumStore'
import { useSessionStore } from '../../stores/sessionStore'
import { useProfileStore } from '../../stores/profileStore'
import { useDebugSettings } from '../../components/debug/DebugControls'
import { LikedContentSection } from '../../components/profile/LikedContentSection'
import { WatchLaterSection } from '../../components/profile/WatchLaterSection'
import { RankingsCollectionsSection } from '../../components/profile/RankingsCollectionsSection'
import { ForumActivitySection } from '../../components/profile/ForumActivitySection'
import { useProfileActions } from '../../hooks/useProfileActions'

export default function ProfilePage() {
    const { user, loading: authLoading } = useAuth()
    const userData = useUserData()
    const { isGuest } = useAuthStatus()
    const isInitialized = useSessionStore((state) => state.isInitialized)
    const { rankings, loadUserRankings } = useRankingStore()
    const { threads, polls, loadThreads, loadPolls } = useForumStore()
    const profileUsername = useProfileStore((state) => state.profile?.username)
    const debugSettings = useDebugSettings()
    const { isSeeding, isDeleting, handleSeedData, handleQuickDelete } = useProfileActions()

    // Show loading state while data is being fetched
    const isLoading = !isInitialized || authLoading

    useEffect(() => {
        document.title = 'Profile - NetTrailers'
    }, [])

    // Load user rankings, threads, and polls
    useEffect(() => {
        const getUserId = useSessionStore.getState().getUserId
        const userId = getUserId()

        if (userId && isInitialized) {
            loadUserRankings(userId)
            loadThreads()
            loadPolls()
        }
    }, [isInitialized, loadUserRankings, loadThreads, loadPolls])

    const getUserId = useSessionStore((state) => state.getUserId)
    const currentUserId = getUserId()

    // Memoize filtered arrays to prevent unnecessary re-computations
    const userThreads = useMemo(
        () => threads.filter((thread) => thread.userId === currentUserId),
        [threads, currentUserId]
    )
    const userPolls = useMemo(
        () => polls.filter((poll) => poll.userId === currentUserId),
        [polls, currentUserId]
    )

    const userName = isGuest ? 'Guest' : user?.displayName || user?.email?.split('@')[0] || 'User'
    const userInitials = userName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)

    const likedContent = userData.likedMovies || []
    const watchLaterPreview = (userData.defaultWatchlist || []).slice(0, 5)
    const collections = (userData.userCreatedWatchlists || []).filter((list) => list?.isPublic)

    // Show loading screen while data is being fetched
    if (isLoading) {
        return (
            <SubPageLayout title="Profile" icon={<UserIcon />} iconColor="text-blue-400">
                <NetflixLoader inline message="Loading your profile data..." />
            </SubPageLayout>
        )
    }

    return (
        <SubPageLayout>
            {/* Guest Mode Notification */}
            {isInitialized && isGuest && (
                <div className="mb-6">
                    <GuestModeNotification align="left" />
                </div>
            )}

            {/* Profile Header */}
            <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 border border-zinc-700 rounded-xl p-8 mb-8">
                <div className="flex items-start gap-6">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                        {user?.photoURL ? (
                            <img
                                src={user.photoURL}
                                alt={userName}
                                className="w-32 h-32 rounded-full ring-4 ring-blue-500/30 object-cover"
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
                            className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center ring-4 ring-blue-500/30"
                            style={{ display: user?.photoURL ? 'none' : 'flex' }}
                        >
                            <span className="text-4xl font-bold text-white">{userInitials}</span>
                        </div>
                    </div>

                    {/* Profile Info */}
                    <div className="flex-1 min-w-0">
                        <h1 className="text-3xl font-bold text-white mb-2">{userName}</h1>
                        {user?.email && <p className="text-gray-400 mb-3">{user.email}</p>}

                        {/* Action Buttons */}
                        <div className="flex items-center gap-3 flex-wrap">
                            <Link
                                href="/settings"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800/50 hover:bg-gray-700/50 text-white rounded-lg transition-colors text-sm font-medium"
                            >
                                Edit Profile
                            </Link>

                            {/* View Public Profile Button - Auth only */}
                            {!isGuest && currentUserId && (
                                <Link
                                    href={`/users/${profileUsername || currentUserId}`}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-400 rounded-lg transition-colors text-sm font-medium"
                                >
                                    <EyeIcon className="w-4 h-4" />
                                    View Public Profile
                                </Link>
                            )}

                            {/* Dev Tools - Controlled by debug console toggle */}
                            {process.env.NODE_ENV === 'development' &&
                                debugSettings.showSeedButton && (
                                    <>
                                        {/* Seed Data Button */}
                                        <button
                                            onClick={handleSeedData}
                                            disabled={isSeeding || isDeleting}
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600/20 to-pink-600/20 hover:from-purple-600/30 hover:to-pink-600/30 text-purple-400 border border-purple-500/30 rounded-lg transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                            title="Populate with test data (15 liked, 8 hidden, 12 watch later, 20 watch history, 8 collections, 8 notifications, 3 forum threads, 2 polls)"
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
                                    </>
                                )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bento Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <LikedContentSection likedContent={likedContent} />
                <WatchLaterSection
                    watchLaterPreview={watchLaterPreview}
                    totalCount={userData.defaultWatchlist.length}
                />
            </div>

            {/* Rankings and Collections */}
            <RankingsCollectionsSection rankings={rankings} collections={collections} />

            {/* Forum Activity */}
            {!isGuest && <ForumActivitySection threads={userThreads} polls={userPolls} />}
        </SubPageLayout>
    )
}
