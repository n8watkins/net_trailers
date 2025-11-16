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
    RectangleStackIcon,
    TrophyIcon,
    EyeIcon,
    ChatBubbleLeftRightIcon,
    ChartBarIcon,
    SparklesIcon,
    TrashIcon,
} from '@heroicons/react/24/outline'
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
import { seedUserData } from '../../utils/seedData'
import type { Movie, TVShow } from '../../typings'
import type { UserList } from '../../types/userLists'

export default function ProfilePage() {
    const { user, loading: authLoading } = useAuth()
    const userData = useUserData()
    const { isGuest } = useAuthStatus()
    const isInitialized = useSessionStore((state) => state.isInitialized)
    const { rankings, loadUserRankings } = useRankingStore()
    const { threads, polls, loadThreads, loadPolls } = useForumStore()
    const profileUsername = useProfileStore((state) => state.profile?.username)
    const debugSettings = useDebugSettings()
    const [isSeeding, setIsSeeding] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

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
            setIsSeeding(false)
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

            setIsDeleting(false)
        } catch (error) {
            console.error('[Profile] ❌ Failed to delete data:', error)
            alert('Failed to delete data. Please try again or use Settings > Clear All Data.')
            setIsDeleting(false)
        }
    }

    const getUserId = useSessionStore((state) => state.getUserId)
    const currentUserId = getUserId()
    const userThreads = threads.filter((thread) => thread.userId === currentUserId)
    const userPolls = polls.filter((poll) => poll.userId === currentUserId)

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
                {/* Liked Content Section */}
                <section
                    id="liked-section"
                    className="bg-gradient-to-br from-red-900/20 to-pink-900/10 border border-red-800/30 rounded-xl p-6"
                >
                    <div className="flex items-center gap-3 mb-4">
                        <HeartIcon className="w-6 h-6 text-red-400" />
                        <h2 className="text-2xl font-bold text-white">Liked Content</h2>
                        <Link
                            href="/liked"
                            className="text-base text-red-400 hover:text-red-300 underline"
                        >
                            View all {likedContent.length}
                        </Link>
                    </div>
                    {likedContent.length > 0 ? (
                        <div className="flex gap-3 flex-wrap">
                            {likedContent.slice(0, 5).map((content) => (
                                <div
                                    key={content.id}
                                    className="w-24 aspect-[2/3] relative overflow-hidden rounded-lg"
                                >
                                    {content.poster_path && (
                                        <img
                                            src={`https://image.tmdb.org/t/p/w185${content.poster_path}`}
                                            alt=""
                                            className="w-full h-full object-cover"
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-black/20 rounded-lg border border-red-800/20">
                            <HeartIcon className="w-16 h-16 text-red-900 mx-auto mb-4" />
                            <p className="text-gray-400">No liked content yet</p>
                        </div>
                    )}
                </section>

                {/* Watch Later Section */}
                <section className="bg-gradient-to-br from-indigo-900/20 to-blue-900/10 border border-indigo-800/30 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <ClockIcon className="w-6 h-6 text-indigo-400" />
                        <h2 className="text-2xl font-bold text-white">Watch Later</h2>
                        <Link
                            href="/watch-later"
                            className="text-base text-indigo-400 hover:text-indigo-300 underline"
                        >
                            View all {userData.defaultWatchlist.length}
                        </Link>
                    </div>
                    {watchLaterPreview.length > 0 ? (
                        <div className="flex gap-3 flex-wrap">
                            {watchLaterPreview.map((content) => (
                                <div
                                    key={content.id}
                                    className="w-24 aspect-[2/3] relative overflow-hidden rounded-lg"
                                >
                                    {content.poster_path && (
                                        <img
                                            src={`https://image.tmdb.org/t/p/w185${content.poster_path}`}
                                            alt=""
                                            className="w-full h-full object-cover"
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-black/20 rounded-lg border border-indigo-800/20">
                            <ClockIcon className="w-16 h-16 text-indigo-900 mx-auto mb-4" />
                            <p className="text-gray-400">No items in watch later</p>
                        </div>
                    )}
                </section>
            </div>

            {/* Rankings and Collections - Bento Container */}
            <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-800/50 border border-zinc-700 rounded-xl p-6 mb-6">
                <div className="flex gap-6">
                    {/* Rankings Section - Takes 1/2 width */}
                    <section id="rankings-section" className="flex-1">
                        <div className="flex items-center gap-3 mb-4">
                            <TrophyIcon className="w-6 h-6 text-yellow-400" />
                            <h2 className="text-2xl font-bold text-white">Rankings</h2>
                            <Link
                                href="/rankings"
                                className="text-base text-yellow-400 hover:text-yellow-300 underline"
                            >
                                View all {rankings.length}
                            </Link>
                        </div>
                        {rankings.length > 0 ? (
                            <div className="flex gap-3">
                                {rankings.slice(0, 3).map((ranking) => (
                                    <Link
                                        key={ranking.id}
                                        href={`/rankings/${ranking.id}`}
                                        className="group bg-gradient-to-br from-yellow-900/20 to-orange-900/10 border border-yellow-800/30 hover:border-yellow-700/50 rounded-xl p-4 transition-all cursor-pointer flex-1 min-w-0"
                                    >
                                        <h3 className="text-sm font-bold text-white group-hover:text-yellow-400 transition-colors line-clamp-2 mb-3 h-10">
                                            {ranking.title}
                                        </h3>
                                        <div className="flex gap-2 mb-3">
                                            {ranking.rankedItems?.slice(0, 3).map((item, idx) => (
                                                <div
                                                    key={idx}
                                                    className="flex-1 aspect-[2/3] relative overflow-hidden rounded"
                                                >
                                                    {item.content?.poster_path && (
                                                        <img
                                                            src={`https://image.tmdb.org/t/p/w185${item.content.poster_path}`}
                                                            alt=""
                                                            className="w-full h-full object-cover"
                                                        />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-gray-400">
                                            <span className="flex items-center gap-1.5">
                                                <HeartIcon className="w-3 h-3" />
                                                <span className="font-medium">
                                                    {ranking.likes || 0}
                                                </span>
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <EyeIcon className="w-3 h-3" />
                                                <span className="font-medium">
                                                    {ranking.views || 0}
                                                </span>
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <ChatBubbleLeftRightIcon className="w-3 h-3" />
                                                <span className="font-medium">
                                                    {ranking.comments?.length || 0}
                                                </span>
                                            </span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 bg-gradient-to-br from-yellow-900/20 to-orange-900/10 border border-yellow-800/30 rounded-xl">
                                <TrophyIcon className="w-16 h-16 text-yellow-900 mx-auto mb-4" />
                                <p className="text-gray-400">No rankings yet</p>
                            </div>
                        )}
                    </section>

                    {/* Collections Section - Takes 1/2 width */}
                    <section id="collections-section" className="flex-1">
                        <div className="flex items-center gap-3 mb-4">
                            <RectangleStackIcon className="w-6 h-6 text-purple-400" />
                            <h2 className="text-2xl font-bold text-white">Collections</h2>
                            <Link
                                href="/collections"
                                className="text-base text-purple-400 hover:text-purple-300 underline"
                            >
                                View all {collections.length}
                            </Link>
                        </div>
                        {collections.length > 0 ? (
                            <div className="flex gap-3">
                                {collections.slice(0, 3).map((collection) => (
                                    <Link
                                        key={collection.id}
                                        href={`/collections/${collection.id}`}
                                        className="group bg-gradient-to-br from-purple-900/20 to-violet-900/10 border border-purple-800/30 hover:border-purple-700/50 rounded-xl p-4 transition-all cursor-pointer flex-1 min-w-0"
                                    >
                                        <div className="flex items-center gap-2 mb-3 h-10">
                                            {collection.emoji && (
                                                <span className="text-xl flex-shrink-0">
                                                    {collection.emoji}
                                                </span>
                                            )}
                                            <h3 className="text-sm font-bold text-white group-hover:text-purple-400 transition-colors line-clamp-2 flex-1 min-w-0">
                                                {collection.name}
                                            </h3>
                                        </div>
                                        <div className="flex gap-2 mb-3">
                                            {collection.items?.slice(0, 3).map((item) => (
                                                <div
                                                    key={item.id}
                                                    className="flex-1 aspect-[2/3] relative overflow-hidden rounded"
                                                >
                                                    {item.poster_path && (
                                                        <img
                                                            src={`https://image.tmdb.org/t/p/w185${item.poster_path}`}
                                                            alt=""
                                                            className="w-full h-full object-cover"
                                                        />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex items-center text-xs text-gray-400">
                                            <span className="flex items-center gap-1.5">
                                                <RectangleStackIcon className="w-3 h-3" />
                                                <span className="font-medium">
                                                    {collection.items?.length || 0} items
                                                </span>
                                            </span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 bg-gradient-to-br from-purple-900/20 to-violet-900/10 border border-purple-800/30 rounded-xl">
                                <RectangleStackIcon className="w-16 h-16 text-purple-900 mx-auto mb-4" />
                                <p className="text-gray-400">No collections yet</p>
                            </div>
                        )}
                    </section>
                </div>
            </div>

            {/* Forum Activity */}
            {!isGuest && (
                <div className="space-y-12">
                    <section id="forum-section">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <ChatBubbleLeftRightIcon className="w-6 h-6 text-green-500" />
                                <h2 className="text-2xl font-bold text-white">Forum Activity</h2>
                            </div>
                            <Link
                                href="/community"
                                className="text-sm text-blue-400 hover:text-blue-300"
                            >
                                Visit community
                            </Link>
                        </div>

                        {/* Bento Grid Layout - Side by Side on Large Screens */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Threads Column */}
                            <div className="bg-zinc-900/50 rounded-lg p-6 border border-zinc-800">
                                <div className="flex items-center gap-3 mb-4">
                                    <ChatBubbleLeftRightIcon className="w-5 h-5 text-green-400" />
                                    <h3 className="text-lg font-semibold text-white">Threads</h3>
                                    <Link
                                        href="/community?tab=threads"
                                        className="text-base text-green-400 hover:text-green-300 underline"
                                    >
                                        View all {userThreads.length}
                                    </Link>
                                </div>
                                {userThreads.length > 0 ? (
                                    <div className="space-y-3">
                                        {userThreads.slice(0, 3).map((thread) => (
                                            <Link
                                                key={thread.id}
                                                href={`/community/threads/${thread.id}`}
                                                className="group hover:bg-zinc-800/50 rounded-lg p-3 transition-colors cursor-pointer border border-transparent hover:border-zinc-700 block"
                                            >
                                                <h4 className="text-white font-medium text-sm mb-1 line-clamp-1 group-hover:text-green-400 transition-colors">
                                                    {thread.title}
                                                </h4>
                                                <p className="text-gray-400 text-xs line-clamp-1 mb-2">
                                                    {thread.content}
                                                </p>
                                                <div className="flex items-center gap-3 text-xs text-gray-500">
                                                    <span className="flex items-center gap-1">
                                                        💬 {thread.replyCount}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        ❤️ {thread.likes}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        👁️ {thread.views}
                                                    </span>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-gray-500 text-center py-8 text-sm">
                                        No threads yet
                                    </p>
                                )}
                            </div>

                            {/* Polls Column */}
                            <div className="bg-zinc-900/50 rounded-lg p-6 border border-zinc-800">
                                <div className="flex items-center gap-3 mb-4">
                                    <ChartBarIcon className="w-5 h-5 text-blue-400" />
                                    <h3 className="text-lg font-semibold text-white">Polls</h3>
                                    <Link
                                        href="/community?tab=polls"
                                        className="text-base text-blue-400 hover:text-blue-300 underline"
                                    >
                                        View all {userPolls.length}
                                    </Link>
                                </div>
                                {userPolls.length > 0 ? (
                                    <div className="space-y-3">
                                        {userPolls.slice(0, 3).map((poll) => (
                                            <Link
                                                key={poll.id}
                                                href={`/community/polls/${poll.id}`}
                                                className="group hover:bg-zinc-800/50 rounded-lg p-3 transition-colors cursor-pointer border border-transparent hover:border-zinc-700 block"
                                            >
                                                <h4 className="text-white font-medium text-sm mb-2 line-clamp-2 group-hover:text-blue-400 transition-colors">
                                                    {poll.question}
                                                </h4>
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-gray-400">
                                                        {poll.options.length} options
                                                    </span>
                                                    <span className="text-gray-500">
                                                        🗳️ {poll.totalVotes} votes
                                                    </span>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-gray-500 text-center py-8 text-sm">
                                        No polls yet
                                    </p>
                                )}
                            </div>
                        </div>
                    </section>
                </div>
            )}
        </SubPageLayout>
    )
}
