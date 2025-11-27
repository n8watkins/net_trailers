'use client'

import React from 'react'
import Link from 'next/link'
import { ChevronRightIcon } from '@heroicons/react/24/outline'
import { UpgradeAccountBanner } from '../auth/UpgradeAccountBanner'
import { useAuthStore } from '../../stores/authStore'
import { useGuestStore } from '../../stores/guestStore'
import { useSessionStore } from '../../stores/sessionStore'
import { SystemRecommendation } from '../../types/recommendations'

// System Recommendations Display Names and Descriptions
const SYSTEM_REC_INFO: Record<string, { name: string; description: string; defaultEmoji: string }> =
    {
        'recommended-for-you': {
            name: 'Recommended For You',
            description: 'Personalized content based on your watch history and preferences',
            defaultEmoji: '✨',
        },
        trending: {
            name: 'Trending',
            description: 'Popular movies and shows trending now',
            defaultEmoji: '🔥',
        },
        'top-rated': {
            name: 'Top Rated',
            description: 'Highest-rated content from TMDB',
            defaultEmoji: '⭐',
        },
        'trending-actors': {
            name: 'Trending Actors',
            description: 'Popular actors trending this week',
            defaultEmoji: '🎭',
        },
        'trending-directors': {
            name: 'Trending Directors',
            description: 'Popular directors trending this week',
            defaultEmoji: '🎬',
        },
    }

// System Recommendations Manager Component
interface SystemRecommendationsManagerProps {
    sessionType: 'guest' | 'authenticated' | 'initializing' | null | undefined
}

