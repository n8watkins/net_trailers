/**
 * Community Page
 *
 * Displays public rankings from all users with filtering and sorting options
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import SubPageLayout from '../../components/layout/SubPageLayout'
import { RankingGrid } from '../../components/rankings/RankingGrid'
import { useRankingStore } from '../../stores/rankingStore'
import { useAuthStatus } from '../../hooks/useAuthStatus'
import NetflixLoader from '../../components/common/NetflixLoader'
import {
    TrophyIcon,
    UsersIcon,
    AdjustmentsHorizontalIcon,
    FunnelIcon,
} from '@heroicons/react/24/outline'

export default function CommunityPage() {
    const router = useRouter()
    const { isInitialized } = useAuthStatus()

    const {
        communityRankings,
        isLoading,
        error,
        loadCommunityRankings,
        sortBy,
        setSortBy,
        filterByMediaType,
        setFilterByMediaType,
    } = useRankingStore()

    const [showFilters, setShowFilters] = useState(false)

    // Load community rankings on mount
    useEffect(() => {
        if (isInitialized) {
            loadCommunityRankings(50)
        }
    }, [isInitialized, loadCommunityRankings])

    // Reload when sort changes
    useEffect(() => {
        if (isInitialized) {
            loadCommunityRankings(50)
        }
    }, [sortBy, isInitialized, loadCommunityRankings])

    const handleRankingClick = (rankingId: string) => {
        router.push(`/rankings/${rankingId}`)
    }

    // Filter rankings by media type
    const filteredRankings =
        filterByMediaType === 'all'
            ? communityRankings
            : communityRankings.filter((ranking) => {
                  // Check if all items in ranking match the filter
                  return ranking.rankedItems.every(
                      (item) => item.content.media_type === filterByMediaType
                  )
              })

    if (!isInitialized || isLoading) {
        return (
            <SubPageLayout
                title="Community"
                icon={<UsersIcon className="w-8 h-8" />}
                iconColor="text-yellow-500"
            >
                <NetflixLoader />
            </SubPageLayout>
        )
    }

    return (
        <SubPageLayout
            title="Community"
            icon={<UsersIcon className="w-8 h-8" />}
            iconColor="text-yellow-500"
            headerActions={
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                >
                    <AdjustmentsHorizontalIcon className="w-5 h-5" />
                    <span className="hidden sm:inline">Filters</span>
                </button>
            }
        >
            {/* Description */}
            <div className="mb-6 text-center">
                <p className="text-gray-400 max-w-2xl mx-auto">
                    Discover and explore public rankings created by the community
                </p>
            </div>

            {/* Filters Panel */}
            {showFilters && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-6 space-y-4">
                    {/* Sort By */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Sort By
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {[
                                { value: 'recent', label: 'Most Recent' },
                                { value: 'popular', label: 'Most Popular' },
                                { value: 'most-liked', label: 'Most Liked' },
                                { value: 'most-viewed', label: 'Most Viewed' },
                            ].map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => setSortBy(option.value as typeof sortBy)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                        sortBy === option.value
                                            ? 'bg-yellow-500 text-black'
                                            : 'bg-zinc-800 text-gray-300 hover:bg-zinc-700'
                                    }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Filter by Media Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Content Type
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {[
                                { value: 'all', label: 'All' },
                                { value: 'movie', label: 'Movies Only' },
                                { value: 'tv', label: 'TV Shows Only' },
                            ].map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() =>
                                        setFilterByMediaType(
                                            option.value as typeof filterByMediaType
                                        )
                                    }
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                        filterByMediaType === option.value
                                            ? 'bg-yellow-500 text-black'
                                            : 'bg-zinc-800 text-gray-300 hover:bg-zinc-700'
                                    }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Error State */}
            {error && (
                <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-6">
                    <p className="text-red-400">{error}</p>
                </div>
            )}

            {/* Rankings Grid */}
            <RankingGrid
                rankings={filteredRankings}
                isLoading={isLoading}
                emptyMessage="No public rankings found. Be the first to create one!"
                showAuthor={true}
                onLike={handleRankingClick}
            />

            {/* Stats Footer */}
            {!isLoading && communityRankings.length > 0 && (
                <div className="mt-8 flex items-center justify-center gap-8 text-sm text-gray-400">
                    <div className="flex items-center gap-2">
                        <TrophyIcon className="w-5 h-5 text-yellow-500" />
                        <span>
                            {communityRankings.length}{' '}
                            {communityRankings.length === 1 ? 'ranking' : 'rankings'}
                        </span>
                    </div>
                    {filteredRankings.length !== communityRankings.length && (
                        <div className="flex items-center gap-2">
                            <FunnelIcon className="w-5 h-5 text-gray-500" />
                            <span>
                                Showing {filteredRankings.length} of {communityRankings.length}
                            </span>
                        </div>
                    )}
                </div>
            )}
        </SubPageLayout>
    )
}
