/**
 * Public User Rankings Page
 *
 * Shows all public rankings for a specific user's profile.
 * Data is fetched from /api/public-profile/[userId] (Turso-backed).
 */

'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import SubPageLayout from '../../../../components/layout/SubPageLayout'
import { RankingGrid } from '../../../../components/rankings/RankingGrid'
import NetflixLoader from '../../../../components/common/NetflixLoader'
import { TrophyIcon, UserIcon } from '@heroicons/react/24/outline'
import type { Ranking } from '../../../../types/rankings'
import type { PublicProfilePayload } from '@/lib/publicProfile'
import Link from 'next/link'

export default function UserRankingsPage() {
    const params = useParams()
    const userId = params?.userId as string

    const [rankings, setRankings] = useState<Ranking[]>([])
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
                // Fetch aggregated public profile from the Turso-backed API.
                // The payload already includes filtered public rankings sorted by recency.
                const response = await fetch(`/api/public-profile/${userId}`)
                if (!response.ok) {
                    const body = await response.json().catch(() => null)
                    throw new Error(body?.error || 'Failed to load rankings')
                }

                const payload = (await response.json()) as PublicProfilePayload

                if (!isMounted) return

                setDisplayName(payload.profile.displayName)
                setRankings(payload.rankings ?? [])
            } catch (err) {
                console.error('Error loading rankings:', err)
                if (isMounted) {
                    setError((err as Error).message || 'Failed to load rankings')
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
                title="Loading Rankings..."
                icon={<TrophyIcon className="w-8 h-8" />}
                iconColor="text-yellow-400"
            >
                <NetflixLoader />
            </SubPageLayout>
        )
    }

    if (error) {
        return (
            <SubPageLayout
                title="Error"
                icon={<TrophyIcon className="w-8 h-8" />}
                iconColor="text-yellow-400"
            >
                <div className="max-w-2xl mx-auto text-center py-16">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-zinc-800 flex items-center justify-center">
                        <TrophyIcon className="w-10 h-10 text-gray-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Error Loading Rankings</h2>
                    <p className="text-gray-400">{error}</p>
                </div>
            </SubPageLayout>
        )
    }

    return (
        <SubPageLayout
            title={`${displayName}'s Rankings`}
            icon={<TrophyIcon className="w-8 h-8" />}
            iconColor="text-yellow-400"
            description={`${rankings.length} public ${rankings.length === 1 ? 'ranking' : 'rankings'}`}
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

            <RankingGrid
                rankings={rankings}
                showAuthor={false}
                emptyMessage={`${displayName} hasn't created any public rankings yet`}
            />
        </SubPageLayout>
    )
}