const SystemRecommendationsManager = React.memo<SystemRecommendationsManagerProps>(
    ({ sessionType }) => {
        const authSystemRecommendations = useAuthStore((state) => state.systemRecommendations)
        const guestSystemRecommendations = useGuestStore((state) => state.systemRecommendations)
        const authUpdateSystemRec = useAuthStore((state) => state.updateSystemRecommendation)
        const guestUpdateSystemRec = useGuestStore((state) => state.updateSystemRecommendation)

        const systemRecommendations =
            sessionType === 'authenticated' ? authSystemRecommendations : guestSystemRecommendations

        const handleToggle = React.useCallback(
            (recId: string, enabled: boolean) => {
                if (sessionType === 'authenticated') {
                    authUpdateSystemRec(recId, { enabled })
                } else {
                    guestUpdateSystemRec(recId, { enabled })
                }
            },
            [sessionType, authUpdateSystemRec, guestUpdateSystemRec]
        )

        // Sort by order
        const sortedRecs = React.useMemo(() => {
            return [...systemRecommendations].sort((a, b) => a.order - b.order)
        }, [systemRecommendations])

        return (
            <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    System Recommendation Rows
                </h3>
                <div className="space-y-4 bg-[#0a0a0a] rounded-lg border border-[#313131] p-6">
                    {sortedRecs.map((rec, index) => {
                        const info = SYSTEM_REC_INFO[rec.id] || {
                            name: rec.name,
                            description: 'System recommendation row',
                            defaultEmoji: '🎬',
                        }

                        return (
                            <div key={rec.id}>
                                {index > 0 && (
                                    <div className="border-t border-[#313131] mb-4"></div>
                                )}
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium text-[#e5e5e5] mb-1">
                                            {rec.emoji || info.defaultEmoji} {rec.name}
                                        </label>
                                        <p className="text-sm text-[#b3b3b3]">{info.description}</p>
                                        {rec.id === 'recommended-for-you' && (
                                            <p className="text-xs text-[#999] mt-1">
                                                Requires "Improve Recommendations" to be enabled
                                            </p>
                                        )}
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer ml-4">
                                        <input
                                            type="checkbox"
                                            checked={rec.enabled}
                                            onChange={(e) => handleToggle(rec.id, e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>
                            </div>
                        )
                    })}
                </div>
                <p className="text-xs text-[#666] mt-3">
                    💡 Tip: You can customize names, emojis, and row order using the "Manage Page"
                    button on the home page.
                </p>
            </div>
        )
    }
)

SystemRecommendationsManager.displayName = 'SystemRecommendationsManager'

// Memoized Recommendations Controls Component - Only re-renders when props actually change
interface RecommendationsControlsProps {
    improveRecommendations: boolean
    showRecommendations: boolean
    trackWatchHistory: boolean
    isGuest: boolean
    onImproveRecommendationsChange: (checked: boolean) => void
    onShowRecommendationsChange: (checked: boolean) => void
    onTrackWatchHistoryChange: (checked: boolean) => void
}

const RecommendationsControls = React.memo<RecommendationsControlsProps>(
    ({
        improveRecommendations,
        showRecommendations,
        trackWatchHistory,
        isGuest,
        onImproveRecommendationsChange,
        onShowRecommendationsChange,
        onTrackWatchHistoryChange,
    }) => {
        return (
            <div className="space-y-8">
                {/* Privacy & Recommendations Section */}
                <div>
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                        Privacy & Recommendations
                    </h3>
                    <div className="space-y-6 bg-[#0a0a0a] rounded-lg border border-[#313131] p-6">
                        {/* Show Personalized Recommendations Row Toggle */}
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-[#e5e5e5] mb-1">
                                    Show Personalized Recommendations
                                </label>
                                <p className="text-sm text-[#b3b3b3] mb-2">
                                    Display a "Recommended For You" row on the home page based on
                                    your watch history and preferences
                                </p>
                                <p className="text-xs text-[#999]">
                                    Requires interaction tracking to be enabled. Only available for
                                    authenticated users.
                                </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer ml-4">
                                <input
                                    type="checkbox"
                                    checked={showRecommendations}
                                    onChange={(e) => onShowRecommendationsChange(e.target.checked)}
                                    disabled={!improveRecommendations || isGuest}
                                    className="sr-only peer"
                                />
                                <div
                                    className={`w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600 ${
                                        !improveRecommendations || isGuest
                                            ? 'opacity-50 cursor-not-allowed'
                                            : ''
                                    }`}
                                ></div>
                            </label>
                        </div>

                        {/* Divider */}
                        <div className="border-t border-[#313131]"></div>

                        {/* Improve Recommendations Toggle */}
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-[#e5e5e5] mb-1">
                                    Improve Recommendations
                                </label>
                                <p className="text-sm text-[#b3b3b3] mb-2">
                                    Allow NetTrailers to learn from your interactions to provide
                                    personalized recommendations
                                </p>
                                <p className="text-xs text-[#999]">
                                    When enabled, we track which content you view, add to
                                    collections, like, and hide. This data helps us recommend movies
                                    and shows you'll enjoy.
                                </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer ml-4">
                                <input
                                    type="checkbox"
                                    checked={improveRecommendations}
                                    onChange={(e) =>
                                        onImproveRecommendationsChange(e.target.checked)
                                    }
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>

                        {/* Divider */}
                        <div className="border-t border-[#313131]"></div>

                        {/* Track Watch History Toggle */}
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-[#e5e5e5] mb-1">
                                    Track Watch History
                                </label>
                                <p className="text-sm text-[#b3b3b3] mb-2">
                                    Keep a record of content you view in your Watch History
                                </p>
                                <p className="text-xs text-[#999]">
                                    Disabling will permanently delete your existing watch history.
                                </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer ml-4">
                                <input
                                    type="checkbox"
                                    checked={trackWatchHistory}
                                    onChange={(e) => onTrackWatchHistoryChange(e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Manage Ratings Section */}
                <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Your Ratings</h3>
                    <Link
                        href="/ratings"
                        className="flex items-center justify-between bg-[#0a0a0a] rounded-lg border border-[#313131] p-4 hover:bg-[#1a1a1a] transition-colors group"
                    >
                        <div>
                            <p className="text-sm font-medium text-[#e5e5e5] mb-1">
                                Manage My Ratings
                            </p>
                            <p className="text-sm text-[#b3b3b3]">
                                View and edit your ratings on movies and TV shows
                            </p>
                        </div>
                        <ChevronRightIcon className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
                    </Link>
                </div>

                {/* Info Box */}
                <div className="p-4 rounded-lg bg-[#1a1a1a] border border-[#313131]">
                    <h4 className="text-sm font-medium text-white mb-2">About Recommendations</h4>
                    <ul className="text-sm text-[#999] space-y-1">
                        <li>
                            <strong>Personalized Recommendations:</strong> Shows content tailored to
                            your preferences based on what you watch, like, and add to collections
                        </li>
                        <li>
                            <strong>Interaction Tracking:</strong> Powers recommendations by
                            learning from your viewing habits (required for personalized
                            suggestions)
                        </li>
                        <li>
                            <strong>Watch History:</strong> Keeps a log of content you've viewed for
                            easy access later
                        </li>
                    </ul>
                    <p className="text-xs text-[#666] mt-3">
                        Tip: To manage which recommendation rows appear on your homepage and their
                        order, use the "Manage" button on the home page.
                    </p>
                </div>
            </div>
        )
    }
)

RecommendationsControls.displayName = 'RecommendationsControls'

interface RecommendationsSectionProps {
    isGuest: boolean
    isInitializing: boolean
    improveRecommendations: boolean
    showRecommendations: boolean
    trackWatchHistory: boolean
    onImproveRecommendationsChange: (checked: boolean) => void
    onShowRecommendationsChange: (checked: boolean) => void
    onTrackWatchHistoryChange: (checked: boolean) => void
}

const RecommendationsSection: React.FC<RecommendationsSectionProps> = ({
    isGuest,
    isInitializing,
    improveRecommendations,
    showRecommendations,
    trackWatchHistory,
    onImproveRecommendationsChange,
    onShowRecommendationsChange,
    onTrackWatchHistoryChange,
}) => {
    const sessionType = useSessionStore((state) => state.sessionType)

    return (
        <div className="p-8">
            {/* Upgrade Banner for Guests */}
            {isGuest && <UpgradeAccountBanner />}

            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">Recommendations</h2>
                <p className="text-[#b3b3b3]">
                    Control recommendation rows and personalization settings
                </p>
            </div>

            {/* Only render controls after data is loaded */}
            {isInitializing ? (
                <div className="space-y-8 animate-pulse">
                    <div>
                        <div className="h-6 bg-[#313131] rounded w-48 mb-4"></div>
                        <div className="bg-[#0a0a0a] rounded-lg border border-[#313131] p-6">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="h-4 bg-[#313131] rounded w-40 mb-2"></div>
                                    <div className="h-3 bg-[#313131] rounded w-64"></div>
                                </div>
                                <div className="w-11 h-6 bg-[#313131] rounded-full ml-4"></div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-8">
                    {/* System Recommendation Rows */}
                    <SystemRecommendationsManager sessionType={sessionType} />

                    {/* Privacy & Personalization Settings */}
                    <RecommendationsControls
                        improveRecommendations={improveRecommendations}
                        showRecommendations={showRecommendations}
                        trackWatchHistory={trackWatchHistory}
                        isGuest={isGuest}
                        onImproveRecommendationsChange={onImproveRecommendationsChange}
                        onShowRecommendationsChange={onShowRecommendationsChange}
                        onTrackWatchHistoryChange={onTrackWatchHistoryChange}
                    />
                </div>
            )}
        </div>
    )
}

export default RecommendationsSection
