/**
 * Public User Profile Page
 *
 * Displays a user's public profile with comprehensive activity view
 */

'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import SubPageLayout from '../../../components/layout/SubPageLayout'
import NetflixLoader from '../../../components/common/NetflixLoader'
import { UserIcon } from '@heroicons/react/24/outline'
import { EyeSlashIcon } from '@heroicons/react/24/solid'
import { FirebaseError } from 'firebase/app'
import { db } from '../../../firebase'
import { collection, doc, getDoc, getDocs, query, where, limit } from 'firebase/firestore'
import type { PublicProfilePayload } from '@/lib/publicProfile'
import { DEFAULT_PROFILE_VISIBILITY } from '@/types/profile'
import type { ProfileVisibility } from '@/types/profile'
import type { Movie, TVShow } from '../../../typings'
import type { UserList } from '../../../types/collections'
import type { Ranking } from '../../../types/rankings'
import type { ThreadSummary, PollSummary, PollOptionSummary } from '../../../types/forum'
import { LikedContentSection } from '../../../components/profile/LikedContentSection'
import { WatchLaterSection } from '../../../components/profile/WatchLaterSection'
import { RankingsSection } from '../../../components/profile/RankingsSection'
import { CollectionsSection } from '../../../components/profile/CollectionsSection'
import { ForumActivitySection } from '../../../components/profile/ForumActivitySection'
import { PROFILE_CONFIG } from '../../../config/profile'

