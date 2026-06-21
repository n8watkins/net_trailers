/**
 * Public User Profile Page
 *
 * Displays a user's public profile with comprehensive activity view.
 * All data is fetched from /api/public-profile/[userId] (Turso-backed).
 */

'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import SubPageLayout from '../../../components/layout/SubPageLayout'
import NetflixLoader from '../../../components/common/NetflixLoader'
import { UserIcon } from '@heroicons/react/24/outline'
import { EyeSlashIcon } from '@heroicons/react/24/solid'
import type { PublicProfilePayload } from '@/lib/publicProfile'
import { LikedContentSection } from '../../../components/profile/LikedContentSection'
import { WatchHistorySection } from '../../../components/profile/WatchHistorySection'
import { RankingsSection } from '../../../components/profile/RankingsSection'
import { CollectionsSection } from '../../../components/profile/CollectionsSection'
import { ForumActivitySection } from '../../../components/profile/ForumActivitySection'

export default function UserProfilePage() {
    const params = useParams()
    const identifier = params?.userId as string
    const userId = identifier // Alias for clarity in JSX

    const [profileData, setProfileData] = useState<PublicProfilePayload | null>(null)
    const [isLoadingProfile, setIsLoadingProfile] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Load aggregate public profile payload from the Turso-backed API.
    // Try username lookup first; fall back to userId lookup on 404.
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
                    throw new Error(payload?.error || 'Failed to load profile')
                }

                const payload = (await response.json()) as PublicProfilePayload
                if (isMounted) {
                    setProfileData(payload)
                }
            } catch (err) {
                console.error('[PublicProfile] Failed to load profile:', err)
                if (isMounted) {
                    setError((err as Error).message || 'Failed to load profile')
                    setProfileData(null)
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
    const forumThreadsVoted = profileData?.forum?.threadsVoted ?? []
    const forumPollsCreated = profileData?.forum?.pollsCreated ?? []
    const forumPollsVoted = profileData?.forum?.pollsVoted ?? []
    const watchHistoryPreview = profileData?.watchHistoryPreview ?? []
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
                        profileData.visibility.showWatchHistory) &&
                        (() => {
                            // Determine if both sections are visible
                            const showBothSections =
                                profileData.visibility.showLikedContent &&
                                profileData.visibility.showWatchHistory
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
                                    {profileData.visibility.showWatchHistory && (
                                        <WatchHistorySection
                                            watchHistoryPreview={watchHistoryPreview}
                                            totalCount={watchHistoryPreview.length}
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
                        profileData.visibility.showThreadsVoted ||
                        profileData.visibility.showPollsCreated ||
                        profileData.visibility.showPollsVoted) && (
                        <ForumActivitySection
                            threads={profileData.visibility.showThreads ? forumThreads : []}
                            threadsVoted={
                                profileData.visibility.showThreadsVoted ? forumThreadsVoted : []
                            }
                            pollsCreated={
                                profileData.visibility.showPollsCreated ? forumPollsCreated : []
                            }
                            pollsVoted={
                                profileData.visibility.showPollsVoted ? forumPollsVoted : []
                            }
                            userId={userId}
                        />
                    )}
                </>
            )}
        </SubPageLayout>
    )
}
