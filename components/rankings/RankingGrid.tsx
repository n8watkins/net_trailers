/**
 * RankingGrid Component
 *
 * Displays a grid of ranking cards with loading and empty states
 */

'use client'

import { Ranking } from '@/types/rankings'
import { RankingCard } from './RankingCard'

interface RankingGridProps {
    rankings: Ranking[]
    isLoading?: boolean
    emptyMessage?: string
    showAuthor?: boolean
    onLike?: (rankingId: string) => void
}

export function RankingGrid({
    rankings,
    isLoading = false,
    emptyMessage = 'No rankings found',
    showAuthor = true,
    onLike,
}: RankingGridProps) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="bg-zinc-900 rounded-lg overflow-hidden animate-pulse">
                        <div className="h-48 bg-zinc-800" />
                        <div className="p-4 space-y-3">
                            <div className="h-6 bg-zinc-800 rounded w-3/4" />
                            <div className="h-4 bg-zinc-800 rounded w-full" />
                            <div className="h-4 bg-zinc-800 rounded w-2/3" />
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    if (rankings.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-20 h-20 mb-4 rounded-full bg-zinc-800 flex items-center justify-center">
                    <svg
                        className="w-10 h-10 text-gray-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                        />
                    </svg>
                </div>
                <p className="text-gray-400 text-lg">{emptyMessage}</p>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {rankings.map((ranking) => (
                <RankingCard
                    key={ranking.id}
                    ranking={ranking}
                    showAuthor={showAuthor}
                    onLike={onLike}
                />
            ))}
        </div>
    )
}