type PublicProfileIdentity = PublicProfilePayload['profile']

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
    // Fetch both user document and profile document
    const [userSnap, profileSnap] = await Promise.all([
        getDoc(doc(db, 'users', userId)),
        getDoc(doc(db, 'profiles', userId)),
    ])

    if (!userSnap.exists() && !profileSnap.exists()) {
        throw new Error('User not found')
    }

    const userData = userSnap.exists() ? userSnap.data() || {} : {}
    const profileData = profileSnap.exists() ? profileSnap.data() || {} : {}
    const legacyProfile = userData.profile || {}

    // Get visibility settings - default to all visible for backward compatibility
    const visibility: ProfileVisibility = profileData.visibility ??
        userData.visibility ??
        legacyProfile.visibility ?? { ...DEFAULT_PROFILE_VISIBILITY }

    // Get display name - profile.username is the primary field (displayName is deprecated)
    const derivedDisplayName =
        profileData.username ||
        profileData.displayName ||
        legacyProfile.displayName ||
        userData.displayName ||
        'User'

    const profile: PublicProfileIdentity = {
        username: derivedDisplayName,
        displayName: derivedDisplayName,
        avatarUrl:
            profileData.avatarUrl ??
            legacyProfile.avatarUrl ??
            userData.photoURL ??
            userData.avatarUrl ??
            null,
        bio: profileData.description ?? legacyProfile.bio ?? userData.bio ?? null,
        favoriteGenres: Array.isArray(profileData.favoriteGenres)
            ? profileData.favoriteGenres
            : Array.isArray(legacyProfile.favoriteGenres)
              ? legacyProfile.favoriteGenres
              : Array.isArray(userData.favoriteGenres)
                ? userData.favoriteGenres
                : undefined,
    }

    const likedContent = Array.isArray(userData.likedMovies)
        ? (userData.likedMovies as (Movie | TVShow)[])
        : []
    // Fetch collections if visibility allows
    let collections: UserList[] = []
    if (visibility.showCollections) {
        // Public collections are stored in userCreatedWatchlists field (historical naming)
        // Note: For authenticated users, collections are in customRows (Zustand store)
        const publicCollections = (userData.userCreatedWatchlists as UserList[]) || []
        // Filter to only show non-system collections
        // For manual/ai-generated: require items array to have content
        // For tmdb-genre: show even without items (content is fetched dynamically)
        collections = publicCollections
            .filter((c) => {
                if (c.isSystemCollection) return false
                // TMDB genre-based collections don't store items, they fetch dynamically
                if (c.collectionType === 'tmdb-genre') return true
                // Manual and AI-generated collections must have items
                return c.items && c.items.length > 0
            })
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            .slice(0, 10) // Limit to 10 collections for the profile
    }
    const watchLaterPreview = Array.isArray(userData.defaultWatchlist)
        ? (userData.defaultWatchlist as (Movie | TVShow)[]).slice(
              0,
              PROFILE_CONFIG.WATCH_LATER_PREVIEW_LIMIT
          )
        : []

    // Only fetch rankings if visibility allows
    let publicRankings: Ranking[] = []
    if (visibility.showRankings) {
        const rankingsSnap = await getDocs(
            query(collection(db, 'rankings'), where('userId', '==', userId))
        )
        const allRankings = rankingsSnap.docs.map((doc) => doc.data() as Ranking)
        publicRankings = sortByRecency(allRankings.filter((ranking) => ranking.isPublic)).slice(
            0,
            PROFILE_CONFIG.MAX_PUBLIC_RANKINGS
        )
    }

    const threadsSnap = await getDocs(
        query(collection(db, 'threads'), where('userId', '==', userId))
    )
    const threadSummaries: ThreadSummary[] = sortByRecency(
        threadsSnap.docs.map((doc): ThreadSummary => {
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
    ).slice(0, PROFILE_CONFIG.MAX_THREAD_SUMMARIES)

    const pollsSnap = await getDocs(query(collection(db, 'polls'), where('userId', '==', userId)))
    const pollSummaries: PollSummary[] = sortByRecency(
        pollsSnap.docs.map((doc): PollSummary => {
            const data = doc.data() || {}
            return {
                id: doc.id,
                question: data.question ?? 'Untitled poll',
                category: data.category ?? 'general',
                totalVotes: data.totalVotes ?? 0,
                isMultipleChoice: Boolean(data.isMultipleChoice),
                allowAddOptions: Boolean(data.allowAddOptions),
                options: Array.isArray(data.options)
                    ? data.options.map((option: unknown): PollOptionSummary => {
                          const opt = option as Record<string, unknown>
                          return {
                              id: (opt.id as string) ?? '',
                              text: (opt.text as string) ?? '',
                              votes: (opt.votes as number) ?? 0,
                              percentage: (opt.percentage as number) ?? 0,
                          }
                      })
                    : [],
                createdAt: toMillisClient(data.createdAt),
                expiresAt: toMillisClient(data.expiresAt),
                votedAt: null,
            }
        })
    ).slice(0, PROFILE_CONFIG.MAX_POLL_SUMMARIES)

    const votesSnap = await getDocs(
        query(collection(db, 'poll_votes'), where('userId', '==', userId), limit(25))
    )
    const votedPollSummaries = (
        await Promise.all(
            votesSnap.docs.map(async (voteDoc) => {
                const voteData = voteDoc.data() || {}
                const pollId = voteData.pollId as string | undefined
                if (!pollId) {
                    return null
                }
                const pollDoc = await getDoc(doc(db, 'polls', pollId))
                if (!pollDoc.exists()) {
                    return null
                }
                const pollData = pollDoc.data() || {}
                if (pollData.userId === userId) {
                    return null
                }

                const summary: PollSummary = {
                    id: pollDoc.id,
                    question: pollData.question ?? 'Untitled poll',
                    category: pollData.category ?? 'general',
                    totalVotes: pollData.totalVotes ?? 0,
                    isMultipleChoice: Boolean(pollData.isMultipleChoice),
                    allowAddOptions: Boolean(pollData.allowAddOptions),
                    options: Array.isArray(pollData.options)
                        ? pollData.options.map((option: unknown): PollOptionSummary => {
                              const opt = option as Record<string, unknown>
                              return {
                                  id: (opt.id as string) ?? '',
                                  text: (opt.text as string) ?? '',
                                  votes: (opt.votes as number) ?? 0,
                                  percentage: (opt.percentage as number) ?? 0,
                              }
                          })
                        : [],
                    createdAt: toMillisClient(pollData.createdAt),
                    expiresAt: toMillisClient(pollData.expiresAt),
                    votedAt: toMillisClient(voteData.votedAt),
                }

                return summary
            })
        )
    )
        .filter((poll): poll is PollSummary => Boolean(poll))
        .filter((poll) => poll.votedAt !== null)
        .sort((a, b) => (b.votedAt ?? 0) - (a.votedAt ?? 0))
        .slice(0, PROFILE_CONFIG.MAX_POLL_SUMMARIES)

    const stats: PublicProfilePayload['stats'] = {
        totalRankings: publicRankings.length,
        totalLikes: publicRankings.reduce((sum, ranking) => sum + (ranking.likes || 0), 0),
        totalViews: publicRankings.reduce((sum, ranking) => sum + (ranking.views || 0), 0),
        totalLiked: likedContent.length,
        totalCollections: collections.length,
        totalThreads: threadSummaries.length,
        totalPollsCreated: pollSummaries.length,
        totalPollsVoted: votedPollSummaries.length,
    }

    return {
        profile,
        stats,
        rankings: publicRankings,
        likedContent: visibility.showLikedContent ? likedContent : [],
        collections,
        forum: {
            threads: visibility.showThreads ? threadSummaries : [],
            pollsCreated: visibility.showPollsCreated ? pollSummaries : [],
            pollsVoted: visibility.showPollsVoted ? votedPollSummaries : [],
        },
        watchLaterPreview: visibility.showWatchLater ? watchLaterPreview : [],
        visibility,
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
                        const errorMessage =
                            (fallbackError as Error).message || 'Failed to load profile'

                        if (
                            fallbackError instanceof FirebaseError &&
                            fallbackError.code === 'permission-denied'
                        ) {
                            setError(
                                'Public profile data requires Firebase Admin credentials or viewing your own account.'
                            )
                            setProfileData(null)
                        } else if ((apiError as Error).message === 'User not found') {
                            setError('User not found')
                            setProfileData(null)
                        } else {
                            setError(errorMessage)
                            setProfileData(null)
                        }
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
    const forumPollsCreated = profileData?.forum?.pollsCreated ?? []
    const forumPollsVoted = profileData?.forum?.pollsVoted ?? []
    const watchLaterPreview = profileData?.watchLaterPreview ?? []
    const stats: PublicProfilePayload['stats'] = profileData?.stats ?? {
        totalRankings: publicRankings.length,
        totalLikes: publicRankings.reduce((sum, r) => sum + r.likes, 0),
        totalViews: publicRankings.reduce((sum, r) => sum + r.views, 0),
        totalLiked: likedContent.length,
        totalCollections: collections.length,
        totalThreads: forumThreads.length,
        totalPollsCreated: forumPollsCreated.length,
        totalPollsVoted: forumPollsVoted.length,
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
                                alt={profile.displayName}
                                className="w-32 h-32 rounded-full ring-4 ring-blue-500/30 object-cover"
                                referrerPolicy="no-referrer"
                            />
                        ) : (
                            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center ring-4 ring-blue-500/30">
                                <span className="text-4xl font-bold text-white">
                                    {profile.displayName[0]?.toUpperCase()}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Profile Info */}
                    <div className="flex-1 min-w-0">
                        <h1 className="text-3xl font-bold text-white mb-2">
                            {profile.displayName}
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
                </div>
            </div>

            {/* Show private profile message if enablePublicProfile is false */}
            {!profileData.visibility.enablePublicProfile ? (
                <div className="bg-zinc-900/50 border border-zinc-700 rounded-xl p-8 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-800 flex items-center justify-center">
                        <EyeSlashIcon className="w-8 h-8 text-zinc-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">Private Profile</h3>
                    <p className="text-gray-400 text-sm">
                        This user has chosen to keep their profile content private.
                    </p>
                </div>
            ) : (
                <>
                    {/* Bento Grid Layout - only show if at least one section is visible */}
                    {(profileData.visibility.showLikedContent ||
                        profileData.visibility.showWatchLater) &&
                        (() => {
                            // Determine if both sections are visible
                            const showBothSections =
                                profileData.visibility.showLikedContent &&
                                profileData.visibility.showWatchLater
                            // Show more items when section has full width
                            const itemLimit = showBothSections ? 6 : 12

                            return (
                                <div
                                    className={`grid grid-cols-1 gap-6 mb-6 ${
                                        showBothSections ? 'lg:grid-cols-2' : ''
                                    }`}
                                >
                                    {profileData.visibility.showLikedContent && (
                                        <LikedContentSection
                                            likedContent={likedContent}
                                            userId={userId}
                                            isPublic={true}
                                            limit={itemLimit}
                                        />
                                    )}
                                    {profileData.visibility.showWatchLater && (
                                        <WatchLaterSection
                                            watchLaterPreview={watchLaterPreview}
                                            totalCount={watchLaterPreview.length}
                                            userId={userId}
                                            isPublic={true}
                                            limit={itemLimit}
                                        />
                                    )}
                                </div>
                            )
                        })()}

                    {/* Rankings */}
                    {profileData.visibility.showRankings && (
                        <div className="mb-6">
                            <RankingsSection
                                rankings={publicRankings}
                                userId={userId}
                                isPublic={true}
                            />
                        </div>
                    )}

                    {/* Collections */}
                    {profileData.visibility.showCollections && (
                        <div className="mb-6">
                            <CollectionsSection
                                collections={collections}
                                userId={userId}
                                isPublic={true}
                            />
                        </div>
                    )}

                    {/* Forum Activity - show if any forum section is enabled */}
                    {(profileData.visibility.showThreads ||
                        profileData.visibility.showPollsCreated ||
                        profileData.visibility.showPollsVoted) && (
                        <ForumActivitySection
                            threads={profileData.visibility.showThreads ? forumThreads : []}
                            pollsCreated={
                                profileData.visibility.showPollsCreated ? forumPollsCreated : []
                            }
                            pollsVoted={
                                profileData.visibility.showPollsVoted ? forumPollsVoted : []
                            }
                        />
                    )}
                </>
            )}
        </SubPageLayout>
    )
}
