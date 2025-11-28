'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useRankingStore } from '@/stores/rankingStore'
import { useAuthStatus } from '@/hooks/useAuthStatus'
import NetflixLoader from '@/components/common/NetflixLoader'
import SearchBar from '@/components/common/SearchBar'
import { getTitle } from '@/typings'
import {
    TrophyIcon,
    FireIcon,
    HeartIcon,
    EyeIcon,
    ChatBubbleLeftRightIcon,
    SparklesIcon,
} from '@heroicons/react/24/outline'

export default function RankingsContent() {
    const router = useRouter()
    const { isInitialized } = useAuthStatus()

    const {
        communityRankings,
        isLoading,
        error,
        loadCommunityRankings,
        sortBy,
        filterByMediaType,
        setFilterByMediaType,
    } = useRankingStore()

    const [searchQuery, setSearchQuery] = useState('')
    const [rankingsLimit, setRankingsLimit] = useState(20)

    // Load community rankings on mount and when sort changes
    useEffect(() => {
        if (isInitialized) {
            loadCommunityRankings(rankingsLimit)
        }
    }, [isInitialized, sortBy, rankingsLimit, loadCommunityRankings])

    const handleLoadMoreRankings = () => {
        setRankingsLimit((prev) => prev + 20)
    }

    const handleRankingClick = (rankingId: string) => {
        router.push(`/rankings/${rankingId}`)
    }

    // Filter rankings by media type
    const filteredByMediaType =
        filterByMediaType === 'all'
            ? communityRankings
            : communityRankings.filter((ranking) => {
                  return ranking.rankedItems.every(
                      (item) => item.content.media_type === filterByMediaType
                  )
              })

    // Apply search filter
    const filteredRankings = searchQuery
        ? filteredByMediaType.filter(
              (ranking) =>
                  ranking.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  ranking.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  ranking.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  ranking.contentTitles?.some((title: string) =>
                      title.toLowerCase().includes(searchQuery.toLowerCase())
                  )
          )
        : filteredByMediaType

    const hasMore = communityRankings.length >= rankingsLimit

    return (
        <div className="space-y-6">
            {/* Filters Section - Collections-style Layout */}
            <div className="space-y-6">
                {/* Media Type Filter Pills and Create Button */}
                <div className="flex flex-wrap gap-2 items-center justify-between">
                    <div className="flex flex-wrap gap-2">
                        {[
                            { value: 'all', label: 'All' },
                            { value: 'movie', label: 'Movies' },
                            { value: 'tv', label: 'TV Shows' },
                        ].map((option) => (
                            <button
                                key={option.value}
                                onClick={() =>
                                    setFilterByMediaType(option.value as typeof filterByMediaType)
                                }
                                className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                                    filterByMediaType === option.value
                                        ? 'bg-yellow-500 text-black shadow-lg scale-105'
                                        : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700/80 hover:scale-105'
                                }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>

                    {/* Create Ranking Button */}
                    <button
                        onClick={() => router.push('/rankings/new')}
                        className="rounded-full px-5 py-2.5 font-semibold transition-all duration-200 flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-black shadow-lg hover:scale-105"
                    >
                        <TrophyIcon className="w-5 h-5" />
                        <span className="hidden sm:inline">Create Ranking</span>
                    </button>
                </div>

                {/* Search Rankings Input */}
                <SearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search rankings..."
                    focusColor="yellow"
                    voiceInput={true}
                    voiceSourceId="rankings-search"
                />
            </div>

            {/* Loading State */}
            {isLoading && <NetflixLoader inline={true} message="Loading rankings..." />}

            {/* Error State */}
            {error && (
                <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
                    <p className="text-red-400">{error}</p>
                </div>
            )}

            {/* Rankings Grid */}
            {!isLoading &&
                (filteredRankings.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredRankings.map((ranking) => (
                            <div
                                key={ranking.id}
                                onClick={() => handleRankingClick(ranking.id)}
                                className="cursor-pointer"
                            >
                                <div className="group relative bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 hover:border-zinc-700 transition-all duration-200 hover:shadow-xl">
                                    {/* Main card */}
                                    <div className="relative">
                                        {/* Header with top 3 posters */}
                                        {ranking.rankedItems && ranking.rankedItems.length > 0 && (
                                            <div className="relative h-48 bg-gradient-to-br from-zinc-800/50 to-zinc-900">
                                                <div className="absolute inset-0 flex justify-center items-center gap-2 p-4">
                                                    {ranking.rankedItems.slice(0, 3).map((item) => (
                                                        <div
                                                            key={item.content.id}
                                                            className="relative flex-1 h-full"
                                                        >
                                                            <img
                                                                src={`https://image.tmdb.org/t/p/w500${item.content.poster_path}`}
                                                                alt={getTitle(item.content)}
                                                                className="object-cover rounded-md shadow-lg w-full h-full"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/50 to-transparent" />
                                                {ranking.likes > 50 && (
                                                    <div className="absolute top-3 right-3 px-2.5 py-1 bg-orange-500/90 backdrop-blur-sm rounded text-xs font-semibold text-white flex items-center gap-1">
                                                        <FireIcon className="w-3 h-3" />
                                                        <span>HOT</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Content section */}
                                        <div className="p-4 space-y-3">
                                            {/* Trophy icon + title */}
                                            <div className="flex items-start gap-2">
                                                <TrophyIcon className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-1" />
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-lg font-bold text-white group-hover:text-yellow-400 transition-colors line-clamp-2">
                                                        {ranking.title}
                                                    </h3>
                                                </div>
                                            </div>

                                            {/* Description - Fixed height for 2 lines */}
                                            <div className="h-10">
                                                {ranking.description && (
                                                    <p className="text-sm text-gray-400 line-clamp-2">
                                                        {ranking.description}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Author info */}
                                            <div className="flex items-center gap-2 text-sm">
                                                <span className="text-gray-400">
                                                    By {ranking.userName}
                                                </span>
                                            </div>

                                            {/* Stats & actions */}
                                            <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                                                <div className="flex items-center gap-4 text-sm text-gray-400">
                                                    <div className="flex items-center gap-1">
                                                        <HeartIcon className="w-5 h-5" />
                                                        <span>{ranking.likes || 0}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <ChatBubbleLeftRightIcon className="w-5 h-5" />
                                                        <span>{ranking.comments || 0}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <EyeIcon className="w-5 h-5" />
                                                        <span>{ranking.views || 0}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-20 h-20 mb-4 rounded-full bg-zinc-800 flex items-center justify-center">
                            <TrophyIcon className="w-10 h-10 text-gray-600" />
                        </div>
                        <p className="text-gray-400 text-lg mb-2">
                            {searchQuery ? 'No rankings match your search' : 'No rankings found'}
                        </p>
                        <p className="text-gray-500 text-sm">
                            {searchQuery
                                ? 'Try a different search term'
                                : 'Be the first to create one!'}
                        </p>
                    </div>
                ))}

            {/* Load More button */}
            {hasMore && !searchQuery && filteredRankings.length > 0 && (
                <div className="flex justify-center mt-8">
                    <button
                        onClick={handleLoadMoreRankings}
                        className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
                    >
                        <span>Load More Rankings</span>
                        <SparklesIcon className="w-5 h-5" />
                    </button>
                </div>
            )}
        </div>
    )
}
