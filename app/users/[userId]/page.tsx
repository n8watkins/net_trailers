/**
 * Public User Profile Page
 *
 * Displays a user's public profile with comprehensive activity view
 */

'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import SubPageLayout from '../../../components/layout/SubPageLayout'
import { RankingGrid } from '../../../components/rankings/RankingGrid'
import NetflixLoader from '../../../components/common/NetflixLoader'
import ContentCard from '../../../components/common/ContentCard'
import {
    UserIcon,
    TrophyIcon,
    HeartIcon,
    EyeIcon,
    RectangleStackIcon,
    ChatBubbleLeftRightIcon,
    ChartBarIcon,
    FilmIcon,
    ClockIcon,
} from '@heroicons/react/24/outline'
import { FirebaseError } from 'firebase/app'
import { db } from '../../../firebase'
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore'
import type { Movie, TVShow } from '../../../typings'
import type { UserList } from '../../../types/userLists'
import type { Ranking } from '../../../types/rankings'
import type { PublicProfilePayload } from '@/lib/publicProfile'

type PublicProfileIdentity = PublicProfilePayload['profile']

const PREVIEW_LIMIT = 12

const toMillisClient = (value: unknown): number | null => {
    if (value === null || value === undefined) return null
    if (typeof value === 'number') return value
    if (typeof value === 'object' && value !== null && 'toMillis' in value) {
        try {
            return (value as { toMillis: () => number }).toMillis()
        } catch {
            return null
        }
    }
    return null
}

const sortByRecency = <T extends { updatedAt?: number | null; createdAt?: number | null }>(
    items: T[]
): T[] => {
    return [...items].sort((a, b) => {
        const aTime = a.updatedAt ?? a.createdAt ?? 0
        const bTime = b.updatedAt ?? b.createdAt ?? 0
        return bTime - aTime
    })
}

async function loadProfileFromClient(userId: string): Promise<PublicProfilePayload> {
    const userSnap = await getDoc(doc(db, 'users', userId))

    if (!userSnap.exists()) {
        throw new Error('User not found')
    }

    const userData = userSnap.data() || {}
    const legacyProfile = userData.profile || {}

    const profile: PublicProfileIdentity = {
        username:
            legacyProfile.username ||
            userData.username ||
            userData.displayName ||
            userData.email?.split('@')[0] ||
            'User',
        displayName: legacyProfile.displayName ?? userData.displayName ?? null,
        avatarUrl: legacyProfile.avatarUrl ?? userData.photoURL ?? userData.avatarUrl ?? null,
        bio: legacyProfile.bio ?? userData.bio ?? null,
        favoriteGenres: Array.isArray(legacyProfile.favoriteGenres)
            ? legacyProfile.favoriteGenres
            : Array.isArray(userData.favoriteGenres)
              ? userData.favoriteGenres
              : undefined,
    }

    const likedContent = Array.isArray(userData.likedMovies)
        ? (userData.likedMovies as (Movie | TVShow)[])
        : []
    const collections = Array.isArray(userData.userCreatedWatchlists)
        ? (userData.userCreatedWatchlists as UserList[]).filter((list) => list?.isPublic)
        : []
    const watchLaterPreview = Array.isArray(userData.defaultWatchlist)
        ? (userData.defaultWatchlist as (Movie | TVShow)[]).slice(0, PREVIEW_LIMIT)
        : []

    const rankingsSnap = await getDocs(
        query(collection(db, 'rankings'), where('userId', '==', userId))
    )
    const allRankings = rankingsSnap.docs.map((doc) => doc.data() as Ranking)
    const publicRankings = sortByRecency(allRankings.filter((ranking) => ranking.isPublic)).slice(
        0,
        20
    )

    const threadsSnap = await getDocs(
        query(collection(db, 'threads'), where('userId', '==', userId))
    )
    const threadSummaries: PublicProfilePayload['forum']['threads'] = sortByRecency(
        threadsSnap.docs.map((doc) => {
            const data = doc.data() || {}
            return {
                id: doc.id,
                title: data.title ?? 'Untitled thread',
                content: data.content ?? '',
                category: data.category ?? 'general',
                likes: data.likes ?? 0,
                views: data.views ?? 0,
                replyCount: data.replyCount ?? 0,
                createdAt: toMillisClient(data.createdAt),
                updatedAt: toMillisClient(data.updatedAt),
            }
        })
    ).slice(0, 10)

    const pollsSnap = await getDocs(query(collection(db, 'polls'), where('userId', '==', userId)))
    const pollSummaries: PublicProfilePayload['forum']['polls'] = sortByRecency(
        pollsSnap.docs.map((doc) => {
            const data = doc.data() || {}
            return {
                id: doc.id,
                question: data.question ?? 'Untitled poll',
                category: data.category ?? 'general',
                totalVotes: data.totalVotes ?? 0,
                isMultipleChoice: Boolean(data.isMultipleChoice),
                allowAddOptions: Boolean(data.allowAddOptions),
                options: Array.isArray(data.options)
                    ? data.options.map(
                          (
                              option: Partial<{
                                  id: string
                                  text: string
                                  votes: number
                                  percentage: number
                              }>
                          ) => ({
                              id: option.id ?? '',
                              text: option.text ?? '',
                              votes: option.votes ?? 0,
                              percentage: option.percentage,
                          })
                      )
                    : [],
                createdAt: toMillisClient(data.createdAt),
                expiresAt: toMillisClient(data.expiresAt),
            }
        })
    ).slice(0, 10)

    const stats: PublicProfilePayload['stats'] = {
        totalRankings: publicRankings.length,
        totalLikes: publicRankings.reduce((sum, ranking) => sum + (ranking.likes || 0), 0),
        totalViews: publicRankings.reduce((sum, ranking) => sum + (ranking.views || 0), 0),
        totalLiked: likedContent.length,
        totalCollections: collections.length,
        totalThreads: threadSummaries.length,
        totalPolls: pollSummaries.length,
    }

    return {
        profile,
        stats,
        rankings: publicRankings,
        likedContent,
        collections,
        forum: {
            threads: threadSummaries,
            polls: pollSummaries,
        },
        watchLaterPreview,
    }
}

