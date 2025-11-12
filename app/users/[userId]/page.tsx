/**
 * Public User Profile Page
 *
 * Displays a user's public profile with their rankings, stats, and bio
 */

'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import SubPageLayout from '../../../components/layout/SubPageLayout'
import { RankingGrid } from '../../../components/rankings/RankingGrid'
import { useRankingStore } from '../../../stores/rankingStore'
import NetflixLoader from '../../../components/common/NetflixLoader'
import { UserIcon, TrophyIcon, HeartIcon, EyeIcon } from '@heroicons/react/24/outline'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../../firebase'

interface UserProfile {
    username: string
    avatarUrl?: string | null
    bio?: string
}

export default function UserProfilePage() {
    const params = useParams()
    const userId = params?.userId as string

    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [isLoadingProfile, setIsLoadingProfile] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const { rankings, isLoading: isLoadingRankings, loadUserRankings } = useRankingStore()

    // Load user profile
    useEffect(() => {
        const loadProfile = async () => {
            if (!userId) return

            try {
                setIsLoadingProfile(true)
                const userDoc = await getDoc(doc(db, 'users', userId))

                if (userDoc.exists()) {
                    const data = userDoc.data()
                    setProfile({
                        username: data.username || 'User',
                        avatarUrl: data.avatarUrl,
                        bio: data.bio,
                    })
                } else {
                    setError('User not found')
                }
            } catch (err) {
                console.error('Error loading user profile:', err)
                setError('Failed to load profile')
            } finally {
                setIsLoadingProfile(false)
            }
        }

        loadProfile()
    }, [userId])

    // Load user's public rankings
    useEffect(() => {
        if (userId) {
            loadUserRankings(userId)
        }
    }, [userId])

    // Filter only public rankings
    const publicRankings = rankings.filter((r) => r.isPublic)

    // Calculate stats
    const stats = {
        totalRankings: publicRankings.length,
        totalLikes: publicRankings.reduce((sum, r) => sum + r.likes, 0),
        totalViews: publicRankings.reduce((sum, r) => sum + r.views, 0),
    }

    if (isLoadingProfile || !profile) {
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

    if (error || !profile) {
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
                        <h1 className="text-3xl font-bold text-white mb-2">{profile.username}</h1>
                        {profile.bio && <p className="text-gray-400 mb-4">{profile.bio}</p>}

                        {/* Stats */}
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2">
                                <TrophyIcon className="w-5 h-5 text-yellow-400" />
                                <span className="text-white font-medium">
                                    {stats.totalRankings}
                                </span>
                                <span className="text-gray-400 text-sm">Rankings</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <HeartIcon className="w-5 h-5 text-red-400" />
                                <span className="text-white font-medium">{stats.totalLikes}</span>
                                <span className="text-gray-400 text-sm">Likes</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <EyeIcon className="w-5 h-5 text-blue-400" />
                                <span className="text-white font-medium">{stats.totalViews}</span>
                                <span className="text-gray-400 text-sm">Views</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Public Rankings */}
            <div>
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                    <TrophyIcon className="w-6 h-6 text-yellow-500" />
                    Public Rankings
                </h2>

                {isLoadingRankings ? (
                    <NetflixLoader inline message="Loading rankings..." />
                ) : publicRankings.length > 0 ? (
                    <RankingGrid rankings={publicRankings} showAuthor={false} />
                ) : (
                    <div className="text-center py-12">
                        <TrophyIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-400">No public rankings yet</p>
                    </div>
                )}
            </div>
        </SubPageLayout>
    )
}
