/**
 * Public User Watch History Page
 *
 * Shows all watch history items for a specific user's public profile
 */

'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../../../firebase'
import SubPageLayout from '../../../../components/layout/SubPageLayout'
import ContentCard from '../../../../components/common/ContentCard'
import ContentGridSpacer from '../../../../components/common/ContentGridSpacer'
import NetflixLoader from '../../../../components/common/NetflixLoader'
import { ClockIcon, UserIcon } from '@heroicons/react/24/outline'
import type { Movie, TVShow } from '../../../../typings'
import type { PublicProfilePayload } from '@/lib/publicProfile'
import Link from 'next/link'

interface WatchHistoryEntry {
    content: Movie | TVShow
    watchedAt: number
}

export default function UserWatchHistoryPage() {
    const params = useParams()
    const userId = params?.userId as string

    const [watchHistory, setWatchHistory] = useState<WatchHistoryEntry[]>([])
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
                // Try to get profile data from API first
                let profileDisplayName = 'User'
                try {
                    const response = await fetch(`/api/public-profile/${userId}`)
                    if (response.ok) {
                        const payload = (await response.json()) as PublicProfilePayload
                        profileDisplayName = payload.profile.displayName
                    }
                } catch (_apiError) {
                    console.warn('[WatchHistory] API failed, will use client-side data')
                }

                // Fallback: try to get display name from public profile document
                if (profileDisplayName === 'User') {
                    try {
                        const profileDoc = await getDoc(doc(db, 'profiles', userId))
                        if (profileDoc.exists()) {
                            const profileData = profileDoc.data()
                            profileDisplayName = profileData?.displayName || 'User'
                        }
                    } catch (_profileError) {
                        console.warn('[WatchHistory] Could not load profile, using default name')
                    }
                }

                if (!isMounted) return

                setDisplayName(profileDisplayName)

                // Fetch watch history from Firestore document
                try {
                    const watchHistoryDoc = await getDoc(
                        doc(db, 'users', userId, 'data', 'watchHistory')
                    )

                    if (watchHistoryDoc.exists()) {
                        const data = watchHistoryDoc.data()
                        const history = Array.isArray(data.history) ? data.history : []
                        const entries: WatchHistoryEntry[] = history
                            .map((entry: any) => ({
                                content: entry.content as Movie | TVShow,
                                watchedAt: entry.watchedAt || Date.now(),
                            }))
                            .filter((entry): entry is WatchHistoryEntry => Boolean(entry.content))

                        setWatchHistory(entries)
                    } else {
                        setWatchHistory([])
                    }
                } catch (historyError) {
                    console.error('Error loading watch history:', historyError)
                    setWatchHistory([])
                }
            } catch (err) {
                console.error('Error loading watch history content:', err)
                if (isMounted) {
                    setError((err as Error).message || 'Failed to load watch history content')
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

    if (isLoading) {
        return (
            <SubPageLayout
                title="Loading Watch History..."
                icon={<ClockIcon className="w-8 h-8" />}
                iconColor="text-purple-400"
            >
                <NetflixLoader />
            </SubPageLayout>
        )
    }

    if (error) {
        return (
            <SubPageLayout
                title="Error"
                icon={<ClockIcon className="w-8 h-8" />}
                iconColor="text-purple-400"
            >
                <div className="max-w-2xl mx-auto text-center py-16">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-zinc-800 flex items-center justify-center">
                        <ClockIcon className="w-10 h-10 text-gray-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Error Loading Content</h2>
                    <p className="text-gray-400">{error}</p>
                </div>
            </SubPageLayout>
        )
    }

    // Group entries by date
    const groupedByDate = watchHistory.reduce(
        (acc, entry) => {
            const date = new Date(entry.watchedAt)
            date.setHours(0, 0, 0, 0)
            const dateKey = date.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            })

            if (!acc[dateKey]) {
                acc[dateKey] = []
            }
            acc[dateKey].push(entry)
            return acc
        },
        {} as Record<string, WatchHistoryEntry[]>
    )

    return (
        <SubPageLayout
            title={`${displayName}'s Watch History`}
            icon={<ClockIcon className="w-8 h-8" />}
            iconColor="text-purple-400"
            description={`${watchHistory.length} ${watchHistory.length === 1 ? 'item' : 'items'}`}
        >
            {/* Back to Profile Link */}
            <div className="mb-6">
                <Link
                    href={`/users/${userId}`}
                    className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                    <UserIcon className="w-4 h-4" />
                    Back to {displayName}'s Profile
                </Link>
            </div>

            {watchHistory.length > 0 ? (
                <div className="space-y-8">
                    {Object.entries(groupedByDate).map(([date, items]) => (
                        <div key={date}>
                            {/* Date header with count badge */}
                            <div className="flex items-center gap-3 mb-4">
                                <h3 className="text-lg font-semibold text-white">{date}</h3>
                                <span className="text-sm text-gray-400 bg-zinc-800/50 px-2 py-0.5 rounded-full">
                                    {items.length}
                                </span>
                            </div>

                            {/* Content grid for this date */}
                            <div className="flex flex-wrap justify-between gap-x-6 sm:gap-x-8 md:gap-x-10 lg:gap-x-12 gap-y-3 sm:gap-y-4 md:gap-y-5 [&>*]:flex-none">
                                {items.map((entry) => (
                                    <ContentCard key={entry.content.id} content={entry.content} />
                                ))}
                                <ContentGridSpacer />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 bg-zinc-900 rounded-lg border border-zinc-800">
                    <ClockIcon className="w-20 h-20 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No Watch History</h3>
                    <p className="text-gray-400">{displayName} hasn't watched anything yet</p>
                </div>
            )}
        </SubPageLayout>
    )
}