export default function UserProfilePage() {
    const params = useParams()
    const identifier = params?.userId as string
    const userId = identifier // Alias for clarity in JSX

    const [profileData, setProfileData] = useState<PublicProfilePayload | null>(null)
    const [isLoadingProfile, setIsLoadingProfile] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Load aggregate public profile payload
    useEffect(() => {
        if (!identifier) return
        let isMounted = true

        const loadProfile = async () => {
            setIsLoadingProfile(true)
            setError(null)

            try {
                let response = await fetch(`/api/public-profile/username/${identifier}`)

                if (response.status === 404) {
                    response = await fetch(`/api/public-profile/${identifier}`)
                }

                if (!response.ok) {
                    const payload = await response.json().catch(() => null)
                    throw new Error(payload?.error || 'API unavailable')
                }

                const payload = (await response.json()) as PublicProfilePayload
                if (isMounted) {
                    setProfileData(payload)
                }
            } catch (apiError) {
                console.warn('[PublicProfile] API failed, falling back to client read:', apiError)
                try {
                    const fallbackPayload = await loadProfileFromClient(identifier)
                    if (isMounted) {
                        setProfileData(fallbackPayload)
                    }
                } catch (fallbackError) {
                    console.error('[PublicProfile] Fallback client load failed:', fallbackError)
                    if (isMounted) {
                        let message = (fallbackError as Error).message || 'Failed to load profile'
                        if (
                            fallbackError instanceof FirebaseError &&
                            fallbackError.code === 'permission-denied'
                        ) {
                            message =
                                'Public profile data requires Firebase Admin credentials or viewing your own account.'
                        } else if ((apiError as Error).message === 'User not found') {
                            message = 'User not found'
                        }
                        setError(message)
                        setProfileData(null)
                    }
                }
            } finally {
                if (isMounted) {
                    setIsLoadingProfile(false)
                }
            }
        }

        loadProfile()

        return () => {
            isMounted = false
        }
    }, [identifier])
    const publicRankings = profileData?.rankings ?? []
    const likedContent = profileData?.likedContent ?? []
    const collections = profileData?.collections ?? []
    const forumThreads = profileData?.forum?.threads ?? []
    const forumPolls = profileData?.forum?.polls ?? []
    const watchLaterPreview = profileData?.watchLaterPreview ?? []
    const stats: PublicProfilePayload['stats'] = profileData?.stats ?? {
        totalRankings: publicRankings.length,
        totalLikes: publicRankings.reduce((sum, r) => sum + r.likes, 0),
        totalViews: publicRankings.reduce((sum, r) => sum + r.views, 0),
        totalLiked: likedContent.length,
        totalCollections: collections.length,
        totalThreads: forumThreads.length,
        totalPolls: forumPolls.length,
    }

    if (isLoadingProfile) {
        return (
            <SubPageLayout
                title="Loading Profile..."
                icon={<UserIcon className="w-8 h-8" />}
                iconColor="text-blue-400"
            >
                <NetflixLoader />
            </SubPageLayout>
        )
    }

    if (error || !profileData) {
        return (
            <SubPageLayout
                title="User Not Found"
                icon={<UserIcon className="w-8 h-8" />}
                iconColor="text-blue-400"
            >
                <div className="max-w-2xl mx-auto text-center py-16">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-zinc-800 flex items-center justify-center">
                        <UserIcon className="w-10 h-10 text-gray-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">User Not Found</h2>
                    <p className="text-gray-400">{error || 'This user does not exist.'}</p>
                </div>
            </SubPageLayout>
        )
    }

    const profile = profileData.profile

    return (
        <SubPageLayout>
            {/* Profile Header */}
            <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 border border-zinc-700 rounded-xl p-8 mb-8">
                <div className="flex items-start gap-6">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                        {profile.avatarUrl ? (
                            <img
                                src={profile.avatarUrl}
                                alt={profile.username}
                                className="w-32 h-32 rounded-full ring-4 ring-blue-500/30 object-cover"
                                referrerPolicy="no-referrer"
                            />
                        ) : (
                            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center ring-4 ring-blue-500/30">
                                <span className="text-4xl font-bold text-white">
                                    {profile.username[0]?.toUpperCase()}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Profile Info */}
                    <div className="flex-shrink-0 min-w-0" style={{ width: '200px' }}>
                        <h1 className="text-3xl font-bold text-white mb-2 truncate">
                            {profile.displayName || profile.username}
                        </h1>
                        {profile.bio && (
                            <p className="text-gray-400 mb-4 line-clamp-2">{profile.bio}</p>
                        )}

                        {profile.favoriteGenres && profile.favoriteGenres.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-4">
                                {profile.favoriteGenres.slice(0, 3).map((genre) => (
                                    <span
                                        key={genre}
                                        className="px-3 py-1 rounded-full border border-zinc-700 bg-zinc-900/80 text-gray-300 text-xs tracking-wide uppercase"
                                    >
                                        #{genre}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Quick Links Stats */}
                    <div className="grid grid-cols-2 gap-3 flex-1">
                        {[
                            {
                                label: 'Rankings',
                                value: stats.totalRankings,
                                icon: TrophyIcon,
                                iconColor: 'text-yellow-400',
                                bgAccent: 'from-yellow-900/20 to-yellow-800/5',
                                hoverColor:
                                    'hover:border-yellow-500/60 hover:shadow-lg hover:shadow-yellow-500/20',
                                scrollTo: 'rankings-section',
                            },
                            {
                                label: 'Collections',
                                value: stats.totalCollections,
                                icon: RectangleStackIcon,
                                iconColor: 'text-purple-400',
                                bgAccent: 'from-purple-900/20 to-purple-800/5',
                                hoverColor:
                                    'hover:border-purple-500/60 hover:shadow-lg hover:shadow-purple-500/20',
                                scrollTo: 'collections-section',
                            },
                            {
                                label: 'Liked',
                                value: stats.totalLiked,
                                icon: FilmIcon,
                                iconColor: 'text-pink-400',
                                bgAccent: 'from-pink-900/20 to-pink-800/5',
                                hoverColor:
                                    'hover:border-pink-500/60 hover:shadow-lg hover:shadow-pink-500/20',
                                scrollTo: 'liked-section',
                            },
                            {
                                label: 'Forum',
                                value: stats.totalThreads + stats.totalPolls,
                                icon: ChatBubbleLeftRightIcon,
                                iconColor: 'text-green-400',
                                bgAccent: 'from-green-900/20 to-green-800/5',
                                hoverColor:
                                    'hover:border-green-500/60 hover:shadow-lg hover:shadow-green-500/20',
                                scrollTo: 'forum-section',
                            },
                        ].map(
                            ({
                                icon: Icon,
                                label,
                                value,
                                iconColor,
                                bgAccent,
                                hoverColor,
                                scrollTo,
                            }) => (
                                <button
                                    key={label}
                                    onClick={() => {
                                        const element = document.getElementById(scrollTo)
                                        element?.scrollIntoView({
                                            behavior: 'smooth',
                                            block: 'start',
                                        })
                                    }}
                                    className={`group bg-gradient-to-br ${bgAccent} border border-zinc-700/50 ${hoverColor} rounded-xl p-5 transition-all duration-300 cursor-pointer hover:scale-105 active:scale-95 text-left`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Icon
                                            className={`w-6 h-6 ${iconColor} flex-shrink-0 group-hover:scale-110 transition-transform`}
                                        />
                                        <p className="text-2xl font-bold text-white group-hover:text-white">
                                            {value}{' '}
                                            <span className="text-sm font-medium text-gray-300 group-hover:text-white uppercase tracking-wide">
                                                {label}
                                            </span>
                                        </p>
                                    </div>
                                </button>
                            )
                        )}
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
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <HeartIcon className="w-6 h-6 text-red-400" />
                            <h2 className="text-2xl font-bold text-white">Liked Content</h2>
                        </div>
                        <Link
                            href={`/users/${userId}/liked`}
                            className="text-sm text-red-400 hover:text-red-300"
                        >
                            View all ({likedContent.length})
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
                {watchLaterPreview.length > 0 && (
                    <section className="bg-gradient-to-br from-indigo-900/20 to-blue-900/10 border border-indigo-800/30 rounded-xl p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <ClockIcon className="w-6 h-6 text-indigo-400" />
                            <h2 className="text-2xl font-bold text-white">Watch Later</h2>
                        </div>
                        <div className="flex gap-3 flex-wrap">
                            {watchLaterPreview.slice(0, 5).map((content) => (
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
                    </section>
                )}
            </div>

            {/* Rankings and Collections - Same Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Rankings Section */}
                <section id="rankings-section">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <TrophyIcon className="w-6 h-6 text-yellow-400" />
                            <h2 className="text-2xl font-bold text-white">Rankings</h2>
                        </div>
                        <Link
                            href={`/users/${userId}/rankings`}
                            className="text-sm text-yellow-400 hover:text-yellow-300"
                        >
                            View all ({publicRankings.length})
                        </Link>
                    </div>
                    {publicRankings.length > 0 ? (
                        <div className="space-y-3">
                            {publicRankings.slice(0, 3).map((ranking) => (
                                <Link
                                    key={ranking.id}
                                    href={`/rankings/${ranking.id}`}
                                    className="group bg-gradient-to-br from-yellow-900/20 to-orange-900/10 border border-yellow-800/30 hover:border-yellow-700/50 rounded-xl p-4 transition-all cursor-pointer block"
                                >
                                    <h3 className="text-lg font-bold text-white group-hover:text-yellow-400 transition-colors line-clamp-2 mb-3">
                                        {ranking.title}
                                    </h3>
                                    <div className="flex gap-2 mb-3">
                                        {ranking.rankedItems?.slice(0, 3).map((item, idx) => (
                                            <div
                                                key={idx}
                                                className="w-16 aspect-[2/3] relative overflow-hidden rounded"
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
                                    <div className="flex items-center gap-4 text-sm text-gray-400">
                                        <span className="flex items-center gap-1.5">
                                            <HeartIcon className="w-4 h-4" />
                                            <span className="font-medium">
                                                {ranking.likes || 0}
                                            </span>
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <EyeIcon className="w-4 h-4" />
                                            <span className="font-medium">
                                                {ranking.views || 0}
                                            </span>
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <ChatBubbleLeftRightIcon className="w-4 h-4" />
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

                {/* Collections Section */}
                <section id="collections-section">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <RectangleStackIcon className="w-6 h-6 text-purple-400" />
                            <h2 className="text-2xl font-bold text-white">Collections</h2>
                        </div>
                        <Link
                            href={`/users/${userId}/collections`}
                            className="text-sm text-purple-400 hover:text-purple-300"
                        >
                            View all ({collections.length})
                        </Link>
                    </div>
                    {collections.length > 0 ? (
                        <div className="space-y-3">
                            {collections.slice(0, 3).map((collection) => (
                                <Link
                                    key={collection.id}
                                    href={`/users/${userId}/collections/${collection.id}`}
                                    className="group bg-gradient-to-br from-purple-900/20 to-violet-900/10 border border-purple-800/30 hover:border-purple-700/50 rounded-xl p-4 transition-all cursor-pointer block"
                                >
                                    <div className="flex items-center gap-2 mb-3">
                                        {collection.emoji && (
                                            <span className="text-2xl">{collection.emoji}</span>
                                        )}
                                        <h3 className="text-lg font-bold text-white group-hover:text-purple-400 transition-colors line-clamp-2 flex-1">
                                            {collection.name}
                                        </h3>
                                    </div>
                                    <div className="flex gap-2 mb-3">
                                        {collection.items?.slice(0, 3).map((item) => (
                                            <div
                                                key={item.id}
                                                className="w-16 aspect-[2/3] relative overflow-hidden rounded"
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
                                    <div className="flex items-center text-sm text-gray-400">
                                        <span className="flex items-center gap-1.5">
                                            <RectangleStackIcon className="w-4 h-4" />
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
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                    <ChatBubbleLeftRightIcon className="w-5 h-5 text-green-400" />
                                    Threads ({forumThreads.length})
                                </h3>
                                <Link
                                    href="/community?tab=threads"
                                    className="text-sm text-green-400 hover:text-green-300"
                                >
                                    View all
                                </Link>
                            </div>
                            {forumThreads.length > 0 ? (
                                <div className="space-y-3">
                                    {forumThreads.slice(0, 3).map((thread) => (
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
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                    <ChartBarIcon className="w-5 h-5 text-blue-400" />
                                    Polls ({forumPolls.length})
                                </h3>
                                <Link
                                    href="/community?tab=polls"
                                    className="text-sm text-blue-400 hover:text-blue-300"
                                >
                                    View all
                                </Link>
                            </div>
                            {forumPolls.length > 0 ? (
                                <div className="space-y-3">
                                    {forumPolls.slice(0, 3).map((poll) => (
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
        </SubPageLayout>
    )
}
