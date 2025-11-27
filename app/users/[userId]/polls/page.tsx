/**
 * Public User Polls Page
 *
 * Shows all public polls for a specific user's profile
 */

'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore'
import { db } from '../../../../firebase'
import SubPageLayout from '../../../../components/layout/SubPageLayout'
import NetflixLoader from '../../../../components/common/NetflixLoader'
import { ChartBarIcon, UserIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline'
import type { Poll } from '../../../../types/forum'
import type { PublicProfilePayload } from '@/lib/publicProfile'
import type { Timestamp } from 'firebase/firestore'
import Link from 'next/link'

export default function UserPollsPage() {
    const params = useParams()
    const userId = params?.userId as string

    const [polls, setPolls] = useState<Poll[]>([])
    const [displayName, setDisplayName] = useState<string>('User')
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!userId) return

        let isMounted = true

        const loadData = async () => {
            setIsLoading(true)
            setError(null)

            try {
                // Try to get profile data from API first (includes auth displayName fallback)
                let profileDisplayName = 'User'
                try {
                    const response = await fetch(`/api/public-profile/${userId}`)
                    if (response.ok) {
                        const payload = (await response.json()) as PublicProfilePayload
                        profileDisplayName = payload.profile.displayName
                    }
                } catch (apiError) {
                    console.warn('[UserPolls] API failed, will use client-side data')
                }

                if (!isMounted) return

                setDisplayName(profileDisplayName)

                // Load user's polls
                const pollsSnap = await getDocs(
                    query(
                        collection(db, 'polls'),
                        where('userId', '==', userId),
                        orderBy('createdAt', 'desc')
                    )
                )

                const userPolls = pollsSnap.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Poll[]

                setPolls(userPolls)
            } catch (err) {
                console.error('Error loading polls:', err)
                if (isMounted) {
                    setError((err as Error).message || 'Failed to load polls')
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false)
                }
            }
        }

        loadData()

        return () => {
            isMounted = false
        }
    }, [userId])

    const formatDate = (timestamp: Timestamp | number) => {
        const ms = typeof timestamp === 'number' ? timestamp : timestamp.toMillis()
        const date = new Date(ms)
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        })
    }

    const getCategoryColor = (category: string) => {
        const colors: Record<string, string> = {
            general: 'bg-gray-600',
            movies: 'bg-blue-600',
            tv: 'bg-purple-600',
            recommendations: 'bg-green-600',
            rankings: 'bg-yellow-600',
            announcements: 'bg-red-600',
        }
        return colors[category] || 'bg-gray-600'
    }

    const isPollExpired = (poll: Poll) => {
        if (!poll.expiresAt) return false
        const expiresAtMs =
            typeof poll.expiresAt === 'number' ? poll.expiresAt : poll.expiresAt.toMillis()
        return Date.now() > expiresAtMs
    }

    const getTotalVotes = (poll: Poll) => {
        return poll.options.reduce((sum, opt) => sum + (opt.votes || 0), 0)
    }

    if (isLoading) {
        return (
            <SubPageLayout
                title="Loading Polls..."
                icon={<ChartBarIcon className="w-8 h-8" />}
                iconColor="text-green-400"
            >
                <NetflixLoader />
            </SubPageLayout>
        )
    }

    if (error) {
        return (
            <SubPageLayout
                title="Error"
                icon={<ChartBarIcon className="w-8 h-8" />}
                iconColor="text-green-400"
            >
                <div className="max-w-2xl mx-auto text-center py-16">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-zinc-800 flex items-center justify-center">
                        <ChartBarIcon className="w-10 h-10 text-gray-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Error Loading Polls</h2>
                    <p className="text-gray-400">{error}</p>
                </div>
            </SubPageLayout>
        )
    }

    return (
        <SubPageLayout
            title={`${displayName}'s Polls`}
            icon={<ChartBarIcon className="w-8 h-8" />}
            iconColor="text-green-400"
            description={`${polls.length} ${polls.length === 1 ? 'poll' : 'polls'}`}
        >
            {/* Back to Profile Link */}
            <div className="mb-6">
                <Link
                    href={`/users/${userId}`}
                    className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                    <UserIcon className="w-4 h-4" />
                    Back to {displayName}&apos;s Profile
                </Link>
            </div>

            {polls.length > 0 ? (
                <div className="space-y-4">
                    {polls.map((poll) => {
                        const expired = isPollExpired(poll)
                        const totalVotes = getTotalVotes(poll)

                        return (
                            <Link
                                key={poll.id}
                                href={`/community/polls/${poll.id}`}
                                className="block bg-zinc-900 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors p-5"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span
                                                className={`px-2 py-0.5 rounded text-xs font-medium text-white ${getCategoryColor(poll.category)}`}
                                            >
                                                {poll.category}
                                            </span>
                                            {expired ? (
                                                <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-900/50 text-red-400">
                                                    Closed
                                                </span>
                                            ) : (
                                                <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-900/50 text-green-400">
                                                    Active
                                                </span>
                                            )}
                                            <span className="text-gray-500 text-sm">
                                                {formatDate(poll.createdAt)}
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-semibold text-white mb-3 line-clamp-2">
                                            {poll.question}
                                        </h3>

                                        {/* Poll options preview */}
                                        <div className="space-y-2 mb-3">
                                            {poll.options.slice(0, 3).map((option, index) => {
                                                const percentage =
                                                    totalVotes > 0
                                                        ? Math.round(
                                                              ((option.votes || 0) / totalVotes) *
                                                                  100
                                                          )
                                                        : 0

                                                return (
                                                    <div key={index} className="relative">
                                                        <div
                                                            className="absolute inset-0 bg-green-900/30 rounded"
                                                            style={{ width: `${percentage}%` }}
                                                        />
                                                        <div className="relative flex items-center justify-between px-3 py-2 text-sm">
                                                            <span className="text-gray-300 truncate">
                                                                {option.text}
                                                            </span>
                                                            <span className="text-gray-500 ml-2 flex-shrink-0">
                                                                {percentage}%
                                                            </span>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                            {poll.options.length > 3 && (
                                                <p className="text-gray-500 text-sm">
                                                    +{poll.options.length - 3} more options
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-4 text-sm text-gray-500">
                                            <span className="flex items-center gap-1">
                                                <CheckCircleIcon className="w-4 h-4" />
                                                {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
                                            </span>
                                            {poll.isMultipleChoice && (
                                                <span className="text-gray-600">
                                                    Multiple choice
                                                </span>
                                            )}
                                            {poll.expiresAt && !expired && (
                                                <span className="flex items-center gap-1 text-yellow-500">
                                                    <ClockIcon className="w-4 h-4" />
                                                    Ends {formatDate(poll.expiresAt)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        )
                    })}
                </div>
            ) : (
                <div className="text-center py-16 bg-zinc-900 rounded-lg border border-zinc-800">
                    <ChartBarIcon className="w-20 h-20 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No Polls</h3>
                    <p className="text-gray-400">{displayName} hasn&apos;t created any polls yet</p>
                </div>
            )}
        </SubPageLayout>
    )
}
