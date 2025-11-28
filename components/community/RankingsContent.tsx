'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useRankingStore } from '@/stores/rankingStore'
import { useAuthStatus } from '@/hooks/useAuthStatus'
import { useVoiceInput } from '@/hooks/useVoiceInput'
import { useToast } from '@/hooks/useToast'
import NetflixLoader from '@/components/common/NetflixLoader'
import { RankingCard } from '@/components/rankings/RankingCard'
import {
    TrophyIcon,
    MagnifyingGlassIcon,
    MicrophoneIcon,
    ChatBubbleLeftRightIcon,
    ChartBarIcon,
    FilmIcon,
    TvIcon,
    SparklesIcon,
} from '@heroicons/react/24/outline'

export default function RankingsContent() {
    const router = useRouter()
    const {
        communityRankings,
        isLoading,
        error,
        loadCommunityRankings,
        sortBy,
        filterByMediaType,
        setFilterByMediaType,
    } = useRankingStore()
    const { isGuest, isInitialized } = useAuthStatus()
    const { showError } = useToast()
    const [searchQuery, setSearchQuery] = useState('')
    const [rankingsLimit, setRankingsLimit] = useState(20)

    // Voice input
    const { isListening, isSupported, startListening, stopListening } = useVoiceInput({
        onResult: (transcript) => {
            setSearchQuery(transcript)
        },
        onError: (error) => {
            showError(error)
        },
        sourceId: 'rankings-search',
    })

    const handleVoiceClick = async () => {
        if (isListening) {
            stopListening()
        } else {
            await startListening()
        }
    }

    // Load community rankings on mount and when sort changes
    useEffect(() => {
        if (isInitialized) {
            loadCommunityRankings(rankingsLimit)
        }
    }, [isInitialized, sortBy, rankingsLimit, loadCommunityRankings])

    const handleLoadMoreRankings = () => {
        setRankingsLimit((prev) => prev + 20)
    }

    const handleCreateRanking = () => {
        if (isGuest) {
            alert('Please sign in to create rankings')
            return
        }
        router.push('/rankings/new')
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
                  ranking.userName.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : filteredByMediaType

    const hasMore = communityRankings.length >= rankingsLimit

    return (
        <div className="relative -mt-24 -mx-6 sm:-mx-8 lg:-mx-12">
            {/* Atmospheric Background */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-black" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[800px] bg-gradient-radial from-yellow-900/20 via-transparent to-transparent opacity-50" />
                <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black opacity-60" />
            </div>

            {/* Content Container */}
            <div className="relative z-10">
                {/* Cinematic Hero Header */}
                <div className="relative overflow-hidden pt-4">
                    {/* Animated Background Gradients */}
                    <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-900/80 to-black" />
                    <div
                        className="absolute inset-0 bg-gradient-to-t from-yellow-900/20 via-amber-900/10 to-black/50 animate-pulse"
                        style={{ animationDuration: '4s' }}
                    />
                    <div className="absolute inset-0 bg-gradient-radial from-yellow-500/10 via-yellow-900/5 to-transparent" />

                    {/* Soft edge vignetting for subtle blending */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/80" />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/60" />

                    {/* Hero Content */}
                    <div className="relative z-10 flex flex-col items-center justify-start px-6 pt-8 pb-6">
                        {/* Trophy Icon with glow */}
                        <div className="relative mb-4">
                            <div className="absolute inset-0 bg-yellow-500/30 blur-2xl scale-150" />
                            <TrophyIcon className="relative w-16 h-16 text-yellow-400 drop-shadow-[0_0_20px_rgba(234,179,8,0.5)]" />
                        </div>

                        {/* Title */}
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-2 text-center tracking-tight">
                            <span className="bg-gradient-to-r from-yellow-200 via-amber-100 to-yellow-200 bg-clip-text text-transparent drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">
                                Community Rankings
                            </span>
                        </h1>

                        {/* Subtitle */}
                        <p className="text-base sm:text-lg text-gray-300 mb-6 text-center max-w-2xl">
                            Discover, curate, and share your top picks in movies & TV
                        </p>

                        {/* Main Navigation Tabs */}
                        <div className="mb-6">
                            <div className="inline-flex gap-2 bg-zinc-900/60 backdrop-blur-xl p-2 rounded-xl border border-zinc-800/50 shadow-2xl">
                                {[
                                    {
                                        id: 'rankings',
                                        label: 'Rankings',
                                        icon: TrophyIcon,
                                        color: 'text-yellow-500',
                                    },
                                    {
                                        id: 'threads',
                                        label: 'Threads',
                                        icon: ChatBubbleLeftRightIcon,
                                        color: 'text-blue-500',
                                    },
                                    {
                                        id: 'polls',
                                        label: 'Polls',
                                        icon: ChartBarIcon,
                                        color: 'text-pink-500',
                                    },
                                ].map((tab) => {
                                    const Icon = tab.icon
                                    const isActive = tab.id === 'rankings'

                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => router.push(`/community/${tab.id}`)}
                                            className={`relative px-6 py-3 rounded-lg font-bold text-lg transition-all duration-300 ${
                                                isActive
                                                    ? 'bg-zinc-800 text-white shadow-lg scale-105'
                                                    : 'text-gray-400 hover:text-gray-200 hover:bg-zinc-800/50 hover:scale-105'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Icon
                                                    className={`w-6 h-6 ${isActive ? tab.color : ''}`}
                                                />
                                                <span>{tab.label}</span>
                                            </div>
                                            {/* Active glow ring */}
                                            {isActive && (
                                                <div className="absolute inset-0 rounded-lg ring-2 ring-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.3)]" />
                                            )}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Category Pills - Integrated in Hero */}
                        <div className="flex flex-wrap gap-2 items-center justify-center mb-5">
                            {[
                                { value: 'all', label: 'All', icon: null },
                                { value: 'movie', label: 'Movies', icon: FilmIcon },
                                { value: 'tv', label: 'TV Shows', icon: TvIcon },
                            ].map((option) => {
                                const Icon = option.icon
                                const isSelected = filterByMediaType === option.value

                                return (
                                    <button
                                        key={option.value}
                                        onClick={() =>
                                            setFilterByMediaType(
                                                option.value as typeof filterByMediaType
                                            )
                                        }
                                        className={`group relative rounded-full px-5 py-2.5 text-sm font-bold transition-all duration-300 backdrop-blur-md border flex items-center gap-2 ${
                                            isSelected
                                                ? 'bg-yellow-500/90 text-black border-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.5)] scale-105'
                                                : 'bg-zinc-900/40 text-gray-300 border-zinc-700/50 hover:bg-zinc-800/60 hover:border-zinc-600 hover:scale-105 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]'
                                        }`}
                                    >
                                        {Icon && (
                                            <Icon
                                                className={`w-4 h-4 ${isSelected ? 'text-black' : ''}`}
                                            />
                                        )}
                                        <span className="relative z-10">{option.label}</span>
                                        {isSelected && (
                                            <div className="absolute inset-0 rounded-full bg-yellow-500 blur-xl opacity-30 animate-pulse" />
                                        )}
                                    </button>
                                )
                            })}
                        </div>

                        {/* Enhanced Search Bar */}
                        <div className="w-full max-w-3xl relative">
                            <div className="relative group">
                                <MagnifyingGlassIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400 z-10 transition-colors group-focus-within:text-yellow-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search rankings..."
                                    className="w-full pl-14 pr-14 py-4 bg-zinc-900/40 backdrop-blur-lg border border-zinc-800/50 rounded-2xl text-white text-lg placeholder-gray-500 focus:outline-none focus:border-yellow-500 focus:shadow-[0_0_25px_rgba(234,179,8,0.3)] transition-all duration-300 hover:bg-zinc-900/60 hover:border-zinc-700"
                                />
                                {isSupported && (
                                    <button
                                        type="button"
                                        onClick={handleVoiceClick}
                                        className="absolute right-5 top-1/2 -translate-y-1/2 z-10 transition-all duration-200"
                                        title={isListening ? 'Stop listening' : 'Start voice input'}
                                    >
                                        <div className="relative">
                                            {isListening && (
                                                <>
                                                    <span className="absolute inset-0 rounded-full bg-red-500/40 animate-ping" />
                                                    <span className="absolute inset-0 rounded-full bg-red-500/30 animate-pulse" />
                                                </>
                                            )}
                                            <MicrophoneIcon
                                                className={`w-6 h-6 relative z-10 transition-all ${
                                                    isListening
                                                        ? 'text-red-500 scale-110 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]'
                                                        : 'text-gray-400 hover:text-yellow-400'
                                                }`}
                                            />
                                        </div>
                                    </button>
                                )}

                                {/* Glowing border effect on focus */}
                                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-yellow-500 to-amber-500 opacity-0 group-focus-within:opacity-20 blur-xl transition-opacity duration-300 -z-10" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="px-6 sm:px-8 lg:px-12 py-8 space-y-6">
                    {/* Error State */}
                    {error && (
                        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
                            <p className="text-red-400">{error}</p>
                        </div>
                    )}

                    {/* Loading state */}
                    {isLoading && (
                        <div className="py-16">
                            <NetflixLoader inline={true} message="Loading rankings..." />
                        </div>
                    )}

                    {/* Empty state */}
                    {!isLoading && communityRankings.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="relative mb-6">
                                <div className="absolute inset-0 bg-yellow-500/20 blur-2xl scale-150" />
                                <div className="relative w-24 h-24 rounded-full bg-zinc-900/60 backdrop-blur-lg flex items-center justify-center border-2 border-zinc-800/50">
                                    <TrophyIcon className="w-12 h-12 text-yellow-500" />
                                </div>
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-3">No rankings yet</h3>
                            <p className="text-gray-400 mb-8 max-w-md text-lg">
                                Be the first to create a ranking! Curate your top picks and share
                                them with the community.
                            </p>
                            <button
                                onClick={handleCreateRanking}
                                className={`px-8 py-4 font-bold rounded-xl transition-all duration-300 ${
                                    isGuest
                                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-black shadow-[0_0_30px_rgba(234,179,8,0.4)] hover:shadow-[0_0_40px_rgba(234,179,8,0.6)] scale-100 hover:scale-105'
                                }`}
                                disabled={isGuest}
                            >
                                {isGuest ? 'Sign in to Create Rankings' : 'Create First Ranking'}
                            </button>
                        </div>
                    )}

                    {/* Rankings Grid - 2 Column Layout */}
                    {!isLoading && filteredRankings.length > 0 && (
                        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {filteredRankings.map((ranking, index) => (
                                <div
                                    key={ranking.id}
                                    className="animate-fadeInUp"
                                    style={{
                                        animationDelay: `${Math.min(index * 50, 500)}ms`,
                                        animationFillMode: 'both',
                                    }}
                                >
                                    <RankingCard ranking={ranking} />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* No results state */}
                    {!isLoading &&
                        communityRankings.length > 0 &&
                        filteredRankings.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <div className="w-20 h-20 mb-4 rounded-full bg-zinc-900/60 backdrop-blur-lg flex items-center justify-center border border-zinc-800/50">
                                    <TrophyIcon className="w-10 h-10 text-gray-600" />
                                </div>
                                <p className="text-gray-400 text-lg mb-2">
                                    {searchQuery
                                        ? `No rankings match "${searchQuery}"`
                                        : 'No rankings found'}
                                </p>
                                <p className="text-gray-500 text-sm">
                                    {searchQuery
                                        ? 'Try a different search term'
                                        : 'Try adjusting your filters'}
                                </p>
                            </div>
                        )}

                    {/* Load More button */}
                    {hasMore && !searchQuery && filteredRankings.length > 0 && !isLoading && (
                        <div className="flex justify-center mt-8">
                            <button
                                onClick={handleLoadMoreRankings}
                                className="group relative px-8 py-4 font-bold rounded-xl transition-all duration-300"
                            >
                                {/* Glow effect */}
                                <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />

                                {/* Button */}
                                <div className="relative flex items-center gap-3 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl border border-zinc-700 group-hover:border-yellow-500/50 transition-all">
                                    <span>Load More Rankings</span>
                                    <SparklesIcon className="w-5 h-5 text-yellow-400" />
                                </div>
                            </button>
                        </div>
                    )}
                </div>

                {/* Floating CTA Button */}
                {!isGuest && (
                    <button
                        onClick={handleCreateRanking}
                        className="fixed bottom-8 right-20 z-50 group"
                        style={{
                            animation: 'bob 5s ease-in-out infinite',
                        }}
                    >
                        <div className="relative">
                            {/* Glowing background */}
                            <div className="absolute inset-0 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-full blur-2xl opacity-60 group-hover:opacity-80 transition-opacity" />

                            {/* Button */}
                            <div className="relative flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600 rounded-full text-black font-bold shadow-[0_0_40px_rgba(234,179,8,0.6)] group-hover:shadow-[0_0_60px_rgba(234,179,8,0.8)] group-hover:scale-110 transition-all duration-300">
                                <TrophyIcon className="w-6 h-6" />
                                <span className="hidden sm:inline">New Ranking</span>
                            </div>
                        </div>
                    </button>
                )}
            </div>

            {/* Add keyframe animation for bobbing and fade-in */}
            <style jsx>{`
                @keyframes bob {
                    0%,
                    100% {
                        transform: translateY(0);
                    }
                    50% {
                        transform: translateY(-10px);
                    }
                }

                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                :global(.animate-fadeInUp) {
                    animation: fadeInUp 0.5s ease-out;
                }
            `}</style>
        </div>
    )
}
