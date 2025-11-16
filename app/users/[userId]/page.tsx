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
        <SubPageLayout
            title={`${profile.username}'s Profile`}
            icon={<UserIcon className="w-8 h-8" />}
            iconColor="text-blue-400"
        >
            {/* Profile Header */}
            <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 border border-zinc-700 rounded-xl p-8 mb-8">
                <div className="flex items-start gap-6">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                        {profile.avatarUrl ? (
                            <img
                                src={profile.avatarUrl}
                                alt={profile.username}
                                className="w-24 h-24 rounded-full ring-4 ring-blue-500/30 object-cover"
                                referrerPolicy="no-referrer"
                            />
                        ) : (
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center ring-4 ring-blue-500/30">
                                <span className="text-3xl font-bold text-white">
                                    {profile.username[0]?.toUpperCase()}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Profile Info */}
                    <div className="flex-1">
                        <h1 className="text-3xl font-bold text-white mb-2">
                            {profile.displayName || profile.username}
                        </h1>
                        <p className="text-gray-500 text-sm mb-2">@{profile.username}</p>
                        {profile.bio && <p className="text-gray-400 mb-4">{profile.bio}</p>}

                        {profile.favoriteGenres && profile.favoriteGenres.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-4">
                                {profile.favoriteGenres.map((genre) => (
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
                </div>
            </div>

            {/* Highlight Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
                {[
                    {
                        label: 'Rankings',
                        value: stats.totalRankings,
                        icon: TrophyIcon,
                        accent: 'from-yellow-900/30 to-yellow-800/10',
                        iconColor: 'text-yellow-400',
                    },
                    {
                        label: 'Ranking Likes',
                        value: stats.totalLikes,
                        icon: HeartIcon,
                        accent: 'from-red-900/30 to-red-800/10',
                        iconColor: 'text-red-400',
                    },
                    {
                        label: 'Views',
                        value: stats.totalViews,
                        icon: EyeIcon,
                        accent: 'from-blue-900/30 to-blue-800/10',
                        iconColor: 'text-blue-400',
                    },
                    {
                        label: 'Collections',
                        value: stats.totalCollections,
                        icon: RectangleStackIcon,
                        accent: 'from-purple-900/30 to-purple-800/10',
                        iconColor: 'text-purple-400',
                    },
                    {
                        label: 'Liked Content',
                        value: stats.totalLiked,
                        icon: FilmIcon,
                        accent: 'from-pink-900/30 to-pink-800/10',
                        iconColor: 'text-pink-400',
                    },
                    {
                        label: 'Forum Posts',
                        value: stats.totalThreads + stats.totalPolls,
                        icon: ChatBubbleLeftRightIcon,
                        accent: 'from-green-900/30 to-green-800/10',
                        iconColor: 'text-green-400',
                        sublabel: `${stats.totalThreads} threads · ${stats.totalPolls} polls`,
                    },
                ].map(({ icon: Icon, label, value, accent, iconColor, sublabel }) => (
                    <div
                        key={label}
                        className={`bg-gradient-to-br ${accent} border border-white/5 rounded-xl p-4`}
                    >
                        <Icon className={`w-6 h-6 ${iconColor} mb-3`} />
                        <p className="text-sm text-gray-400">{label}</p>
                        <p className="text-3xl font-semibold text-white">{value}</p>
                        {sublabel && <p className="text-xs text-gray-500 mt-1">{sublabel}</p>}
                    </div>
                ))}
            </div>

            {watchLaterPreview.length > 0 && (
                <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-6 mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <ClockIcon className="w-6 h-6 text-indigo-400" />
                            <div>
                                <h2 className="text-xl font-semibold text-white">
                                    Watch Later Spotlight
                                </h2>
                                <p className="text-gray-400 text-sm">
                                    A peek at what {profile.username} is planning to watch next
                                </p>
                            </div>
                        </div>
                        <span className="text-sm text-gray-500">
                            {watchLaterPreview.length} picks
                        </span>
                    </div>
                    <div className="overflow-x-auto pb-2">
                        <div className="flex gap-4">
                            {watchLaterPreview.slice(0, 12).map((content) => (
                                <div key={content.id} className="min-w-[160px] flex-shrink-0">
                                    <ContentCard content={content} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-12">
                <section>
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <TrophyIcon className="w-6 h-6 text-yellow-500" />
                            <h2 className="text-2xl font-bold text-white">Public Rankings</h2>
                        </div>
                        <Link
                            href="/rankings"
                            className="text-sm text-blue-400 hover:text-blue-300"
                        >
                            Explore rankings
                        </Link>
                    </div>
                    {publicRankings.length > 0 ? (
                        <RankingGrid rankings={publicRankings} showAuthor={false} />
                    ) : (
                        <div className="text-center py-12 bg-zinc-900 rounded-lg border border-zinc-800">
                            <TrophyIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                            <p className="text-gray-400">No public rankings yet</p>
                        </div>
                    )}
                </section>

                <section>
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <RectangleStackIcon className="w-6 h-6 text-purple-500" />
                            <h2 className="text-2xl font-bold text-white">Public Collections</h2>
                        </div>
                        <Link
                            href="/collections"
                            className="text-sm text-blue-400 hover:text-blue-300"
                        >
                            Browse collections
                        </Link>
                    </div>
                    {collections.length > 0 ? (
                        <div className="grid gap-6">
                            {collections.map((collection) => (
                                <div
                                    key={collection.id}
                                    className="bg-zinc-900 rounded-lg p-6 border border-zinc-800 hover:border-zinc-700 transition-colors"
                                >
                                    <div className="flex items-center gap-3 mb-4">
                                        {collection.emoji && (
                                            <span className="text-3xl">{collection.emoji}</span>
                                        )}
                                        <div>
                                            <h3 className="text-xl font-semibold text-white">
                                                {collection.name}
                                            </h3>
                                            <p className="text-gray-400 text-sm">
                                                {collection.items?.length || 0} items
                                            </p>
                                        </div>
                                    </div>
                                    {collection.description && (
                                        <p className="text-gray-400 mb-4">
                                            {collection.description}
                                        </p>
                                    )}
                                    {collection.items && collection.items.length > 0 && (
                                        <div className="flex gap-2 overflow-x-auto">
                                            {collection.items.slice(0, 10).map((item) => (
                                                <div
                                                    key={item.id}
                                                    className="min-w-[140px] flex-shrink-0"
                                                >
                                                    <ContentCard content={item} />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-zinc-900 rounded-lg border border-zinc-800">
                            <RectangleStackIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                            <p className="text-gray-400">No public collections yet</p>
                        </div>
                    )}
                </section>

                <section>
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <HeartIcon className="w-6 h-6 text-red-500" />
                            <h2 className="text-2xl font-bold text-white">Liked Content</h2>
                        </div>
                        <Link href="/liked" className="text-sm text-blue-400 hover:text-blue-300">
                            View liked items
                        </Link>
                    </div>
                    {likedContent.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {likedContent.slice(0, PREVIEW_LIMIT).map((content) => (
                                <ContentCard key={content.id} content={content} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-zinc-900 rounded-lg border border-zinc-800">
                            <HeartIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                            <p className="text-gray-400">No liked content yet</p>
                        </div>
                    )}
                </section>

                <section>
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
                    <div className="space-y-8">
                        <div>
                            <h3 className="text-xl font-semibold text-white mb-4">
                                Threads ({forumThreads.length})
                            </h3>
                            {forumThreads.length > 0 ? (
                                <div className="space-y-4">
                                    {forumThreads.map((thread) => (
                                        <div
                                            key={thread.id}
                                            className="bg-zinc-900 rounded-lg p-4 border border-zinc-800"
                                        >
                                            <h4 className="text-white font-semibold mb-2">
                                                {thread.title}
                                            </h4>
                                            <p className="text-gray-400 text-sm line-clamp-2 mb-2">
                                                {thread.content}
                                            </p>
                                            <div className="flex items-center gap-4 text-xs text-gray-500">
                                                <span>{thread.replyCount} replies</span>
                                                <span>{thread.likes} likes</span>
                                                <span>{thread.views} views</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-400 text-center py-8">
                                    No threads created yet
                                </p>
                            )}
                        </div>
                        <div>
                            <h3 className="text-xl font-semibold text-white mb-4">
                                Polls ({forumPolls.length})
                            </h3>
                            {forumPolls.length > 0 ? (
                                <div className="space-y-4">
                                    {forumPolls.map((poll) => (
                                        <div
                                            key={poll.id}
                                            className="bg-zinc-900 rounded-lg p-4 border border-zinc-800"
                                        >
                                            <h4 className="text-white font-semibold mb-4">
                                                {poll.question}
                                            </h4>
                                            <div className="space-y-2">
                                                {poll.options.map((option) => (
                                                    <div
                                                        key={option.id}
                                                        className="bg-zinc-800 rounded p-2"
                                                    >
                                                        <div className="flex justify-between items-center mb-1">
                                                            <span className="text-white text-sm">
                                                                {option.text}
                                                            </span>
                                                            <span className="text-gray-400 text-xs">
                                                                {option.percentage ?? 0}%
                                                            </span>
                                                        </div>
                                                        <div className="w-full bg-zinc-700 rounded-full h-2">
                                                            <div
                                                                className="bg-blue-600 h-2 rounded-full"
                                                                style={{
                                                                    width: `${option.percentage ?? 0}%`,
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <p className="text-gray-500 text-xs mt-2">
                                                {poll.totalVotes} total votes
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-400 text-center py-8">
                                    No polls created yet
                                </p>
                            )}
                        </div>
                    </div>
                </section>
            </div>
        </SubPageLayout>
    )
}
